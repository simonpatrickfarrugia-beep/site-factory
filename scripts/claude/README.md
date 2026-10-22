# Claude's helpers (run from a chat session)

Chat sessions can't load the live sites directly, and only `gh` reaches GitHub, so these
dispatch a GitHub workflow and print its result. Start every session with `git pull` and
read **hq/brief.md** — the daily state of the whole factory.

| Script | What it does |
|---|---|
| `probe.sh "<urls>" ["regex"]` | What is live on a page right now: status, redirects, live build, title, description, buttons, pattern matches |
| `seo-audit.sh <site>` | SEO + tracking audit of a whole site (samples 25 pages on big sites) |
| `pipe-run.sh <job> [dry]` | Run a pipeline Worker job now (intake, enrich, stats, collections, …) |
| `brief.sh` | Rebuild hq/brief.md now and print it |
