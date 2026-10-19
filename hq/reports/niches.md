# Niche finder

Updated 2026-10-19. Google searches in the United States unless an idea says otherwise (Market column). Score = 30% demand + 25% money (CPC) + 25% ease (SEO difficulty) + 20% fit (Claude: data source, automation, monetisation, risk).

Add ideas by chat: "score these niches: …". Rules: launch at most one new site a month, only while the last one is on track.

## Ranking

| # | Idea | Market | Score | Demand | Money | Ease | Fit | Searches/mo | Median CPC | Avg difficulty |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Dog breeds | United States | **75** | 100 | 66 | 78 | 46 | 54,904,000 | $1.34 | 22 |
| 2 | US national parks and hiking trails | United States | **74** | 100 | 66 | 78 | 42 | 17,831,200 | $1.33 | 22 |
| 3 | TV shows: where to watch | United States | **73** | 91 | 91 | 68 | 30 | 5,543,800 | $3.55 | 32 |
| 4 | Anime: where to watch and watch order | United States | **70** | 100 | 66 | 60 | 42 | 20,483,800 | $1.31 | 40 |
| 5 | Victoria: where to stay by town | Australia | **66** | 63 | 69 | 90 | 38 | 780,660 | $1.51 | 10 |
| 6 | Video games: release dates and trailers | United States | **62** | 100 | 32 | 62 | 40 | 14,104,000 | $0.35 | 38 |
| 7 | Board games | United States | **61** | 78 | 32 | 84 | 42 | 2,245,200 | $0.35 | 16 |
| 8 | Victoria: things to do by town | Australia | **59** | 52 | 47 | 95 | 38 | 353,780 | $0.63 | 5 |
| 9 | Book series in reading order | United States | **53** | 90 | 25 | 50 | 38 | 4,912,700 | $0.27 | — |
| 10 | Movie soundtracks and film music | United States | **53** | 79 | 0 | 81 | 45 | 2,377,600 | $0.08 | 19 |
| 11 | Victoria: where to eat by town | Australia | **52** | 40 | 41 | 96 | 27 | 155,710 | $0.50 | 4 |

## Dog breeds: 75/100

**Verdict:** Breed data is free and easy to structure, but the same facts already sit on AKC, Wikipedia and Dogtime, so generic breed pages would be thin. It only works if the site becomes a breed-matching and sizing tool, where the data drives decisions and product fit.

**Site angle:** A breed-matching and fit-guide site: one page per breed with data-driven tables (adult weight, lifespan, grooming, energy, apartment suitability), plus comparison pages and product guides where the recommended size comes from the breed's adult weight range (crate, harness and bed sizes), not generic copy.

**Data sources:** The Dog API (thedogapi.com): free key, breed attributes (weight, height, life span, temperament, group). Check image licences before reuse.; Wikidata (CC0): breed entities, country of origin, breed group, aliases for deduplicating keyword variants; Wikipedia summaries (CC BY-SA): attribute with link-back, do not copy wholesale; Kaggle dog breed datasets: verify each licence individually before use; Your own derived fields: size band, grooming tier and apartment-suitability score, computed from the raw attributes and documented as your methodology

**Money:** Amazon Associates: crates, harnesses and beds filtered by breed size band (note the 3-sales-in-180-days rule to stay active); Chewy and Petco affiliate programmes via Impact or CJ, for food and supplies by life stage and size; Pet insurance lead or CPA offers (e.g., Healthy Paws, Trupanion, Embrace), which pay well per lead but have strict disclosure and advertising rules; Display ads (Mediavine or Raptive) only after you reach their traffic thresholds, which a small site may take a long time to hit

**Page types:** /breeds/[breed]: data table plus short fit summary, unique per breed; /compare/[breedA]-vs-[breedB]: generated from the attribute diff, which is the strongest thin-content defence; /breeds/for/[lifestyle]: e.g., apartment-friendly, low-shedding, under-20kg, good-with-kids, filtered from the data; /crates/[breed] or /harness/[breed]: product guides sized from adult weight range; /breeds/group/[group]: hub pages linking the breeds in each AKC group

**Risks:** Thin, near-duplicate pages if the template is filled with generic copy; the comparison and filter pages are your main defence; Keyword list is noisy: typos (belgium malawa, belgian malamute), duplicates (german shepherd vs german shepherd dog, great pyrenees vs great pyrenees dog) and synonyms (aussie shepherd vs australian shepherd). Dedupe to canonical breeds before generating anything; Health and lifespan claims edge toward pet-health advice; keep them sourced, dated and non-prescriptive; Breed controversy (pit bull, bully breeds, greyhound welfare) needs careful, neutral framing and can attract complaints or outrage traffic; Image copyright: breed photos from The Dog API or stock may not be reusable; use licensed or self-sourced images; Heavy competition from AKC, Wikipedia, Dogtime, Dogster and PetMD on head terms; the head terms are mostly informational and earn little, so the revenue case rests on lower-volume transactional long-tail pages; Insurance lead programmes are strict about disclosure and claims, so a mis-stated coverage claim can get the account closed; The CPC numbers are for the head terms; the money is in product-intent queries, which need verifying in your own keyword tool

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| greyhounds | 1,220,000 | 18 | $0.32 |
| cane corso | 1,000,000 | 27 | $0.42 |
| dachshund | 673,000 | 29 | $1.59 |
| chihuahua | 673,000 | 27 | $1.76 |
| australian shepherds | 673,000 | 27 | $1.31 |
| aussie shepherd | 673,000 | 30 | $1.31 |
| shih tzu | 550,000 | 28 | $1.26 |
| belgian malinois | 550,000 | 16 | $0.94 |
| doberman | 550,000 | 18 | $1.23 |
| belgium malawa | 550,000 | 16 | $0.94 |
| belgian malamute | 550,000 | 16 | $0.94 |
| dog breed shih tzu | 550,000 | 10 | $1.26 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| greyhounds | 1,220,000 | 18 | $0.32 |
| cane corso | 1,000,000 | 27 | $0.42 |
| pit bull | 823,000 | 37 | $0.89 |
| golden retriever | 673,000 | 58 | $1.91 |
| dachshund | 673,000 | 29 | $1.59 |
| chihuahua | 673,000 | 27 | $1.76 |
| australian shepherds | 673,000 | 27 | $1.31 |
| aussie shepherd | 673,000 | 30 | $1.31 |
| shih tzu | 550,000 | 28 | $1.26 |
| german shepherd | 550,000 | 39 | $1.59 |
| belgian malinois | 550,000 | 16 | $0.94 |
| doberman | 550,000 | 18 | $1.23 |
| german shepherd dog | 550,000 | 39 | $1.59 |
| belgium malawa | 550,000 | 16 | $0.94 |
| belgian malamute | 550,000 | 16 | $0.94 |

