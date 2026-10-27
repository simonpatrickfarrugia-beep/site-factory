# Site Factory brief — Tue 27 Oct 2026 (generated 10:11 UTC)

_Auto-written daily by scripts/hq/brief.py. Read this first in any new chat. Refresh: scripts/claude/brief.sh_

## Headline

Revenue to date **A$0.00** · sprint "First $1" ends in 4 days · Simon has **15** open items (~94 min)

## Traffic (last 28 days)

| Site | Station | Views (prev) | Last 7 days | CTA clicks | Google clicks / impressions |
|---|---|---|---|---|---|
| movietrailer.channel | Measure | 245 (104) | 11 4 4 4 3 1 7 | 0 | 7 / 646 |
| victours.com.au | Launch | 56 (0) | 2 9 3 28 7 7 | book_tour 2, website 1, map 1 | 2 / 1263 |
| Community Help Co | Launch | 0 (0) |  | 0 | 0 / 30 |
| tradeadmin.com.au | Launch | 0 (0) |  | 0 | 0 / 0 |

- **movietrailer.channel** (stats 0h ago) — top pages: / 103, /browse 12, /movies/star-wars-episode-v---the-empire-strikes-back-1980 9, /movies/schindlers-list-1994 8, /movies/star-wars-episode-vii---the-force-awakens-2015 6
  - Google: "ghost soldier movie 2006" 97 impr, pos 8.8; "the prestige trailer" 37 impr, pos 36; "the sixth sense trailer" 32 impr, pos 29.2; "home alone trailer" 30 impr, pos 42.3; "star wars episode 1 trailer" 23 impr, pos 41
- **victours.com.au** (stats 0h ago) — top pages: / 26, /towns 6, /warburton 5, /daylesford 2, /road-trips/goldfields-road-trip 2
  - Google: "accommodation melbourne southbank" 153 impr, pos 77.6; "sorrento restaurants" 66 impr, pos 90.6; "activities lorne victoria" 42 impr, pos 72.2; "1004 mornington-flinders road red hill vic 3937" 36 impr, pos 31.3; "best restaurants in mornington peninsula" 35 impr, pos 79.5
- **Community Help Co** (stats 0h ago) — top pages: / 0
  - Google: "community services placement" 30 impr, pos 15.9
- **tradeadmin.com.au** (stats 0h ago) — top pages: 

Latest milestones: 2026-10-15 trailers: Best day ever: 80 visits; 2026-10-15 trailers: Daily visits crossed 50; 2026-10-21 trailers: First Google clicks (7 in 28 days)

## Health

All checks passing ✅ (sites up, pipeline jobs fresh, live builds current, no failing workflows)

## Pipeline jobs (last run)

- ✅ `stats` 0h ago: trade-admin: 0 views, 0 CTA clicks, 0 Google clicks. | community-help-co: 0 views, 0 CTA clicks, 0 Google clicks. | vic: 56 views, 4 CTA cli
- ✅ `intake` 10h ago: Intake: 0 new trailer(s) queued. | Feed UCAP57cF-FSjJKzzXg7ntPlQ failed: YouTube feed UCAP57cF-FSjJKzzXg7ntPlQ: HTTP 404 | Feed UCtlPYzQ188v
- ✅ `enrich` 15h ago: Enrich: looked at 0, published 0. Queue: 1 waiting for OMDb, 11 need review.
- ✅ `competition` 16h ago: Competition: checked 4; 5 still to check (run again). | Australian clothing brands directory (beason.com.au): openness 59/100; big players d
- ✅ `niches` 40h ago: Niches: scored 6 of 6. | Hurricane history by coastal state: 33/100 (demand 0, money 0, ease 97, fit 42). | Freshwater fish species by state
- ✅ `discover` 3d ago: Discover: screened 12 new ideas for US$0.24; 3 promoted to scoring: US school district enrollment by county (2 free domains), US airport run
- ✅ `catalogue` 5d ago: Catalogue: queued 30 film(s): Sleepless in Seattle (1993): 135590/mo, Shaun of the Dead (2004): 135590/mo, Citizen Kane (1941): 135480/mo, T
- ✅ `ratings` 5d ago: Ratings: checked 40, updated 0; 0 never checked.
- ✅ `keywords` 6d ago: Victorian road trips and itineraries: day trips from melbourne 2900, great alpine road 1900, weekend getaways from melbourne 1900, romantic 
- ✅ `collections` 6d ago: Collections: created 3: 90s Family Movies (8 films, 18000/mo) → /discover/90s-family-movies; 2000s Comedy Movies (15 films, 11000/mo) → /dis
- ✅ `collcheck` 6d ago: Collection check: 29 idea(s) checked (US$0.077). Most winnable: Tom Hanks Movies 305400/mo × 21%; Christian Bale Movies 166600/mo × 16%; 90s

## Simon's list (open)

