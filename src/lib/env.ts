/**
 * Environment access. Values are read through getters so CLI scripts can call
 * {@link loadScriptEnv} to hydrate `process.env` from a dotenv file before the
 * first read. Next.js loads `.env.local` on its own, so routes never call it.
 */

const DEFAULT_BASE_URL = "https://api.agentphone.ai/v1";

export class ConfigError extends Error {
  constructor(missing: string) {
    super(`Missing required configuration: ${missing}`);
    this.name = "ConfigError";
  }
}

/** Load `.env.local` then `.env` into `process.env` (no-op if absent). Node >= 20.12. */
export function loadScriptEnv(): void {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // file absent or unreadable: fall through to the next candidate
    }
  }
}

export const env = {
  get eventId(): string {
    return process.env.ARIADNE_EVENT_ID ?? "nytw-runwaytime";
  },
  get publicBaseUrl(): string {
    // VERCEL_URL is injected automatically on Vercel (host only, no scheme), so
    // the deployed origin needs no manual config.
    const base =
      process.env.ARIADNE_PUBLIC_BASE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
      "http://localhost:3939";
    return base.replace(/\/$/, "");
  },
  /** Brand image AgentPhone sends as the guest's first bubble, before the first reply. */
  get welcomeImageUrl(): string {
    return process.env.ARIADNE_WELCOME_IMAGE_URL ?? `${env.publicBaseUrl}/brand/welcome.png`;
  },
  /** Postgres connection string (Supabase pooler). Read by prod routes + scripts. */
  get databaseUrl(): string {
    return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "";
  },
  get operatorToken(): string {
    return process.env.ARIADNE_OPERATOR_TOKEN ?? "";
  },
  get agentToken(): string {
    return process.env.ARIADNE_AGENT_TOKEN ?? "";
  },
  /** Shared secret the reminder sweep cron must present. Vercel Cron sends it as a bearer token. */
  get cronSecret(): string {
    return process.env.CRON_SECRET ?? "";
  },
  get disableOutbound(): boolean {
    return process.env.ARIADNE_DISABLE_OUTBOUND === "1";
  },
  /** Model id for the conversational brain (Dedalus gateway, `provider/model`). */
  get model(): string {
    return process.env.ARIADNE_MODEL ?? "openai/gpt-5-mini";
  },
  /** Max agent tool-calling iterations per inbound message. */
  get agentMaxSteps(): number {
    const n = Number(process.env.ARIADNE_AGENT_MAX_STEPS);
    return Number.isFinite(n) && n > 0 ? n : 5;
  },
  agentphone: {
    get apiKey(): string {
      return process.env.AGENTPHONE_API_KEY ?? "";
    },
    get baseUrl(): string {
      return (process.env.AGENTPHONE_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    },
    get agentId(): string {
      return process.env.AGENTPHONE_AGENT_ID ?? "";
    },
    get numberId(): string {
      return process.env.AGENTPHONE_NUMBER_ID ?? "";
    },
    get phoneNumber(): string {
      return process.env.AGENTPHONE_PHONE_NUMBER ?? "";
    },
    get webhookSecret(): string {
      return process.env.AGENTPHONE_WEBHOOK_SECRET ?? "";
    },
  },
  dedalus: {
    get apiKey(): string {
      return process.env.DEDALUS_API_KEY ?? "";
    },
    get baseUrl(): string {
      return (process.env.DEDALUS_BASE_URL ?? "https://api.dedaluslabs.ai/v1").replace(/\/$/, "");
    },
  },
};

/** Postgres connection string required for any DB access. Throws if unset. */
export function requireDatabaseUrl(): string {
  if (!env.databaseUrl) throw new ConfigError("SUPABASE_DB_URL");
  return env.databaseUrl;
}

/** AgentPhone API credentials required for any live call. Throws if unset. */
export function requireAgentphoneApi(): { apiKey: string; baseUrl: string } {
  if (!env.agentphone.apiKey) throw new ConfigError("AGENTPHONE_API_KEY");
  return { apiKey: env.agentphone.apiKey, baseUrl: env.agentphone.baseUrl };
}

/** Dedalus gateway credentials required for the conversational brain. Throws if unset. */
export function requireDedalusApi(): { apiKey: string; baseUrl: string } {
  if (!env.dedalus.apiKey) throw new ConfigError("DEDALUS_API_KEY");
  return { apiKey: env.dedalus.apiKey, baseUrl: env.dedalus.baseUrl };
}
