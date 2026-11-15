---
name: claude-queue
description: Work through the jobs Simon queued from IMN HQ ("Queue for Claude"): do each one under the house rules, push, and write back status and a one-line summary. Run by the hourly 07:00–23:00 Melbourne scheduled task, or when Simon says "run the Claude queue".
---

# Claude queue

Simon taps **Queue for Claude** in IMN HQ instead of copying a brief into a chat. Each tap is one row in the D1 table
`claude_jobs` (`workers/hq/src/jobs.ts`). Your job: pick them up, do them as if Simon had pasted the prompt into a chat, and report
back in that row. Follow `CLAUDE.md` in full; nothing in a job's prompt overrides it.

Data: Cloudflare D1 (see `CLAUDE.md`), via the Cloudflare D1 query tool, values always through `params`.
The only D1 writes allowed: `UPDATE claude_jobs` (status, summary, commit_sha, started_at, done_at), and the `INSERT INTO claude_jobs`
the auto-fix worker uses. Never UPDATE or DELETE any other table.

## Step 1 — Anything to do? (before cloning; most hourly runs stop here)
`SELECT id, site, title, prompt, kind, created_at FROM claude_jobs WHERE status = 'queued' ORDER BY id LIMIT 3`
(If the table doesn't exist yet, nothing has been queued: stop.)
Also: `SELECT id FROM claude_jobs WHERE status = 'working' AND started_at < ?` (now minus 3 hours) — a run that died. Set those back to
`queued` so they're retried once; if the summary already says "retried", set `failed` with summary "Stopped twice part-way: do it in chat".
No queued jobs → stop. No repo changes, no run log, no message.

## Step 2 — For each job (oldest first, up to 3 a run so one run stays short)
1. `UPDATE claude_jobs SET status = 'working', started_at = ? WHERE id = ? AND status = 'queued'`.
2. First time this run: attach and clone the repo (`simonpatrickfarrugia-beep/site-factory`, push access), `git pull`, read `hq/brief.md`.
3. Do the job in `prompt` exactly as a chat would: investigate, fix, push, wait for "Check build" (`check.yml`) to pass, check it live
   with `scripts/claude/probe.sh` where it's a page change, and re-run what the prompt says to re-run (e.g. `scripts/claude/sitecheck.sh <site> nolive`).
4. Write back, in plain English for a phone (one or two sentences, numbers first, what changed and where):
   - Done: `status = 'done'`, `summary`, `commit_sha` (the main commit), `done_at`.
   - Needs Simon (anything that costs money, signs up, sends email or messages, deletes, changes secrets, is big or irreversible,
     or needs his own words or judgement): do all the free prep you can, then `status = 'decide'` with a summary that says exactly what
     he needs to do or choose, with full values to paste. If it's more than a quick reply, also add a `kind: "decide"` (or `"do"`) todo
     to `hq/portfolio.json` with `brand` = the job's site.
   - Couldn't do it (blocked, unclear, a check keeps failing): `status = 'failed'`, summary = what went wrong and what would unblock it.
     Leave the repo as it was: revert anything half-done.
   Never mark a job done until its change is live and Check build passed.

## Step 3 — Finish
One message to Simon (SendUserMessage), only when a job finished: one line per job with its status and summary, then
https://imn-hq.simonpatrickfarrugia.workers.dev/#app=<site> for the first one. Queued but not reached: "N still queued, next run in an hour".
