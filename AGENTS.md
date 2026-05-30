# Instructions for coding agents

Ariadne is a phone-first event backbone (see [README.md](README.md)). It follows
the Dedalus monorepo ethos: minimal diff, deletions celebrated, fail closed, no
silent fallbacks, match surrounding style.

## Commands

```bash
pnpm dev          # Next dev server on :3939
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest (run before committing)
pnpm migrate      # apply schema to SUPABASE_DB_URL (Supabase Postgres)
pnpm seed         # demo data into Supabase via the live brain
pnpm provision    # AgentPhone agent + number + webhook
pnpm smoke        # live AgentPhone checks
pnpm simulate     # signed local inbound webhook
pnpm mcp          # strap-on MCP server (stdio)
```

## Conventions

- **Stack**: Next 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 +
  `cn()` · Zod · Vitest · Postgres via `pg` (Supabase pooler in prod), `pglite`
  in tests. Deployed on Vercel.
- **Structure**: constants in `src/constants/`, pure logic in `src/domain/`,
  data access in `src/server/db/repositories/` (extend `BaseRepository`), business
  logic in `src/server/services/`, partner adapters in `src/server/partners/`.
  Helpers live in their own files; do not nest functions; imports at top of file.
- **State is deterministic.** Mission pass/fail and drink parsing are decided by
  code, never an LLM. The agent persona (prompts) only shapes voice.
- **Backbone is testable.** `new Backbone(await createPgliteDb())` wires everything
  over an in-memory Postgres with no network. Services take deps via the constructor.
- **CSS**: Tailwind utilities only; raw CSS lives in `app/globals.css`. Dynamic
  per-tile gem colors use a single inline-style bridge (documented exception).
- **Webhooks fail closed**: verify the HMAC signature; reject if the secret is
  unset. Outbound is best-effort and must never block the guest reply path.

Read [README.md](README.md) for architecture and [skill/SKILL.md](skill/SKILL.md)
for the strap-on contract.
