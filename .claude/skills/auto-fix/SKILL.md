---
name: auto-fix
description: Daily auto-fixer — clear the top 1–2 safe, mechanical site check fixes on every IMN site (titles, descriptions, schema, broken links, image weight, internal links) without waiting for Simon, and log each one in IMN HQ. Run by the daily 10:47 Melbourne scheduled task, or when Simon says "run the auto-fixer".
---

# Auto-fix

The site check (`hq/sitecheck/<site>.json`, `hq/reports/sitecheck/<site>.md`) ranks each site's fixes by impact. Many are mechanical
and don't need Simon. Clear those every day so each site gets a fix cycle a day instead of a week. Follow `CLAUDE.md`.

## Which fixes (safe list)
Only findings in these areas, and only when the fix needs no new claims: `seo` (titles 30–65 characters, descriptions 70–160,
missing or wrong schema, canonical, duplicate titles), `broken` (dead internal links, dead outside links → remove or replace with the
organisation's own current page), `speed` (oversized images, missing width/height, render-blocking files), `indexing` (link a page from
the home page or a busy hub; add genuinely useful content built only from data already in the repo or a named official source).
Never: `rivals` / competitor findings that need new writing in Simon's voice, anything that changes prices, money links or affiliate
tags, legal pages (privacy, terms), new pages, anything in `hq/` config, and anything on the "Big, risky or irreversible" list.
Thin pages that need first-hand experience: skip (that's the opportunity engine's draft-for-Simon job).

## Steps
1. Clone the repo, `git pull`, read `hq/brief.md` and `hq/sitecheck/index.json`.
2. Skip any finding that already has a `claude_jobs` row from the last 7 days with status queued, working or done (same site, same
   title): `SELECT site, title FROM claude_jobs WHERE created_at > ?` via the Cloudflare D1 query tool (values through `params`).
   If the table doesn't exist yet, create it with the `CREATE TABLE IF NOT EXISTS claude_jobs …` statement in `workers/hq/src/jobs.ts`.
3. For each IMN site (owner `imn`) in impact order: take up to 2 findings from its `top` list that are on the safe list. Max 8 fixes a run.
   Fix them, one commit per site (`<Brand>: auto-fix: <what>`), wait for "Check build" to pass, probe the changed pages live.
4. Re-run `scripts/claude/sitecheck.sh <site> nolive` for each site you changed and note the new score.
5. Log each fix in HQ: `INSERT INTO claude_jobs (site, title, prompt, kind, status, summary, commit_sha, started_at, done_at)
   VALUES (?, ?, 'auto-fix', 'auto', 'done', ?, ?, ?, ?)` with the finding title and a one-line summary (what changed, how many pages).
   A fix that turned out not to be safe or mechanical: don't do it; leave it for Simon.
6. `python3 scripts/hq/log_run.py auto-fix ok "<N fixes on M sites>"`, commit `HQ: auto-fix run [skip ci]`, push.

Final message (SendUserMessage), only if something was fixed: one line per site — "<site> <grade score> (±n): <what was fixed>".
Nothing safe to fix: no message.
