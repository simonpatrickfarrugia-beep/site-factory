# AI workers

Three layers, each with one job:

| Layer | What it is | Lives in |
|---|---|---|
| **Rules** | House rules every session and worker inherits | `CLAUDE.md` |
| **Skills** | Each worker's job description (what to read, do, write, report) | `.claude/skills/<name>/SKILL.md` |
| **Schedule** | When a worker runs: a claude.ai scheduled task whose prompt just points at its skill | claude.ai → scheduled tasks |

Code jobs that don't need judgement (stats, intake, enrich, health, leads, brief) stay as GitHub workflows and the pipeline Worker:
they're free, fast and don't use Claude usage. Use an AI worker only where judgement or research is the job.

To change what a worker does, edit its SKILL.md and push. The scheduled task picks it up on the next run; no prompt editing.

## Roster

| Worker | Skill | When (Melbourne) | Model | Connectors (only these) | Writes to |
|---|---|---|---|---|---|
| Morning report | `morning-report` | daily 08:56 | Sonnet | Cloudflare, Claude Code Remote | `hq/milestones.json`, `hq/runs.json` |
| IMN Radar | `imn-radar` | weekdays 07:34 | Opus | Cloudflare, Claude Code Remote | D1 orgs/contacts/touches, hq_kv, `hq/runs.json` |
| Weekly autopilot | `weekly-autopilot` | Mon 07:59 | Opus | Gmail (read), Claude Code Remote | repo data, todo, reports, `hq/runs.json` |
| RBA rate day | `rba-rate-day` | each RBA decision day 15:15 | Opus | Claude Code Remote | `data/paycalc/rates.json` |

Claude Code Remote is what lets a scheduled run attach and push to this repo; web search is built in.
Sonnet for reading and formatting, Opus where the job is research or judgement.

Day-job workers (FCBT Radar 8:45 top-up and bonus top-up) are deliberately **not** in this repo: they're Simon's employer work,
kept separate from IMN, and this repo is public.

## Health
Each worker's last step runs `scripts/hq/log_run.py <worker> ok|fail "<note>"`, which updates its entry in `hq/runs.json`.
The daily `health` workflow (09:40 Melbourne) checks those entries against `workersMaxAgeDays` in `hq/health.json`
and opens a `health` issue (GitHub emails Simon) if a worker failed or went quiet, e.g. after a usage-limit stop.

## Scheduled task prompt (the whole thing)

```
Clone simonpatrickfarrugia-beep/site-factory (gh repo clone; REST only, GraphQL is blocked).
Read CLAUDE.md, then read and follow .claude/skills/<name>/SKILL.md exactly.
```

## Adding a worker
1. Write `.claude/skills/<name>/SKILL.md` (frontmatter `name`, `description`; then steps, what it may write, the final message).
2. Try it once in a chat: "run the <name> skill".
3. Create the scheduled task with the prompt above and only the connectors in its row. Add the row here,
   and add the worker to `workersMaxAgeDays` in `hq/health.json` so a silent failure gets noticed.

## Why the repo stays public
GitHub Actions uses ~8,000 minutes a month here (measured 11 Nov 2026; the 8-brand "Check build" on every push is ~6,400).
Private repos get 2,000 free minutes, so going private would stop the builds and daily jobs mid-month or cost ~US$50/month.
Private material (Project docs, finances, day-job lists) goes in a separate private repo instead.
