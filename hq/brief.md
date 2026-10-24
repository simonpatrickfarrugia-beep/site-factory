# Site Factory brief — Sun 25 Oct 2026 (generated 23:36 UTC)

_Auto-written daily by scripts/hq/brief.py. Read this first in any new chat. Refresh: scripts/claude/brief.sh_

## Headline

Revenue to date **A$0.00** · sprint "First $1" ends in 6 days · Simon has **15** open items (~86 min)

## Traffic (last 28 days)

| Site | Station | Views (prev) | Last 7 days | CTA clicks | Google clicks / impressions |
|---|---|---|---|---|---|
| movietrailer.channel | Measure | 249 (92) | 1 15 11 4 4 4 3 | 0 | 7 / 665 |
| victours.com.au | Launch | 14 (0) | 2 9 3 | map 1 | 0 / 31 |
| Community Help Co | Launch | not tracked yet | | | |

- **movietrailer.channel** (stats 3h ago) — top pages: / 101, /movies/schindlers-list-1994 11, /browse 10, /movies/star-wars-episode-v---the-empire-strikes-back-1980 9, /movies/star-wars-episode-vii---the-force-awakens-2015 6
  - Google: "ghost soldier movie 2006" 107 impr, pos 8.9; "the prestige trailer" 36 impr, pos 35.2; "home alone trailer" 33 impr, pos 41.8; "the sixth sense trailer" 31 impr, pos 28; "star wars episode 1 trailer" 23 impr, pos 41
- **victours.com.au** (stats 3h ago) — top pages: / 8, /daylesford 2, /richmond 1, /richmond/do 1, /road-trips/yarra-valley-day-trip 1
  - Google: "1004 mornington-flinders road red hill vic 3937" 6 impr, pos 22.3; "apollo bay" 4 impr, pos 77.3; "day tours from melbourne" 3 impr, pos 67.7; "st kilda 3182" 3 impr, pos 76.3; "bairnsdale beach" 2 impr, pos 47.5

Latest milestones: 2026-10-15 trailers: Best day ever: 80 visits; 2026-10-15 trailers: Daily visits crossed 50; 2026-10-21 trailers: First Google clicks (7 in 28 days)

## Health

- https://www.movietrailer.channel is serving an older build (b437ccb); expected 01b1736 "Trade Admin: quote ABN wording; uitest can build and serve a". Workers Builds may have skipped a deploy: push an empty commit.
- https://victours.com.au is serving an older build (b437ccb); expected 01b1736 "Trade Admin: quote ABN wording; uitest can build and serve a". Workers Builds may have skipped a deploy: push an empty commit.
- https://communityhelp.com.au is serving an older build (b437ccb); expected 01b1736 "Trade Admin: quote ABN wording; uitest can build and serve a". Workers Builds may have skipped a deploy: push an empty commit.

## Pipeline jobs (last run)

