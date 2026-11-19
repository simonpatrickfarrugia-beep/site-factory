-- Community Help Co Check-in: its own D1 database (chc-checkin), kept apart from the public sites' forms data.
-- Privacy rule: first name + email, reminders, goal text, ticks and messages only.
-- No health or diagnosis info, NDIS numbers or addresses. All times are Unix milliseconds (UTC).

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'active',          -- active | paused
  tz TEXT NOT NULL DEFAULT 'Australia/Melbourne',
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  last_email_notice_at INTEGER                    -- throttle for "new message" emails
);

-- Magic links + 6-digit codes. Only hashes are stored.
CREATE TABLE IF NOT EXISTS login_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE,
  role TEXT NOT NULL,                             -- admin | client
  client_id INTEGER,
  token_hash TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS login_requests_email ON login_requests (email, created_at);

CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  client_id INTEGER,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,                             -- admin | client
  client_id INTEGER,                              -- null for admin
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device TEXT,
  created_at INTEGER NOT NULL,
  last_ok_at INTEGER,
  fail_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS push_subs_client ON push_subs (role, client_id);

-- Weekly goals. week_start = Monday (YYYY-MM-DD, client's time zone).
-- source/external_ref leave room for syncing from the goals spreadsheet later.
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  week_start TEXT NOT NULL,
  text TEXT NOT NULL,
  target INTEGER NOT NULL DEFAULT 1,              -- e.g. 3 for "Showered 3 times"
  count INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  external_ref TEXT,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS goals_week ON goals (client_id, week_start);

CREATE TABLE IF NOT EXISTS goal_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  via TEXT NOT NULL,                              -- tap | reminder | admin
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS goal_events_goal ON goal_events (goal_id);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  goal_id INTEGER,
  message TEXT NOT NULL,
  kind TEXT NOT NULL,                             -- once | daily | weekdays | weekly
  days TEXT NOT NULL DEFAULT '',                  -- ISO weekdays "1,3,5" (1 = Monday)
  time_local TEXT NOT NULL,                       -- "11:00"
  tz TEXT NOT NULL DEFAULT 'Australia/Melbourne',
  start_date TEXT NOT NULL,
  end_date TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  next_run_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reminders_due ON reminders (enabled, next_run_at);

CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id INTEGER,
  client_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  local_date TEXT NOT NULL,
  due_at INTEGER NOT NULL,
  sent_at INTEGER,
  channel TEXT,                                   -- push | email | none | test
  opened_at INTEGER,
  status TEXT,                                    -- done | not_today
  note TEXT,
  responded_at INTEGER,
  goal_credit_id INTEGER                          -- goal ticked by this Done (undone if changed)
);
CREATE INDEX IF NOT EXISTS deliveries_client ON deliveries (client_id, local_date);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  sender TEXT NOT NULL,                           -- admin | client
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER
);
CREATE INDEX IF NOT EXISTS messages_client ON messages (client_id, created_at);

-- App settings the Worker makes for itself (VAPID keys, link-signing key, throttles).
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Later (not built yet): journal_entries (client_id, local_date, body, created_at) for the daily journal,
-- and quarterly AI summaries on top of it. Add as migration 0002 when it's built.
