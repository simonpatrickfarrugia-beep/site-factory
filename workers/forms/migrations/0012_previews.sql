-- IMN website previews (17 Nov 2026). A private preview of a prospect's new site, served by the imn Worker at
-- https://imnetwork.com.au/preview/<slug> (noindex, unguessable suffix). Client details live only here, never in the public repo.
-- Written and updated only by the imn-preview skill (.claude/skills/imn-preview/SKILL.md); views counted by src/worker/preview.ts.
CREATE TABLE IF NOT EXISTS previews (
  slug TEXT PRIMARY KEY,            -- e.g. werribee-plumbing-k7f2 (business name + 4 random chars)
  org_id INTEGER,                   -- orgs.id when it came from outreach, else NULL
  business TEXT NOT NULL,
  data TEXT NOT NULL,               -- JSON, see PreviewData in src/worker/preview.ts
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | sent | free | won | lost (free/won also serve /site/<slug>, 20 Nov 2026)
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,         -- ISO; after this the page says it has expired (unless status = won)
  views INTEGER NOT NULL DEFAULT 0,
  first_viewed_at TEXT,
  last_viewed_at TEXT
);
CREATE INDEX IF NOT EXISTS previews_org ON previews(org_id);