- ⚡ [do, 2 min] Cloudflare Email Routing: hello@victours.com.au → your Gmail (`email`)
- ⚡ [do, 5 min] Send the Halloween movie-night page and a Vic Tours road trip to a few group chats (posts in SHARE-POSTS.md) (`share`)
- · [do, 1 min] Community Help Co: Cloudflare → Rules → Redirect Rules → 'Redirect from WWW to root' (`chc-www`)
- · [do, 2 min] Bing Webmaster Tools: import both sites from Search Console (`bing`)
- · [do, 3 min] Cloudflare → Workers & Pages → Create → Import repository → site-factory. Name: shortlisted. Build: BRAND=shortlisted npm run build. Deploy: npx wrangler deploy --config brands/shortlisted/wrangler.jsonc (`sl-import`)
- · [do, 3 min] Get a free Adzuna API key (developer.adzuna.com) and add ADZUNA_APP_ID + ADZUNA_APP_KEY as GitHub secrets (`adzuna`)
- · [do, 3 min] Trade Admin: www.tradeadmin.com.au shows an error. In Cloudflare → tradeadmin.com.au → DNS, delete any leftover 'www' record, then check trade-admin → Domains & Routes lists www.tradeadmin.com.au (`ta-www`)
- · [do, 5 min] Community Help Co: Search Console → Add property → Domain → communityhelp.com.au (let Cloudflare add the record) → submit sitemap.xml; add the search-console-reader service account as a user (`chc-gsc`)
- · [do, 5 min] Community Help Co: create a GA4 property and send Claude the G- ID (`chc-ga4`)
- · [do, 5 min] Buy shortlisted.com.au (about A$25/yr at an AU registrar, with IMN's ABN) (`sl-domain`)
- · [do, 10 min] Cloudflare Access: login on /hq pages (both domains) (`access`)
- · [do, 10 min] Join Impact and Awin (`networks`)
- · [do, 10 min] Share communityhelp.com.au/resume-builder with 3 job services, schools or community groups you know (`chc-share-resume`)
- · [do, 15 min] Community Help Co: create a Google Business Profile as a service-area business (hide the address; service area Melbourne), link communityhelp.com.au (`chc-gbp`)
- · [do, 15 min] Trade Admin: apply to the Fergus referral partner and Tradify partner programmes (answers drafted by Claude) (`ta-partners`)

Done in the last 7 days: Vic Tours: put the 49 weekend plans live? (by train, budget,; CJ: tax form (W-8BEN-E) + payment method; In CJ, apply to Klook (Booking.com applied 23 Oct); Sign up to Discover Cars; Viator: account created 23 Oct. Finish "Get verified" on the; Apply to GetYourGuide; Join Commission Factory (ABN + AU$5 refundable pre-auth); OK the 90-day targets? Trailers 3,000 visits + 30 money clic; Dog breeds for November: go or no-go? Domain: breedpicker.co; Community Help Co: import the preview in Cloudflare (build: ; Community Help Co: send 3–4 lines of real background for the; Community Help Co: add communityhelp.com.au to Cloudflare, c; Shortlisted: OK the 'How we make money' wording (says the fo; Trade Admin: point tradeadmin.com.au's nameservers (GoDaddy); Cloudflare → Workers & Pages → Create → Import repository → 

## Claude is on

- Switch on affiliate buttons as each programme approves (vic)
- Fix thin Vic collections and town pages flagged by the quality gate (vic)
- Template the content engine during the dog breeds build (factory)
- Cover letter builder for Community Help Co (after the resume builder, live 23 Oct) (chc)

## Open GitHub issues

- none

## Changes in the last 7 days

100 commits (19 automated data updates). Hand-made changes:

- 2026-10-27 Daily brief: include Trade Admin traffic; mark ta-gsc done
- 2026-10-27 Trade Admin: GA4 ID is G-MLFVHPE242 (replaces G-ZCRGB48394)
- 2026-10-27 Fix trailers/HQ build: Trade Admin signup answers had no stats path (crashed /hq/signup); read() now tolerates
- 2026-10-27 GA4 tags for Community Help Co (G-W507HD781R) and Trade Admin (G-ZCRGB48394); add both to daily stats (Search 
- 2026-10-27 Community Help Co: hosted logo for Simon's email signature
- 2026-10-27 HQ: Trade Admin answers for the Fergus and Tradify partner applications (tap-to-copy at /hq/signup)
- 2026-10-26 Leads: daily call list [skip ci]
- 2026-10-26 HQ: Trade Admin on the dashboard and health check; Vic affiliates live; targets confirmed; niche jobs monitore
- 2026-10-25 Leads: daily call list [skip ci]
- 2026-10-25 Vic Tours: Viator products refreshed
- 2026-10-25 HQ: Trade Admin live; next steps on Simon's list [skip ci]
- 2026-10-25 Trade Admin: correct the Tradify vs ServiceM8 break-even (sole trader >50 jobs, pair >150)
- 2026-10-25 Trade Admin: unique worked-numbers section on each comparison page; fuller contact page
- 2026-10-25 Trade Admin: launch on tradeadmin.com.au (custom domains, indexable), contact page, IndexNow key
- 2026-10-24 Leads: daily call list [skip ci]
- 2026-10-24 HQ: Trade Admin launch steps on Simon's list [skip ci]
- 2026-10-24 Trade Admin: quote ABN wording; uitest can build and serve an undeployed brand; builder + calculator browser t
- 2026-10-24 Trade Admin: register brand and site module
- 2026-10-24 Trade Admin (preview): free quote and invoice builders for tradies, job app price comparisons with a cost calc
- 2026-10-24 Discover: log how many ideas Claude proposed and why any were dropped
- 2026-10-24 Discover: money first. Ideas must name a real affiliate programme or lead buyer with a per-sale/signup payout;
- 2026-10-24 Affiliates: Discover Cars car hire on Vic road trips and day trips (book_car counts as an affiliate click)
- 2026-10-24 HQ: Commission Factory applied [skip ci]
- 2026-10-24 Vic: Commission Factory site verification meta tag (brand config 'verify')
- 2026-10-24 Vic Tours: Viator products refreshed

## Where things live

- HQ data: hq/portfolio.json (sites, Simon's list, goals), hq/finance.json, hq/milestones.json, hq/reports/*.md
- Traffic: data/<brand>/stats.json (pipeline `stats` job, daily)
- Helpers for chat sessions: scripts/claude/README.md (probe live pages, SEO audit, run pipeline jobs)
- Decisions, costs, plans: the claude.ai Project docs (DECISIONS.md, COSTS.md, PRODUCTION-LINE.md, …)
