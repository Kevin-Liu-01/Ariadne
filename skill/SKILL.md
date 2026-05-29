---
name: ariadne
description: Strap Ariadne onto a running agent (Claude Code, OpenClaw) to host a phone-first live event. Use when the agent should check guests in, assign gems + secret words, issue labyrinth missions, take drink orders, and drive a projection board over SMS/iMessage/voice via AgentPhone. Triggers on "run the room", "host the event", "Run(way)time", "check in a guest", "take a drink order".
---

# Ariadne — the thread through the labyrinth

Ariadne is the event backbone. You are the cognition. Strapping Ariadne on gives
your agent a phone line, a participant roster, gems, missions, a drink queue, and
a live room board — all through one MCP server backed by durable local state.

## Connect

Add the MCP server (stdio) to your agent. From the Ariadne repo:

```json
{
  "mcpServers": {
    "ariadne": { "command": "pnpm", "args": ["mcp"], "cwd": "/abs/path/to/ariadne" }
  }
}
```

It needs `.env.local` with `AGENTPHONE_API_KEY` (+ ids from `pnpm provision`) and
`ARIADNE_DB_PATH` (shared with the web server).

## Adopt the persona first

Call `ariadne_get_system_prompt` and **become that voice**: cinematic, concise,
slightly mysterious, SMS replies under 320 characters. The persona is the
contract for how you talk to guests.

## The loop

1. A guest texts the number → the web server's deterministic brain already replies
   (fast, reliable). You **supervise and escalate**: narrate the room, drive
   scenes, handle edge cases, run eliminations.
2. To act on a guest, resolve them by **game id** (the public, textable code).

## Tools

| Tool | Use |
|---|---|
| `ariadne_status` | scene, checked-in count, missions solved, drinks pouring |
| `ariadne_get_system_prompt` | the persona/policy to adopt |
| `ariadne_register_participant` | check a guest in (gem + word + first mission) |
| `ariadne_get_participant` | look up a guest by game id |
| `ariadne_deliver_mission` | their current mission prompt |
| `ariadne_submit_mission_answer` | submit an answer (deterministic pass/fail) |
| `ariadne_take_drink_order` | parse free text → bar queue |
| `ariadne_list_drink_queue` / `ariadne_update_drink_status` | run the bar |
| `ariadne_send_guest_message` | text a guest via the AgentPhone line |
| `ariadne_projection` | scene change, fade/restore a guest, custom event |

## Hard rules (fail closed)

- Never invent participant state. Read with a tool before you write.
- Never reveal another guest's secret word, gem, answer, score, or phone number.
- Deterministic validation owns mission pass/fail. You interpret fuzzy text; the
  backbone decides correctness.
- One clarifying question max. Push social motion ("find a green gem, text me both IDs").
- If voice or outbound fails, fall back to text. The room must keep running.
- Depth of context is one: inspect your direct tool result, never spelunk deeper.
