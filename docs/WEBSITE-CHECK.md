# Free website check + tracked IMN emails

One scanner since 26 Nov 2026. The **health-check** Worker (`workers/health-check`) scores every site, wherever the check runs.

| Where | What happens |
|---|---|
| https://imnetwork.com.au/labs/website-check | Public front door (IMN Labs page, SEO content, GA4 `cta_check_*`, "Send me a plan" form → D1 `submissions`). Its `/api/webcheck` asks health-check over the `HEALTH_CHECK` service binding and shows a link to the full report. Falls back to `src/worker/webcheck.ts`'s own checks if the binding fails. |
| https://check.imnetwork.com.au | health-check. `/r/<id>` = a saved report (shareable). `/` forwards to the Labs page. `/admin` = Simon's list of reports, views and the bulk outreach scanner (key = HEALTH_CHECK_ADMIN_KEY). |
| IMN HQ → Draft email → Run website check | HQ asks health-check (admin key `HC_KEY`), fills `{check}` (top 3 fixes in plain English) and `{checklink}` (their report). Runs by itself when a Radar email has `{check}`/`{checklink}` and a website. Send and Outlook buttons refuse an email that still says "(run the website check first)". |
| IMN HQ → Send now (brands in `TRACK_BRANDS`, now `imn`) | Every link goes through Mail Tracker (`https://go.imnetwork.com.au/l/<id>/<n>`) and a 1×1 image records opens. Opens and clicks show in Mail Tracker (IMN tab); report views show in health-check's admin. If Mail Tracker is down the email still goes, untracked. The card's history says "Sent from HQ (tracked <id>)". |

Scoring rules match the Labs page copy: first response 0.8 s or less is good, over 1.8 s poor; A 90+, B 75+, C 60+, D 45+.
Public checks: 8 an hour per IP (IP kept a day), a repeat check of the same site within 30 minutes reuses the saved report.

Tests: `node workers/health-check/test/run.mjs`, `node workers/health-check/test/integration.mjs`, `npx tsx workers/hq/test/track.mjs`
(all run in `deploy-workers.yml` before deploying).
