-- Text-to-book-a-call (IMN HQ → Today → "Text to book a call", 22 Nov 2026).
-- For prospects whose only published contact is a business phone number (no email). Simon sends every text himself
-- from his own phone (HQ opens Messages with the text filled in); HQ only records what happened.
-- phone: the number exactly as the business publishes it (Google listing, its own Facebook/Instagram).
-- phone_source: the page showing it. texted_at: when Simon marked the first text sent.
-- sms_opted_out_at: they replied STOP (or asked not to be texted): never text or call them again, any brand.
ALTER TABLE orgs ADD COLUMN phone TEXT;
ALTER TABLE orgs ADD COLUMN phone_source TEXT;
ALTER TABLE orgs ADD COLUMN texted_at TEXT;
ALTER TABLE orgs ADD COLUMN sms_opted_out_at TEXT;
