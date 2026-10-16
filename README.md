# Site Factory

One codebase that builds and runs every branded website for Simon's ventures.
Each new site is a new config file, not a new build.

- Framework: Astro (static output)
- Hosting: Cloudflare Workers with static assets
- Content: Airtable (read at build time only)
- Form submissions: Cloudflare D1

Docs (deploy, rollback, add a new site) live in `docs/` as they're written.
