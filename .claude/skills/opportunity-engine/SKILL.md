---
name: opportunity-engine
description: Weekly search opportunities per site — find searches each site is already shown for in Google, ship the quick title fixes, and draft the best new or deeper pages for Simon to add his own line and approve. Run by the Tuesday 07:47 Melbourne scheduled task, or when Simon says "run the opportunity engine".
---

# Opportunity engine

Turn Search Console data into the pages that win clicks. Google already shows our sites for real searches; most rank on
pages 5–9. This worker picks the best few each week, fixes what's quick, and drafts the rest for Simon.
Follow `CLAUDE.md` (hard rules, commits, DataForSEO cap). The quality bar is the house rule: no mass thin AI content.
Everything published is built on real data in this repo plus Simon's own words.

Sites: `vic` and `paycalc` (add others to the run line below once they have 50+ Search Console impressions a week).

## 1. Find
`python3 scripts/hq/opportunities.py vic paycalc` → `hq/opportunities.json` and `hq/reports/opportunities.md`.
Vic volumes come from `data/vic/towns.json`. For the top 10 per site with no volume, you may look them up once:
`scripts/claude/volumes.sh "a|b|…" 2036` (AU, ~US$0.09), saved to `hq/opportunity-volumes.json` as
`{"volumes": {"<search lower-case>": <monthly>}, "checkedAt": "<date>"}`. Don't re-check a search within 90 days. Rerun the script.

Read `hq/reports/opportunity-log.md` first and skip anything done or drafted in the last 4 weeks.

## 2. Pick (max 3 per site)
Best score first, but use judgement: a search we can genuinely answer better than page 1 beats a big head term
(e.g. "pay calculator", "melbourne accommodation") we can't. Kinds:
- **fix-snippet** (page 1–2, no clicks) and **template patterns** (the same intent across many pages, like "<town> restaurants"
  landing on every eat page): rewrite titles/descriptions in code or data. Free and reversible, so **just do it** (standing permission),
  build-check it and log it.
- **strengthen** (right page, ranks page 3+): draft what the page is missing for that search — the direct answer up top, a short FAQ
  from the variants people actually typed, better internal links. Facts only from repo data (places, counts, rates, distances).
- **new-page** (no page answers it, e.g. "tax brackets 2021"): draft the page from real sources (ATO, Parks Victoria, the repo).

## 3. Draft for Simon (strengthen / new-page)
Write each draft to `hq/ready/opportunities/<YYYY-MM-DD>-<site>-<slug>.md`:
- Target search, the variants, current page and position, monthly searches
- What the searcher wants (one line)
- Proposed title (≤60 chars, search words first) and description (≤155 chars)
- The draft copy, short and specific, with every fact traceable to a repo file or a named official source
- `SIMON'S LINE:` an empty slot plus one question that prompts it (e.g. "Where do you actually eat in Sorrento, and why?").
  His first-hand line is what makes the page original; never write it for him.

Then add one `todo` item per draft to `hq/portfolio.json`: `mins` 3, `why` (the search and its monthly volume), `ready` =
{what: "Draft ready: add your line and reply 'publish <slug>'", link: GitHub link to the draft, at}. Keep the list under ~10 open.

## 4. Publish (when Simon replies "publish <slug>" with his line)
Put the copy into the site's data (Vic: `data/vic/content.json` town `intro`/`tips`, or the page's data file; MyPayCalc:
`data/paycalc/pages.json`), Simon's line in his voice where it fits best, then wait for "Check build" to pass, run
`scripts/claude/probe.sh` on the live URL and ping IndexNow (`indexnow` workflow). Tick the todo.

## 5. Log and report
Append a dated section to `hq/reports/opportunity-log.md`: what was fixed (and on how many pages), what was drafted, what was published.
Each fix or publish gets a re-check line for 4 weeks later; next run, compare position and clicks for those searches and note the result,
so the engine learns which kinds of change move rankings.
`python3 scripts/hq/log_run.py opportunity-engine ok "<summary>"`, commit `HQ: opportunity-engine run [skip ci]` (code changes in a
separate commit without `[skip ci]`), push.

Final message, one phone screen: fixes shipped (pages affected), drafts waiting (with the question for each), last month's
re-checks (moved up / no change), DataForSEO cost.
