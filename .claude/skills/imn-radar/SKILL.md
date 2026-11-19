---
name: imn-radar
description: IMN Radar — find real organisations that could embed an IMN widget or link to an IMN site, verify why them and why now, draft the first email, and queue it in IMN HQ for Simon to review. Run by the weekday 07:34 Melbourne scheduled task, or when Simon asks for more Radar prospects.
---

# IMN Radar

Each weekday, research a few real organisations that could embed one of Simon's free widgets or link to his sites, work out
WHY THEM and WHY NOW (buying signals), write the first email to each, and put them in IMN HQ. Simon reviews and sends every email
himself. You never send or schedule email; you only write to the database. Follow `CLAUDE.md`.

Brands: Vic Tours (victours.com.au, town-by-town Victoria travel guide), Community Help Co (communityhelp.com.au, free resume /
cover letter / job tools plus 1:1 goal mentoring), MovieTrailer.Channel (www.movietrailer.channel, classic film trailers and where to
watch; free embeddable Trailer reel widget), Trade Admin (tradeadmin.com.au, independent job-management software guides for tradies),
MyPayCalc (mypaycalc.com.au, Australian take-home pay, HECS and mortgage calculators).

Data: Cloudflare D1 (see `CLAUDE.md`), via the Cloudflare D1 query tool.

## Hard rules
- Organisations only. Only email addresses the organisation publishes on its own website (general inbox or role address best).
  Record the exact page. Never guess or construct an address; never use personal addresses from LinkedIn or directories.
- Real organisations checked on their own website (exists, right place, still operating). Never invent anything.
- Every trigger verified on the source page with its real date. Listing/archive pages often show TODAY's date in the header; that
  is not the event date. Past events don't count as "why now" (see re-surfacing).
- Skip anyone already in the database (compare name, website domain and email loosely across ALL brands), any email in contacts with
  `opted_out_at`, and organisations whose page already links to the brand's domain.
- Only INSERT into orgs, contacts, touches; and upsert hq_kv keys `radar_playbook` and `radar_last_run`. Never UPDATE or DELETE anything else. In the repo, only `hq/runs.json` (run log).

## Step 1 — Read
- Playbook: `hq/prospect-playbook.json` (`_signals` = the method; per brand `ask`, `signals` with points and where to look, gaps, proof, chips).
- `SELECT k, v FROM hq_kv WHERE k IN ('radar_targets','radar_playbook','radar_coaching')`
  - radar_targets = {brands:[{brand, name, site, leftThisWeek, targets:[{key, segment, region, score, why, offer?, evidence?, search, page}]}]}
  - radar_coaching = [{text, at}]: Simon's standing rules. Treat them as hard rules for choosing, scoring and writing.
- Queue: `SELECT COUNT(*) FROM orgs WHERE found_by='radar' AND reviewed_at IS NULL AND (snooze_until IS NULL OR snooze_until <= strftime('%Y-%m-%dT%H:%M:%SZ','now'))`
- Ramp: `SELECT MIN(day) AS first FROM sends` (Melbourne dates; NULL = nothing sent yet)
- Waiting on Simon: `SELECT COUNT(*) FROM orgs WHERE found_by='radar' AND stage='drafted'` (liked, not yet sent) and follow-ups due:
  `SELECT COUNT(*) FROM orgs o WHERE o.stage='sent' AND o.stage_at <= strftime('%Y-%m-%dT%H:%M:%SZ','now','-7 days') AND NOT EXISTS (SELECT 1 FROM sends s WHERE s.org_id=o.id AND s.kind='followup')`
- Dedupe: `SELECT o.id, o.brand, o.name, o.website, c.email, c.opted_out_at FROM orgs o LEFT JOIN contacts c ON c.org_id = o.id`
- Outcomes: `SELECT o.brand, o.target, o.name, o.type, o.region, o.score, o.review, o.stage, o.signals, o.trigger_date, o.ask, (SELECT group_concat(note, ' | ') FROM touches t WHERE t.org_id = o.id AND t.channel IN ('radar','note','board')) AS notes FROM orgs o WHERE o.found_by='radar' AND (o.reviewed_at IS NOT NULL OR o.stage IN ('sent','replied','linked','won','no'))`
  review = drafted (liked) / not_fit / no_email / already (dropped, reason in notes) / later. Stage replied / linked / won = the real win.
- Winning emails: `SELECT o.brand, o.target, o.stage, o.signals, o.draft_subject, o.draft_body FROM orgs o WHERE o.found_by='radar' AND o.draft_body IS NOT NULL AND o.stage IN ('replied','linked','won') LIMIT 20`
- Widget usage: `SELECT brand, widget, COUNT(DISTINCT host) AS sites, SUM(n) AS events FROM embed_events GROUP BY brand, widget`

