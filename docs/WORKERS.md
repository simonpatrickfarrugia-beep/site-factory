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

| Worker | Skill | When (Melbourne) | Connectors it needs | Writes to |
|---|---|---|---|---|
| Morning report | `morning-report` | daily 08:56 | Cloudflare (D1 read), GitHub | `hq/milestones.json` only |
| Weekly autopilot | `weekly-autopilot` | Mon 07:59 | GitHub, Gmail (read), Cloudflare | repo data, todo, reports |
| IMN Radar | `imn-radar` | weekdays 07:34 | Cloudflare (D1), web search | D1 orgs/contacts/touches, hq_kv |
| RBA rate day | `rba-rate-day` | each RBA decision day 15:15 | GitHub, web search | `data/paycalc/rates.json` |

Day-job workers (FCBT Radar 8:45 top-up and bonus top-up) are deliberately **not** in this repo: they're Simon's employer work,
kept separate from IMN, and this repo is public.

## Scheduled task prompt (the whole thing)

```
Clone simonpatrickfarrugia-beep/site-factory (gh repo clone; REST only, GraphQL is blocked).
Read CLAUDE.md, then read and follow .claude/skills/<name>/SKILL.md exactly.
```

## Adding a worker
1. Write `.claude/skills/<name>/SKILL.md` (frontmatter `name`, `description`; then steps, what it may write, the final message).
2. Try it once in a chat: "run the <name> skill".
3. Create the scheduled task with the prompt above and only the connectors in its row. Add the row here.