- ✅ `stats` 3h ago: vic: 14 views, 1 CTA clicks, 0 Google clicks. | trailers: 249 views, 0 CTA clicks, 7 Google clicks. | trailers GA4: 70 page(s), 0 CTA click(
- ✅ `enrich` 5h ago: Enrich: looked at 15, published 13 (Annie Hall (1977) → /movies/annie-hall-1977; Chitty Chitty Bang Bang (1968) → /movies/chitty-chitty-bang
- ✅ `discover` 6h ago: Discover: screened 12 new ideas for US$0.24; 3 promoted to scoring: US school district enrollment by county (2 free domains), US airport run
- ✅ `intake` 12h ago: Intake: 0 new trailer(s) queued.
- ✅ `catalogue` 2d ago: Catalogue: queued 30 film(s): Sleepless in Seattle (1993): 135590/mo, Shaun of the Dead (2004): 135590/mo, Citizen Kane (1941): 135480/mo, T
- ✅ `ratings` 2d ago: Ratings: checked 40, updated 0; 0 never checked.
- ✅ `niches` 3d ago: Niches: scored 3 of 3. | Australian clothing brands directory (beason.com.au): 50/100 (demand 43, money 61, ease 60, fit 34). | Australian l
- ✅ `keywords` 4d ago: Victorian road trips and itineraries: day trips from melbourne 2900, great alpine road 1900, weekend getaways from melbourne 1900, romantic 
- ✅ `collections` 4d ago: Collections: created 3: 90s Family Movies (8 films, 18000/mo) → /discover/90s-family-movies; 2000s Comedy Movies (15 films, 11000/mo) → /dis
- ✅ `collcheck` 4d ago: Collection check: 29 idea(s) checked (US$0.077). Most winnable: Tom Hanks Movies 305400/mo × 21%; Christian Bale Movies 166600/mo × 16%; 90s

## Simon's list (open)

- ⚡ [do, 2 min] Cloudflare Email Routing: hello@victours.com.au → your Gmail (`email`)
- ⚡ [do, 5 min] Send the Halloween movie-night page and a Vic Tours road trip to a few group chats (posts in SHARE-POSTS.md) (`share`)
- · [do, 1 min] Community Help Co: Cloudflare → Rules → Redirect Rules → 'Redirect from WWW to root' (`chc-www`)
- · [do, 2 min] Bing Webmaster Tools: import both sites from Search Console (`bing`)
- · [do, 3 min] Cloudflare → Workers & Pages → Create → Import repository → site-factory. Name: shortlisted. Build: BRAND=shortlisted npm run build. Deploy: npx wrangler deploy --config brands/shortlisted/wrangler.jsonc (`sl-import`)
- · [do, 3 min] Get a free Adzuna API key (developer.adzuna.com) and add ADZUNA_APP_ID + ADZUNA_APP_KEY as GitHub secrets (`adzuna`)
- · [do, 5 min] Community Help Co: Search Console → Add property → Domain → communityhelp.com.au (let Cloudflare add the record) → submit sitemap.xml; add the search-console-reader service account as a user (`chc-gsc`)
- · [do, 5 min] Community Help Co: create a GA4 property and send Claude the G- ID (`chc-ga4`)
- · [do, 5 min] Buy shortlisted.com.au (about A$25/yr at an AU registrar, with IMN's ABN) (`sl-domain`)
- · [do, 5 min] Trade Admin: point tradeadmin.com.au's nameservers (GoDaddy) to Cloudflare (`ta-dns`)
- · [do, 5 min] Cloudflare → Workers & Pages → Create → Import repository → site-factory. Name: trade-admin. Build command: BRAND=trade-admin npm run build. Deploy command: npx wrangler deploy --config brands/trade-admin/wrangler.jsonc (`ta-import`)
- · [do, 10 min] Cloudflare Access: login on /hq pages (both domains) (`access`)
- · [do, 10 min] Join Impact and Awin (`networks`)
- · [do, 10 min] Share communityhelp.com.au/resume-builder with 3 job services, schools or community groups you know (`chc-share-resume`)
- · [do, 15 min] Community Help Co: create a Google Business Profile as a service-area business (hide the address; service area Melbourne), link communityhelp.com.au (`chc-gbp`)

Done in the last 7 days: Vic Tours: put the 49 weekend plans live? (by train, budget,; CJ: tax form (W-8BEN-E) + payment method; In CJ, apply to Klook (Booking.com applied 23 Oct); Sign up to Discover Cars; Viator: account created 23 Oct. Finish "Get verified" on the; Apply to GetYourGuide; Join Commission Factory (ABN + AU$5 refundable pre-auth); OK the 90-day targets? Trailers 3,000 visits + 30 money clic; Dog breeds for November: go or no-go? Domain: breedpicker.co; Community Help Co: import the preview in Cloudflare (build: ; Community Help Co: send 3–4 lines of real background for the; Community Help Co: add communityhelp.com.au to Cloudflare, c; Shortlisted: OK the 'How we make money' wording (says the fo

## Claude is on

- Switch on affiliate buttons as each programme approves (vic)
- Fix thin Vic collections and town pages flagged by the quality gate (vic)
- Template the content engine during the dog breeds build (factory)
- Cover letter builder for Community Help Co (after the resume builder, live 23 Oct) (chc)

## Open GitHub issues

- none

## Changes in the last 7 days

100 commits (14 automated data updates). Hand-made changes:

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
- 2026-10-23 Leads: daily call list [skip ci]
- 2026-10-23 HQ: free domains for this week's discovered niches [skip ci]
- 2026-10-23 Discover: Claude suggests 6 domain names per idea; promoted ideas get them checked (Verisign RDAP for .com, DN
- 2026-10-23 Discover: get Claude's idea list as a forced tool call (always valid JSON)
- 2026-10-23 Discover: retry once if Claude's idea list isn't valid JSON
- 2026-10-23 Discover: whole-word topic match (dam no longer matches madam)
- 2026-10-23 Discover: count only searches containing the topic's own words (server-side regex), so the screen isn't fooled
- 2026-10-23 Pipeline: weekly niche discovery (Claude proposes ideas, one DataForSEO Labs call each screens for 100+/mo sea

## Where things live

- HQ data: hq/portfolio.json (sites, Simon's list, goals), hq/finance.json, hq/milestones.json, hq/reports/*.md
- Traffic: data/<brand>/stats.json (pipeline `stats` job, daily)
- Helpers for chat sessions: scripts/claude/README.md (probe live pages, SEO audit, run pipeline jobs)
- Decisions, costs, plans: the claude.ai Project docs (DECISIONS.md, COSTS.md, PRODUCTION-LINE.md, …)
