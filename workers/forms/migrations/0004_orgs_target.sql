-- Links an organisation to a prospecting target (segment:region from hq/prospect-targets.json),
-- so IMN HQ can show coverage per target and rank where to prospect next.
ALTER TABLE orgs ADD COLUMN target TEXT;
CREATE INDEX IF NOT EXISTS orgs_target ON orgs (brand, target);
