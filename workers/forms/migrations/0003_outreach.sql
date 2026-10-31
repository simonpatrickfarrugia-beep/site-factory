-- Outreach CRM (IMN HQ). Shared database site-factory-forms. See claude/OUTREACH.md.
-- Stages: found → drafted → sent → replied → linked | won | no

CREATE TABLE IF NOT EXISTS orgs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL,            -- vic | trailers | paycalc | trade-admin | community-help-co
  name TEXT NOT NULL,
  type TEXT,                      -- tourism association, library, TAFE, trade association...
  website TEXT,
  evidence_url TEXT,              -- page where they already link to outside resources (weekly link check reads it)
  region TEXT,
  notes TEXT,
  stage TEXT NOT NULL DEFAULT 'found',
  next_step TEXT,
  stage_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS orgs_brand_stage ON orgs (brand, stage);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES orgs(id),
  name TEXT,
  role TEXT,
  email TEXT NOT NULL,            -- only addresses the organisation publishes itself
  source_url TEXT,                -- where the address is published
  opted_out_at TEXT,              -- set when they reply "no thanks"; never contacted again by any brand
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS contacts_email ON contacts (email);

CREATE TABLE IF NOT EXISTS touches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES orgs(id),
  contact_id INTEGER REFERENCES contacts(id),
  brand TEXT NOT NULL,
  stage TEXT NOT NULL,
  channel TEXT,                   -- email | phone | form | auto
  subject TEXT,
  note TEXT,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS touches_org ON touches (org_id, at);

-- Written by the imn-mail Email Worker: every message to or from a hub address.
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT,
  direction TEXT NOT NULL,        -- in | out
  mail_from TEXT,
  mail_to TEXT,
  subject TEXT,
  message_id TEXT,
  thread TEXT,
  contact_id INTEGER REFERENCES contacts(id),
  org_id INTEGER REFERENCES orgs(id),
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS messages_at ON messages (at);
CREATE UNIQUE INDEX IF NOT EXISTS messages_msgid ON messages (message_id, direction);

CREATE TABLE IF NOT EXISTS links_won (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES orgs(id),
  brand TEXT NOT NULL,
  page_url TEXT NOT NULL,
  our_url TEXT,
  first_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  last_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS links_won_page ON links_won (org_id, page_url);