_Seeds: dog breeds, best dog breeds, dog breed temperament, hypoallergenic dogs, small dog breeds. Data cost: US$0.114._

## US national parks and hiking trails: 74/100

**Verdict:** The data is excellent (NPS API plus open trail geometry supports thousands of genuinely distinct park, trail and waterfall pages), but most of the big volume sits in "near me" queries that are map-pack and app driven and that a static site rarely wins. The realistic prize is the long tail of park, trail and state pages, and the competition there (NPS.gov, AllTrails, Hiking Project-style aggregators) is stiff.

**Site angle:** A data-first trail directory: /parks/[park-slug]/trails/[trail-slug] for NPS units plus /waterfalls/[state]/[name] and /hikes/[state]/[length-or-difficulty] hubs, each page built from NPS fields and trail geometry (length, elevation gain, loop or out-and-back, nearest campground, permit requirements, seasonal closures). Target 'waterfalls near me' and state-level hike lists rather than the 'near me' head terms. Keep AI copy to short intros, and let the computed stats do most of the work.

**Data sources:** NPS Developer API (developer.nps.gov, free key): parks, alerts, campgrounds, activities, places, public-domain imagery; USGS National Map / 3DEP elevation data (free) for elevation profiles; OpenStreetMap trail and waterway extracts via Overpass or Geofabrik (ODbL: attribution and share-alike obligations on the database); Recreation.gov data where licence terms allow (check before scraping; prefer documented access); USGS NHD for waterfall and stream points, cross-checked with GNIS names

**Money:** Amazon Associates (outdoor gear, low commission but high volume); REI affiliate programme, if still open to new applicants when you apply; Booking.com or Expedia affiliate for lodging near parks; GetYourGuide or Viator partner programmes for guided tours near parks; Hipcamp affiliate, if accepted, for campsites; Display ads via Mediavine or Raptive only after they accept you (traffic thresholds apply)

**Page types:** /parks/[park]/trails/[trail]: distance, elevation, loop type, trailhead coordinates, NPS alerts, nearby campgrounds; /waterfalls/[state]/[waterfall]: height, flow data where available, access trail length, nearest park; /hikes/[state]/[length-band]: filtered lists generated from the same trail table; /parks/[park]: hub page linking trails, campgrounds and alerts; /[state]/state-parks/[park]: state-level park pages, only if state datasets are actually consistent

**Risks:** Hiking safety and YMYL-adjacent liability: trail conditions, weather, wildlife and rescue information can be dangerous if stale. Show data timestamps, avoid advice beyond the source, and carry a clear disclaimer.; Licence risk: OSM is ODbL (share-alike and attribution). NPS content is generally public domain, but NPS-branded logos, trademarks and some photos may not be. Check each source's terms.; Keyword data is suspicious: many 'near me' terms show KD 0 at 550k volume, which doesn't match SERP reality. Validate with live SERPs before committing.; 'Near me' intent is mostly local-pack and app intent (Google Maps, AllTrails, phone location), so a static site will struggle to rank for it.; Competition from NPS.gov, AllTrails, Hipcamp and Gaia GPS on the head terms, and from Google's own features on park pages.; Thin-content penalty if trail pages differ only by name and coordinates. Each page needs a computed, non-generic data set (elevation, loop shape, closures, nearby services).; Affiliate income depends on seasonality (summer peaks) and on gear and lodging conversion rates that are typically low for content sites.; Park-related data can change quickly (closures, fire restrictions, permit rules), so you need a refresh pipeline and alerting or pages will go stale.

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| hiking trails near me | 550,000 | 0 | $1.33 |
| trails near me | 550,000 | 11 | $1.74 |
| hiking spots near me | 550,000 | 11 | $1.33 |
| hiking areas near me | 550,000 | 13 | $1.33 |
| hiking paths near me | 550,000 | 14 | $1.33 |
| trekking trails near me | 550,000 | 0 | $1.33 |
| hikes and trails near me | 550,000 | 29 | $1.33 |
| areas to hike near me | 550,000 | 0 | $1.33 |
| hiking destinations near me | 550,000 | 0 | $1.33 |
| trail paths near me | 550,000 | 11 | $1.74 |
| spots to hike near me | 550,000 | 11 | $1.33 |
| hiking grounds near me | 550,000 | 0 | $1.33 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| national parks | 550,000 | 87 | $1.06 |
| hiking trails near me | 550,000 | 0 | $1.33 |
| trails near me | 550,000 | 11 | $1.74 |
| hiking spots near me | 550,000 | 11 | $1.33 |
| hiking areas near me | 550,000 | 13 | $1.33 |
| hiking paths near me | 550,000 | 14 | $1.33 |
| trekking trails near me | 550,000 | 0 | $1.33 |
| hikes and trails near me | 550,000 | 29 | $1.33 |
| areas to hike near me | 550,000 | 0 | $1.33 |
| hiking destinations near me | 550,000 | 0 | $1.33 |
| trail paths near me | 550,000 | 11 | $1.74 |
| spots to hike near me | 550,000 | 11 | $1.33 |
| hiking grounds near me | 550,000 | 0 | $1.33 |
| local hiking spots near me | 550,000 | 0 | $1.33 |
| near me hiking trails | 550,000 | 0 | $1.33 |

_Seeds: national parks, hiking trails near me, best hikes, national park camping, state parks. Data cost: US$0.114._

## TV shows: where to watch: 73/100

**Verdict:** The head terms ('where to watch', 'where can i watch') are high-CPC but dominated by Google's own streaming panel, JustWatch, Reelgood and big publishers, and TMDB watch-provider data is commodity information that many sites already republish. Viable only as a narrow, data-rich long tail, and TMDB's commercial-use terms for watch-provider data must be checked first.

**Site angle:** A US-only 'where to watch [TV show]' site with one page per show and season, built around what the free data can't show: season-by-season availability, free-with-ads (FAST/AVOD) options vs paid tiers, which service is cheapest for a full binge, and buy/rent prices from Watchmode. Use a 'where to watch [show] for free' sub-page only where a free provider actually carries it. Start with 200-300 currently airing or recently popular shows, not the whole catalogue.

**Data sources:** TMDB API /tv/{id}/watch/providers (JustWatch-sourced, US region) plus /tv/{id} for seasons, episode counts and air dates (check TMDB commercial-use terms first); Watchmode API (sources, prices, free-tier availability; check current free-tier limits and terms); Wikidata for show IDs and cross-referencing; Google Trends / Search Console for prioritising which shows to generate