## Step 2 — Learn (every run)
Compare outcomes by brand, organisation type (target before ':'), region, score band, ask and SIGNAL. Upsert `radar_playbook`:
`INSERT INTO hq_kv (k, v) VALUES ('radar_playbook', ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`
v = JSON {updatedAt, basedOn {found, drafted, dropped, replied, linked}, favour [3-6], avoid [3-6], signals [2-5], summary (2-3 sentences), changes (one line)}.
Only claim what the data supports; with little data, say so.
- Judge by what happened after the send, not by whether Simon liked the draft: linked/won > replied > sent > drafted. A segment
  Simon likes but that never gets replies is not a "favour" yet.
- Every favour/avoid line states its sample, e.g. "neighbourhood houses: 3 of 5 drafted, 0 of 2 replied". Under 10 at the step
  the line is about, start it with "Hunch:". Don't move a segment to avoid on fewer than 5 drops.
- Compare dated triggers with evergreen fits once each has 5+ sends; until then keep both (the first link won was evergreen).

## Step 3 — Top up the queue
Queue size follows the warm-up ramp: day = days since `first` + 1 (day 1 if NULL). Days 1-7: 5. Days 8-14: 10. From day 15: 10 per brand
with `leftThisWeek` > 0, capped at 25. Needed = size − queue count. If Needed <= 0, go to step 4.
IMN FIRST (Simon, 19 Nov 2026: "prioritise IMN"; target 3 paying IMN clients by 31 Dec): IMN is always filled first. Before day 15,
IMN may take the WHOLE day's size (no per-brand cap for IMN); other brands only get what IMN leaves. From day 15, IMN gets its full 10
before any other brand is topped up. If IMN runs out of verified finds (3 dead ends in every region), give the leftover to other brands.
PACE TO SIMON, PER BRAND: prospects are only worth something once sent. Count unsent liked drafts and due follow-ups for EACH brand.
A brand with 5+ unsent liked drafts or 3+ follow-ups due gets at most 2 new prospects this run (strongest, dated triggers only);
other brands are not slowed by it. Say who was paced and why in radar_last_run's note, e.g. "paced CHC: 12 drafts waiting to send".
Pick targets from radar_targets: IMN first, then highest score first, skip brands with leftThisWeek <= 0, max 3 per non-IMN brand per
run before day 15, applying playbook and coaching. For each target find ONE real organisation of that type in that region (start from its search phrases
and the brand's trigger "look" hints; WebSearch, then WebFetch their own pages). Find:
- FIT, TRIGGER (best dated trigger from the brand's signals, verified; prefer 0-8 weeks away; strong evergreen fits allowed with a lower score),
  GAP (from the brand's gaps list, checked on the page), PROOF (brand's proof list, real numbers only, e.g. Vic `pages[].gscImpressions`
  in `data/vic/stats.json` for that path; widget usage from embed_events), EVIDENCE PAGE (where the widget or link would go),
  and a published email (and its page).
SCORE 0-100 = fit (0-60) + trigger (its points if 0-8 weeks away, half if 8-10, 0 if evergreen) + gaps (max 20) + proof (max 10).
Quality over quantity: skip weak or unverifiable finds.
DEAD ENDS: if an organisation has no website of its own, no published email, or no page that links out, don't stop: try the brand's
next target in the same region (another segment), then the next region. Only end a brand empty-handed after 3 dead ends,
and name them in radar_last_run's note.
RE-SURFACE: strong fit but trigger 10+ weeks away, or just passed with the next date published or clearly recurring → add with
trigger_date = next date and snooze_until = 6 weeks before it (ISO). Snoozed adds don't count toward Needed.

**The ask** (brand's `ask`):
- `widget` (MovieTrailer.Channel): lead with a free Trailer reel made for them. Fetch https://www.movietrailer.channel/embed/trailer-reel.json
  (widget.items[].id = film slugs, widget.groups[] = collections). Films from their program in items → `items=<slugs>` (up to 8);
  otherwise the best collection `g=<group id>`. widget_url = `https://www.movietrailer.channel/widgets?for=<org, URL-encoded>&title=<short heading, URL-encoded>&items=...` (or `&g=...`)`&id=<org-slug>`.
  Never claim films are in their program unless you saw them on their page.
- `link`: ask for a link from their evidence page.
- `preview` (Independent Media Network, brand `imn`, added 17 Nov 2026): **sales outreach, not link building.** Find a real local
  small business in the target region whose web presence has a gap from IMN's `gaps` list, verified by looking (open the Google
  listing's Website button, the link, the site at phone width). Offer a free preview of a simple site built from what they already
  publish; if they like it, $99 + GST a month, no setup fee, no lock-in. Never build the preview before they say yes.
  - Email: only one the business publishes itself (its own site, Facebook/Instagram About, Google listing, a directory listing it
    manages). Never a staff member's personal address, never guessed. Skip chains, franchises and businesses with a decent modern site.
  - Gap wording is kind and factual ("your Google listing doesn't link to a website yet", "the website link on your Google listing
    goes to a page that no longer works"). Never mock their current site; never promise rankings, leads, calls or revenue.
  - No website is the point for IMN, so "no website of its own" is NOT a dead end here; no published email is.
  - evidence_url = the page showing the gap (their Google Maps link or site); source_url = the page with the email; ask = 'preview'.
  - MIX (18 Nov, Simon: "don't just do tradies"): spread IMN picks across industries. Never more than 1 of any 3 IMN picks from
    trades/trade-adjacent; rotate through hospitality, beauty, retail, fitness, creative, auto and personal. Non-trade picks use
    https://imnetwork.com.au/pricing as {page}.
  - Gap priority (17 Nov): a dead website link on their Google listing (old business.site page, switched off by Google in 2024) or
    no website with 20+ Google reviews beat everything else. Check by tapping the listing's Website button.
  - {page}: for plumbers, electricians and landscapers write the trade page instead (https://imnetwork.com.au/plumber-websites,
    /electrician-websites, /landscaping-websites); other trades keep /websites-for-tradies. Skip registered health practitioners.
  - Template `*` in templates.ts already carries the price line; replace its "noticed..." sentence with the verified gap and lead
    with the trigger when there is one. Keep the price, "no lock-in contract" and the question at the end.

**The email** (under ~130 words, plain, warm, Australian English, no hype, no exclamation marks, nothing unbacked):
- Start from `SELECT subject, body FROM templates WHERE brand = ? AND segment = ? ORDER BY version DESC LIMIT 1`; if none, the built-in
  one in `workers/hq/src/templates.ts` (T: brand → segment key, or '*').
- Open with the trigger in one natural sentence, name the gap gently, then the offer. Widget: "I've made you a free trailer reel for
  <season/page> — here's a preview: {widget}", one line of code, updates itself, no cost; then one line offering a simple link instead.
- KEEP placeholders exactly ({first_name} {organisation} {region} {page} {site} {widget}). Keep "Thanks," and
  `Reply "no thanks" and I won't contact you again.` exactly. No name, signature or Give-first sentence (HQ adds them).

**Insert** each one:
1. `INSERT INTO orgs (brand, name, type, website, evidence_url, region, target, stage, found_by, score, why, opener, source_url, notes, draft_subject, draft_body, signals, why_now, trigger_date, gap, proof, ask, widget_url, snooze_until) VALUES (?, ?, ?, ?, ?, ?, ?, 'found', 'radar', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
   type = segment label; region = region label; target = target key exactly; why = one specific sentence; opener = the email's first
   sentence; source_url = page with the email; notes = two short lines, "Verified: <facts you saw> (<url>)" and
   "Assumed: <your inferences>", so Simon can tell evidence from guesswork; signals = JSON array of 2-5 chips; why_now = trigger + source; trigger_date = YYYY-MM-DD or
   'evergreen'; gap = one sentence; proof = one sentence or NULL; ask = 'widget'|'link'|'preview'; widget_url or NULL; snooze_until or NULL.
2. `INSERT INTO contacts (org_id, name, role, email, source_url) VALUES (?, ?, ?, ?, ?)` (name/role only if published next to the address)
3. `INSERT INTO touches (org_id, brand, stage, channel, note) VALUES (?, ?, 'found', 'radar', ?)` note = "Radar: " + why now (+ " · snoozed to <date>")

## Step 4 — Record the run
Upsert `radar_last_run` the same way with v = JSON {at, added, snoozed, note ("3 Vic, 2 trailers, 1 snoozed to Feb")}.

## Log the run (always, even if something failed)
`python3 scripts/hq/log_run.py imn-radar ok "<one-line summary>"` (use `fail` and say why if a step failed), commit
`HQ: imn-radar run [skip ci]`, push. The daily health check flags this worker if the log goes stale.

## Step 5 — Summary for Simon (3 lines)
Added and snoozed (by brand), the hottest one (score, why now, gap), the biggest playbook change. If anything is waiting on Simon,
lead with it: "First: send the N drafts waiting and the N follow-ups due" (sending beats finding).
He reviews and sends at https://imn-hq.simonpatrickfarrugia.workers.dev (Today → Review & send).
