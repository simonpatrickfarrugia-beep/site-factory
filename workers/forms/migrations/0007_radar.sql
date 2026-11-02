-- IMN Radar: a daily feed of researched prospects in IMN HQ (inspired by Simon's FCBT Radar).
-- A Claude scheduled task researches ~5 organisations each weekday morning and inserts them with
-- found_by = 'radar'; Simon reviews them in HQ → Today (draft / not a fit / later).
ALTER TABLE orgs ADD COLUMN found_by TEXT;      -- 'radar' (scheduled research), 'board' (added in HQ), NULL (older rows)
ALTER TABLE orgs ADD COLUMN score INTEGER;      -- Radar fit score 0-100
ALTER TABLE orgs ADD COLUMN why TEXT;           -- why this organisation, now
ALTER TABLE orgs ADD COLUMN opener TEXT;        -- suggested personal first line
ALTER TABLE orgs ADD COLUMN source_url TEXT;    -- where the published email was found
ALTER TABLE orgs ADD COLUMN reviewed_at TEXT;   -- when Simon actioned it in Today
ALTER TABLE orgs ADD COLUMN snooze_until TEXT;  -- "Later": hidden from Today until this date
ALTER TABLE orgs ADD COLUMN review TEXT;        -- drafted | not_fit | no_email | already | later
CREATE INDEX IF NOT EXISTS orgs_queue ON orgs (found_by, reviewed_at);

-- Small key/value store: radar_targets (written by imn-hq's daily cron), radar_playbook
-- (rewritten by the research task), radar_coaching (Simon's standing rules), radar_last_run.
CREATE TABLE IF NOT EXISTS hq_kv (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
