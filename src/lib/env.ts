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
};

/** AgentPhone API credentials required for any live call. Throws if unset. */
export function requireAgentphoneApi(): { apiKey: string; baseUrl: string } {
  if (!env.agentphone.apiKey) throw new ConfigError("AGENTPHONE_API_KEY");
  return { apiKey: env.agentphone.apiKey, baseUrl: env.agentphone.baseUrl };
}
