import { MISSION_BY_ID } from "@/constants/missions";
import { nameNudgeCopy, pickupCheckCopy, progressNudgeCopy } from "@/constants/copy";
import type { Participant } from "@/domain/types";
import type { ReminderRecord } from "@/server/db/repositories/reminders";
import type { Repositories } from "@/server/db/repositories";
import type { MissionService } from "@/server/services/missions";

// Scene-change announcements fire on the operator action (see AnnouncementService);
// the cron sweep only sends true reminders: pickup, missing name, and inactivity.
export type ReminderKind = "pickup" | "name" | "activity";

/** One proactive message Ariadne will send a guest. */
export interface PlannedSend {
  participantId: string;
  phone: string;
  kind: ReminderKind;
  refId: string | null;
  text: string;
}

export interface GuestSnapshot {
  id: string;
  phone: string | null;
  displayName: string | null;
  eliminated: boolean;
  score: number;
  createdAtMs: number;
  lastActiveMs: number;
  engaged: boolean;
  hasMission: boolean;
  missionPrompt: string | null;
  /** Guest texted "stop texting me": no proactive nudges until they message again. */
  paused: boolean;
}

export interface ReadyOrderSnapshot {
  id: string;
  participantId: string;
  label: string;
  readyAtMs: number;
}

export interface ReminderCaps {
  activeWindowMs: number;
  quietGapMs: number;
  pickupDelayMs: number;
  nameDelayMs: number;
  activityIdleMs: number;
  activityGapMs: number;
  nameCap: number;
  activityCap: number;
  pickupCap: number;
  perSweepCap: number;
}

const MIN = 60_000;

// "Within reason": name and progress get one unprompted text each for the whole
// night (ignore it and you are probably not playing, so we stop). Pickup is the
// exception at 2: it is gated per drink, so this chases up to two waiting drinks,
// each named once. Never mid-conversation, never two in a row.
export const DEFAULT_CAPS: ReminderCaps = {
  activeWindowMs: 5 * MIN,
  quietGapMs: 10 * MIN,
  pickupDelayMs: 4 * MIN,
  nameDelayMs: 3 * MIN,
  activityIdleMs: 25 * MIN,
  activityGapMs: 30 * MIN,
  nameCap: 1,
  activityCap: 1,
  pickupCap: 2,
  perSweepCap: 60,
};

export interface SweepContext {
  nowMs: number;
  guests: GuestSnapshot[];
  readyOrders: ReadyOrderSnapshot[];
  history: ReminderRecord[];
  caps: ReminderCaps;
}

// Highest first: a waiting drink and a missing name beat an inactivity nudge.
const PRIORITY: ReminderKind[] = ["pickup", "name", "activity"];

interface GuestHistory {
  lastSentMs: number;
  count: Record<ReminderKind, number>;
  refs: Set<string>;
}

function indexHistory(history: ReminderRecord[]): Map<string, GuestHistory> {
  const map = new Map<string, GuestHistory>();
  for (const r of history) {
    let h = map.get(r.participantId);
    if (!h) {
      h = { lastSentMs: 0, count: { pickup: 0, name: 0, activity: 0 }, refs: new Set() };
      map.set(r.participantId, h);
    }
    const t = Date.parse(r.sentAt);
    if (t > h.lastSentMs) h.lastSentMs = t;
    if (r.kind in h.count) h.count[r.kind as ReminderKind] += 1;
    if (r.refId) h.refs.add(`${r.kind}:${r.refId}`);
  }
  return map;
}

const EMPTY_HISTORY: GuestHistory = {
  lastSentMs: 0,
  count: { pickup: 0, name: 0, activity: 0 },
  refs: new Set(),
};

/** Choose at most one due nudge for a guest, honoring priority + caps. Pure: no IO. */
function chooseForGuest(
  guest: GuestSnapshot,
  ctx: SweepContext,
  hist: GuestHistory,
  readyByGuest: ReadyOrderSnapshot[],
): PlannedSend | null {
  const { nowMs, caps } = ctx;
  if (!guest.phone) return null;
  if (guest.paused) return null; // honored their "stop texting me" until they re-engage
  if (nowMs - guest.lastActiveMs < caps.activeWindowMs) return null; // mid-conversation
  if (hist.lastSentMs > 0 && nowMs - hist.lastSentMs < caps.quietGapMs) return null; // no back-to-back

  const candidates: Partial<Record<ReminderKind, PlannedSend>> = {};

  const order = readyByGuest.find(
    (o) =>
      nowMs - o.readyAtMs >= caps.pickupDelayMs &&
      hist.count.pickup < caps.pickupCap &&
      !hist.refs.has(`pickup:${o.id}`),
  );
  if (order) {
    candidates.pickup = {
      participantId: guest.id,
      phone: guest.phone,
      kind: "pickup",
      refId: order.id,
      text: pickupCheckCopy(order.label),
    };
  }

  if (
    !guest.displayName &&
    nowMs - guest.createdAtMs >= caps.nameDelayMs &&
    hist.count.name < caps.nameCap &&
    !hist.refs.has("name:name")
  ) {
    candidates.name = { participantId: guest.id, phone: guest.phone, kind: "name", refId: "name", text: nameNudgeCopy() };
  }

  if (
    !guest.eliminated &&
    guest.hasMission &&
    nowMs - guest.lastActiveMs >= caps.activityIdleMs &&
    hist.count.activity < caps.activityCap &&
    !hist.refs.has("activity:activity")
  ) {
    candidates.activity = {
      participantId: guest.id,
      phone: guest.phone,
      kind: "activity",
      refId: "activity",
      text: progressNudgeCopy({ engaged: guest.engaged, score: guest.score, missionPrompt: guest.missionPrompt }),
    };
  }

  for (const kind of PRIORITY) {
    const hit = candidates[kind];
    if (hit) return hit;
  }
  return null;
}

