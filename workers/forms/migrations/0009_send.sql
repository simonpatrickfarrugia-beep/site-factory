-- One-click send from IMN HQ (7 Nov 2026). See claude/OUTREACH.md "One-click send".

-- Radar writes the whole first email overnight; HQ opens it ready to review and send.
ALTER TABLE orgs ADD COLUMN draft_subject TEXT;
ALTER TABLE orgs ADD COLUMN draft_body TEXT;

-- Every email HQ sends through Microsoft Graph. Drives the warm-up ramp (first emails per day).
CREATE TABLE IF NOT EXISTS sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER, brand TEXT NOT NULL, to_email TEXT NOT NULL, subject TEXT,
  kind TEXT NOT NULL,                 -- first | followup
  day TEXT NOT NULL,                  -- Melbourne date, YYYY-MM-DD
  sent_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS sends_day ON sends (day, kind);
