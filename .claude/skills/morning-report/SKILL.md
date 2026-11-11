---
name: morning-report
description: Simon's one daily morning report (sites, Radar queue, day-job call list, today's one thing). Run by the daily 08:56 Melbourne scheduled task, or when Simon asks for the morning report.
---

# Morning report

Simon's ONLY daily ping from Claude, so it replaces separate notifications. One phone screen.
Follow `CLAUDE.md`. The only repo changes allowed here: recording a milestone (step 0) and logging the run (last step).

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
