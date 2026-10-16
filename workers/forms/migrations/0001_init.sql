-- Form submissions for every brand. One row per submission.
CREATE TABLE IF NOT EXISTS submissions (
  id         TEXT PRIMARY KEY,
  brand      TEXT NOT NULL,
  form       TEXT NOT NULL,
  data       TEXT NOT NULL,            -- JSON object of the submitted fields
  page       TEXT,                     -- page the form was sent from
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS submissions_brand_form ON submissions (brand, form, created_at);

-- Lightweight votes (e.g. "Would you watch this?" on trailer pages).
-- One row per item per answer; counts only, no personal data.
CREATE TABLE IF NOT EXISTS votes (
  brand  TEXT NOT NULL,
  item   TEXT NOT NULL,
  answer TEXT NOT NULL,
  count  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (brand, item, answer)
);