**Money:** Amazon Associates links for Prime Video and rentals (Amazon Associates program); Affiliate programmes for streamers and vPNs/bundles via Impact, CJ or Partnerize, where they exist and are current (verify each one); Display ads once traffic justifies it (Ezoic early on; Mediavine or Raptive later, both with traffic thresholds); Sponsored YouTube-embed or trailer-channel cross-promotion from the sister site

**Page types:** /tv/[show]/ (canonical availability page per show, US only); /tv/[show]/free/ (only where a free or FAST provider carries it); /tv/[show]/season-[n]/ (only where provider differs by season); /where-to-stream/[service]/ (hub listing shows on that service, with real counts); /free-tv/ and /free-movies/ hubs, with real provider counts and last-checked dates

**Risks:** Google's own 'where to watch' SERP panel and big incumbents (JustWatch, Reelgood, Rotten Tomatoes, Decider) will absorb most clicks on the head terms; TMDB and JustWatch data licensing: commercial use of watch-provider data may require a separate agreement, and a takedown would kill the whole site; Thin-content risk: a page that only lists providers is exactly the mass-produced pattern Google penalises unless the extra data is real; Staleness: availability changes weekly and wrong 'where to watch' answers hurt trust and user satisfaction; Much of the listed volume is for movies (e.g., The Grinch, Twilight films), outside a TV-only scope; Affiliate programme terms for streamers change often and many have no public programme; Low CPC-to-RPM after affiliate rules, and display ads won't pay until traffic is large; Some keywords, e.g. 'where can you watch schitt's creek', have no KD value, so keyword data is incomplete

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| where to watch twilight | 60,500 | 30 | $3.55 |
| where can i watch the grinch | 60,500 | 1 | $4.64 |
| where can i watch the twilight movies | 60,500 | 18 | $3.55 |
| where can you watch twilight | 60,500 | 30 | $3.55 |
| where can you watch the grinch | 60,500 | 0 | $4.64 |
| where can i watch the grinch who stole christmas | 60,500 | 1 | $4.64 |
| where can i watch the twilight saga | 60,500 | 30 | $3.55 |
| where to watch modern family | 49,500 | 26 | $5.07 |
| where can i watch modern family | 49,500 | 26 | $5.07 |
| where can i watch the notebook | 49,500 | 14 | $2.51 |
| where can you watch modern family | 49,500 | 26 | $5.07 |
| where to watch from tv series | 49,500 | 13 | $4.24 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| where to watch | 301,000 | 90 | $6.26 |
| where can you watch | 301,000 | 100 | $6.26 |
| where can i watch it | 135,000 | 64 | $3.64 |
| where can you watch it | 135,000 | 64 | $3.64 |
| where can i watch | 90,500 | 47 | $8.43 |
| where to stream | 90,500 | 100 | $2.98 |
| where can i stream | 90,500 | 89 | $2.98 |
| where to watch twilight | 60,500 | 30 | $3.55 |
| where can i watch the grinch | 60,500 | 1 | $4.64 |
| where can i watch the twilight movies | 60,500 | 18 | $3.55 |
| where can you watch twilight | 60,500 | 30 | $3.55 |
| where can you watch the grinch | 60,500 | 0 | $4.64 |
| where can i watch the grinch who stole christmas | 60,500 | 1 | $4.64 |
| where can i watch the twilight saga | 60,500 | 30 | $3.55 |
| where to watch modern family | 49,500 | 26 | $5.07 |

_Seeds: where to watch, what streaming service has, is it on netflix, tv show streaming guide, where can i watch. Data cost: US$0.114._

## Anime: where to watch and watch order: 70/100

**Verdict:** The data is usable: AniList gives clean, free, structured anime metadata, and streaming availability can be layered on. But the highest-volume and highest-CPC terms are piracy queries (kissanime, gogoanime, free anime websites) you should avoid, and 'where to watch' is already dominated by JustWatch, Reelgood and the platforms themselves, so the pages need a regional or watch-order angle to earn a place.

**Site angle:** A country-specific 'where to watch [anime] in [country]' directory built from AniList IDs and streaming-availability data, plus a 'watch order' page for each franchise that covers sequels, prequels, movies and OVAs. Start with 3 to 5 English-speaking markets (US, UK, CA, AU) and only expand if the first set gets impressions. Do not target piracy terms.

**Data sources:** AniList GraphQL API (free, non-commercial rate limits; check current commercial terms and attribution requirements); Jikan API (unofficial MyAnimeList REST wrapper, free, rate-limited) for cross-checking titles and episode counts; Watchmode API (free tier with call limits, paid tiers for scale) for streaming availability by country; TMDB API (free, includes watch-provider data sourced from JustWatch; commercial use requires checking their terms); Wikidata (CC0) for franchise and character relationships

**Money:** Amazon Associates for Blu-ray, manga and merchandise links (low commission but reliable); Crunchyroll affiliate, only if you can confirm an active program; do not assume it exists; JustWatch or Watchmode partner/affiliate programs, if available in your target markets (verify); Display ads (Mediavine or Raptive once traffic thresholds are met; expect low RPM on anime pages); Email lead capture for a 'what to watch next' newsletter, if the traffic justifies it

**Page types:** /where-to-watch/[anime-slug]/[country] pages: availability per service, price tier, subtitle/dub status; /watch-order/[franchise-slug] pages: chronological and release order built from AniList relations, with movies and OVAs placed by date; /service/[streaming-service]/anime pages: list of anime available on that service in each country; /genre/[genre]/[country] pages: top-rated titles with current availability (AniList score and popularity); /compare/[franchise-a]-vs-[franchise-b] pages only where you can add real differences in data

