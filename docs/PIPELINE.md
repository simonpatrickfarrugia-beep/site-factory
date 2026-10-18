# Trailer pipeline (movietrailer.channel)

Replaces the Make.com scenarios. One Cloudflare Worker, `trailer-pipeline`, in `workers/pipeline/`.

| Job | When (Melbourne time) | What it does |
|---|---|---|
| intake | every 12 hours | Reads the newest 5 videos from each studio channel (public YouTube feeds, no key). Trailers we don't already have go into `data/trailers/queue.json`. |
| enrich | daily 06:00 | Up to 15 queued trailers: OMDb lookup → Claude Haiku writes tagline + summary → added to `data/trailers/movies.json` → site rebuilds and the page goes live. |
| recheck | monthly (2nd, 05:00) | Upcoming films OMDb didn't know yet get looked up again. |
| demand | monthly (3rd, 08:00) | Pulls the last 28 days from Search Console and writes `reports/trailers/demand-YYYY-MM.md`: top searches, quick-win pages (ranking 4–20), low click-through titles, films people search for that we don't have, and collection ideas. |

## Strategy loop (monthly)

1. The demand report lands on the 3rd. In the Trailers chat say **"show the demand report"**.
2. Take the parts worth deciding on to the Movie Trailer Channel Project (which collections, which film groups).
3. Back here, say **"act on the demand report"** with what you approved: Claude adds the films to the queue
   (`source: "demand"`, no video yet; enrich finds the official trailer on YouTube), builds the collections and
   rewrites weak titles/descriptions.

Search volumes (Keyword Planner numbers via DataForSEO, ~US$0.09 per 1,000 keywords) are a later add-on if Search Console alone is too thin.

The movie list lives in the repo, not Airtable. Every run that changes something makes one commit to `main`.
A commit that adds movies rebuilds the site; queue-only commits are marked `[skip ci]`.

## The queue (`data/trailers/queue.json`, not published)

- `new`: just found, not looked up yet.
- `pending`: upcoming film, not in OMDb yet. Rechecked monthly.
- `review`: needs a person. OMDb returned a different film, or the years don't match (re-releases, remakes). Say "review the trailer queue" in the Trailers chat; Claude fixes or drops each one.

Matching is strict: the cleaned title must equal OMDb's title, and the years must agree. Anything unsure goes to review, never live.

## One-time setup (Cloudflare dashboard, about 10 minutes)

1. **Workers & Pages → Create → Import a repository** → `site-factory`.
   - Project name: `trailer-pipeline`
   - Build command: leave empty
   - Deploy command: `npx wrangler deploy --config workers/pipeline/wrangler.jsonc`
   - Non-production branch deploy command: `npx wrangler versions upload --config workers/pipeline/wrangler.jsonc`
   - Build watch paths (Settings → Build, after creating): include `workers/pipeline/*`, so data commits don't redeploy it.
2. **trailer-pipeline → Settings → Variables and Secrets → Add**, type **Secret**, one for each:
   - `GITHUB_TOKEN`: github.com → Settings → Developer settings → Fine-grained tokens → Generate. Repository access: *Only select* → `site-factory`. Permissions: **Contents: Read and write**. Expiry: 1 year.
   - `OMDB_API_KEY`: the key from omdbapi.com (free tier, 1,000 lookups a day).
   - `ANTHROPIC_API_KEY`: console.anthropic.com → API Keys. Add a small credit and set a monthly spend limit.
   - `RUN_KEY`: any long random phrase you make up. It protects the manual-run link.
3. **Google (for the demand report and back-catalogue trailers, about 10 minutes, free):**
   1. console.cloud.google.com → create a project, e.g. `site-factory`.
   2. APIs & Services → Library → enable **Google Search Console API** and **YouTube Data API v3**.
   3. APIs & Services → Credentials → Create credentials → **API key**. Restrict it to YouTube Data API v3.
      Add it as the secret `YOUTUBE_API_KEY`.
   4. IAM & Admin → Service accounts → Create (name `search-console-reader`, no roles needed) → Keys → Add key → JSON.
      Paste the whole JSON file into the secret `GSC_SERVICE_ACCOUNT`, then delete the downloaded file.
   5. search.google.com/search-console → the `https://www.movietrailer.channel/` property → Settings → Users and permissions →
      Add user: the service account's email (`…@….iam.gserviceaccount.com`), permission **Restricted**.
      (If the property is a *Domain* property, tell Claude: `GSC_SITE` then becomes `sc-domain:movietrailer.channel`.)
4. Test without changing anything:
   `https://trailer-pipeline.<your-subdomain>.workers.dev/run/intake?key=<RUN_KEY>&dry=1`
   Then `/run/enrich?...&dry=1`, and `/run/demand?...&dry=1` (shows the report in the browser).
   Drop `&dry=1` to run for real.

## Limits (all free tier)

- Workers free plan: 50 outgoing calls per run. The pipeline counts them and stops early; leftovers wait for the next run.
- OMDb free: 1,000/day (we use ≤ 35/day).
- YouTube feeds: no key, no quota. YouTube Data API: 10,000 units/day free; one trailer search = 100.
- Search Console API: free.
- Claude Haiku: only for matched films, a few cents a month.

## Changing things by chat

- Add or remove a studio channel: `CHANNELS` in `workers/pipeline/wrangler.jsonc`.
- Per-run limits: `ENRICH_LIMIT`, `RECHECK_LIMIT`.
- Writing brief for taglines/summaries: `writeCopy` in `workers/pipeline/src/sources.ts`.
- Logs: trailer-pipeline → Observability (each run logs a one-line summary).
