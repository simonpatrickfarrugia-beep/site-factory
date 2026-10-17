# Make.com automations — reference for rebuilding on the factory

Captured 17 Oct 2026 before cancelling the paid Make plan. All 13 scenarios were inactive.
The scenarios stay in the Make account on its free plan; this file records the logic so nothing depends on Make.

Airtable base for trailers: `appvc6B09xfUyhFdH` (Retro Video Store Directory)
- Movies table `tblY2tX0mtcRLVs5G`
- Buckets table `tblYEvm2hNtof88gi`

API keys used by these scenarios (OMDb, Anthropic) live in Make's keychain. They are NOT copied here; when rebuilding, store them as Cloudflare Worker secrets.

## Trailer channel pipeline (to rebuild as scheduled Workers)

### 1. Intake: "movietrailer.channel - Automated Intake & Scraper" (every 12h)
- Apify YouTube scraper (actor `h7sDV53CddomktSi5`), 5 newest videos from these official studio channels:
  UCjmJDM5pRKbUlVIzDYYWb6g, UCq0OueAsdxH6b8nyAspwViw, UCF9imwPMSGz4Vq1NiTWCC7g, UC_5niPa-d35gg88HaS7RrIw,
  UCJ6nMHaJPZvsJ-HmUmj1SeA, UCz97F7dMxBNOfGYu3rx8aCw, UC2-BeLxzUBSs0uSrmzWhJuQ, UCf5CjDJvsFvtVIhkfmKAwAA,
  UCU4SM3j_9TNWaSu8KdGV50g, UCuPivVjnfNo4mb3Oog_frZg
- Keep only titles containing "trailer" (length > 4).
- Dedupe against Airtable Movies by fuzzy title match; create a new record (`Movie Title` = video title, `SEO:Index` = false) if none exists.
- Rebuild note: the YouTube Data API (free quota) can replace Apify, so there's no per-run cost.

### 2. Enrichment: "Movie Engine - YouTube Intake & OMDb Enrichment" (daily 06:00)
- Picks up to 20 Movies where `Availability Status` is blank.
- Extracts the year from the title "(YYYY)"; looks up OMDb by `Clean Title` + year.
- Finds the official trailer via Apify YouTube search "<title> official trailer" (1 result).
- Three branches:
  - **OMDb match and title validated** → Claude (Haiku) writes a tagline (≤12 words) and a 2–3 sentence original summary
    (format `TAGLINE: … ||| SUMMARY: …`), then updates the record: year, plot, runtime, trailer ID, actors, last-checked date,
    rating (N/A/Unrated → "Not Rated"), director, tagline, title, box office, genre, `SEO:Index` = true,
    summary, `Availability Status` = "Available", IMDb rating.
  - **No match and year ≥ current year** → `Availability Status` = "Pending Release", `SEO:Index` = false.
  - **No match, older or no year** → "Pending Release" plus note "NEEDS REVIEW: OMDb no match…".

### 3. Recheck: "Pending Release - Monthly Recheck" (1st of month 05:00)
- Up to 20 "Pending Release" movies → OMDb by title → if found, the same Claude tagline/summary step and updates as the match branch above.
  Otherwise just stamp the last-checked date.

### 4. Publishing: "Airtable to Webflow Sync" and "Buckets to Webflow Sync" (daily)
- **Obsolete.** The factory builds pages straight from Airtable data. The logic worth keeping:
  - Amazon URL gets `tag=movietrailerc-20` appended (now done in the site template).
  - CTA priority: Sponsor/Stripe override → tagged Amazon → Prime Video → Apple TV → physical media.
  - Movies are published when `SEO:Index` = TRUE and `Availability Status` = "Available".
  - Bucket membership comes from the movie's `Bucket Tags` containing the bucket name, sorted by released year.

### 5. Engagement webhooks (rebuild on the forms Worker + D1)
- **Poll Vote Receiver**: `{recordId, vote: "watch"|"not_watch"}` increments `Would Watch Count` / `Wouldn't Watch Count`.
- **Movie Poll Stats API**: returns `{wouldWatch, wouldNotWatch, total, pct, showResult (total ≥ 10)}`; CORS for movietrailer.channel.
- **Notify Me Email Capture**: `{recordId, email}` appends the email to `Notify Emails` on the movie
  (personal data: store in D1, not Airtable, when rebuilt).

## Other businesses' scenarios (not part of the trailer site)
- "[Brand] 1 - Hotel form intake -> Airtable": webhook → [Brand] Bed Directory base `apppPULrbzRNwd0RR`, with a honeypot check.
- "Integration Apify, Airtable" (×2) and "…Websearch": Seek job scraper and Google Maps scraper → Seek Pipeline / FCBT Lead Generation bases.
- "TEST - Aggregator Pattern": test only.