**Risks:** Piracy-adjacent head terms (kissanime, gogoanime, free anime websites) carry legal exposure and ad networks often reject them; exclude them and do not link to pirate sites; Streaming availability changes often and varies by region; stale data will produce wrong 'where to watch' answers, so you need a refresh pipeline and visible last-updated dates; Watch-order information is partly editorial (fillers, recaps, what counts as canon); AniList relations alone are not enough, and scraping filler lists may breach their terms; Crunchyroll's affiliate availability is unverified, so the main revenue assumption may fail; Anime fan audiences are concentrated on Reddit, Discord and YouTube, so organic traffic from search alone may be modest; Many franchise keywords (naruto, dragon ball z, dbz, dragonball z) are duplicates or variants, so you must consolidate them to avoid cannibalisation; Poster and key-art images are copyrighted; use AniList or TMDB image endpoints under their terms or skip imagery; Thin pages risk: if the copy is only templated 'X is available on Y', Google may treat the site as low value, so each page needs unique data such as dub availability, price changes or regional differences

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| kissanime | 1,500,000 | 13 | $4.76 |
| berserk | 201,000 | 30 | $1.00 |
| gogoanime | 201,000 | 11 | $4.03 |
| hulu anime | 201,000 | 5 | $2.75 |
| hulu animes | 201,000 | 5 | $2.75 |
| free anime websites | 165,000 | 12 | $3.95 |
| anime shows on netflix | 165,000 | 15 | $0.12 |
| crunchyroll one piece | 135,000 | 12 | $5.85 |
| watch cartoon online | 135,000 | 0 | $3.11 |
| one punch man season 3 | 110,000 | 15 | $2.24 |
| anime series | 90,500 | 30 | $0.82 |
| kamisama kiss | 90,500 | 30 | $2.70 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| kissanime | 1,500,000 | 13 | $4.76 |
| naruto | 673,000 | 66 | $0.91 |
| my hero academia | 450,000 | 64 | $0.98 |
| dragon ball z | 301,000 | 63 | $0.65 |
| sailor moon | 301,000 | 50 | $0.29 |
| dragonball z | 301,000 | 84 | $0.65 |
| death note | 301,000 | 48 | $1.35 |
| jojo's bizarre adventure | 301,000 | 41 | $0.95 |
| dbz | 301,000 | 55 | $0.65 |
| dragon ballz | 301,000 | 63 | $0.65 |
| one punch man | 201,000 | 58 | $2.27 |
| hunter x hunter | 201,000 | 46 | $1.29 |
| berserk | 201,000 | 30 | $1.00 |
| high school dxd | 201,000 | 42 | $3.52 |
| gogoanime | 201,000 | 11 | $4.03 |

_Seeds: anime watch order, where to watch anime, best anime, anime streaming, anime series. Data cost: US$0.114._

## Victoria: where to stay by town: 66/100

**Verdict:** The keyword list is mostly branded hotel names (Yarra Valley Lodge, Mantra Lorne, Lake House) that Google will send to the hotels and big OTAs, so it isn't a real opportunity. The generic town terms (Daylesford, Phillip Island, Lorne) are winnable but small, and the volumes are US-search figures that overstate Australian demand. Only a narrow, data-differentiated town guide has a chance.

**Site angle:** A Victoria 'stays near' guide covering about 25-30 towns that each have 10+ accommodation listings. Each page is /stay/[town-vic] with a computed table of properties and attributes (distance to beach, winery, station or town centre, bed count, property type) from OSM, plus live Booking/Expedia prices and ratings where the feed allows. Skip hotel-brand pages entirely.

**Data sources:** OpenStreetMap via Overpass API (tourism=hotel/motel/guest_house/caravan_site/alpine_hut; ODbL, attribution required); Booking.com Affiliate Partner / Demand API (approval required; prices, ratings, availability); Expedia Group Rapid/EPS affiliate feed (approval required); Victorian open data (data.vic.gov.au) for town boundaries and locality points; Wikidata/Wikipedia for town descriptions (CC BY-SA; attribution required)

**Money:** Booking.com affiliate commission (Booking Partner programme); Expedia Group affiliate commission; Agoda affiliate programme as a secondary feed; Display ads (Mediavine or Ezoic once traffic thresholds are met; low RPM for travel at small scale); Direct referral or lead forms for holiday rental management companies, if local ones exist

**Page types:** /stay/[town]-vic: all accommodation in a town, with the computed attribute table; /stay/[town]-vic/[type]: e.g. hotels, B&Bs, cabins, caravan parks, per town (only where 10+ listings exist); /stay-near/[landmark]-vic: e.g. stays near Great Ocean Road, Phillip Island Penguin Parade, Grampians (only where data is genuinely distinct); Index hub /victoria/ with town list ranked by listing count and distance data

**Risks:** Thin-content and scaled-content penalties: a list plus affiliate links with AI copy is exactly what Google's spam policies target; each page needs unique computed facts, not just generated prose; Booking.com and Expedia feed approval can take weeks and may reject a new site with little traffic; US search volume and USD CPC do not reflect Australian search; validate with Google Keyword Planner set to Australia; Brand-name queries (Lake House, Balgownie, Mantra) are controlled by the hotels and OTAs; targeting them invites trademark issues and gives no ranking chance; OSM data quality varies by town; rural listings can be stale or missing, causing empty or wrong pages; Crowded affiliate SERPs with Booking, Expedia, TripAdvisor, Wotif and Hotels.com; a small site competes on specificity, not authority; Seasonal demand (Victorian ski, coast and wine peaks) and low RPM make revenue lumpy; Booking.com affiliate terms restrict displaying prices or data outside their approved formats and can require caching limits; check before automating

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| yarra valley lodge | 14,800 | 13 | $1.03 |
| mantra lorne accommodation | 14,800 | 0 | $1.93 |
| yarra valley lodge accommodation | 14,800 | 13 | $1.03 |
| accommodation lorne mantra | 14,800 | 0 | $1.93 |
| yarra valley lodge hotel | 14,800 | 13 | $1.03 |
| balgownie yarra valley accommodation | 14,800 | 0 | $0.68 |
| balgownie estate yarra valley accommodation | 14,800 | 0 | $0.68 |
| balgownie estate vineyard resort & spa yarra valley | 14,800 | 0 | $0.68 |
| lake house daylesford accommodation | 9,900 | 3 | $0.72 |
| accommodation daylesford lake house | 9,900 | 3 | $0.72 |
| lake house daylesford hotel | 9,900 | 3 | $0.72 |
| phillip island accommodation | 8,100 | 0 | $1.69 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| yarra valley lodge | 14,800 | 13 | $1.03 |
| mantra lorne accommodation | 14,800 | 0 | $1.93 |
| yarra valley lodge accommodation | 14,800 | 13 | $1.03 |
| accommodation lorne mantra | 14,800 | 0 | $1.93 |
| yarra valley lodge hotel | 14,800 | 13 | $1.03 |
| balgownie yarra valley accommodation | 14,800 | 0 | $0.68 |
| balgownie estate yarra valley accommodation | 14,800 | 0 | $0.68 |
| balgownie estate vineyard resort & spa yarra valley | 14,800 | 0 | $0.68 |
| lake house daylesford accommodation | 9,900 | 3 | $0.72 |
| accommodation daylesford lake house | 9,900 | 3 | $0.72 |
| lake house daylesford hotel | 9,900 | 3 | $0.72 |
| lakehouse at daylesford | 9,900 | — | $0.72 |
| phillip island accommodation | 8,100 | 0 | $1.69 |
| daylesford hotel | 8,100 | 2 | $1.10 |
| lorne hotels | 8,100 | 0 | $1.44 |

_Seeds: accommodation daylesford, where to stay in bright, phillip island accommodation, lorne accommodation, yarra valley accommodation, weekend getaways victoria, romantic getaways victoria. Data cost: US$0.114._

## Video games: release dates and trailers: 62/100

