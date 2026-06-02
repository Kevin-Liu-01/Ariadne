import {
  alreadyHereCopy,
  askNameCopy,
  badNameCopy,
  checkinAskEmailCopy,
  drinkClarifyCopy,
  drinkQueuedCopy,
  drinkUnavailableCopy,
  helpCopy,
  missionCorrectCopy,
  missionDeliverCopy,
  missionPartnerInvalidCopy,
  missionWrongCopy,
  notOnListCopy,
  pickupConfirmedCopy,
  songQueuedCopy,
  welcomeCopy,
} from "@/constants/copy";
import type { InboundChannel } from "@/constants/event";
import { GEMS } from "@/constants/gems";
import { assertNever } from "@/lib/assert";
import { extractEmail, isEmail, normalizeEmail } from "@/domain/email";
import { cleanDisplayName } from "@/domain/profanity";
import { waitlistLookup } from "@/server/door/waitlist";
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
  /** The guest's current message: the fallback when the model omits a tool arg. */
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
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
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

/** Words that look like names but are not. */
const NOT_A_NAME = new Set([
  "join",
  "hi",
  "hello",
  "hey",
  "help",
  "mission",
  "drink",
  "yes",
  "no",
  "ok",
  "okay",
  "thanks",
  "thank",
  "stop",
]);

