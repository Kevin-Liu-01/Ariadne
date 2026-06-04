/**
 * Hammer the LIVE deployment: signed webhooks (real brain) + operator HTTP +
 * concurrent load bursts, against Vercel + Supabase. Clears the board's leftover
 * test data first for a deterministic run, then deletes every test player and
 * resets scene/puzzle at the end so the room is clean for the event.
 *
 * THIS WRITES TO THE LIVE DB. Usage: npx tsx scripts/e2e-prod.ts
 */
import { createHmac } from "node:crypto";
import { env, loadScriptEnv } from "@/lib/env";

loadScriptEnv();

import pg from "pg";
import { PUZZLE_BY_ID } from "@/constants/puzzles";
import { clueForParticipant } from "@/domain/mission-parse";

const BASE = "https://ariadne-runway.vercel.app";
const SECRET = env.agentphone.webhookSecret;
const OP = process.env.OP_TOKEN ?? env.operatorToken;
const AGENT = env.agentphone.agentId || "agt_e2e";
const EVENT = env.eventId;

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, detail = ""): void {
  if (cond) pass += 1;
  else fail += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function signedHeaders(raw: string, webhookId: string): Record<string, string> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = `sha256=${createHmac("sha256", SECRET).update(`${ts}.${raw}`).digest("hex")}`;
  return {
    "content-type": "application/json",
    "x-webhook-signature": sig,
    "x-webhook-timestamp": ts,
    "x-webhook-id": webhookId,
    "x-webhook-event": "agent.message",
  };
}

async function sendText(fromArg: string | null, text: string, webhookId?: string): Promise<number> {
  const from = fromArg ?? "";
  const id = webhookId ?? `e2e_${from}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const raw = JSON.stringify({
    event: "agent.message",
    channel: "sms",
    timestamp: new Date().toISOString(),
    agentId: AGENT,
    data: { conversationId: `conv_${from}`, numberId: "num_e2e", from, to: env.agentphone.phoneNumber, message: text, direction: "inbound", receivedAt: new Date().toISOString() },
    conversationState: null,
    recentHistory: [],
  });
  const res = await fetch(`${BASE}/api/webhooks/agentphone`, { method: "POST", headers: signedHeaders(raw, id), body: raw });
  return res.status;
}

async function registerWeb(name: string | null, phone: string): Promise<{ status: number; ms: number; gameId?: string }> {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/participants/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: name ?? undefined, phone }),
  });
  const ms = Date.now() - t0;
  const body = res.ok ? ((await res.json()) as { participant?: { gameId: string } }) : null;
  return { status: res.status, ms, gameId: body?.participant?.gameId };
}

function opFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE}${path}`, { ...init, headers: { authorization: `Bearer ${OP}`, "content-type": "application/json", ...(init.headers ?? {}) } });
}
interface Roster { gameId: string; displayName: string | null; gem: string; secretWord: string; score: number; eliminated: boolean; phone: string | null }
async function roster(): Promise<Roster[]> {
  return ((await (await opFetch("/api/operator/participants")).json()) as { participants: Roster[] }).participants;
}
async function projection(): Promise<Record<string, unknown>> {
  return (await fetch(`${BASE}/api/projection/state`)).json() as Promise<Record<string, unknown>>;
}

const CLEAN = [
  { phone: "+19990000001", name: "Aria" },
  { phone: "+19990000002", name: "Bell" },
  { phone: "+19990000003", name: "Cyrus" },
  { phone: "+19990000004", name: "Dione" },
  { phone: "+19990000005", name: "Echo" },
  { phone: "+19990000006", name: "Faye" },
];
const COLOR_GROUPS: Record<string, string[]> = {
  amethyst: ["amethyst", "garnet"],
  garnet: ["garnet", "amethyst"],
  moonstone: ["moonstone", "peridot"],
  peridot: ["peridot", "moonstone"],
  aquamarine: ["aquamarine", "topaz", "peridot"],
  topaz: ["topaz", "aquamarine", "peridot"],
};

const db = new pg.Client({ connectionString: env.databaseUrl });
const CHILD_TABLES = ["mission_events", "riddle_solves", "participant_missions", "drink_orders", "operator_alerts"];

async function wipeEvent(): Promise<number> {
  const ids = (await db.query<{ id: string }>(`SELECT id FROM participants WHERE event_id = $1`, [EVENT])).rows.map((r) => r.id);
  await db.query(`DELETE FROM drink_order_events WHERE order_id IN (SELECT id FROM drink_orders WHERE event_id = $1)`, [EVENT]);
  for (const t of CHILD_TABLES) await db.query(`DELETE FROM ${t} WHERE event_id = $1`, [EVENT]);
  await db.query(`DELETE FROM conversations WHERE event_id = $1`, [EVENT]);
  await db.query(`DELETE FROM participants WHERE event_id = $1`, [EVENT]);
  await db.query(`DELETE FROM projection_events WHERE event_id = $1`, [EVENT]);
  await db.query(`DELETE FROM counters WHERE event_id = $1`, [EVENT]);
  return ids.length;
}

