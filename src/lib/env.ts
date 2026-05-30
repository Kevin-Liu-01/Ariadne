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
    return (process.env.ARIADNE_PUBLIC_BASE_URL ?? "http://localhost:3939").replace(/\/$/, "");
  },
  get dbPath(): string {
    return process.env.ARIADNE_DB_PATH ?? "./data/ariadne.db";
  },
  get operatorToken(): string {
    return process.env.ARIADNE_OPERATOR_TOKEN ?? "";
  },
  get agentToken(): string {
    return process.env.ARIADNE_AGENT_TOKEN ?? "";
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
