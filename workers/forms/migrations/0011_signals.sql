-- Buying signals for IMN Radar prospects (7 Nov 2026), like FCBT Radar. See hq/prospect-playbook.json "_signals".
ALTER TABLE orgs ADD COLUMN signals TEXT;       -- JSON array of short chips, e.g. ["Season in 5 weeks","No trailers on program"]
ALTER TABLE orgs ADD COLUMN why_now TEXT;       -- the trigger in one sentence
ALTER TABLE orgs ADD COLUMN trigger_date TEXT;  -- YYYY-MM-DD of the trigger, or 'evergreen'
ALTER TABLE orgs ADD COLUMN gap TEXT;           -- what's missing on their site that we fix
ALTER TABLE orgs ADD COLUMN proof TEXT;         -- our numbers / look-alikes
ALTER TABLE orgs ADD COLUMN ask TEXT;           -- widget | link
ALTER TABLE orgs ADD COLUMN widget_url TEXT;    -- personalised widget builder link (fills {widget} in the email)
