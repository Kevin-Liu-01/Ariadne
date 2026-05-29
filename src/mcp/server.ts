import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DRINK_STATUSES } from "@/constants/drinks";
import { GEMS } from "@/constants/gems";
import { ARIADNE_SYSTEM_PROMPT } from "@/constants/prompts";
import { loadScriptEnv } from "@/lib/env";
import { getBackbone } from "@/server/backbone";
import { sendGuestText } from "@/server/partners/agentphone/outbound";
import { outboundEnabled } from "@/server/partners/agentphone/client";
import type { Participant } from "@/domain/types";

loadScriptEnv();

const server = new McpServer({ name: "ariadne", version: "0.1.0" });

function text(payload: unknown) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return { content: [{ type: "text" as const, text: body }] };
}

function participantView(p: Participant) {
  const bb = getBackbone();
  return {
    gameId: p.gameId,
    displayName: p.displayName,
    gem: p.gem,
    gemLabel: GEMS[p.gem].label,
    secretWord: p.secretWord,
    score: p.score,
    eliminated: p.eliminated,
    phone: p.phone,
    missions: bb.repos.participantMissions.listByParticipant(p.id),
  };
}

function requireParticipant(gameId: string): Participant {
  const p = getBackbone().repos.participants.findByGameId(getBackbone().eventId, gameId);
  if (!p) throw new Error(`no participant with game id ${gameId}`);
  return p;
}

server.tool(
  "ariadne_status",
  "Read the live event status: scene, checked-in count, missions solved, drinks pouring.",
  {},
  async () => text(getBackbone().projection.snapshot()),
);

server.tool(
  "ariadne_get_system_prompt",
  "Return the canonical Ariadne persona/policy so the running agent can adopt the host's voice.",
  {},
  async () => text(ARIADNE_SYSTEM_PROMPT),
);

server.tool(
  "ariadne_register_participant",
  "Check a guest in. Creates the canonical participant, assigns gem + secret word + game id + first mission.",
  {
    name: z.string().optional(),
    phone: z.string().optional(),
    category: z.string().optional().describe("RSVP cohort, e.g. engineers/founders/artists"),
    stationId: z.string().optional(),
  },
  async (args) => {
    const result = getBackbone().registration.register({
      phone: args.phone ?? null,
      externalConversationId: null,
      channel: null,
      name: args.name ?? null,
      category: args.category ?? null,
      stationId: args.stationId ?? null,
    });
    return text({ isNew: result.isNew, participant: participantView(result.participant) });
  },
);

server.tool(
  "ariadne_get_participant",
  "Look up a participant by game id, including missions and score.",
  { gameId: z.string() },
  async (args) => text(participantView(requireParticipant(args.gameId))),
);

server.tool(
  "ariadne_deliver_mission",
  "Get a participant's current mission prompt (assigns the next one if none active).",
  { gameId: z.string() },
  async (args) => {
    const bb = getBackbone();
    const p = requireParticipant(args.gameId);
    const conv = bb.repos.conversations.findByPhone(bb.eventId, p.phone ?? "");
    const delivered = conv ? bb.missions.deliverCurrent(p, conv) : null;
    return text(delivered ? { title: delivered.mission.title, prompt: delivered.prompt } : { mission: null });
  },
);

server.tool(
  "ariadne_submit_mission_answer",
  "Submit a mission answer on a participant's behalf. Deterministic validation owns pass/fail.",
  { gameId: z.string(), text: z.string() },
  async (args) => {
    const bb = getBackbone();
    const p = requireParticipant(args.gameId);
    const conv = bb.repos.conversations.findByPhone(bb.eventId, p.phone ?? "");
    if (!conv) return text({ error: "no conversation for participant" });
    return text(bb.missions.submit(p, conv, args.text));
  },
);

server.tool(
  "ariadne_take_drink_order",
  "Parse free text into a drink order and route it to the bar queue.",
  { gameId: z.string(), text: z.string() },
  async (args) => {
    const bb = getBackbone();
    const p = requireParticipant(args.gameId);
    const conv = bb.repos.conversations.findByPhone(bb.eventId, p.phone ?? "");
    return text(bb.drinks.createFromText(p, conv?.id ?? null, args.text));
  },
);

server.tool(
  "ariadne_list_drink_queue",
  "List open bar orders, oldest first.",
  {},
  async () => text(getBackbone().drinks.listActive()),
);

server.tool(
  "ariadne_update_drink_status",
  "Move a drink order through its lifecycle.",
  { orderId: z.string(), status: z.enum(DRINK_STATUSES), note: z.string().optional() },
  async (args) => text(getBackbone().drinks.updateStatus(args.orderId, args.status, args.note ?? null) ?? { error: "not found" }),
);

server.tool(
  "ariadne_send_guest_message",
  "Send an SMS/iMessage to a guest via the AgentPhone line (best-effort).",
  { gameId: z.string(), text: z.string() },
  async (args) => {
    const p = requireParticipant(args.gameId);
    if (!p.phone) return text({ sent: false, reason: "participant has no phone" });
    if (!outboundEnabled()) return text({ sent: false, reason: "outbound disabled", preview: args.text });
    const sent = await sendGuestText(p.phone, args.text);
    return text({ sent });
  },
);

server.tool(
  "ariadne_projection",
  "Drive the room board: change scene, fade/restore a guest, or emit a custom event.",
  {
    action: z.enum(["scene", "eliminate", "restore", "emit"]),
    scene: z.string().optional(),
    gameId: z.string().optional(),
    type: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  },
  async (args) => {
    const bb = getBackbone();
    if (args.action === "scene" && args.scene) return text(bb.projection.emit("scene.changed", { scene: args.scene }));
    if ((args.action === "eliminate" || args.action === "restore") && args.gameId) {
      const p = requireParticipant(args.gameId);
      bb.repos.participants.setEliminated(p.id, args.action === "eliminate");
      return text(
        bb.projection.emit(
          args.action === "eliminate" ? "participant.eliminated" : "participant.restored",
          { gameId: p.gameId },
        ),
      );
    }
    if (args.action === "emit" && args.type) {
      return text(bb.projection.emit(args.type as never, args.data ?? {}));
    }
    return text({ error: "invalid projection command" });
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr so we don't corrupt the stdio JSON-RPC channel
  console.error("[ariadne-mcp] ready");
}

main().catch((err) => {
  console.error("[ariadne-mcp] fatal", err);
  process.exit(1);
});
