---
name: weekly-autopilot
description: The Site Factory's weekly routine work (health, affiliate inbox, Vic towns, quality, trailer queue, money model, Simon's list) plus the weekly brief. Run by the Monday 07:59 Melbourne scheduled task, or when Simon says "run the autopilot".
---

# Weekly autopilot

Do the week's routine work yourself so Simon only makes decisions, then send a short weekly brief.
Follow `CLAUDE.md` (hard rules, commits, pipeline jobs, DataForSEO cap).
The company is scored by LEVELS (`hq/portfolio.json` goal.levels: 1 first $1, 2 first $100 month, 3 one site at $1k/month,
4 portfolio at $5k/month); every choice should move it up a level.

## Read first
`hq/portfolio.json` (todo, actions, goal, notes), `hq/finance.json`, `hq/reports/*.md`, `data/*/stats.json`, and the project docs if this
session has them (DECISIONS.md, PRODUCTION-LINE.md, VIC-TOURS.md, DOG-BREEDS.md, AFFILIATE-SIGNUP-KIT.md, SHARE-POSTS.md, COSTS.md).
Other workflows you can dispatch: vic-probe (inputs count, slugs), vic-photos, domain-check, health, indexnow.

## Routine
1. **Health**: open GitHub issues labelled `health` and `review`. Fix what's clearly fixable (failed job, broken page, thin page).
   A 90-day review issue becomes a "decide" todo for Simon; don't decide it.
2. **Affiliate inbox**: Gmail, read-only, last 8 days:
   `(cj.com OR viator OR getyourguide OR discovercars OR klook OR commissionfactory OR impact.com OR awin OR "associates@amazon") (approved OR accepted OR welcome OR "publisher ID" OR "partner ID" OR "affiliate ID" OR earnings OR commission)`.
   Approval with a clear ID → link template in `data/vic/content.json` → affiliates (enabled: true; only link formats confirmed in the
   email or the programme's own help pages), status "approved" in `hq/affiliate-programs.json`, tick the matching todo (done, doneAt).
   Signup confirmations tick their item too. Earnings → `hq/finance.json` revenue (month, source, amount, sales).
   Missing ID → a 1-minute todo asking for exactly that.
3. **Vic Tours growth**: next ~12 unpublished towns from `data/vic/towns.json` (most-searched first; skip kind "region", towns with a hold
   `note`, duplicates of a published page). Run vic-probe with those slugs. Towns with ~25+ places: short factual 2–3 sentence intro and
   region in `data/vic/content.json`, `published: true`, rebuild (`scripts/vic/build_data.py`), run vic-photos.
   Under ~25: stay unpublished with a `note`; list them in the brief. Follow VIC-TOURS.md.
   If the towns list is exhausted, add a "decide" todo proposing the next batch of towns to volume-check (costs DataForSEO).
4. **Quality**: latest CI "Quality gate" warnings; fix thin pages with real facts, or noindex if there's nothing real to add.
5. **Trailers**: `data/trailers/queue.json` items in `review`. Set obvious non-films (promos, box sets, compilations) to `rejected`
   (so intake skips them); list anything ambiguous for Simon. Keep seasonal collections timely from films already in the catalogue
   (Halloween in October, Christmas from late November); unfeature them when the season ends.
6. **Money model**: run the `niches` job, then `python3 scripts/hq/prioritise.py`; commit the updated reports.
7. **Simon's list**: keep `todo` short and current: tick done items, remove stale ones, every item has mins, why and a direct link,
   never more than ~10 open. When a level is reached, say so loudly, move goal.sprint to the next level (deadline ~6 weeks out) and add
   its 3–5 steps with `sprint: true`. Watch the Amazon Associates deadline in notes. Keep `actions` current.
8. **Log** decisions in `hq/reports/autopilot-log.md` (dated section).

## Weekly brief
Write `hq/reports/weekly/<YYYY-MM-DD>.md`, commit it, and send it as your final message. One phone screen:
- "Level X → next: <name> (<days> days left in the sprint)"
- Scoreboard per site: visits (28 days) and change, affiliate clicks, Google clicks, day X of 90 vs target90
- What I did this week (3–6 bullets), incl. affiliate buttons switched on and todo items ticked
- Your list: "<N> left, about <M> min" + top 3 open items (decide first) with links; rest at https://www.movietrailer.channel/hq
- One honest line: on track for the next level or not, and the biggest blocker
