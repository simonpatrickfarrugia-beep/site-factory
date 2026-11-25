# Deploy, preview and roll back

Each brand is its own Cloudflare Worker, connected to this GitHub repo with **Workers Builds**.
Pushing to `main` deploys every brand. Pushing any other branch creates preview URLs.

## One-time setup per brand (Cloudflare dashboard)

1. Workers & Pages → Create → **Import a repository** → pick `site-factory`.
2. Project name: the brand slug (e.g. `trailers`). It must match `name` in `brands/<slug>/wrangler.jsonc`.
3. Build command: `BRAND=<slug> npm run build`
4. Deploy command: `npx wrangler deploy --config brands/<slug>/wrangler.jsonc`
5. Non-production branch deploy command: `npx wrangler versions upload --config brands/<slug>/wrangler.jsonc`
6. Root directory: leave empty (repo root).
7. Save and deploy.

## Day-to-day

- Changes come in as a branch + pull request → Cloudflare posts a preview link on the PR.
- Merge the PR → live within a couple of minutes.

## Roll back

Cloudflare dashboard → Workers & Pages → the brand → **Deployments** → pick the last good one → **Rollback**.
Takes effect in seconds. Then fix forward in the repo.

## If a build fails

The build log is under the brand's Deployments tab. Config mistakes fail with a message naming the exact field, e.g. `colors.accent: Use a 6-digit hex colour`.

## Standalone Workers (GitHub Actions, not Workers Builds)

`mail-tracker`, `health-check` and `chc-checkin` deploy from **`.github/workflows/deploy-workers.yml`**
(script: `scripts/deploy-worker.sh`). A push to `main` that touches `workers/mail-tracker/`, `workers/health-check/`
or `workers/checkin/` deploys that Worker; changing the workflow file deploys all three. Or run it by hand: Actions → Deploy Workers.

- **Repo secrets:** `CLOUDFLARE_API_TOKEN` (Edit Cloudflare Workers template + D1 Edit), `CLOUDFLARE_ACCOUNT_ID`,
  `MAIL_TRACKER_ADMIN_KEY`, `HEALTH_CHECK_ADMIN_KEY`.
- **Worker secrets it sets:** mail-tracker `ADMIN_KEY`; health-check `ADMIN_KEY` and `MT_KEY` (= Mail Tracker's key).
  Add one: give the job an env line `SECRET_<NAME>: ${{ secrets.<GITHUB_SECRET> }}`.
- **Order:** mail-tracker, then health-check (its `MAIL_TRACKER` service binding needs mail-tracker to exist).
- **D1:** mail-tracker and health-check apply their `migrations/*.sql` before deploying (`APPLY_MIGRATIONS`).
- **Skips cleanly** while a Worker's code (`src/index.js`) isn't in the repo yet. Results show as annotations titled `deploy <name>`.
