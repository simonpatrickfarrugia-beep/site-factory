-- Affiliate programme status tracker (IMN HQ → Affiliates). Seeded from hq/affiliate-programs.json
-- on 2 Nov 2026; status is kept here from now on. No logins, tax or bank details: only public IDs.
CREATE TABLE IF NOT EXISTS affiliates (
  id TEXT PRIMARY KEY,               -- programme id (matches hq/affiliate-programs.json where it exists)
  name TEXT NOT NULL,
  network TEXT,
  brands TEXT,                       -- comma list of brand keys it's for (vic, trailers, ...), or "ideas"
  status TEXT NOT NULL DEFAULT 'not-applied',  -- not-applied | applied | approved | rejected | paused
  applied_at TEXT,
  decided_at TEXT,
  live TEXT,                         -- where it's live on our sites (empty = approved but not wired yet)
  ids TEXT,                          -- public partner / tracking IDs only
  commission TEXT,
  signup_url TEXT,
  note TEXT,
  next_step TEXT,
  follow_up_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE TABLE IF NOT EXISTS affiliate_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id TEXT NOT NULL REFERENCES affiliates(id),
  status TEXT,
  note TEXT,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS affiliate_events_aff ON affiliate_events (affiliate_id, at);
