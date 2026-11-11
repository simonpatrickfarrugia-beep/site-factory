# Site Factory

One codebase that builds and runs every branded website for Simon's ventures.
Each new site is a new config file, not a new build.

- Framework: Astro (static output)
- Hosting: Cloudflare Workers with static assets, one Worker per brand
- Content: JSON in `data/<brand>/` (written by the pipeline Worker and by Claude)
- Form submissions, outreach CRM: Cloudflare D1
- AI workers: rules in `CLAUDE.md`, jobs in `.claude/skills/`, roster in `docs/WORKERS.md`

## Layout
- `brands/<slug>/` — brand config (`brand.config.ts`) and Cloudflare config (`wrangler.jsonc`)
- `src/` — the shared site: layouts, pages, design system
- `docs/` — how to deploy, roll back and add a new site

Build a brand locally: `BRAND=trailers npm run build`
