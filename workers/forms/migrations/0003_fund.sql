-- "Fund the Next Film" (movietrailer.channel/fund-the-next-film), added 31 Oct 2026.
-- Shared D1 database site-factory-forms; every table is keyed by brand like the others.
-- (The older `votes` table is anonymous poll counts, so film votes live in `fund_votes`.)

-- One row per brand + email. A vote only counts once confirmed_at is set (double opt-in).
CREATE TABLE IF NOT EXISTS supporters (
  brand           TEXT NOT NULL,
  email           TEXT NOT NULL,
  consented_at    TEXT,                 -- ticked "Send me funding updates" (optional). NULL = no update emails
  confirmed_at    TEXT,                 -- clicked the confirmation link
  source          TEXT,                 -- page they voted on
  credits         INTEGER NOT NULL DEFAULT 0, -- running total; every change is a row in credit_ledger
  founding        INTEGER NOT NULL DEFAULT 0, -- 1 = Founding Supporter
  confirm_token   TEXT,                 -- cleared once used
  token_sent_at   TEXT,
  unsubscribed_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (brand, email)
);

-- One vote per brand + email.
CREATE TABLE IF NOT EXISTS fund_votes (
  brand    TEXT NOT NULL,
  email    TEXT NOT NULL,
  concept  TEXT NOT NULL,
  voted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (brand, email)
);
CREATE INDEX IF NOT EXISTS fund_votes_concept ON fund_votes (brand, concept);

-- Credits ledger: every credit given or taken, with the reason. Credits have no cash value.
-- RULE: never award credits for Amazon or other affiliate clicks or purchases (Amazon Associates terms).
-- Allowed reasons are listed in src/worker/site.ts (CREDIT_REASONS).
CREATE TABLE IF NOT EXISTS credit_ledger (
  id         TEXT PRIMARY KEY,
  brand      TEXT NOT NULL,
  email      TEXT NOT NULL,
  amount     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS credit_ledger_email ON credit_ledger (brand, email);