/** Light name extraction for when the model omits the name arg. */
function guessName(text: string): string | null {
  const m = text.match(/\b(?:i'?m|i am|this is|name'?s|call me)\s+([a-z][a-z'-]{1,30})/i);
  if (m?.[1]) return titleName(m[1]);
  const bare = text.trim();
  if (/^[a-z][a-z'-]{0,29}$/i.test(bare) && !NOT_A_NAME.has(bare.toLowerCase())) {
    return titleName(bare);
  }
  return null;
}

function titleName(raw: string): string {
  return raw[0].toUpperCase() + raw.slice(1).toLowerCase();
}

/** Strict arg lookup: only the named keys, no "any string value" fallback (that would grab the email). */
function argString(args: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = args[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function resolveName(args: Record<string, unknown>, userText: string): string | null {
  return argString(args, ["name", "guest_name"]) || guessName(userText);
}

/** Pull the signup email from a tool arg or the guest's message. */
function resolveEmail(args: Record<string, unknown>, userText: string): string | null {
  const fromArgs = argString(args, ["email", "e_mail", "address"]);
  if (fromArgs && isEmail(fromArgs)) return normalizeEmail(fromArgs);
  return extractEmail(fromArgs) ?? extractEmail(userText);
}

/** Resolve the live conversation + participant for this phone, fresh each call. */
async function resolve(
  ctx: ToolContext,
): Promise<{ conversation: Conversation; participant: Participant | null }> {
  const conversation = await ctx.conversations.resolve(
    ctx.externalConversationId,
    ctx.from,
    ctx.channel,
  );
  const participant = conversation.participantId
    ? await ctx.repos.participants.findById(conversation.participantId)
    : ctx.from
      ? await ctx.repos.participants.findByPhone(ctx.eventId, ctx.from)
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
        "Thread a guest into the event: assigns their color gem, secret word, game id, and first mission. Requires the email they signed up with, and it must be on the waitlist. Pass a name too if they gave one (otherwise the signup name is used). If they have not given an email yet, ask first and do not call this until they do.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "the email the guest signed up with (required for new check-ins)" },
          name: { type: "string", description: "guest's first name if they offered one" },
          category: { type: "string", description: "RSVP cohort if known (engineers/founders/artists/...)" },
        },
        required: ["email"],
      },
    },
  },
  execute: async (args, ctx) => {
    const { participant: existing } = await resolve(ctx);

    // Returning guest: already threaded in, no email gate. Save a name if it was missing.
    if (existing) {
      const offered = resolveName(args, ctx.userText);
      const offeredName = offered ? cleanDisplayName(offered) : null;
      if (!existing.displayName && offeredName) {
        const updated = await ctx.repos.participants.setDisplayName(existing.id, offeredName);
        const p = updated ?? existing;
        return {
          is_new: false,
          name_saved: true,
          gem: GEMS[p.gem].label,
          game_id: p.gameId,
          say: alreadyHereCopy({ name: p.displayName, gemLabel: GEMS[p.gem].label, gameId: p.gameId }),
        };
      }
      return {
        is_new: false,
        gem: GEMS[existing.gem].label,
        game_id: existing.gameId,
        say: alreadyHereCopy({
          name: existing.displayName,
          gemLabel: GEMS[existing.gem].label,
          gameId: existing.gameId,
        }),
      };
    }

    // New guest: the waitlist email is the gate.
    const email = resolveEmail(args, ctx.userText);
    if (!email) return { needs_email: true, say: checkinAskEmailCopy() };

    const listing = waitlistLookup(email);
    if (!listing.onList) return { not_on_list: true, email, say: notOnListCopy() };

    const rawName = resolveName(args, ctx.userText) ?? listing.name;
    const displayName = rawName ? cleanDisplayName(rawName) : null;
    if (rawName && !displayName) return { needs_name: true, email, say: badNameCopy() };
    if (!displayName) return { needs_name: true, email, say: askNameCopy() };

    const result = await ctx.registration.register({
      phone: ctx.from,
      externalConversationId: ctx.externalConversationId,
      channel: ctx.channel,
      name: displayName,
      email,
      category: pickText(args, ["category", "cohort"]) || null,
    });
    const p = result.participant;
    const missionPrompt = result.firstMission
      ? ctx.missions.renderPrompt(result.firstMission, p)
      : "";
    const say = result.isNew
      ? welcomeCopy({
          name: p.displayName,
          gemLabel: GEMS[p.gem].label,
          word: p.secretWord,
          gameId: p.gameId,
          missionPrompt,
        })
      : alreadyHereCopy({
          name: p.displayName,
          gemLabel: GEMS[p.gem].label,
          gameId: p.gameId,
        });
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
  execute: async (args, ctx) => {
    const { conversation, participant } = await resolve(ctx);
    if (!participant) return NOT_CHECKED_IN;
    const text = pickText(args, ["text", "request", "drink", "item", "order", "query"]) || ctx.userText;
    const outcome = await ctx.drinks.createFromText(participant, conversation.id, text);
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
        "Submit the guest's current-mission answer. Pass their words verbatim (include any game IDs). Pass/fail is decided deterministically; never judge it yourself.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "the guest's answer verbatim, including game IDs" },
        },
        required: ["text"],
      },
    },
  },
  execute: async (args, ctx) => {
    const { conversation, participant } = await resolve(ctx);
    if (!participant) return NOT_CHECKED_IN;
    const text = pickText(args, ["text", "answer", "response", "guess", "request"]) || ctx.userText;
    const outcome = await ctx.missions.submit(participant, conversation, text);
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
        return { result: "already", say: "You already solved that one. Stay close to the screen." };
      case "no_mission": {
        const delivered = await ctx.missions.deliverCurrent(participant, conversation);
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
  execute: async (_args, ctx) => {
    const { conversation, participant } = await resolve(ctx);
    if (!participant) return NOT_CHECKED_IN;
    const delivered = await ctx.missions.deliverCurrent(participant, conversation);
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

const confirmPickup: Tool = {
  def: {
    type: "function",
    function: {
      name: "confirm_pickup",
      description:
        "Mark the guest's ready drink as picked up. Call when the guest confirms they grabbed, got, or have their drink (e.g. 'yes', 'got it', 'thanks for the drink').",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  execute: async (_args, ctx) => {
    const { participant } = await resolve(ctx);
    if (!participant) return NOT_CHECKED_IN;
    const order = await ctx.repos.drinkOrders.findReadyByParticipant(participant.id);
    if (!order) return { picked_up: false, say: "I don't see a drink waiting for you right now." };
    await ctx.drinks.updateStatus(order.id, "picked_up", null);
    return { picked_up: true, label: order.label, say: pickupConfirmedCopy(order.label) };
  },
};

const queueSong: Tool = {
  def: {
    type: "function",
    function: {
      name: "queue_song",
      description:
        "Send a guest's song request to the DJ booth. Pass the song title or artist verbatim. The DJ accepts or rejects it; the guest is texted the outcome.",
      parameters: {
        type: "object",
        properties: { text: { type: "string", description: "the song or artist the guest wants" } },
        required: ["text"],
      },
    },
  },
  execute: async (args, ctx) => {
    const { participant } = await resolve(ctx);
    if (!participant) return NOT_CHECKED_IN;
    const text = pickText(args, ["text", "song", "title", "request", "track", "artist"]) || ctx.userText;
    if (!text.trim()) {
      return { status: "clarify", say: "What song? Text me a title or artist and I'll send it to the DJ." };
    }
    await ctx.repos.songRequests.create(ctx.eventId, participant.id, text.trim());
    return { status: "queued", say: songQueuedCopy(text.trim()) };
  },
};

const showHelp: Tool = {
  def: {
    type: "function",
    function: {
      name: "help",
      description:
        "List everything the guest can do (mission answers, drinks, song requests, status). Call when they ask for help or what they can do.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  execute: async () => ({ say: helpCopy() }),
};

const flagOperator: Tool = {
  def: {
    type: "function",
    function: {
      name: "flag_operator",
      description:
        "Alert a human staffer when a guest has a real-world problem, is upset, or asks for a person (lost item, safety concern, complaint, or anything you can't resolve). Pass a short reason.",
      parameters: {
        type: "object",
        properties: { reason: { type: "string", description: "short summary of what the guest needs" } },
        required: ["reason"],
      },
    },
  },
  execute: async (args, ctx) => {
    const { participant } = await resolve(ctx);
    const reason = pickText(args, ["reason", "text", "issue", "message"]) || ctx.userText;
    await ctx.repos.operatorAlerts.create(
      ctx.eventId,
      participant?.id ?? null,
      participant?.gameId ?? null,
      reason,
    );
    return { flagged: true, say: "Got it. A staffer is heading your way. Hang tight." };
  },
};

const TOOLS: Record<string, Tool> = {
  check_in: checkIn,
  order_drink: orderDrink,
  answer_mission: answerMission,
  get_status: getStatus,
  confirm_pickup: confirmPickup,
  queue_song: queueSong,
  help: showHelp,
  flag_operator: flagOperator,
};

export const AGENT_TOOL_DEFS: ToolDef[] = Object.values(TOOLS).map((t) => t.def);

export function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const tool = TOOLS[name];
  if (!tool) return Promise.resolve({ error: `unknown_tool:${name}` });
  return tool.execute(args, ctx);
}
