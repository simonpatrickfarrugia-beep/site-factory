-- IMN HQ pipeline: email text in the CRM, editable email templates with versions,
-- which template each organisation got, daily link checks and page performance snapshots.
ALTER TABLE messages ADD COLUMN body TEXT;          -- reply text without the quoted thread (max ~6,000 chars)
ALTER TABLE orgs ADD COLUMN template_id INTEGER;   -- templates.id used for the first email (NULL = built-in default)
ALTER TABLE orgs ADD COLUMN checked_at TEXT;       -- last automatic link check of evidence_url

CREATE TABLE IF NOT EXISTS templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL,
  segment TEXT NOT NULL,          -- playbook segment key, e.g. visitor-centre
  version INTEGER NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  note TEXT,                      -- what changed in this version
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS templates_seg ON templates (brand, segment, version);

-- One row per linked page per day: our page's 28-day numbers from the site's stats.json.
CREATE TABLE IF NOT EXISTS page_metrics (
  url TEXT NOT NULL,
  brand TEXT NOT NULL,
  day TEXT NOT NULL,
  views INTEGER,
  impressions INTEGER,
  clicks INTEGER,
  position REAL,
  PRIMARY KEY (url, day)
);
