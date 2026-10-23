-- Email list signups for every brand (POST /api/subscribe on each site). One row per brand + email.
CREATE TABLE IF NOT EXISTS subscribers (
  brand           TEXT NOT NULL,
  email           TEXT NOT NULL,
  source          TEXT,                 -- page they signed up on
  interests       TEXT,                 -- optional, comma separated
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  unsubscribed_at TEXT,
  PRIMARY KEY (brand, email)
);
