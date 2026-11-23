-- Public social proof on the trailers swipe feed (/watch, 24 Nov 2026): likes, reactions, "my list" saves and comments.
-- Written by the site Worker (src/worker/social.ts); comments are moderated in IMN HQ → Today → "Comments to check".
--
-- film_votes: one row per brand · film · kind · anonymous viewer. kind = like | list | react (value = the emoji).
--   voter: a random id the browser makes and keeps in localStorage (no account, no cookie, nothing personal).
--   net: SHA-256 of the viewer's network (IPv4 /24, IPv6 /48), cut to 16 hex characters. Used only for rate limits.
--   Un-liking deletes the viewer's own row: counts are always COUNT(*) of real rows, never a stored number.
CREATE TABLE IF NOT EXISTS film_votes (
  brand TEXT NOT NULL,
  film TEXT NOT NULL,
  kind TEXT NOT NULL,
  voter TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  net TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (brand, film, kind, voter)
);
CREATE INDEX IF NOT EXISTS film_votes_film ON film_votes (brand, film, kind);
CREATE INDEX IF NOT EXISTS film_votes_net ON film_votes (net, created_at);

-- comments: status = live (shown) | held (waiting for Simon) | spam (auto-filtered, never shown) | hidden (removed by Simon).
--   score + reasons: what the spam filter saw, so Simon can see why something was held.
--   Rows are never deleted by code; hiding a comment only changes its status.
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL,
  film TEXT NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  reasons TEXT NOT NULL DEFAULT '',
  voter TEXT NOT NULL DEFAULT '',
  net TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  moderated_at TEXT
);
CREATE INDEX IF NOT EXISTS comments_film ON comments (brand, film, status, created_at);
CREATE INDEX IF NOT EXISTS comments_status ON comments (status, created_at);
CREATE INDEX IF NOT EXISTS comments_net ON comments (net, created_at);