**Verdict:** The data is free, large and genuinely refreshes, so per-game pages can be useful. But the high-volume terms are brand or navigational queries owned by Nintendo, publishers and fast news sites, the CPCs are low (about $0.30 typical), and display ads will take a long time to reach.

**Site angle:** A per-game 'release date, platforms and trailer' reference site for upcoming and recent games, with one page per title (/game/[slug]) and hubs by platform and release month (/upcoming/[platform]/[month-year]). Each page shows the confirmed or tentative date with its source and last-checked timestamp, the platforms, the trailer embed, and current prices at the stores. Avoid brand-head terms like 'nintendo switch' and 'nintendo eshop' and target long-tail 'release date' and 'upcoming on [platform]' queries.

**Data sources:** IGDB API (free via Twitch developer account; check its commercial-use and attribution terms before launch); IGDB video entries (YouTube video IDs for trailers); Steam Store API (appdetails for release dates, prices and platform flags; check its terms); IsThereAnyDeal API (free key, for cross-store price comparison; check terms); RAWG API (free key, as a fallback for coverage gaps)

**Money:** Amazon Associates (games, consoles, controllers; needs 3 qualifying sales in 180 days to stay active); Humble Bundle affiliate programme; Fanatical affiliate programme; Green Man Gaming affiliate programme; Display ads (Mediavine or Raptive) only after roughly 50k monthly sessions

**Page types:** /game/[slug] for each game with release date, platforms, trailer and store links; /upcoming/[platform]/[month-year] hub pages listing dated releases; /platform/[platform]/release-dates year-by-year archives; /game/[slug]/price-history pages built from ITAD data where available; /delayed/ pages listing titles whose dates have moved, with the change log

**Risks:** IGDB and Steam terms may restrict commercial use, redistribution or caching of data; check before building; Cover art, screenshots and trailers belong to publishers; embed only official YouTube trailers and never rehost images; Release dates shift often; stale pages hurt trust and rankings unless the data refreshes automatically with timestamps; Big outlets (IGN, GameSpot, Game Rant, Nintendo Life) dominate news-style date queries and can outrank a small site; AI-written copy on thin pages risks Google's helpful-content and spam policies; each page needs unique structured facts, not generic blurbs; Low CPCs (about $0.20-0.50) mean weak RPM for display ads and modest affiliate income; Keyword data is Nintendo-heavy and includes ambiguous or speculative queries (e.g. 'playstation 6 release date', 'inside nintendo switch'); demand for rumour-based pages is volatile; Trademarked platform and brand names in URLs and titles may draw complaints; use descriptive, non-brand-led page titles

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| inside nintendo switch | 1,220,000 | 8 | $0.36 |
| nintendo switch lite | 246,000 | 15 | $0.27 |
| ps5 games | 246,000 | 30 | $0.34 |
| nintendo eshop | 201,000 | 28 | $0.74 |
| playstation 6 release date | 135,000 | 1 | $0.49 |
| mario kart 8 deluxe nintendo switch | 110,000 | 28 | $0.39 |
| gameboy nintendo | 110,000 | 16 | $0.52 |
| nintendo switch pro controller | 74,000 | 17 | $0.27 |
| switchlite | 74,000 | 11 | $0.23 |
| luigi and mario | 74,000 | 30 | $0.21 |
| nintendo switch controller | 60,500 | 20 | $0.32 |
| nintendo switch online expansion pack | 49,500 | 22 | $0.56 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| nintendo switch | 1,220,000 | 88 | $0.36 |
| nintendogs switch | 1,220,000 | 88 | $0.36 |
| inside nintendo switch | 1,220,000 | 8 | $0.36 |
| nintendo switch games | 1,000,000 | 57 | $0.36 |
| nintendo | 1,000,000 | 91 | $0.99 |
| release date gta 6 | 1,000,000 | 57 | $0.43 |
| nintendo switch lite | 246,000 | 15 | $0.27 |
| ps5 games | 246,000 | 30 | $0.34 |
| nintendo eshop | 201,000 | 28 | $0.74 |
| playstation 6 release date | 135,000 | 1 | $0.49 |
| mario kart 8 deluxe nintendo switch | 110,000 | 28 | $0.39 |
| metroid prime 4 | 110,000 | 37 | $0.23 |
| gameboy nintendo | 110,000 | 16 | $0.52 |
| switch games | 90,500 | 31 | $0.39 |
| animal crossing new horizons | 90,500 | 51 | $0.29 |

_Seeds: game release date, upcoming games, video game trailer, best ps5 games, switch games. Data cost: US$0.114._

## Board games: 61/100

**Verdict:** Only a narrow slice works: co-op and party-game discovery pages built from BGG's structured game metadata can be genuinely useful, but most of the listed volume is chess and mancala rules queries that BGG data cannot answer, and Amazon's commission on games is thin. Commercial use of BGG data also needs checking before you build anything.

**Site angle:** A co-op and party board game finder. Each page is a filter combination (player count, playtime, weight band, age, mechanic) populated from BGG's cooperative-mechanic and category data, with each game linked to its own stats page (players, time, weight, rating, year). Skip chess, mancala and checkers entirely; those need rules content, not this dataset.

**Data sources:** BoardGameGeek XML API2 (thing, search, and mechanic/category fields), subject to its terms and any required API token; confirm commercial-use permission in writing before launch; Wikidata (CC0) for game metadata as a fallback or supplement, which avoids BGG licensing issues but has thinner game-mechanic coverage; Your own snapshot of BGG data refreshed on a schedule, cached within the terms you agree to

**Money:** Amazon Associates links (games sit in Toys & Games, which typically pays about 3%; verify current rate and whether you qualify for PA-API); Miniature Market or other hobby-retailer affiliate programmes (verify availability and rates); Target or Walmart affiliate feeds via Impact or similar networks (verify); Display ads only once traffic is substantial; RPM on game-discovery pages will be low

**Page types:** /co-op-board-games-for-[n]-players/; /co-op-board-games-under-[n]-minutes/; /co-op-board-games-[weight-band]/ (e.g. light, medium, heavy); /party-board-games-for-[n]-players/; /game/[bgg-slug]/ with per-game stats and short factual summary; /best-[mechanic]-board-games/ where mechanic has enough titles to fill a useful list

