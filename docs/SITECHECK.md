# Site check (report card engine)

One automated report card per site: errors, quality, SEO gaps, speed, tracking, Google trend and competitor moves,
with the fixes ranked by impact. Works for every IMN site now and for client sites later.

## When it runs
`.github/workflows/sitecheck.yml`, daily 06:30 Melbourne (after the 06:00 stats job). Only due sites are scanned, at most 3 a day:

| Stage | Rule | Scan every |
|---|---|---|
| building | no revenue in the last 60 days (`hq/finance.json`, entries with `site` or `brand` = the site id) | 7 days |
| earning | some revenue in the last 60 days | 14 days |
| steady | revenue in each of the last 3 months **and** 28-day visits ≥ `target90.views` (`hq/portfolio.json`) | 30 days |
| client | care plan in `hq/sitecheck.json` → `carePlans` | 7 / 14 / 30 |

Run one now: `scripts/claude/sitecheck.sh vic` (or `all`), or Actions → sitecheck → Run workflow.

## What it checks (and what it reuses)
- **Broken pages and links**: every sitemap page, every internal link not in the sitemap, up to 150 outside links (403/429 = the site blocks robots, not counted).
- **Titles, descriptions, H1, share image, schema**: `scripts/seo_audit.py` (`page_facts`, `page_issues`), plus JSON-LD that won't parse.
- **Thin and duplicate pages**: `scripts/quality.py` (the build's quality gate) run on the live HTML.
- **Tracking**: the GA4 tag on every page and the right ID; GA4 still recording visits (`stats.json` daily).
- **Affiliate links**: every link to a programme in `affiliateRules` must carry our ID and `rel="sponsored"`.
- **Sitemap and indexing**: sitemap loads, no redirects or noindex pages in it, canonicals, robots.txt; Search Console URL Inspection for the busiest 8 pages.
- **Speed**: Google PageSpeed (mobile) for the home page and the busiest page (free; add a `PSI_KEY` secret only if it starts hitting the quota).
- **Google trend**: impressions and clicks week on week and over 28 days, position moves on top searches (`stats.json`).
- **Competitors**: Google's top 10 for the site's top 5 searches (DataForSEO through the pipeline Worker, `POST /sitecheck`, ~US$0.002 each),
  and who came into or dropped out of the top 5 since the last scan.

## How fixes are ranked
impact = severity (blocker 10, high 5, medium 2.5, low 1) × traffic of the pages affected (views + impressions/20, from `stats.json`; up to ×5)
× 2 when it touches money (tracking, affiliate links). Area scores start at 100 and lose points per finding; the overall score weights
broken things and tracking highest. A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 55, else F.

## Where results go
- `hq/sitecheck/<id>.json` (full card, last 12 scores in `history`), `hq/sitecheck/index.json` (one line per site), `hq/reports/sitecheck/<id>.md`.
- IMN HQ → More → **Site check** (reads the cards live from the repo; no redeploy).
- Morning report: one line when a new card landed in the last 24 h.
- Anything broken: a GitHub issue labelled `sitecheck`, one per site, updated each scan and closed after a clean one.

## Cost
A$0 new. GitHub Actions (public repo), PageSpeed and Search Console are free; DataForSEO comes from the existing credit:
~US$0.01 per site per scan, so ~US$0.30 a month for 6 weekly sites.

## Client sites (client studio, later)
Add an entry with `"owner": "client"` and `"carePlan"`. No stats file is needed; the Google parts switch on once one exists.
Client cards must not land in this public repo: run with `--out <private repo>/sitecheck` from a workflow in the private repo.
Client sites never get GitHub issues here.
