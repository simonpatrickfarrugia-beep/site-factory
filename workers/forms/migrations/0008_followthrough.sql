-- Outreach follow-through (4 Nov 2026): give first, one follow-up, reply triage. See claude/OUTREACH.md.

-- Give first: organisations we feature on one of our pages before (or as) we email them.
-- The brand's site Worker serves them at /api/featured?path=… and every page shows its own list.
CREATE TABLE IF NOT EXISTS featured (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER REFERENCES orgs(id),
  brand TEXT NOT NULL,
  path TEXT NOT NULL,             -- our page, e.g. /daylesford
  name TEXT NOT NULL,             -- shown as the link text
  url TEXT NOT NULL,              -- their website
  blurb TEXT,                     -- optional one line, e.g. "Maps, bookings and local advice"
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  removed_at TEXT
);
CREATE INDEX IF NOT EXISTS featured_page ON featured (brand, path);
CREATE UNIQUE INDEX IF NOT EXISTS featured_org_path ON featured (org_id, path);

-- Reply triage, set by the imn-mail Worker on incoming email:
--   optout (contact opted out automatically) | auto (out of office, bounces) | positive (sounds like a yes) | reply (needs an answer)
ALTER TABLE messages ADD COLUMN triage TEXT;
ALTER TABLE messages ADD COLUMN handled_at TEXT;  -- answered (an email went back to them) or ticked off in IMN HQ