**Risks:** BGG API terms may restrict commercial use, and access rules have changed; a licensing or ban problem could kill the whole site; Amazon PA-API access requires qualifying sales, and product-data caching rules limit how you can store prices; Monetisation per visit is low: about 3% on games means many visits are needed to earn meaningful money; Keyword mismatch: the chess, mancala and checkers rules queries (most of the volume) need instructional content, which templated data pages will not satisfy; Thin or near-duplicate filter pages when a combination has only a few titles; enforce minimum item counts or noindex them; Box art and publisher images carry copyright risk; use only what the licence allows, or none; Competition from BGG itself, Board Game Arena, and established blogs on high-volume co-op queries

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| co op board games | 40,500 | 1 | $0.66 |
| co operative board games | 40,500 | 4 | $0.66 |
| mancala rules | 33,100 | 5 | $0.02 |
| chess game 2 player | 33,100 | 30 | $0.30 |
| two player chess game | 33,100 | 30 | $0.30 |
| mancala game rules | 33,100 | 3 | $0.02 |
| best codenames game | 33,100 | 25 | $0.30 |
| chess board game 2 player | 33,100 | 30 | $0.30 |
| chess two | 33,100 | 30 | $0.30 |
| mancala official rules | 33,100 | 5 | $0.02 |
| table top games | 27,100 | 21 | $0.83 |
| party board games | 27,100 | 0 | $0.40 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| co op board games | 40,500 | 1 | $0.66 |
| chess free game | 40,500 | 97 | $0.27 |
| co operative board games | 40,500 | 4 | $0.66 |
| mancala rules | 33,100 | 5 | $0.02 |
| chess game 2 player | 33,100 | 30 | $0.30 |
| two player chess game | 33,100 | 30 | $0.30 |
| mancala game rules | 33,100 | 3 | $0.02 |
| best codenames game | 33,100 | 25 | $0.30 |
| chess board game 2 player | 33,100 | 30 | $0.30 |
| chess board two player | 33,100 | — | $0.30 |
| chess two | 33,100 | 30 | $0.30 |
| mancala official rules | 33,100 | 5 | $0.02 |
| play chess two player | 33,100 | 31 | $0.30 |
| rules for playing mancala | 33,100 | — | $0.02 |
| two player chess board | 33,100 | — | $0.30 |

_Seeds: best board games, board games for adults, board game rules, 2 player board games, family board games. Data cost: US$0.114._

## Victoria: things to do by town: 59/100

**Verdict:** The data and affiliate pieces exist, but the keyword set covers only about four towns, and the volumes are US figures that look inflated and duplicated across variants, so the real Australian demand is probably much smaller. Build it only as a small, curated Melbourne day-trip site, not as hundreds of programmatic town pages.

**Site angle:** victours.com.au as a 'day trips from Melbourne' guide: 15-25 hand-verified destination hubs (Ballarat, Daylesford, Phillip Island, Great Ocean Road, Bellarine, Mornington, Yarra Valley, Grampians), each with a curated 'things to do' list enriched from OSM and open data, then tour and accommodation links. Add the long-tail town pages only after the flagship hubs earn traffic and show that the data quality holds.

