import {
  alreadyHereCopy,
  drinkClarifyCopy,
  drinkQueuedCopy,
  drinkUnavailableCopy,
  missionCorrectCopy,
  missionDeliverCopy,
  missionPartnerInvalidCopy,
  missionWrongCopy,
  welcomeCopy,
} from "@/constants/copy";
import type { InboundChannel } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { assertNever } from "@/lib/assert";
import type { Conversation, Participant } from "@/domain/types";
import type { Repositories } from "@/server/db/repositories";
import type { ConversationService } from "@/server/services/conversations";
import type { DrinkService } from "@/server/services/drinks";
import type { MissionService } from "@/server/services/missions";
import type { RegistrationService } from "@/server/services/registration";
import type { ToolDef } from "@/server/partners/dedalus/types";

export interface ToolContext {
  eventId: string;
  from: string;
  externalConversationId: string | null;
  channel: InboundChannel;
  /** The guest's current message — the fallback when the model omits a tool arg. */
  userText: string;
  repos: Repositories;
  registration: RegistrationService;
  drinks: DrinkService;
  missions: MissionService;
  conversations: ConversationService;
}

type ToolResult = Record<string, unknown>;
interface Tool {
  def: ToolDef;
  execute: (args: Record<string, unknown>, ctx: ToolContext) => ToolResult;
}

/**
 * Pull a string argument tolerantly. Models name the same field differently
 * (text/request/drink/answer/...), so accept any of the candidates, then fall
 * back to any string value in the args.
 */