/** Decide every guest's single due nudge, then apply the per-sweep blast ceiling. Pure. */
export function planReminders(ctx: SweepContext): PlannedSend[] {
  const hist = indexHistory(ctx.history);
  const readyByGuest = new Map<string, ReadyOrderSnapshot[]>();
  for (const o of ctx.readyOrders) {
    const list = readyByGuest.get(o.participantId) ?? [];
    list.push(o);
    readyByGuest.set(o.participantId, list);
  }

  const planned: PlannedSend[] = [];
  for (const guest of ctx.guests) {
    const pick = chooseForGuest(guest, ctx, hist.get(guest.id) ?? EMPTY_HISTORY, readyByGuest.get(guest.id) ?? []);
    if (pick) planned.push(pick);
  }

  if (planned.length <= ctx.caps.perSweepCap) return planned;
  planned.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
  return planned.slice(0, ctx.caps.perSweepCap);
}

export interface SweepSummary {
  planned: number;
  sent: number;
  byKind: Record<ReminderKind, number>;
}

type SendText = (phone: string, text: string) => Promise<boolean>;

/**
 * The proactive engine. A cron sweep calls run(); it gathers state, plans the due
 * nudges (scene broadcasts, game reminders, missing-name and unconfirmed-pickup
 * catches), sends them, and logs each so it never repeats or spams.
 */
export class ReminderService {
  constructor(
    private readonly eventId: string,
    private readonly repos: Repositories,
    private readonly missions: MissionService,
    private readonly caps: ReminderCaps = DEFAULT_CAPS,
  ) {}

  async run(sendText: SendText): Promise<SweepSummary> {
    const ctx = await this.snapshot();
    const planned = planReminders(ctx);
    const byKind: Record<ReminderKind, number> = { pickup: 0, name: 0, activity: 0 };
    let sent = 0;
    const reserved: PlannedSend[] = [];
    for (const send of planned) {
      // Reserve the slot before sending so parallel cron sweeps cannot double-text.
      const ok = await this.repos.reminders.tryRecord(
        this.eventId,
        send.participantId,
        send.kind,
        send.refId,
      );
      if (ok) reserved.push(send);
    }
    const results = await Promise.all(
      reserved.map(async (send) => ({ send, ok: await sendText(send.phone, send.text) })),
    );
    for (const { send, ok } of results) {
      if (!ok) continue;
      byKind[send.kind] += 1;
      sent += 1;
    }
    return { planned: planned.length, sent, byKind };
  }

  private async snapshot(): Promise<SweepContext> {
    const [participants, conversations, submittedIds, readyOrders, history] = await Promise.all([
      this.repos.participants.listByEvent(this.eventId),
      this.repos.conversations.listByEvent(this.eventId),
      this.repos.missionEvents.submittedParticipantIds(this.eventId),
      this.repos.drinkOrders.listReady(this.eventId),
      this.repos.reminders.listByEvent(this.eventId),
    ]);

    const convByParticipant = new Map<string, (typeof conversations)[number]>();
    for (const c of conversations) {
      if (c.participantId && !convByParticipant.has(c.participantId)) convByParticipant.set(c.participantId, c);
    }
    const engaged = new Set(submittedIds);

    const guests: GuestSnapshot[] = participants.map((p) => {
      const conv = convByParticipant.get(p.id);
      const missionId = conv?.currentMissionId ?? null;
      return {
        id: p.id,
        phone: p.phone,
        displayName: p.displayName,
        eliminated: p.eliminated,
        score: p.score,
        createdAtMs: Date.parse(p.createdAt),
        lastActiveMs: Date.parse(conv?.updatedAt ?? p.createdAt),
        engaged: engaged.has(p.id),
        hasMission: missionId !== null,
        missionPrompt: this.missionPrompt(missionId, p),
        paused: conv?.textsPaused ?? false,
      };
    });

    return {
      nowMs: Date.now(),
      guests,
      readyOrders: readyOrders.map((o) => ({
        id: o.id,
        participantId: o.participantId,
        label: o.label,
        readyAtMs: Date.parse(o.readyAt ?? o.createdAt),
      })),
      history,
      caps: this.caps,
    };
  }

  private missionPrompt(missionId: string | null, participant: Participant): string | null {
    if (!missionId) return null;
    const template = MISSION_BY_ID.get(missionId);
    return template ? this.missions.renderPrompt(template, participant) : null;
  }
}