**Data sources:** OpenStreetMap via Overpass API (tourism=attraction/viewpoint/museum/zoo, leisure=park/nature_reserve, natural=*; ODbL attribution and share-alike obligations apply); Victorian open data portal (data.vic.gov.au): parks, trails, heritage and public facility datasets (check each dataset's licence, typically CC BY); Wikidata/Wikipedia for town descriptions and notable-site cross-checks; Manual founder verification of opening hours, prices and access, since OSM is patchy on hours and pricing

**Money:** Viator Partner Program (commission on tours; API access requires approval and terms restrict some product-data reuse); GetYourGuide Partner Program (commission on activities); Klook affiliate programme (Asia-Pacific activities, useful for some Victorian attractions); Booking.com or Expedia affiliate for accommodation near each destination; Display ads (AdSense first; premium networks only after sustained traffic); Direct listing or lead-gen deals with local operators, such as day-tour or winery bookings, if they can be negotiated

**Page types:** /day-trips-from-melbourne/[destination]/ hub: overview, getting there, verified top 10, tour widget, accommodation; /[destination]/things-to-do/ and /[destination]/[category]/ (e.g. /phillip-island/wildlife/) only where there are 8+ verified items; /tours/[tour-type]/ comparison pages (e.g. Great Ocean Road tours) with clearly labelled affiliate links; /[destination]/getting-there/ utility pages built from timetables and distance data

**Risks:** The keyword volumes are US-based, identical across many variants (e.g. 8100/mo for every Ballarat variant), and likely reflect parent-topic clustering, not real AU demand. Verify with Australian Google Ads data before building.; Phillip Island Penguin Parade is run by Phillip Island Nature Parks, which controls its booking, pricing and branding. Affiliate potential there is narrow and the brand is hard to rank against.; The SERPs for 'things to do in X' are dominated by Viator, GetYourGuide, TripAdvisor, Lonely Planet and council sites. Thin lists will not beat them.; Google's scaled content abuse and helpful-content systems will penalise mass-generated AI copy with no unique data; each page needs verified, locally specific content.; OSM data quality varies: unnamed features, closed businesses, wrong categories and stale hours. Without manual verification, pages will be inaccurate and possibly misleading.; Licence obligations: OSM requires ODbL attribution and share-alike for derived databases; Viator and GYG terms restrict scraping and reuse of product data; check every source's terms before automating.; Affiliate disclosure must be clear under ACCC and Australian Consumer Law expectations, and any price or hours claims must be accurate.; Seasonality and tourism shocks (bushfires, COVID-style closures) hit traffic and commissions sharply.

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| melbourne great ocean road tour | 12,100 | 13 | $3.62 |
| things to do in ballarat | 8,100 | 14 | $0.63 |
| ballarat attractions | 8,100 | 14 | $0.63 |
| ballarat tourist attractions | 8,100 | 4 | $0.63 |
| ballarat sightseeing | 8,100 | 14 | $0.63 |
| to do in ballarat | 8,100 | 14 | $0.63 |
| ballarat things to see | 8,100 | 14 | $0.63 |
| ballarat what to see | 8,100 | 14 | $0.63 |
| things to do in ballarat australia | 8,100 | 14 | $0.63 |
| things to do in ballarat vic | 8,100 | 14 | $0.63 |
| things to do in ballarat victoria | 8,100 | 14 | $0.63 |
| things to do in phillip island | 5,400 | 0 | $0.63 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| penguin parade in phillip island | 18,100 | 35 | $1.40 |
| melbourne great ocean road tour | 12,100 | 13 | $3.62 |
| things to do in ballarat | 8,100 | 14 | $0.63 |
| ballarat attractions | 8,100 | 14 | $0.63 |
| ballarat tourist attractions | 8,100 | 4 | $0.63 |
| ballarat sightseeing | 8,100 | 14 | $0.63 |
| to do in ballarat | 8,100 | 14 | $0.63 |
| ballarat attractions victoria | 8,100 | — | $0.63 |
| ballarat things to see | 8,100 | 14 | $0.63 |
| ballarat what to see | 8,100 | 14 | $0.63 |
| stuff to do in ballarat | 8,100 | — | $0.63 |
| things to do in ballarat australia | 8,100 | 14 | $0.63 |
| things to do in ballarat vic | 8,100 | 14 | $0.63 |
| things to do in ballarat victoria | 8,100 | 14 | $0.63 |
| things to visit in ballarat | 8,100 | — | $0.63 |

_Seeds: things to do in daylesford, things to do in bright, things to do in phillip island, things to do in ballarat, things to do in the yarra valley, day trips from melbourne, things to do in victoria. Data cost: US$0.114._

## Book series in reading order: 53/100

**Verdict:** The data is free and workable, since Wikidata has series membership and ordinals for thousands of series, but these are mostly franchise-level queries with weak monetisation (CPCs around $0.20-0.45, and books pay low affiliate commissions) and strong incumbents such as Wikipedia, Fandom wikis, publisher sites and Reddit. It only makes sense as a long-tail utility site, not a head-term play.

**Site angle:** A 'Reading order' site with one canonical URL per series (e.g. /series/percy-jackson-and-the-olympians/), listing books by publication order and by in-world/chronological order where they differ, with publication years, POV or spin-off flags, and 'where to start' notes. Consolidate keyword variants like 'throne of glass order' and 'throne of glass books in order' onto a single page rather than building separate ones. Target series with at least 3 books and no official reading-order page, not the top franchises.

**Data sources:** Wikidata SPARQL: P179 (part of the series) with P1545 (series ordinal), CC0 licence; Open Library API: editions, ISBNs, publish dates, author IDs (series metadata is patchy, so use it for enrichment only); Open Library Covers API (check per-image rights before use; text-only pages are safer); Wikipedia/Wikidata author and series descriptions via CC BY-SA attribution, or your own short factual notes

**Money:** Amazon Associates (books and Kindle, low single-digit percent commission; verify the current rate and the 3-sales-in-180-days eligibility rule); Bookshop.org affiliate programme (typically a higher rate than Amazon for print; verify); Audible/Libro.fm affiliate links for audiobook editions where available; Display ads only once traffic is large enough for Mediavine/Raptive-style thresholds; at these CPCs RPM will be modest

**Page types:** /series/[series-slug]/ (reading order, one page per series with 3+ books); /author/[author-slug]/ (author hub listing all series, linking to each reading order); /series/[series-slug]/chronological/ only where in-world order differs from publication order; /start-here/[genre]/ (curated entry points by genre, e.g. romantic fantasy)

**Risks:** Thin content: a bare list of titles is exactly what Google's helpful-content and scaled-content rules target; each page needs verified, series-specific notes that generic AI copy cannot fake; Incumbents: Wikipedia, Fandom wikis, Goodreads-style lists and publisher sites already rank for many of the head queries; Low earnings per visitor: book affiliate commissions are small and CPCs are under $0.50, so you need very high traffic to earn much; Wikidata series data is incomplete and sometimes wrong, so ordinals and series membership need validation and a corrections path; Copyright: titles and order are facts, but blurbs, cover art and editorial reading-order text from publishers or fan wikis may not be reusable; Amazon Associates: account can be closed for low sales or disclosure violations, and the Product Advertising API has its own eligibility conditions; Keyword cannibalisation from many near-duplicate variants (HP, PJO, GOT) if you build separate pages per query

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| percy jackson novel series | 246,000 | — | $0.28 |
| books by rick riordan | 165,000 | — | $0.41 |
| throne of glass series order | 110,000 | — | $0.22 |
| throne of glass order | 110,000 | — | $0.22 |
| throne of glass books in order | 110,000 | — | $0.22 |
| the new york times best seller | 110,000 | — | $0.44 |
| scholastic book club | 74,000 | — | $0.28 |
| harry potter books in order | 60,500 | — | $0.31 |
| harry potter book series order | 60,500 | — | $0.31 |
| joe pickett book series | 60,500 | — | $0.27 |
| hp books in order | 60,500 | — | $0.31 |
| joe pickett cj box | 60,500 | — | $0.27 |
| romantic fantasy series | 49,500 | — | $0.32 |
| percy jackson books in order | 40,500 | — | $0.27 |
| percy jackson series in order | 40,500 | — | $0.27 |

_Seeds: books in order, book series in order, reading order, kindle series, best book series. Data cost: US$0.09._

## Movie soundtracks and film music: 53/100

**Verdict:** The data is usable: TMDB, MusicBrainz and Discogs can produce real per-film and per-composer pages. But the monetisation is weak (vinyl and streaming affiliate payouts are small, and music display RPMs are low), and most high-volume queries are movie-title searches that IMDb and Wikipedia already own, so this only works as a modest, narrowly focused site.

**Site angle:** soundtrackindex.com: one page per film soundtrack (/soundtrack/[film-slug]) showing the verified tracklist, composer and credited musicians, label and release history, and live Discogs vinyl pressings with lowest price and copies for sale. Add /composer/[name] pages listing scored films and their soundtrack releases. Skip song-by-song pages for films that have no real release data.

**Data sources:** TMDB API (film metadata, crew with job 'Original Music Composer', release dates; check commercial-use terms before launch); MusicBrainz API (soundtrack release groups, recordings, composer and performer relationships; rate-limited to about 1 request/second); Discogs API (soundtrack pressings, tracklists, formats, marketplace stats: lowest price and num_for_sale; check the API terms on commercial use and attribution); Wikidata SPARQL (film-to-composer links and IDs for joining sources)

**Money:** Amazon Associates (vinyl and CD links; low commission, roughly 1-4%); Apple Music / iTunes via Apple Performance Partners; Bandcamp affiliate program, where soundtracks are sold direct; eBay Partner Network for used vinyl listings; Display ads via Mediavine or Raptive once traffic thresholds are met (music RPMs are modest)

**Page types:** /soundtrack/[film-slug] (tracklist, composer, label, Discogs pressings with live price data); /composer/[name] (filmography plus soundtrack releases per film); /composer/[name]/[format] for vinyl, CD and digital editions where data exists; /label/[label-name] (soundtrack catalogue by label, e.g. Varèse Sarabande, Intrada); /soundtracks-by-year/[year] (release year indexes built from MusicBrainz dates)

**Risks:** Intent mismatch: queries like 'across the universe movie' or 'chariots of fire' want the film, so IMDb, Wikipedia and streaming services will outrank a soundtrack site; Commercial licensing: TMDB and Discogs API terms may restrict commercial use or require attribution, and Discogs images are copyrighted, so avoid hotlinking them; Lyrics and sheet-music copyright: never publish lyrics; keep to titles, credits and facts; Affiliate payouts are small: vinyl commissions and display RPMs will not cover much traffic, so volume has to be large before this pays; Thin-content risk if pages with no real release (e.g. films with no soundtrack album) are generated; noindex them; Competition from Discogs, MusicBrainz and Spotify's own pages for soundtrack queries; Low CPC on most terms (Dirty Dancing, Lion King, Frozen at $0.01-0.14) means only the composer and high-CPC pages carry real revenue

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| composer hans zimmer | 135,000 | 26 | $3.84 |
| across the universe movie | 40,500 | 20 | $3.37 |
| hans zimmer films | 33,100 | 27 | $6.44 |
| movies scored by hans zimmer | 33,100 | 21 | $6.44 |
| purple rain movie | 27,100 | 22 | $0.39 |
| songs in guardians of the galaxy | 27,100 | 12 | $0.20 |
| mamma mia movie songs | 27,100 | 24 | $0.79 |
| mamma mia movie soundtrack | 27,100 | 8 | $0.79 |
| songs from the movie frozen | 27,100 | 15 | $0.14 |
| danny elfman films | 18,100 | 14 | $0.05 |
| danny elfman movies | 18,100 | 14 | $0.05 |
| songs from the lion king movie | 18,100 | 4 | $0.08 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| composer hans zimmer | 135,000 | 26 | $3.84 |
| across the universe | 40,500 | 39 | $3.37 |
| across the universe movie | 40,500 | 20 | $3.37 |
| hans zimmer movies | 33,100 | 36 | $6.44 |
| chariots of fire | 33,100 | 35 | $1.49 |
| hans zimmer films | 33,100 | 27 | $6.44 |
| movies scored by hans zimmer | 33,100 | 21 | $6.44 |
| purple rain movie | 27,100 | 22 | $0.39 |
| songs in guardians of the galaxy | 27,100 | 12 | $0.20 |
| soundtrack from guardians of the galaxy | 27,100 | — | $0.20 |
| mamma mia movie songs | 27,100 | 24 | $0.79 |
| mamma mia movie soundtrack | 27,100 | 8 | $0.79 |
| ost guardian of the galaxy | 27,100 | — | $0.20 |
| rocket man film | 27,100 | 35 | $0.18 |
| songs from the movie frozen | 27,100 | 15 | $0.14 |

_Seeds: movie soundtrack, film score, soundtrack vinyl, best movie soundtracks, song from movie. Data cost: US$0.114._

## Victoria: where to eat by town: 52/100

**Verdict:** Victorian restaurant data is thin and generic: OSM gives cuisine and hours, but no ratings, prices, menus or reviews, so pages would look like a directory that Google Maps already beats. The search volumes are US figures, which are unreliable for AU local intent, and the CPCs are low ($0.2–1.5), so revenue per page is tiny unless the site converts through affiliate tours or accommodation.

**Site angle:** A narrow Yarra Valley and Macedon Ranges winery-lunch guide (/winery-restaurants/[region]/ and /[winery]/ pages) built on OSM craft=winery and amenity=restaurant data, with a short factual card per venue and affiliate links for wine tours and stays. Skip general Geelong and Lorne 'best restaurants' pages until you have a real differentiator.

**Data sources:** OpenStreetMap via Overpass API (amenity=restaurant/cafe, craft=winery, cuisine, opening_hours, website); Victorian open data portals (data.vic.gov.au) for council and tourism datasets; Winery websites and official Yarra Valley / Macedon tourism listings (manual verification, not scraped at scale); Google Places API only if you can afford its caching and display terms

**Money:** Viator (Tripadvisor affiliate) wine and food tours in the Yarra Valley; GetYourGuide Partner Program for experiences; Booking.com or Agoda affiliate (check current AU network) for accommodation near wineries; Klook for day trips and transfers; Display ads only once traffic justifies it; expect very low RPM at these CPCs; Lead-gen to private dining or group bookings, sold per enquiry to restaurants

**Page types:** /yarra-valley/[winery]/ (one page per winery, with real OSM facts and a verified lunch menu link); /yarra-valley/lunch/[town]/ (Yarra Glen, Healesville, Lilydale, Coldstream); /macedon-ranges/[town]-restaurants/ (Woodend, Hanging Rock, Daylesford hub links); /tours/[region]/ tour comparison pages with affiliate tables

**Risks:** US keyword volumes do not reflect Australian search demand; validate with AU keyword tools before building; OSM hours and cuisine tags are often missing or stale in regional Victoria; pages will look empty without manual checks; Thin AI-written copy over generic data is exactly what Google's helpful-content and spam policies target; ODbL licence: OSM data requires attribution and share-alike for any derived database you publish; check how your page output is treated; Google Places API terms restrict storing and caching place data, which undermines a bulk-generated site; Restaurants close or change hands often, so unmaintained pages decay quickly and can mislead diners; Low CPCs and small volumes mean the niche supports maybe a few thousand visits a month at best

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| restaurants in geelong cbd | 22,200 | 21 | $0.50 |
| best restaurants geelong | 6,600 | 6 | $0.50 |
| nice restaurants geelong | 6,600 | 6 | $0.50 |
| geelong good restaurants | 6,600 | 6 | $0.50 |
| geelong's best restaurants | 6,600 | 6 | $0.50 |
| restaurants bright | 5,400 | 0 | $0.65 |
| ezard at levantine hill | 5,400 | 0 | $0.88 |
| yarra valley restaurants | 4,400 | 3 | $0.50 |
| dining in the yarra valley | 4,400 | 3 | $0.50 |
| yarra valley eateries | 4,400 | 3 | $0.50 |
| restaurant geelong waterfront | 2,400 | 5 | $0.50 |
| restaurants lorne | 1,900 | 0 | $0.23 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| restaurants in geelong cbd | 22,200 | 21 | $0.50 |
| best restaurants geelong | 6,600 | 6 | $0.50 |
| nice restaurants geelong | 6,600 | 6 | $0.50 |
| geelong good restaurants | 6,600 | 6 | $0.50 |
| geelong's best restaurants | 6,600 | 6 | $0.50 |
| great restaurants in geelong | 6,600 | — | $0.50 |
| restaurants bright | 5,400 | 0 | $0.65 |
| ezard at levantine hill | 5,400 | 0 | $0.88 |
| yarra valley restaurants | 4,400 | 3 | $0.50 |
| dining in the yarra valley | 4,400 | 3 | $0.50 |
| yarra valley eateries | 4,400 | 3 | $0.50 |
| pier restaurant lorne | 2,900 | — | $1.54 |
| restaurant geelong waterfront | 2,400 | 5 | $0.50 |
| restaurants lorne | 1,900 | 0 | $0.23 |
| breakfast places geelong | 1,900 | 3 | $0.24 |

_Seeds: best restaurants daylesford, restaurants bright, restaurants lorne, best restaurants geelong, yarra valley restaurants, winery lunch yarra valley. Data cost: US$0.114._
