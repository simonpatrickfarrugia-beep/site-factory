# Trailer pipeline (movietrailer.channel)

Builds the trailer catalogue from what people in the **USA** search for. **Any year**, as long as the film can be rented or streamed (films still in cinemas wait until they've been out 90 days, `AVAILABLE_AFTER_DAYS`). *(Until 18 Oct evening: older films only, Australian volumes.)*
Only films at least 10 years old are added (`MIN_AGE_YEARS`), chosen by what people search for.
One Cloudflare Worker, `trailer-pipeline`, in `workers/pipeline/`. Replaces the Make.com scenarios.

| Job | When (Melbourne time) | What it does |
|---|---|---|
| catalogue | ~weekly (1st, 8th, 15th, 22nd, 29th UTC; 07:00 Melbourne next day) | **Main growth engine.** Looks up Google search volumes (DataForSEO) for films in `data/trailers/candidates.json`, queues the 10 most-searched, and writes `reports/trailers/catalogue.md` (ranked list + demand by theme). |
| intake | every 12 hours | Newest 5 videos from classic and re-release label channels (Criterion, Kino Lorber, Vinegar Syndrome, Severin, Umbrella). Trailers go into the queue. |
| enrich | daily 06:00 | Up to 15 queued films: OMDb lookup → trailer found on YouTube if needed → Claude Haiku writes tagline + summary → added to `data/trailers/movies.json` → site rebuilds and the page goes live. |
| collections | monthly (4th, 08:00) | **SEO collection pages.** Finds every theme the catalogue can fill (decade + genre, director, lead actor), looks up searches for "<theme>" + "best <theme>", and creates the 3 most-searched as **smart collections** (rule-based; new movies join automatically at each build). Claude writes tagline, intro and meta description. Report: `reports/trailers/collections.md`, incl. popular themes that need more films. Needs ≥ 6 films and ≥ 100 searches/mo. |
| demand | monthly (3rd, 08:00) | Last 28 days from Search Console → `reports/trailers/demand-YYYY-MM.md`: top searches, quick-win pages (ranking 4–20), low click-through titles, missing films, collection ideas. |
| recheck | monthly (2nd, 05:00) | Only matters if the age cutoff is turned off: upcoming films not yet in OMDb get looked up again. |

## Strategy loop

- **Candidates** are added by chat, by theme: "add candidates: 80s Australian horror", "add candidates: every Hitchcock film".
  Claude adds them to `candidates.json` with the theme; the weekly run ranks them by searches and queues the top ones.
  The first seed (18 Oct) is 227 films in 16 themes (80s action, Classic Hollywood, Australian classics, cult classics, …).
- **Self-refilling:** when fewer than 50 candidates are waiting (`CATALOGUE_REFILL_BELOW`), the catalogue run asks Claude for 60 more
  (mostly the strongest themes, plus up to 2 new nearby themes), skips anything already on the site or listed, then checks US search
  volumes. Only films with ≥ 50 searches/mo can be queued. Auto-added films carry the note `auto-suggested`.
- **Monthly**, say "show the catalogue report" and "show the demand report". Take the decisions (which themes, which collections)
  to the Movie Trailer Channel Project, then come back and say "act on the reports": Claude builds collections from the
  strongest themes, adds candidates and rewrites weak titles/descriptions.

The movie list lives in the repo, not Airtable. Every run that changes something makes one commit to `main`.
A commit that adds movies rebuilds the site; queue, candidate and report commits skip CI.

## Smart collections

A collection in `data/trailers/collections.json` can have a `rule`, e.g. `{"decades": [1980], "genres": ["Horror"]}` or
`{"directors": ["John Carpenter"]}`. Hand-picked `movieSlugs` show first, then every matching movie, oldest first.
Movie pages link to every collection they're in ("Also featured in"), so each new collection adds internal links too.
First one: `/discover/steven-spielberg-movies` (18 Oct, written by hand).

## Amazon affiliate links

- Tracking ID `movietrailerc-20` (Amazon.com US Associates) on every Amazon link; links are `rel="sponsored"`;
  the footer carries the Associates disclosure.
- Movie pages: **Rent on Prime Video** first (Prime Video search; digital rentals/purchases pay 5%), then
  **Buy on DVD & Blu-ray** (2.5%), then JustWatch. A movie's `rentBuyUrl` (a direct Amazon link) overrides the Prime search.
- CI fails the build if any Amazon link lacks the tag, uses a different tag, isn't marked sponsored, a page with Amazon
  links lacks the disclosure, or a movie page has no Prime Video link.
- Only purchases on amazon.com earn with this tag. Visitors from Australia buy on amazon.com.au, which needs its own
  Associates account (tags end in -22). Check GA4's country split before deciding.

## The queue (`data/trailers/queue.json`, not published)

- `new`: waiting for enrich.
- `review`: needs a person. Typical reasons: OMDb returned a different title (e.g. "Dr. Strangelove" vs its full title),
  the years don't match, several films share the title and the trailer gave no year (remakes), or no official trailer was found.
  Say "review the trailer queue"; Claude fixes or drops each one.
- `pending`: only used when the age cutoff is off.

Matching is strict: the cleaned title must equal OMDb's title, and the years must agree. Anything unsure goes to review, never live.

## One-time setup

1. **Cloudflare: Workers & Pages → Create → Import a repository** → `site-factory`.
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
3. **Google (demand report + trailer search, about 10 minutes, free):**
   1. console.cloud.google.com → create a project, e.g. `site-factory`.
   2. APIs & Services → Library → enable **Google Search Console API** and **YouTube Data API v3**.
   3. APIs & Services → Credentials → Create credentials → **API key**. Restrict it to YouTube Data API v3.
      Add it as the secret `YOUTUBE_API_KEY`.
   4. IAM & Admin → Service accounts → Create (name `search-console-reader`, no roles needed) → Keys → Add key → JSON.
      Paste the whole JSON file into the secret `GSC_SERVICE_ACCOUNT`, then delete the downloaded file.
   5. search.google.com/search-console → the `https://www.movietrailer.channel/` property → Settings → Users and permissions →
      Add user: the service account's email (`…@….iam.gserviceaccount.com`), permission **Restricted**.
      (If the property is a *Domain* property, tell Claude: `GSC_SITE` then becomes `sc-domain:movietrailer.channel`.)
4. **DataForSEO (search volumes, US$50 minimum top-up):** dataforseo.com → sign up → top up → Dashboard → **API Access**.
   Add the API login and API password (not your website password) as secrets `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD`.
5. Test without changing anything:
   `https://trailer-pipeline.<your-subdomain>.workers.dev/run/catalogue?key=<RUN_KEY>&dry=1` (shows the ranked list)
   Then `/run/collections`, `/run/intake`, `/run/enrich`, `/run/demand`, each with `?key=<RUN_KEY>&dry=1`.
   Drop `&dry=1` to run for real.

## Limits and costs

- Workers free plan: 50 outgoing calls per run. The pipeline counts them and stops early; leftovers wait for the next run.
- OMDb free: 1,000/day (we use ≤ 50/day).
- YouTube feeds: no key, no quota. YouTube Data API: 10,000 units/day free; one trailer search = 100.
- Search Console API: free.
- DataForSEO: US$0.09 per lookup of up to 500 films (1,000 keywords). Weekly lookups only cover films without a volume
  (or older than 6 months), so a typical month costs cents.
- Claude Haiku: only for matched films, a few cents a month.

## Changing things by chat

- Collections per month: `COLLECTIONS_PER_RUN`; thresholds `COLLECTION_MIN_FILMS`, `COLLECTION_MIN_VOLUME`.
- Age cutoff: `MIN_AGE_YEARS` ("0" = off). Films per weekly run: `CATALOGUE_PER_RUN`. Minimum searches: `CATALOGUE_MIN_VOLUME`.
- Search-volume country: `DATAFORSEO_LOCATION` (2036 Australia, 2840 United States).
- Label channels: `CHANNELS` in `workers/pipeline/wrangler.jsonc` (Arrow and Shout! Factory still to add once their channel IDs are confirmed).
- Writing brief for taglines/summaries: `writeCopy` in `workers/pipeline/src/sources.ts`.
- Logs: trailer-pipeline → Observability (each run logs a one-line summary).

## Running a job on demand

Ask Claude in chat ("publish more films now", "run the demand report"). Claude starts the `pipeline-run` GitHub Action
(`.github/workflows/pipeline-run.yml`, job + dry-run inputs), which calls the Worker with the `PIPELINE_RUN_KEY` repo secret
and reports the result as an annotation. Nobody needs to open `/run/...` links by hand.