async function main(): Promise<void> {
  console.log(`== Ariadne LIVE hammer against ${BASE} (event ${EVENT}) ==\n`);
  await db.connect();

  // Preflight: confirm the prod webhook accepts our signature.
  const ping = await sendText("+19990009999", "ping");
  ok("webhook signature accepted by prod", ping === 200, `status ${ping}`);
  if (ping !== 200) {
    console.error("Aborting: webhook secret mismatch with prod. Re-run `pnpm provision --no-number` and sync AGENTPHONE_WEBHOOK_SECRET to Vercel.");
    await db.end();
    process.exit(1);
  }

  // Clean slate (all existing rows are pre-event test data).
  const wiped = await wipeEvent();
  console.log(`cleared ${wiped} leftover participant(s) for a clean run\n`);

  // ---- Functional: 6 sequential check-ins → full mission cycle ----
  for (const p of CLEAN) await sendText(p.phone, `hey, I'm ${p.name}`);
  let ros = await roster();
  let clean = ros.filter((r) => CLEAN.some((c) => c.phone === r.phone));
  ok("6 functional guests checked in", clean.length === 6, `${clean.length}/6`);
  ok("6 distinct gems on a clean board", new Set(clean.map((r) => r.gem)).size === 6, [...new Set(clean.map((r) => r.gem))].join(","));

  const byGem = Object.fromEntries(clean.map((r) => [r.gem, r])) as Record<string, Roster>;
  const byWord = Object.fromEntries(clean.map((r) => [r.secretWord, r])) as Record<string, Roster>;
  const gid = (g: string) => byGem[g]?.gameId ?? "????";
  const scored = (rs: Roster[], min: number) => rs.filter((r) => CLEAN.some((c) => c.phone === r.phone) && r.score >= min).length;

  await Promise.all(Object.entries(COLOR_GROUPS).map(([g, grp]) => (byGem[g] ? sendText(byGem[g].phone, grp.map(gid).join(" ")) : Promise.resolve(0))));
  ok("color quest scored (all 6)", scored(await roster(), 100) === 6);
  await Promise.all(([["give", "wings"], ["drip", "ship"], ["run", "way"]] as const).flatMap(([a, b]) => (byWord[a] && byWord[b] ? [sendText(byWord[a].phone, `${a} ${b} ${byWord[b].gameId}`), sendText(byWord[b].phone, `${b} ${a} ${byWord[a].gameId}`)] : [])));
  ok("word match scored (all 6)", scored(await roster(), 250) === 6);
  await Promise.all(clean.map((r) => sendText(r.phone, clueForParticipant(r.gameId).answers[0])));
  ok("clue quest scored (all 6)", scored(await roster(), 370) === 6);
  const puzId = ((await projection()).puzzle as { id: string }).id;
  await Promise.all(clean.map((r) => sendText(r.phone, PUZZLE_BY_ID.get(puzId)?.answers[0] ?? "labyrinth")));
  ok("image puzzle scored (all 6)", scored(await roster(), 490) === 6, `puzzle=${puzId}`);

  // ---- LOAD: 25 concurrent web check-ins (pure infra: Vercel + Supabase) ----
  const N = 25;
  const burst = Array.from({ length: N }, (_, i) => `+1888${String(1000000 + i).slice(-7)}`);
  const t0 = Date.now();
  const regs = await Promise.all(burst.map((ph, i) => registerWeb(`Load${i}`, ph)));
  const burstMs = Date.now() - t0;
  const okRegs = regs.filter((r) => r.status === 200);
  const ids = new Set(okRegs.map((r) => r.gameId));
  const lat = regs.map((r) => r.ms).sort((a, b) => a - b);
  ok(`${N} concurrent web check-ins all succeeded`, okRegs.length === N, `${okRegs.length}/${N} in ${burstMs}ms, p50=${lat[Math.floor(N / 2)]}ms p95=${lat[Math.floor(N * 0.95)]}ms`);
  ok("all burst game IDs unique (no collision under load)", ids.size === okRegs.length, `${ids.size} unique`);
  const burstRoster = (await roster()).filter((r) => r.phone !== null && burst.includes(r.phone));
  const tally: Record<string, number> = {};
  for (const r of burstRoster) tally[r.gem] = (tally[r.gem] ?? 0) + 1;
  const counts = Object.values(tally);
  const spread = counts.length ? Math.max(...counts) - Math.min(...counts) : 99;
  ok("gems stay evenly distributed under the burst (race-safe)", Object.keys(tally).length === 6 && spread <= 2, `spread=${spread} ${JSON.stringify(tally)}`);

  // ---- LOAD: 8 concurrent brain webhooks (full LLM path under concurrency) ----
  const brainBurst = Array.from({ length: 8 }, (_, i) => `+1777${String(2000000 + i).slice(-7)}`);
  const codes = await Promise.all(brainBurst.map((ph) => sendText(ph, "yo what is this, I'm here")));
  ok("8 concurrent brain webhooks returned 200", codes.every((c) => c === 200), codes.join(","));
  const afterBrainBurst = (await roster()).filter((r) => brainBurst.includes(r.phone ?? "")).length;
  ok("concurrent brain check-ins registered", afterBrainBurst >= 7, `${afterBrainBurst}/8 (LLM path under load)`);

  // ---- Idempotency: same webhook id twice ----
  const dupPhone = "+19990008888";
  const dupId = `dup_${Date.now()}`;
  await sendText(dupPhone, "I'm Dup", dupId);
  const before = (await roster()).filter((r) => r.phone === dupPhone).length;
  await sendText(dupPhone, "I'm Dup", dupId);
  const after = (await roster()).filter((r) => r.phone === dupPhone).length;
  ok("duplicate webhook id is idempotent", before === 1 && after === 1, `before=${before} after=${after}`);

  // ---- Operator HTTP suite ----
  await sendText(byGem.garnet.phone, "vodka soda please");
  const dq = (await (await opFetch("/api/operator/drink-orders")).json()) as { active: { id: string }[] };
  ok("drink reached the operator queue", dq.active.length >= 1, `${dq.active.length} active`);
  if (dq.active[0]) {
    const r = await opFetch(`/api/operator/drink-orders/${dq.active[0].id}`, { method: "PATCH", body: JSON.stringify({ status: "ready" }) });
    ok("operator marked a drink ready", r.ok, `${r.status}`);
  }
  await sendText(byGem.moonstone.phone, "I lost my coat, can someone help?");
  const al = (await (await opFetch("/api/operator/alerts")).json()) as { alerts: { id: string }[] };
  ok("guest issue raised an alert", al.alerts.length >= 1, `${al.alerts.length} open`);
  if (al.alerts[0]) await opFetch(`/api/operator/alerts/${al.alerts[0].id}`, { method: "PATCH", body: JSON.stringify({ status: "resolved" }) });
  await opFetch("/api/operator/projection", { method: "POST", body: JSON.stringify({ action: "scene", scene: "runway" }) });
  const puzNext = (await (await opFetch("/api/operator/projection", { method: "POST", body: JSON.stringify({ action: "puzzle", step: "next" }) })).json()) as { puzzleId: string };
  const snap = await projection();
  ok("scene change live on the board", snap.scene === "runway", `scene=${snap.scene}`);
  ok("puzzle advanced live on the board", (snap.puzzle as { id: string }).id === puzNext.puzzleId);
  await opFetch("/api/operator/projection", { method: "POST", body: JSON.stringify({ action: "eliminate", gameId: byGem.topaz.gameId }) });
  ok("operator faded a guest", (await roster()).find((r) => r.gameId === byGem.topaz.gameId)?.eliminated === true);
  await opFetch("/api/operator/projection", { method: "POST", body: JSON.stringify({ action: "restore", gameId: byGem.topaz.gameId }) });
  ok("operator restored a guest", (await roster()).find((r) => r.gameId === byGem.topaz.gameId)?.eliminated === false);

  // ---- Profanity + auth ----
  const prof = await registerWeb("Shithead McGee", "+19990007777");
  const profRow = (await roster()).find((r) => r.phone === "+19990007777");
  ok("profane name anonymized on the live DB", prof.status === 200 && profRow?.displayName === null);
  ok("operator API rejects no-token", (await fetch(`${BASE}/api/operator/participants`)).status === 401);

  // ---- Projection scale ----
  const fin = await projection();
  ok("projection holds the full crowd", (fin.participants as unknown[]).length >= 40, `${(fin.participants as unknown[]).length} tiles`);
  ok("projection counted all mission completions", (fin.stats as { missionsCompleted: number }).missionsCompleted >= 24, `${(fin.stats as { missionsCompleted: number }).missionsCompleted} solved`);

  // ---- Cleanup: wipe test data + reset board ----
  console.log("\nwiping all test data + resetting the board…");
  const removed = await wipeEvent();
  await db.end();
  console.log(`removed ${removed} test participants; board reset (empty, scene=arrival, default puzzle).`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("hammer crashed:", e);
  try { await db.end(); } catch { /* ignore */ }
  process.exit(1);
});
