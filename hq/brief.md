# Site Factory brief — Tue 27 Oct 2026 (generated 00:43 UTC)

_Auto-written daily by scripts/hq/brief.py. Read this first in any new chat. Refresh: scripts/claude/brief.sh_

## Headline

Revenue to date **A$0.00** · sprint "First $1" ends in 4 days · Simon has **16** open items (~99 min)

## Traffic (last 28 days)

| Site | Station | Views (prev) | Last 7 days | CTA clicks | Google clicks / impressions |
|---|---|---|---|---|---|
| movietrailer.channel | Measure | 239 (103) | 15 11 4 4 4 3 1 | 0 | 7 / 667 |
| victours.com.au | Launch | 49 (0) | 2 9 3 28 7 | book_tour 2, website 1, map 1 | 2 / 635 |
| Community Help Co | Launch | not tracked yet | | | |

- **movietrailer.channel** (stats 4h ago) — top pages: / 98, /browse 10, /movies/schindlers-list-1994 9, /movies/star-wars-episode-v---the-empire-strikes-back-1980 9, /movies/star-wars-episode-vii---the-force-awakens-2015 6
  - Google: "ghost soldier movie 2006" 106 impr, pos 8.9; "the prestige trailer" 36 impr, pos 35.2; "home alone trailer" 33 impr, pos 41.8; "the sixth sense trailer" 32 impr, pos 29.2; "star wars episode 1 trailer" 23 impr, pos 41
- **victours.com.au** (stats 4h ago) — top pages: / 20, /towns 6, /warburton 5, /daylesford 2, /road-trips/goldfields-road-trip 2
  - Google: "sorrento restaurants" 66 impr, pos 90.6; "activities lorne victoria" 30 impr, pos 75.4; "best restaurants in mornington peninsula" 26 impr, pos 86.8; "1004 mornington-flinders road red hill vic 3937" 24 impr, pos 24.7; "bright things to do" 21 impr, pos 55.6

Latest milestones: 2026-10-15 trailers: Best day ever: 80 visits; 2026-10-15 trailers: Daily visits crossed 50; 2026-10-21 trailers: First Google clicks (7 in 28 days)

## Health

All checks passing ✅ (sites up, pipeline jobs fresh, live builds current, no failing workflows)

## Pipeline jobs (last run)

- ✅ `intake` 1h ago: Intake: 0 new trailer(s) queued. | Feed UCAP57cF-FSjJKzzXg7ntPlQ failed: YouTube feed UCAP57cF-FSjJKzzXg7ntPlQ: HTTP 404 | Feed UCtlPYzQ188v
- ✅ `stats` 4h ago: vic: 49 views, 4 CTA clicks, 2 Google clicks. | trailers: 239 views, 0 CTA clicks, 7 Google clicks. | trailers GA4: 66 page(s), 0 CTA click(
- ✅ `enrich` 6h ago: Enrich: looked at 0, published 0. Queue: 1 waiting for OMDb, 11 need review.
- ✅ `competition` 7h ago: Competition: checked 4; 5 still to check (run again). | Australian clothing brands directory (beason.com.au): openness 59/100; big players d
- ✅ `niches` 31h ago: Niches: scored 6 of 6. | Hurricane history by coastal state: 33/100 (demand 0, money 0, ease 97, fit 42). | Freshwater fish species by state
- ✅ `discover` 2d ago: Discover: screened 12 new ideas for US$0.24; 3 promoted to scoring: US school district enrollment by county (2 free domains), US airport run
- ✅ `catalogue` 4d ago: Catalogue: queued 30 film(s): Sleepless in Seattle (1993): 135590/mo, Shaun of the Dead (2004): 135590/mo, Citizen Kane (1941): 135480/mo, T
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
- · [do, 5 min] Trade Admin Search Console: remove the www sitemap, submit https://tradeadmin.com.au/sitemap.xml, then Settings → Users and permissions → add the …iam.gserviceaccount.com reader (copy it from Vic's users) as Restricted (`ta-gsc`)
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

100 commits (18 automated data updates). Hand-made changes:

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
- 2026-10-24 Viator: day-trip boxes only list tours from Melbourne (no entry tickets or balloon flights); 'Book on Viator' 
- 2026-10-24 Vic Tours: Viator products refreshed
- 2026-10-24 Affiliates: GetYourGuide as the second tours link on Vic Tours; Klook approved (IDs saved, not wired)
- 2026-10-24 Vic: Viator tickets on matched attractions and 'Rather not drive?' guided tours on day trips (filled weekly fr
- 2026-10-24 Affiliates: switch on Viator tours buttons on Vic Tours (campaign label per town); GetYourGuide approved
- 2026-10-24 Affiliates: tick GetYourGuide signup (welcome email 24 Oct)

## Where things live

- HQ data: hq/portfolio.json (sites, Simon's list, goals), hq/finance.json, hq/milestones.json, hq/reports/*.md
- Traffic: data/<brand>/stats.json (pipeline `stats` job, daily)
- Helpers for chat sessions: scripts/claude/README.md (probe live pages, SEO audit, run pipeline jobs)
- Decisions, costs, plans: the claude.ai Project docs (DECISIONS.md, COSTS.md, PRODUCTION-LINE.md, …)
