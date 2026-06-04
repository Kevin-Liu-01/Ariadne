/**
 * Schema for the shared event backbone (Postgres dialect). Applied idempotently
 * via `CREATE TABLE IF NOT EXISTS`, so a fresh Supabase project, a pglite test
 * DB, and local dev all converge on the same shape. Booleans are real BOOLEAN,
 * JSON payloads are TEXT (we own the (de)serialization), timestamps are ISO-8601
 * TEXT, and `seq` is an identity column so the projection log is monotonic.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS participants (
  id            TEXT PRIMARY KEY,
  event_id      TEXT NOT NULL,
  game_id       TEXT NOT NULL,
  display_name  TEXT,
  phone         TEXT,
  email         TEXT,
  gem           TEXT NOT NULL,
  secret_word   TEXT NOT NULL,
  station_id    TEXT,
  score         INTEGER NOT NULL DEFAULT 0,
  eliminated    BOOLEAN NOT NULL DEFAULT FALSE,
  photo_url     TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
-- Added after launch; ALTER keeps existing deploys in sync (CREATE above covers fresh DBs).
ALTER TABLE participants ADD COLUMN IF NOT EXISTS email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_event_game ON participants(event_id, game_id);
CREATE INDEX IF NOT EXISTS idx_participants_phone ON participants(event_id, phone);
CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(event_id, email);

CREATE TABLE IF NOT EXISTS conversations (
  id                 TEXT PRIMARY KEY,
  event_id           TEXT NOT NULL,
  participant_id     TEXT,
  external_id        TEXT,
  phone              TEXT,
  channel            TEXT,
  current_flow       TEXT NOT NULL DEFAULT 'idle',
  current_mission_id TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversations_external ON conversations(external_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(event_id, phone);
CREATE INDEX IF NOT EXISTS idx_conversations_participant ON conversations(participant_id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS contact_card_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS welcome_image_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS game_unlocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS texts_paused BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS host_request_state TEXT;

CREATE TABLE IF NOT EXISTS partner_events (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL,
  provider    TEXT NOT NULL,
  webhook_id  TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  channel     TEXT,
  payload     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'received',
  created_at  TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_events_webhook ON partner_events(provider, webhook_id);

CREATE TABLE IF NOT EXISTS participant_missions (
  id             TEXT PRIMARY KEY,
  event_id       TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  mission_id     TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'assigned',
  points_awarded INTEGER NOT NULL DEFAULT 0,
  assigned_at    TEXT NOT NULL,
  submitted_at   TEXT,
  completed_at   TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_participant_mission ON participant_missions(participant_id, mission_id);

CREATE TABLE IF NOT EXISTS mission_events (
  id                TEXT PRIMARY KEY,
  event_id          TEXT NOT NULL,
  participant_id    TEXT NOT NULL,
  mission_id        TEXT NOT NULL,
  raw_answer        TEXT NOT NULL,
  normalized_answer TEXT NOT NULL,
  partner_game_ids  TEXT NOT NULL DEFAULT '[]',
  result            TEXT NOT NULL,
  points_awarded    INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mission_events_participant ON mission_events(participant_id);

CREATE TABLE IF NOT EXISTS drink_orders (
  id              TEXT PRIMARY KEY,
  event_id        TEXT NOT NULL,
  participant_id  TEXT NOT NULL,
  conversation_id TEXT,
  raw_text        TEXT NOT NULL,
  menu_item_id    TEXT NOT NULL,
  label           TEXT NOT NULL,
  modifiers       TEXT NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'queued',
  operator_notes  TEXT,
  created_at      TEXT NOT NULL,
  ready_at        TEXT,
  picked_up_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_drink_orders_status ON drink_orders(event_id, status);
CREATE INDEX IF NOT EXISTS idx_drink_orders_participant ON drink_orders(participant_id);

CREATE TABLE IF NOT EXISTS drink_order_events (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL,
  status     TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drink_order_events_order ON drink_order_events(order_id);

CREATE TABLE IF NOT EXISTS projection_events (
  seq        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id   TEXT NOT NULL,
  type       TEXT NOT NULL,
  data       TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projection_events_event ON projection_events(event_id, seq);

CREATE TABLE IF NOT EXISTS operator_alerts (
  id             TEXT PRIMARY KEY,
  event_id       TEXT NOT NULL,
  participant_id TEXT,
  game_id        TEXT,
  reason         TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open',
  created_at     TEXT NOT NULL,
  resolved_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_operator_alerts_event ON operator_alerts(event_id, status);

CREATE TABLE IF NOT EXISTS fuser_assets (
  id              TEXT PRIMARY KEY,
  event_id        TEXT NOT NULL,
  asset_type      TEXT NOT NULL,
  source_url      TEXT,
  local_url       TEXT,
  projection_slot TEXT,
  creator_name    TEXT,
  credit_line     TEXT,
  license_notes   TEXT,
  status          TEXT NOT NULL DEFAULT 'received',
  created_at      TEXT NOT NULL
);

-- Append-only log of proactive texts Ariadne has sent a guest (scene broadcasts,
-- game nudges, name/pickup reconciliation). The reminder sweep reads this to stay
-- idempotent and to throttle: never two in a row, capped per night.
CREATE TABLE IF NOT EXISTS reminders (
  id             TEXT PRIMARY KEY,
  event_id       TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  kind           TEXT NOT NULL,
  ref_id         TEXT,
  sent_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reminders_lookup ON reminders(event_id, participant_id, kind);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_dedupe
  ON reminders (event_id, participant_id, kind, COALESCE(ref_id, ''));

-- Guest song requests routed to the DJ. The DJ screen accepts or rejects each;
-- the guest is texted the outcome.
CREATE TABLE IF NOT EXISTS song_requests (
  id             TEXT PRIMARY KEY,
  event_id       TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  raw_text       TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'requested',
  created_at     TEXT NOT NULL,
  decided_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON song_requests(event_id, status);

-- Atomic per-event counters. Incremented inside the check-in transaction so each
-- guest gets a distinct round-robin index: gem/word assignment stays even and
-- race-free even when many guests check in at the same instant.
CREATE TABLE IF NOT EXISTS counters (
  event_id  TEXT NOT NULL,
  kind      TEXT NOT NULL,
  value     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, kind)
);
`;
