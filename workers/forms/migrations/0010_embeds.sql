-- Widget engine (7 Nov 2026): usage of embedded widgets on other sites. One row per Melbourne day · brand ·
-- widget · embed id · host site · event (view | play | click) · item, with a running count. Written by each
-- brand's site Worker (POST /api/embed); read by IMN HQ and Claude for "your widget was played N times" reports.
CREATE TABLE IF NOT EXISTS embed_events (
  day TEXT NOT NULL,
  brand TEXT NOT NULL,
  widget TEXT NOT NULL,
  embed_id TEXT NOT NULL,
  host TEXT NOT NULL,
  event TEXT NOT NULL,
  item TEXT NOT NULL DEFAULT '',
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, brand, widget, embed_id, host, event, item)
);
CREATE INDEX IF NOT EXISTS embed_events_embed ON embed_events (brand, embed_id, day);
