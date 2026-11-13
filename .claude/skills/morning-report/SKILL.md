---
name: morning-report
description: Simon's one daily morning report (sites, Radar queue, day-job call list, today's one thing). Run by the daily 08:56 Melbourne scheduled task, or when Simon asks for the morning report.
---

# Morning report

Simon's ONLY daily ping from Claude, so it replaces separate notifications. One phone screen.
Follow `CLAUDE.md`. The only repo changes allowed here: recording a milestone (step 0), refreshing `hq/outreach.json` (below) and logging the run (last step).

## Data
- Stats per site: `data/{trailers,vic,community-help-co,trade-admin,paycalc}/stats.json`
  (generatedAt; totals {views, prevViews, users, cta, gscClicks, gscImpressions}; daily [{date, views, cta}]; pages). Skip a missing file.
- Money clicks: the CTA keys listed in `CLAUDE.md`.
- `hq/portfolio.json` (nodes[] with launched + target90 {views, moneyClicks}; todo[]), `hq/finance.json`, `hq/milestones.json`.
- `leads/latest.md`: today's business-travel call list for Simon's day job.
- D1, read-only (SELECT only, values via params):
  - New forms, last 24 h: `SELECT brand, form, COUNT(*) n FROM submissions WHERE created_at > ? GROUP BY brand, form`.
    `tradify-trial` = a tradie wants a Tradify trial (Simon sets it up in Tradify's Partner Portal); `enquiry`/`referral` = CHC; `admin-help`/`pitch` = interest forms. Ignore `plan-email`.
  - Tradify trials since the push started: `SELECT COUNT(*) n FROM submissions WHERE brand='trade-admin' AND form='tradify-trial' AND created_at > '2026-11-05T11:00:00Z'`
  - Radar waiting: `SELECT brand, COUNT(*) n FROM orgs WHERE found_by='radar' AND reviewed_at IS NULL AND (snooze_until IS NULL OR snooze_until <= strftime('%Y-%m-%dT%H:%M:%SZ','now')) GROUP BY brand`;
    top one: `SELECT brand, name, why, score FROM orgs WHERE found_by='radar' AND reviewed_at IS NULL ORDER BY score DESC LIMIT 1`
  - Outreach replies, last 24 h: `SELECT brand, mail_from, subject FROM messages WHERE direction='in' AND at > ?`


## Refresh the HQ outreach funnel (before the report)
IMN HQ's Growth funnel, Bottlenecks and Brand pipeline read `hq/outreach.json`. Run these read-only queries, then rewrite
`brands` in that file (keep `_note`, set `asOf` to now in UTC). Every brand in `hq/prospect-targets.json` gets an entry (zeros if none).
- Funnel per brand ("ever reached" counts):
  `WITH t AS (SELECT id oid, stage s FROM orgs UNION ALL SELECT org_id, stage FROM touches), r AS (SELECT o.id, o.brand, o.stage, o.stage_at, MAX(CASE t.s WHEN 'drafted' THEN 1 WHEN 'sent' THEN 2 WHEN 'replied' THEN 3 WHEN 'linked' THEN 4 WHEN 'won' THEN 5 ELSE 0 END) best FROM orgs o JOIN t ON t.oid = o.id GROUP BY o.id) SELECT brand, COUNT(*) found, SUM(best>=1) drafted, SUM(best>=2) sent, SUM(best>=3) replied, SUM(best>=4) linked, SUM(stage='drafted') waiting, SUM(stage='dropped') dropped, MIN(CASE WHEN stage='drafted' THEN stage_at END) oldest_waiting, (SELECT MAX(at) FROM touches x WHERE x.brand=r.brand AND x.stage='sent') last_sent, (SELECT COUNT(*) FROM messages m WHERE m.brand=r.brand AND m.direction='in') mail_in, (SELECT COUNT(*) FROM messages m WHERE m.brand=r.brand AND m.direction='out') mail_out FROM r GROUP BY brand`
- Sent in the last 7 days: `SELECT brand, COUNT(DISTINCT org_id) n FROM touches WHERE stage='sent' AND at > ? GROUP BY brand` (param: now minus 7 days).
Map columns to keys: found, drafted, sent, replied, linked, waiting, dropped, oldestWaiting, lastSent, sent7, mailIn, mailOut.
Commit with the milestone/log commit (`[skip ci]` is NOT used for this file: HQ must rebuild to show it), message `HQ: outreach snapshot`.

## Report
0. **New milestone** (not already in `hq/milestones.json` `hit`): lead with it. Counts: first money click per site, first Google click per site,
   best day ever once a site has 7+ days of data, daily visits crossing 10/50/100/500/1,000, 28-day visits crossing 1,000/5,000/10,000,
   first revenue, first Tradify trial request, first Fergus trial click. Append `{"date","site","what"}` to `hit`, commit
   `HQ: milestone <what> [skip ci]`, push.
1. **🔔 Needs you** (only if something is waiting): Tradify trial requests ("set up in the Partner Portal"), CHC enquiries, outreach replies (who, which brand).
2. **🛠️ Trade Admin push** (5 Nov – 5 Dec 2026; drop after 5 Dec): "Day X of 30 · trials requested N · Fergus trial clicks N (28 days) · boss fight: first trial through your link by 5 Dec".
   If both are 0 after day 10, one short nudge (e.g. "Traffic is the blocker: review the Radar picks today").
3. **📨 Radar**: N prospects waiting (by brand) + the top one in a few words. https://imn-hq.simonpatrickfarrugia.workers.dev
4. **📊 Sites**: one line each: yesterday's visits vs 7-day average, money clicks yesterday, 28-day visits with % vs prevViews,
   and for sites with target90 "day X of 90, Y% of visit target". If generatedAt is 30+ hours old: "Stats didn't refresh".
   **Where from** (from `traffic`, when present): for any site with a visits spike yesterday, name the source behind it from
   `traffic.daily`; and once a week (Mondays) the top 3 outside sources of the last 28 days. Name a referrer page when
   `traffic.referrers` has one that sent 3+ views and isn't a search engine or social site: that's an organisation sharing
   the link. Say "Radar can find more like <org>". Never guess a source the data doesn't show.
5. **🔎 Google**: total clicks and impressions (28 days, all sites); the best-placed page in the top 20 if any (path, position, query).
6. **📞 Day job**: top 3 from `leads/latest.md` (company (city) — why — opener in quotes), then
   https://github.com/simonpatrickfarrugia-beep/site-factory/blob/main/leads/latest.md . If the file isn't dated today (Melbourne) or has
   no prospects: "No new call list today". Then: "FCBT Radar topped up at 8:45: review when you can."
7. **📦 Ready for you** (only if any open todo item has `ready`): one line each: what Claude prepared, its link, and the
   approve step in a few words (e.g. "reply to CF with the attached PDF"). These are approve-only: Simon checks and sends.
8. **✅ Today's one thing**: the first open item WITH `ready` if there is one (decide items first), otherwise the first open
   item (decide first), with its link, then "N left on your list (M ready to approve)".
   On the 1st of the month also remind him of `ga4-country-check`.

## Log the run (always, even if something failed)
`python3 scripts/hq/log_run.py morning-report ok "<one-line summary>"` (use `fail` and say why if a step failed), commit
`HQ: morning-report run [skip ci]`, push. The daily health check flags this worker if the log goes stale.

Then send the report as your final message.