function pickText(args: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = args[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  for (const v of Object.values(args)) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

/** Light name extraction for when the model omits the name arg. */
function guessName(text: string): string | null {
  const m = text.match(/\b(?:i'?m|i am|this is|name'?s|call me)\s+([a-z][a-z'-]{1,30})/i);
  if (!m?.[1]) return null;
  return m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
}

/** Resolve the live conversation + participant for this phone, fresh each call. */
function resolve(ctx: ToolContext): { conversation: Conversation; participant: Participant | null } {
  const conversation = ctx.conversations.resolve(ctx.externalConversationId, ctx.from, ctx.channel);
  const participant = conversation.participantId
    ? ctx.repos.participants.findById(conversation.participantId)
    : ctx.from
      ? ctx.repos.participants.findByPhone(ctx.eventId, ctx.from)
      : null;
  return { conversation, participant };
}

const NOT_CHECKED_IN = { error: "guest_not_checked_in", hint: "call check_in first" };

const checkIn: Tool = {
  def: {
    type: "function",
    function: {
      name: "check_in",
      description:
        "Thread a guest into the event: assigns their color gem, secret word, game id, and first mission. Call this the first time someone with no record messages. Use their name if they gave one.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "guest's name if given" },
          category: { type: "string", description: "RSVP cohort if known (engineers/founders/artists/...)" },
        },
        required: [],
      },
    },
  },
  execute: (args, ctx) => {
    const result = ctx.registration.register({
      phone: ctx.from,
      externalConversationId: ctx.externalConversationId,
      channel: ctx.channel,
      name: pickText(args, ["name", "guest_name"]) || guessName(ctx.userText),
      category: pickText(args, ["category", "cohort"]) || null,
    });
    const p = result.participant;
    const missionPrompt = result.firstMission
      ? ctx.missions.renderPrompt(result.firstMission, p)
      : "";
    const say = result.isNew
      ? welcomeCopy({ gemLabel: GEMS[p.gem].label, word: p.secretWord, gameId: p.gameId, missionPrompt })
      : alreadyHereCopy({ gemLabel: GEMS[p.gem].label, gameId: p.gameId });
    return {
      is_new: result.isNew,
      gem: GEMS[p.gem].label,
      secret_word: p.secretWord,
      game_id: p.gameId,
      first_mission: missionPrompt,
      say,
    };
  },
};

const orderDrink: Tool = {
  def: {
    type: "function",
    function: {
      name: "order_drink",
      description:
        "Route a drink to the bar. Pass the guest's request verbatim; the menu match and queueing are deterministic. If the result is 'clarify', ask the guest what they want.",
      parameters: {
        type: "object",
        properties: { text: { type: "string", description: "the guest's drink request, verbatim" } },
        required: ["text"],
      },
    },
  },
  execute: (args, ctx) => {
    const { conversation, participant } = resolve(ctx);
    if (!participant) return NOT_CHECKED_IN;
    const text = pickText(args, ["text", "request", "drink", "item", "order", "query"]) || ctx.userText;
    const outcome = ctx.drinks.createFromText(participant, conversation.id, text);
    switch (outcome.kind) {
      case "queued":
        return { status: "queued", label: outcome.order.label, say: drinkQueuedCopy(outcome.order.label) };
      case "unavailable":
        return { status: "unavailable", label: outcome.label, say: drinkUnavailableCopy(outcome.label) };
      case "clarify":
        return { status: "clarify", say: drinkClarifyCopy() };
      default:
        return assertNever(outcome);
    }
  },
};

const answerMission: Tool = {
  def: {
    type: "function",
    function: {
      name: "answer_mission",
      description:
        "Submit the guest's current-mission answer. Pass their words verbatim (include any game IDs). Pass/fail is decided deterministically — never judge it yourself.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "the guest's answer verbatim, including game IDs" },
        },
        required: ["text"],
      },
    },
  },
  execute: (args, ctx) => {
    const { conversation, participant } = resolve(ctx);
    if (!participant) return NOT_CHECKED_IN;
    const text = pickText(args, ["text", "answer", "response", "guess", "request"]) || ctx.userText;
    const outcome = ctx.missions.submit(participant, conversation, text);
    switch (outcome.kind) {
      case "correct":
        return {
          result: "correct",
          points: outcome.points,
          say: missionCorrectCopy({ points: outcome.points, nextMissionPrompt: outcome.nextPrompt ?? undefined }),
        };
      case "incorrect":
        return { result: "incorrect", say: missionWrongCopy(outcome.hint) };
      case "partner_invalid":
        return { result: "partner_invalid", say: missionPartnerInvalidCopy() };
      case "already":
        return { result: "already", say: "already solved that one — stay close to the screen." };
      case "no_mission": {
        const delivered = ctx.missions.deliverCurrent(participant, conversation);
        return {
          result: "no_mission",
          say: delivered
            ? missionDeliverCopy({ title: delivered.mission.title, prompt: delivered.prompt })
            : "no active move right now. order a drink or watch the board.",
        };
      }
      default:
        return assertNever(outcome);
    }
  },
};

const getStatus: Tool = {
  def: {
    type: "function",
    function: {
      name: "get_status",
      description: "Get the guest's gem, secret word, game id, score, and current mission.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  execute: (_args, ctx) => {
    const { conversation, participant } = resolve(ctx);
    if (!participant) return NOT_CHECKED_IN;
    const delivered = ctx.missions.deliverCurrent(participant, conversation);
    return {
      gem: GEMS[participant.gem].label,
      secret_word: participant.secretWord,
      game_id: participant.gameId,
      score: participant.score,
      current_mission: delivered?.prompt ?? null,
      say: delivered
        ? missionDeliverCopy({ title: delivered.mission.title, prompt: delivered.prompt })
        : "you've cleared the labyrinth. stay close to the screen.",
    };
  },
};

const flagOperator: Tool = {
  def: {
    type: "function",
    function: {
      name: "flag_operator",
      description:
        "Alert a human staffer when a guest has a real-world problem, is upset, or asks for a person — lost item, safety concern, complaint, or anything you can't resolve. Pass a short reason.",
      parameters: {
        type: "object",
        properties: { reason: { type: "string", description: "short summary of what the guest needs" } },
        required: ["reason"],
      },
    },
  },
  execute: (args, ctx) => {
    const { participant } = resolve(ctx);
    const reason = pickText(args, ["reason", "text", "issue", "message"]) || ctx.userText;
    ctx.repos.operatorAlerts.create(
      ctx.eventId,
      participant?.id ?? null,
      participant?.gameId ?? null,
      reason,
    );
    return { flagged: true, say: "got it — a staffer's heading your way. hang tight." };
  },
};

const TOOLS: Record<string, Tool> = {
  check_in: checkIn,
  order_drink: orderDrink,
  answer_mission: answerMission,
  get_status: getStatus,
  flag_operator: flagOperator,
};

export const AGENT_TOOL_DEFS: ToolDef[] = Object.values(TOOLS).map((t) => t.def);

export function executeTool(name: string, args: Record<string, unknown>, ctx: ToolContext): ToolResult {
  const tool = TOOLS[name];
  if (!tool) return { error: `unknown_tool:${name}` };
  return tool.execute(args, ctx);
}
