# Niche finder

Updated 2026-10-29. Google searches in the United States unless an idea says otherwise (Market column). Score = 30% demand + 25% money (CPC) + 25% ease (SEO difficulty) + 20% fit (Claude: data source, automation, monetisation, risk).

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
| 8 | Victoria: things to do by town | Australia | **60** | 52 | 47 | 95 | 42 | 353,780 | $0.63 | 5 |
| 9 | Retro game finder: where to play classic games today (US) | United States | **58** | 71 | 31 | 81 | 42 | 1,393,340 | $0.34 | 19 |
| 10 | Book series in reading order | United States | **53** | 90 | 25 | 50 | 38 | 4,912,700 | $0.27 | — |
| 11 | Movie soundtracks and film music | United States | **53** | 79 | 0 | 81 | 45 | 2,377,600 | $0.08 | 19 |
| 12 | Victoria: where to eat by town | Australia | **51** | 40 | 41 | 96 | 22 | 155,710 | $0.50 | 4 |
| 13 | Australian clothing brands directory (beason.com.au) | Australia | **50** | 43 | 61 | 60 | 34 | 189,760 | $1.09 | 40 |
| 14 | Australian winter wear: beanies, jackets and knitwear | Australia | **50** | 13 | 57 | 96 | 38 | 24,330 | $0.92 | 4 |
| 15 | US public library branches by city | United States | **46** | 22 | 54 | 77 | 34 | 45,100 | $0.84 | 23 |
| 16 | Retro game finder: where to play classic games today (AU) | Australia | **42** | 31 | 19 | 82 | 38 | 84,660 | $0.21 | 18 |
| 17 | Australian loungewear and comfortwear brands | Australia | **42** | 0 | 55 | 90 | 28 | 7,150 | $0.86 | 10 |
| 18 | Hurricane history by coastal state | United States | **33** | 0 | 0 | 97 | 42 | 30 | — | 3 |
| 19 | US airport runway and elevation facts | United States | **33** | 0 | 0 | 100 | 42 | 730 | — | 0 |
| 20 | US school district enrollment by county | United States | **31** | 0 | 0 | 95 | 38 | 20 | — | 5 |
| 21 | Freshwater fish species by state | United States | **28** | 0 | 0 | 94 | 22 | 650 | $0.03 | 6 |
| 22 | Rail travel times between NSW stations | Australia | **21** | 0 | 0 | 50 | 44 | 0 | — | — |

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

**Verdict:** Most of the volume is branded hotel names (Yarra Valley Lodge, Mantra Lorne, Lake House, Balgownie), which a generic town site can't win, and the same figures repeat across close variants, so real unique demand is lower than it looks. The only workable opportunity is generic 'accommodation in [town]' queries in smaller towns, where you'd compete with Booking.com, Expedia and TripAdvisor on thin affiliate margins.

**Site angle:** A 'Places to stay in [town], Victoria' guide covering about 60-100 Victorian towns with 5+ OSM accommodation entries, each page showing a live-priced, filterable list by type (hotel, motel, B&B, guesthouse, caravan park, holiday rental) with a local context block (distance to attractions, nearest train or bus, seasonal notes). Target the 'accommodation [town]' and 'places to stay [town]' head terms and skip branded hotel pages entirely.

**Data sources:** OpenStreetMap via Overpass API (tourism=hotel, motel, guest_house, hostel, chalet, caravan_site, alpine_hut; ODbL, so attribute and share-alike the database); Booking.com Affiliate Partner API (prices, availability, review scores; approval required and display limits apply); Expedia Group Rapid/affiliate feed (prices and property IDs); Parks Victoria open data and campground datasets (CC BY); data.vic.gov.au datasets for town boundaries and population (CC BY); ABS census population by suburb/locality for town size and sorting

**Money:** Booking.com Affiliate Partner programme (commission on bookings made through your links); Expedia Group affiliate programme (Hotels.com, Expedia links); Agoda affiliate programme for lower-cost stays; Viator or GetYourGuide affiliate links for tours and day trips, which suits the Vic Tours angle; Display ads (Ezoic, Raptive or Mediavine) only once traffic is high enough to qualify; not a realistic early revenue source

**Page types:** /places-to-stay/[town]/ for each town with enough OSM entries; /places-to-stay/[town]/[type]/ for example /lorne/motels/, /daylesford/bnb/, /phillip-island/caravan-parks/; /[town]/pet-friendly/ or /[town]/family/ filtered views, only where the API supplies the attribute; /[region]/ hub pages (Gippsland, Goldfields, Great Ocean Road) linking to town pages; Avoid /[hotel-name]/ pages: they're branded, you won't rank, and they invite trademark issues

**Risks:** Branded search volume (Yarra Valley Lodge, Mantra Lorne, Lake House, Balgownie) is largely unreachable for a third-party site and inflates the apparent opportunity; the duplicated volume figures across variants make the totals unreliable; Booking.com and Expedia API terms restrict caching, display and resale of rates and reviews; violating them can lose the affiliate account; Thin-content risk: pages built from OSM names plus AI copy look mass-produced unless each town has real local data and unique content; OSM's ODbL attribution and share-alike obligations must be met or the database use is non-compliant; Price and availability claims under Australian Consumer Law (ACCC) and misleading-conduct rules; prices must be clearly dated and disclaimed; Affiliate disclosure must be clear under ACCC guidance on influencer and paid-promotion conduct; Strong incumbents (Booking, Expedia, TripAdvisor, Stayz, Airbnb) with much higher domain authority; expect slow ranking for 12+ months; Low commission rates on accommodation mean you need substantial organic traffic before revenue covers hosting and time

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

## Victoria: things to do by town: 60/100

**Verdict:** The demand is real but concentrated: most of the volume sits in three towns (Ballarat, Phillip Island, Daylesford), and the Ballarat variants share one figure, so the true unique volume is lower than the list suggests. Hundreds of small-town hub pages will mostly be thin, since OSM and open data have sparse, often unnamed POIs in small towns, so this only works as a small, curated set of pages.

**Site angle:** vicours.com.au-style 'Melbourne day trips' site, or vic tours: 30-60 deep hub pages for the towns where data is rich (Ballarat, Phillip Island, Daylesford, Great Ocean Road towns, Mornington Peninsula, Yarra Valley), each with verified attractions, opening info, and a route map. Do not build a page for every Victorian town. Add a Melbourne-departure filter and drive times, which generic lists lack and where your local knowledge helps.

**Data sources:** OpenStreetMap via Overpass (tourism=*, historic=*, natural=* tags; ODbL, attribution and share-alike required); data.vic.gov.au open datasets (check each licence, typically CC BY 4.0); Parks Victoria and Phillip Island Nature Parks published visitor info (manual verification, not scraping); ABS/town population and location data for town selection; Viator Partner API and GetYourGuide Partner API (product feeds, not scraped descriptions)

**Money:** Viator affiliate tours and tickets (Great Ocean Road and Phillip Island products fit best); GetYourGuide partner programme; Klook affiliate programme for Victoria attractions; Booking.com or similar affiliate for accommodation on town pages; Direct booking links to Phillip Island Nature Parks or similar operators where an affiliate is unavailable; Display ads only after sustained traffic; at roughly USD 0.63 CPC, display RPM will be low

**Page types:** /[town]/ hub: top attractions, day-trip options, drive time from Melbourne, map; /[town]/[attraction]/ for attractions with enough verified data (hours, address, price, one local tip written by the founder); /day-trips-from-melbourne/[destination]/ for tours and itineraries; /things-to-do-in-[town]-[month]/ only where seasonal content is real (e.g. penguin parade seasons, not generated filler)

**Risks:** Thin or near-empty town pages risk Google's scaled content and helpful-content penalties, even with real data behind them; Keyword volumes are duplicated across variants and kd figures are inconsistent (e.g. same term shows kd 4 and kd 14); verify in a live tool before committing; OSM ODbL share-alike and attribution obligations may constrain how you combine or license the data; Google Places and some tourism APIs restrict caching and storage; check terms before storing any content; Viator, GetYourGuide and Klook affiliate terms restrict scraped or reused descriptions and prohibit some placement styles; use only official feed fields; Hours, prices and closures change; stale listings damage trust and can cause users to arrive at closed attractions; Penguin Parade and Great Ocean Road intent is transactional and well served by operators and OTAs, so ranking against them needs strong differentiation; Low CPC means display ads will earn little; affiliate conversion rates on day-trip content are the real test

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

## Retro game finder: where to play classic games today (US): 58/100

**Verdict:** The high-volume head terms are Nintendo's own brand queries (Switch Online, eShop) with KD in the 30s, so you won't win them. The workable part is long-tail per-game pages, but the core promise, whether a game is playable on Switch Online today, has no free structured source, so you would need manual curation or accept stale data.

**Site angle:** A 'where to play [game] today' database covering roughly 1,000 classic titles from the six platforms. Each game page lists current legal options (Steam, GOG, Fanatical/GMG, a named official collection such as NSO, PS Plus Classics or Sega Genesis Mini, and eBay original-cart listings where they exist), and only the official collections and cart pages get manual checks. Start with Mega Drive and GameCube, where the long-tail queries show volume and low KD. Hub pages cover each platform and each collection. Do not build any ROM, emulator or abandonware angle, and do not publish 'DOS games' pages until you can prove a legal source for each title.

**Data sources:** Wikidata SPARQL (CC0): game, platform, release year, developer, publisher, series, franchise links; Steam Storefront API (appdetails): price, platforms, release, Steam Deck status; GOG catalogue data (check current terms before scraping; prefer any official feed or partner data); Fanatical and Green Man Gaming catalogue/price feeds where they offer them; Wikipedia platform and list pages for cross-checking releases and collection contents; Manually maintained official collection lists (Nintendo Switch Online, PS Plus Classics, Sega Genesis Mini, etc.), reviewed monthly; eBay Browse API for current cart listings (no sold data, so present prices as asking prices); Amazon Product Advertising API, only once the Associates account qualifies, for collections and consoles

**Money:** GOG via Adtraction (about 6% of net, but a $5–10 game earns only around $0.30–0.60 per sale); Fanatical and Green Man Gaming affiliate programmes (about 5%); Amazon Associates for consoles, mini consoles and handhelds (video game commissions are low, historically around 1%, so treat it as secondary); eBay Partner Network for original carts; Display ads once traffic is established (retro handheld queries at $1.86 CPC are the main ad-value prize); Steam has no real affiliate programme, so Steam links earn nothing; use it for data, not monetisation

**Page types:** /game/[slug]: one page per classic game, with a platform-by-platform 'where to play today' table and a price history if you store prices; /platform/[console]: hub for Mega Drive, SNES, N64, GameCube, PS1 and DOS, listing the best legal route for each platform; /collection/[service]: NSO, PS Plus Classics, Sega Genesis Mini and similar, with included-game lists and cost per game; /cart/[game]: original cartridge pages, only where eBay listings exist and carrying a condition/price-range note; /handhelds/[model]: retro handheld comparison pages, kept to official hardware and clearly labelled as not preloaded with ROMs

**Risks:** Thin or mass-generated pages: 1,000 near-identical 'where to play' pages with AI filler will be classed as scaled content unless each has real, verified availability data; Stale availability: Nintendo and Sony rotate catalogues monthly, so pages can be wrong quickly and need a refresh pipeline; Head terms belong to Nintendo, with NSO queries at KD 36 and a strong brand SERP; Search intent may leak towards piracy ('dos games', 'nintendo online games'); keep the site visibly legal and avoid ranking for ROM-adjacent queries; Legal framing: 'playable legally' depends on region, service and storefront terms, so add a disclaimer and sourced claims rather than absolutes; Copyright and trademark: box art and screenshots need licensing or should be avoided; Wikidata images vary by Commons licence; Affiliate economics are thin per sale, and Amazon and eBay rates are low, so revenue depends on volume and ads; Affiliate and API terms: Amazon PA-API and eBay requirements (price display, freshness, disclosure) and FTC disclosure must be built into the template

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| retro handheld game system | 49,500 | 12 | $1.86 |
| game cube games | 40,500 | 2 | $0.41 |
| nintendo switch rpg games | 27,100 | 0 | $0.25 |
| mariokart double dash | 27,100 | 6 | $0.30 |
| goldeneye 007 nintendo | 27,100 | 23 | $0.37 |
| nintendo cube games | 22,200 | 27 | $0.35 |
| nintendo switch online family membership | 14,800 | 11 | $0.54 |
| nintendo switch online individual membership | 14,800 | 28 | $0.58 |
| mario baseball superstars | 12,100 | 6 | $0.30 |
| mario superstar baseball superstars | 12,100 | 6 | $0.30 |
| altered beast mega drive | 9,900 | 7 | $0.16 |
| sega genesis altered beast | 9,900 | 1 | $0.16 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| nintendo switch online membership | 74,000 | 36 | $0.23 |
| nintendo switch online | 60,500 | 36 | $0.27 |
| nintendo online switch | 60,500 | — | $0.27 |
| 64 nintendo games | 49,500 | — | $0.34 |
| retro handheld game system | 49,500 | 12 | $1.86 |
| game cube games | 40,500 | 2 | $0.41 |
| nintendo switch online subscription | 40,500 | 39 | $0.41 |
| nintendo online | 33,100 | 33 | $0.12 |
| sonic and mario olympic | 33,100 | — | $0.15 |
| nintendo switch rpg games | 27,100 | 0 | $0.25 |
| nintendo e shop gift card | 27,100 | — | $1.22 |
| mariokart double dash | 27,100 | 6 | $0.30 |
| goldeneye 007 nintendo | 27,100 | 23 | $0.37 |
| nintendo e shop games | 27,100 | — | $0.58 |
| nintendo cube games | 22,200 | 27 | $0.35 |

_Seeds: chrono trigger steam, chrono trigger switch, super mario 64 switch, gamecube games on switch, sega mega drive classics, nintendo switch online games, best retro handheld, best retro console, castlevania anniversary collection, dos games. Data cost: US$0.114._

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

## Victoria: where to eat by town: 51/100

**Verdict:** The data can produce hundreds of venue pages, but OSM gives names, cuisine and hours only, with no ratings, menus or quality signal. The high-volume queries ask for judgement ('best', 'nice', 'good'), which generated lists can't honestly answer, and the commercial value is low (CPC about $0.50, weak affiliates).

**Site angle:** Skip the statewide 'where to eat' build. If you test anything, make one narrow Geelong-and-Yarra-Valley site that targets 'winery lunch yarra valley' and 'giant steps winery restaurant' style intent. Each page should be a hand-checked venue or winery with a verified menu, booking link and a real opinion, and the site should stay under about 60 pages.

**Data sources:** OpenStreetMap via Overpass (amenity=restaurant/cafe/winery, cuisine, opening_hours; ODbL attribution and share-alike apply); Victorian council food premises registers, where published (check each council's licence terms); data.vic.gov.au datasets, if any venue or tourism layers are usable; Venue websites and menus, scraped or checked manually with permission

**Money:** Booking-referral or lead-gen partners for AU restaurants (verify current programmes; OpenTable and Dimmi-type affiliate or partner terms change often); Winery and cellar-door tour bookings where the venue offers an affiliate or referral arrangement; Display ads only once traffic justifies them; food and local RPM is modest

**Page types:** /restaurants/[town]/ for towns with enough verified venues (Geelong, Lorne, Daylesford, Yarra Valley); /[cuisine]/[town]/ only where at least 8 to 10 venues are verified; /venue/[slug]/ with verified hours, cuisine, address and a human-written note; /wineries/[region]/lunch/ for winery-dining intent; Avoid /best-[x]/ pages generated from data alone

**Risks:** Thin or duplicate pages: OSM-only lists without real judgement are the pattern Google's helpful-content and spam policies target; Stale or wrong data: venues close or change hours often, and OSM coverage is uneven across small towns; Allergy, gluten-free or dietary claims in AI copy create consumer-safety and misleading-information exposure; ODbL share-alike obligations if you publish a derived database; Google Places and Yelp API terms restrict caching and display of ratings, so don't build on them; Weak affiliates and low ad RPM mean many pages must earn very little each; Brand queries like 'ezard at levantine hill' are one-venue traffic, not repeatable demand

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

## Australian clothing brands directory (beason.com.au): 50/100

**Verdict:** The head queries are large but cheap (CPC mostly $0.50 to $1.40), and the attributes you want per brand (made in AU, materials, sizes, ethics) aren't in any free structured source, so the database would need manual research that doesn't scale to hundreds of pages. Only a narrower, feed-driven angle is worth testing.

**Site angle:** beason.com.au as a swimwear and dress directory: one page per Australian swimwear or dress brand, built from Commission Factory merchant and product feeds (price, sizes, stock, product lists), with a small hand-verified set of made-in and materials fields. Start with about 30 brands before generating anything at scale.

**Data sources:** Commission Factory merchant list and product feeds, available to publishers under program terms (price, sizes, stock, product URLs); ABN Lookup bulk extract from the Australian Business Register (free, CC-BY licensed; confirms registered entity names and dates, not made-in or materials); Brand and retailer websites checked manually for made-in, materials and ethics claims, with source URL stored per field; Wikidata for a small seed set of Australian fashion brands (sparse, mainly a starting list)

**Money:** Commission Factory affiliate links to Australian fashion merchants (confirm the swimwear and dress programs and their commission rates before building); Awin and Rakuten fashion programs as secondary networks; Display ads, weak for fashion RPM and only worth it at high traffic

**Page types:** /brands/[brand-slug]: one page per brand with verified attributes, feed-sourced price range and sizes, and affiliate outbound links; /swimwear/australian-swimsuit-brands and /dresses/australian-dress-brands: category lists; /brands/[brand-slug]/sizes: only if the size data is real and verified per brand; Avoid city or state combinations; the data doesn't support them and they create thin pages

**Risks:** Thin or templated pages: AI copy over a few fields will be read as mass-produced text; each page needs real, verified attributes or it should not be published; Ethics and sustainability claims are brand self-declarations; labelling a brand ethical without evidence risks misleading-conduct issues under the Australian Consumer Law and greenwashing scrutiny; Scraping brand sites for sizes or prices may breach terms of service; prefer feeds and manual checks; Keyword volume is misleading: the 8100/mo group is one cluster of near-identical variants, and the head term carries a low CPC, which signals weak commercial intent; Brand-name queries (for example ghanda aus, australian urban outfitters) target specific retailers, not a directory, and invite trademark or brand-owner disputes if used in page titles; Affiliate program terms may restrict feed use, caching or republishing of product data; check before building; Fashion affiliate payouts are often low, and brands may pull or change programs, so revenue per page is unstable; Ghanda aus, the Australian urban outfitters and the many brand-specific queries show most search demand is for named brands the site would only ever be a thin aggregator for

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| australian urban outfitters | 5,400 | 7 | $0.47 |
| australian womens workwear | 1,600 | 1 | $1.10 |
| australian sportswear brands | 1,300 | 12 | $1.73 |
| clothing designers australia | 1,300 | 6 | $1.00 |
| australian fashion designer dresses | 1,300 | 6 | $1.00 |
| australian fashion houses | 1,300 | 6 | $1.00 |
| australian made clothing | 1,000 | 18 | $1.32 |
| australian streetwear brands | 1,000 | 24 | $1.09 |
| mango clothing australia | 1,000 | 1 | $0.61 |
| clothes manufacturing australia | 1,000 | 0 | $4.26 |
| australia streetwear brands | 1,000 | 24 | $1.09 |
| australian female fashion brands | 1,000 | 16 | $0.75 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| australian clothing brands | 8,100 | 43 | $0.69 |
| australian fashion brands | 8,100 | 33 | $0.69 |
| womens clothing australia | 8,100 | 55 | $1.09 |
| womens fashion australia | 8,100 | 55 | $1.09 |
| aus clothing brands | 8,100 | 84 | $0.69 |
| clothing australia womens | 8,100 | 55 | $1.09 |
| womens fashion aus | 8,100 | 55 | $1.09 |
| australian apparel brands | 8,100 | 43 | $0.69 |
| australia apparel brands | 8,100 | 43 | $0.69 |
| australian garment brands | 8,100 | 43 | $0.69 |
| australian womens wear | 8,100 | — | $1.09 |
| australian urban outfitters | 5,400 | 7 | $0.47 |
| australian designers dress | 2,900 | 39 | $0.64 |
| ghanda aus | 2,900 | — | $0.09 |
| australian swimsuit brands | 2,400 | 45 | $1.03 |

_Seeds: australian clothing brands, australian made clothing, australian fashion brands, sustainable clothing brands australia, australian streetwear brands. Data cost: US$0.114._

## Australian winter wear: beanies, jackets and knitwear: 50/100

**Verdict:** Commercially weak and seasonal: the best terms (merino, beanies) are small, search volume is modest, and most product-listing pages would be thin unless weather data drives them. It only works as a weather-led guide site with a few hundred genuinely distinct pages, and it has to be built before March to catch the May-August window.

**Site angle:** An Australian 'what to wear this week' site: city and suburb pages that turn BOM or Open-Meteo forecast and historical data (min temp, wind chill, rain, UV) into specific layering and jacket/beanie/merino recommendations, plus a small set of material guides (merino vs wool vs puffer) and beanie buying guides. Product picks come from affiliate feeds, not from generated listing pages.

**Data sources:** Bureau of Meteorology open data (observations and forecasts by station/postcode); Open-Meteo API (free, historical and forecast, Australian coordinates); ABS postcode and locality data (page targets and population weighting); Commission Factory merchant product feeds (approval-gated, for real prices, stock and images where licence allows); Google Trends and the keyword export for prioritising material and city terms

**Money:** Commission Factory affiliate links to AU outdoor and fashion retailers (check which brands are actually on the network, e.g. Kathmandu, Macpac, Icebreaker, Rip Curl); Amazon Associates AU for beanies and merino basics; Display ads on weather pages (low RPM, seasonal, so treat as a supplement)

**Page types:** /weather/[city-or-suburb]/what-to-wear/ (forecast-driven, refreshed daily from BOM/Open-Meteo); /[city]/winter-jackets-for-[temp-band]/ (e.g. below-10C, wind-chill, rainy days); /merino/[use-case]/ (thermals, base layers, activity-specific); /beanies/[material-or-fit]/ (merino, personalised, kids, sizing); /womens-winter-coats/[style]/ and /mens-winter-jackets/[style]/ (only with real feed data and distinct buyer guidance)

**Risks:** Seasonality: about four months of demand a year, so cash flow and Google ranking build-up are compressed; no meaningful traffic outside May-August; Thin-content penalty if city or temperature pages differ only by place name; each page needs data-driven, unique recommendations; Keyword volumes are small (most terms under 1,000/mo; the top clusters are mostly the same coat terms in different wording); a few hundred pages will not produce large traffic; Kd values of 0 on many terms look like tool artefacts and should be verified in a second source before committing; Affiliate feed approval and merchant terms may block image use or price display; some brands may not be on Commission Factory at all; Competition from large retailers and comparison sites (Kathmandu, Target, Myer, Amazon) with far larger domain authority on product terms; Weather-data licensing: BOM terms of use and attribution requirements must be checked before scaling; Google's helpful-content and spam policies apply to scaled AI copy; copy must be reviewed and grounded in the data, not generic

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| ladies winter coats australia sale | 1,300 | 0 | $0.59 |
| women's winter jackets australia | 880 | 0 | $0.68 |
| ladies winter coats australia | 880 | 0 | $0.68 |
| womens winter coats australia | 880 | 0 | $0.68 |
| ladies winter jackets australia | 880 | 0 | $0.68 |
| woollen jumpers australia | 720 | 0 | $0.94 |
| men's winter jackets australia | 720 | 0 | $0.44 |
| beanies australia | 590 | 0 | $0.98 |
| beanie au | 590 | 0 | $0.98 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| ladies winter coats australia sale | 1,300 | 0 | $0.59 |
| icebreaker clothes australia | 1,300 | — | $0.63 |
| women's winter jackets australia | 880 | 0 | $0.68 |
| ladies winter coats australia | 880 | 0 | $0.68 |
| womens winter coats australia | 880 | 0 | $0.68 |
| ladies winter jackets australia | 880 | 0 | $0.68 |
| woollen jumpers australia | 720 | 0 | $0.94 |
| men's winter jackets australia | 720 | 0 | $0.44 |
| beanies australia | 590 | 0 | $0.98 |
| beanie au | 590 | 0 | $0.98 |
| winter jackets australia | 480 | 5 | $0.92 |
| merino wool clothing australia | 480 | 0 | $1.40 |
| winter coats australia | 480 | 0 | $0.92 |
| merino clothing australia | 480 | 34 | $1.40 |
| winter coat au | 480 | 0 | $0.92 |

_Seeds: beanies australia, winter jackets australia, merino wool clothing australia, australian knitwear brands, best winter jacket australia. Data cost: US$0.114._

## US public library branches by city: 46/100

**Verdict:** The data is real and free: IMLS PLS outlet-level stats plus OSM branch geometry can support thousands of city and branch pages. But the search demand is mostly navigational ("tulsa public library", "hardesty library hours") and is already answered by the official library sites and Google Maps, and the commercial intent that pays is thin. The 1.1M/mo top-100 figure can't be checked against the list supplied, which shows roughly 40k/mo across about 33 queries.

**Site angle:** A US-wide library statistics site, not a branch directory: /library/[city-state] pages comparing per-capita funding, visits, circulation and programmes against peer cities, with a branch list and map beneath. Lead with the comparison data, which is what makes each page useful, and treat hours and addresses as secondary, since Google Maps owns those queries.

**Data sources:** IMLS Public Libraries Survey (annual outlet-level and systems-level CSV/Excel, free); OpenStreetMap amenity=library nodes/ways via Overpass API (free, ODbL attribution required); US Census population estimates by place (free) for per-capita denominators; Library system websites for hours (scraping is fragile; treat as optional)

**Money:** Display ads (Mediavine/Ezoic-style) on statistics pages; expect low RPM because intent is informational; Bookshop.org affiliate links on reading and library-program pages; Libro.fm affiliate links on audiobook content; Amazon Associates for library-science and reading-list books; No strong lead-gen category identified; relocation or moving-service leads are a weak possibility for city pages

**Page types:** /library/[city-state] for each place with a public library: branch list, per-capita stats, peer comparison; /library/[city-state]/[branch-slug] for each outlet: address, OSM map, PLS visits and circulation, service area; /library-systems/[state] index pages ranking systems by per-capita metrics; /compare/[city-a]-vs-[city-b] for high-population pairs where the data differs meaningfully

**Risks:** Search volume is concentrated in a few Tulsa queries; the long tail of 100+/mo searches needs per-city validation before building thousands of pages; The official library sites and Google Maps dominate branch and hours queries, so clicks are limited; IMLS PLS data lags by one to two years and some branch records are incomplete or inconsistent across years; OSM hours and addresses go stale; wrong hours send people to closed branches, so show hours only with a source date or a link to the library; Attribution requirements for OSM (ODbL) and any scraped library-site content need handling; Per-capita pages built from the same template are at risk of being judged thin unless the comparisons and narrative are genuinely varied; Very low affiliate relevance means revenue per page will be small; the site needs display traffic at scale to pay

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| libraries in tulsa oklahoma | 9,900 | 19 | $0.56 |
| tulsa city county library tulsa ok | 8,100 | 25 | $0.62 |
| downtown tulsa library | 720 | 2 | $3.25 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| libraries in tulsa oklahoma | 9,900 | 19 | $0.56 |
| city of tulsa library | 9,900 | — | $0.56 |
| libraries in tulsa | 9,900 | 36 | $0.56 |
| tulsa city county library tulsa ok | 8,100 | 25 | $0.62 |
| tulsa public library | 1,900 | 39 | $0.76 |
| tulsa oklahoma public library | 1,900 | — | $0.76 |
| downtown tulsa library | 720 | 2 | $3.25 |
| tulsa library hours | 480 | 28 | $10.55 |
| hardesty library tulsa | 480 | 28 | $9.94 |
| hardesty library tulsa ok | 480 | 28 | $9.94 |
| tulsa libraries near me | 260 | 17 | $0.03 |
| university of tulsa library | 140 | 23 | — |
| rudisill regional library tulsa ok | 110 | 6 | $24.02 |
| tulsa library events | 110 | 37 | $0.84 |
| tulsa library printing | 90 | 13 | $4.84 |

_Seeds: libraries in tulsa oklahoma, how many library branches in phoenix, public library hours near denver. Data cost: US$0.107._

## Retro game finder: where to play classic games today (AU): 42/100

**Verdict:** Only a narrow version works: a PC-first classic game price and availability finder built on Steam and GOG APIs, plus Wikidata for metadata. The console side (Switch Online, PS Plus Classics) has no public catalogue API and needs manual curation, and the biggest keywords are Nintendo brand queries with low CPC, so the money sits in long-tail game pages.

**Site angle:** auplay.example/classic/[game]: one page per classic PC/DOS/Windows game that is currently legally buyable or playable in Australia. Each page shows live AU prices from GOG and Steam, the cheapest verified option, and a short note on compatibility. Keep console availability as a small, manually reviewed list, not an auto-generated claim. Do not build the full six-platform 'where to play everything' site as the first launch.

**Data sources:** Wikidata SPARQL (CC0): titles, release years, developers, platforms, and Steam/GOG ID properties to link entities; Steam Store API appdetails with cc=au for AU pricing, availability and age ratings; GOG catalogue endpoints (undocumented, verify terms and stability before relying on them); Wikipedia platform and release lists for the game universe and seeding; Manually verified Nintendo Switch Online and PS Plus Classics catalogue snapshots, reviewed monthly, never auto-scraped

**Money:** GOG affiliate via Adtraction (confirm AU availability and current commission; the 6% figure is the founder's estimate); Fanatical and Green Man Gaming affiliate (confirm rate; ~5% is unverified); Amazon Associates AU for collections, mini consoles and retro handhelds (requires qualifying sales to stay active); eBay Partner Network for original cartridges, with a caveat that used-price volatility makes price claims risky; Display ads only once traffic justifies it; retro-gaming RPM is modest

**Page types:** /classic/[game]: one page per game, live AU storefront prices and verified availability; /platform/[platform]: e.g. /platform/dos, /platform/gamecube, listing games with a current legal option; /platform/[platform]/[genre]: only where at least 10 games have verified availability; /buy/[game]-cartridge: original cartridge price pages, only for high-volume titles with real eBay listing data; /subscriptions/[service]: manually maintained catalogue pages, not templated per game

**Risks:** No public API for Nintendo Switch Online or PS Plus Classics catalogues; auto-generated 'available on NSO' claims would be wrong and scraping breaks ToS; Availability and price data goes stale quickly; wrong 'where to play today' answers are a trust and YMYL-adjacent-consumer risk; Google may treat per-game templated pages with little unique content as thin; each page needs real price history or compatibility data to justify it; Top keywords are brand queries (nintendo switch online, eshop gift card) that Nintendo's own properties dominate, with CPC around $0.07 to $0.60; Per-game volumes are small: most DOS and GameCube game queries are in the tens to low hundreds per month, so traffic depends on breadth; Affiliate programme availability, rates and cookie terms for GOG, Fanatical and GMG in AU are unverified and could change; Amazon Associates and eBay PN both have terms on price display and sales thresholds that affect whether the site can monetise at all; Trademark and nominative use of Nintendo, Sony and Sega names needs careful disclaimers; avoid implying endorsement and never link to ROM or abandonware sources

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| nintendo switch online | 3,600 | 29 | $0.16 |
| nintendo online | 2,900 | 29 | $0.64 |
| nintendo switch online subscription | 1,900 | 30 | $0.07 |
| goldeneye 007 nintendo | 1,900 | 24 | $0.60 |
| game cube games | 1,300 | 3 | $0.28 |
| price nintendo switch | 1,300 | 9 | $0.25 |
| nintendo switch rpg games | 1,000 | 0 | $0.12 |
| nintendo cube games | 1,000 | 14 | $0.31 |
| nintendo switch sonic games | 720 | 0 | $0.14 |
| nintendo switch online individual membership | 720 | 19 | $0.07 |
| switch online | 590 | 27 | $0.29 |
| nintendo switch online family membership | 590 | 16 | $0.24 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| nintendo switch online | 3,600 | 29 | $0.16 |
| nintendo online switch | 3,600 | — | $0.16 |
| nintendo online | 2,900 | 29 | $0.64 |
| nintendo switch online membership | 2,900 | 34 | $0.09 |
| retro handheld game system | 2,900 | — | $1.26 |
| 64 nintendo games | 2,400 | — | $0.35 |
| nintendo e shop gift card | 1,900 | — | $0.53 |
| nintendo switch online subscription | 1,900 | 30 | $0.07 |
| goldeneye 007 nintendo | 1,900 | 24 | $0.60 |
| nintendoswitch eshop | 1,600 | — | $0.29 |
| sonic and mario olympic | 1,600 | — | $0.21 |
| game cube games | 1,300 | 3 | $0.28 |
| nintendo e shop cards | 1,300 | — | $1.35 |
| price nintendo switch | 1,300 | 9 | $0.25 |
| nintendo switch rpg games | 1,000 | 0 | $0.12 |

_Seeds: chrono trigger steam, chrono trigger switch, super mario 64 switch, gamecube games on switch, sega mega drive classics, nintendo switch online games, best retro handheld, best retro console, castlevania anniversary collection, dos games. Data cost: US$0.114._

## Australian loungewear and comfortwear brands: 42/100

**Verdict:** Keyword demand is thin: the whole list is roughly 4,000 searches a month across near-duplicate groups, and the largest clusters are generic retail queries that big retailers and Google Shopping already own. It only works if merchant feeds give each page live price, size and stock data that a human-written guide can't match, and that data needs formal affiliate-feed access.

**Site angle:** A price-and-stock comparison directory for about 30-50 Australian comfortwear brands. Each brand gets a page, and each category (hoodies, track pants, lounge sets) gets a comparison page built from live feed data, with a 'price drops this week' page. Skip generic 'best X' guides as the core product.

**Data sources:** Commission Factory merchant product feeds for approved Australian fashion/apparel merchants (price, stock, sizes, images, deep links), accessed under each merchant's programme terms; Awin and other AU affiliate-network product feeds where the merchant offers them; ABN Lookup bulk extract (free, government data) to verify brand legal entity names and ABNs for brand pages; Google Search Console and Keyword Planner exports to prioritise which brand and category pages to build

**Money:** Commission Factory affiliate commissions on approved fashion merchants (commission rates vary widely, and fashion is often low single digits to low double digits; verify per merchant); Awin and other affiliate networks where the same merchants are listed; Display ads once traffic clears a meaningful threshold (unlikely at this search volume)

**Page types:** /brand/[brand-slug]/ for each approved brand with live price range, stock status and category links; /brand/[brand-slug]/[category]/ e.g. /brand/example-brand/track-pants/ built from feed rows; /[category]/[state-or-city]/ only if you have real per-location stock or pickup data, otherwise skip; /price-drops/ and /new-arrivals/ generated from daily feed diffs; /compare/[brand-a]-vs-[brand-b]/ using only feed attributes (fabric, price, sizes), not invented reviews

**Risks:** Total search demand is small: the largest group is about 720/mo, and many 'best' queries sit at 30-70/mo, so traffic ceiling is low; Affiliate feed access is not guaranteed; many brands restrict feed use or require approval, and feed terms may ban redistribution or caching of prices; Price and stock data goes stale fast; out-of-date prices on affiliate pages create trust and compliance problems (Australian Consumer Law misleading-pricing risk if prices are shown incorrectly); Google may treat feed-only pages as thin or duplicate content unless each brand page has real editorial context, which is the core helpful-content risk here; Competition from Google Shopping, Myer, Kmart, Big W and brand sites on the head terms; ranking for 'loungewear sets australia' is unlikely at KD 0-1 without authority; Commission rates and cookie windows change; don't model revenue on the feed alone without actual click and sales data; Copyright: do not copy brand product descriptions or photos beyond what feed terms allow; write your own attributes and use links to source images

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| loungewear sets australia | 720 | 1 | $0.85 |
| lounge sets australia | 720 | 0 | $0.85 |
| lounge wear sets australia | 720 | 0 | $0.85 |
| loungewear australia | 590 | 6 | $1.12 |
| lounge wear aus | 590 | 6 | $1.12 |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| loungewear sets australia | 720 | 1 | $0.85 |
| lounge sets australia | 720 | 0 | $0.85 |
| lounge wear sets australia | 720 | 0 | $0.85 |
| loungewear australia | 590 | 6 | $1.12 |
| lounge wear aus | 590 | 6 | $1.12 |
| loungewear underwear australia | 480 | 0 | $1.38 |
| womens track pants australia | 260 | 0 | $0.92 |
| ladies track pants australia | 260 | 0 | $0.92 |
| best hoodies australia | 210 | 0 | $0.85 |
| women's loungewear sets australia | 210 | 0 | $0.69 |
| best hoodie brands australia | 170 | 1 | $0.65 |
| good quality hoodies australia | 170 | 2 | $1.67 |
| trackpants australia | 140 | — | $1.49 |
| luxury loungewear australia | 140 | 0 | $1.15 |
| mens track pants australia | 110 | 0 | $1.61 |

_Seeds: loungewear australia, australian loungewear brands, best hoodies australia, trackpants australia, comfortable clothes australia. Data cost: US$0.114._

## Hurricane history by coastal state: 33/100

**Verdict:** The data is genuinely usable: NOAA IBTrACS is free, public-domain, and carries wind and pressure per storm, so hundreds of real state pages are feasible. But the monetisation is weak for history content, and the traffic numbers you have don't agree with each other (the three top queries show 10/mo, while the 4.08M/mo total implies much higher volumes), so verify demand before building.

**Site angle:** stormyears.com as a state-by-state landfall archive: one page per coastal state listing every IBTrACS storm that made landfall there, with per-storm pages for wind, pressure and year, and a 'strongest storm' page per state. Keep it a data reference, not a blog, and leave insurance intent to a separate page or site.

**Data sources:** NOAA IBTrACS (International Best Track Archive for Climate Stewardship), free and public domain, includes wind speed, central pressure and track points; US Census TIGER/Line state boundary shapefiles (public domain), used to assign landfall points to states; NOAA NHC annual season reports and tropical cyclone reports (free, public domain) for narrative fact-checking

**Money:** Display ads via Ezoic or AdSense (low RPM for history/weather content; Mediavine needs about 50k sessions/month); Amazon Associates for hurricane prep products (generators, flood barriers, go-bags); low conversion but cheap to add; Lead-gen for homeowners insurance via EverQuote or MediaAlpha, only on separate intent pages (e.g. 'hurricane insurance by state'), since history queries rarely convert and insurance is near-YMYL; Impact-network prep brands as a secondary option

**Page types:** /[state]/hurricanes-that-hit/[year] (storms making landfall in that state that year); /[state]/strongest-hurricane/ (top storms by wind or pressure for the state); /[state]/hurricanes/[storm-name-year] (single-storm page with track map, wind, pressure, landfall date); /storms/[name-year] (canonical storm page linking to every affected state); /[state]/landfall-count-by-decade/ (count tables for queries like 'how many hurricanes has louisiana had')

**Risks:** Search volume is inconsistent: listed queries show 10/mo while the aggregate claims 4M/mo across 8,453 queries, so the demand figure is likely overstated; check with Search Console or a keyword tool before committing; Thin-content risk: data-only pages with templated AI copy are exactly what Google's scaled-content policies target; each page needs unique analysis, such as comparisons, context or regional impact notes; Attribution errors: IBTrACS track points near state borders or with multiple landfalls are easy to mis-assign, which damages trust; document the methodology; Low monetisation ceiling: history and weather queries carry low CPCs, and display RPM will be small per page; Disaster-adjacent YMYL: pages that touch on storm safety or preparedness need accurate sourcing from NHC/NOAA and clear disclaimers; Competition from NOAA, NHC, Wikipedia season pages and weather.com archives, which already rank for many storm queries; Domain fit: landfallmap.com suggests a map product, which needs map tiles and licensing (Mapbox or OpenStreetMap, with attribution), a larger build than a table site

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| hurricanes that hit florida by year | 10 | — | — |
| how many hurricanes has louisiana had | 10 | — | — |
| strongest hurricane to hit north carolina | 10 | 3 | — |

_Seeds: hurricanes that hit florida by year, how many hurricanes has louisiana had, strongest hurricane to hit north carolina. Data cost: US$0.102._

## US airport runway and elevation facts: 33/100

**Verdict:** The data is free, public-domain and legally clean, but AirNav, SkyVector and FAA's own pages already cover airport runway and elevation facts with far more authority, and the traffic figures look inflated by keyword clustering. Viable only as a narrower, utility-driven tool with a real aviation lead-gen angle, not as a generic one-page-per-airport site.

**Site angle:** airfieldlog.com as a runway and elevation lookup for pilots and aviation students: one page per public-use airport (ICAO/FAA ID) with a density-altitude calculator, runway table and a 'which aircraft types fit' summary, plus filtered list pages such as airports with runways over 6,000 ft by state. Skip generic 'how many runways' copy pages and build the calculator and comparison tools first.

**Data sources:** FAA NASR (28-day subscription cycle, public domain): airport, runway, elevation, and frequency records; OurAirports open data (public domain CSV): global airport, runway and elevation cross-reference; FAA Type Certificate Data Sheets (public): aircraft type reference for the 'aircraft fit' section, used only for category-level, non-performance claims; NOAA/NWS station data (public domain): optional temperature inputs for density altitude

**Money:** Sporty's Pilot Shop and ASA (Aviation Supplies & Academics) affiliate programs, to be verified before launch; Flight school and CFI lead forms (per-lead sales to local schools); Aircraft insurance and aircraft sales/broker leads (Trade-A-Plane, Controller listings where terms allow); Display ads (AdSense or Mediavine once traffic qualifies); aviation CPMs are modest, so expect low revenue per page

**Page types:** /airport/[icao]/ (e.g. /airport/kjfk/): runway table, elevation, FAA ID, cross-reference to FAA NASR; /airport/[icao]/density-altitude/: calculator page per airport with pre-filled elevation; /airports/[state]/: state index with elevation and longest-runway filters; /airports/runway-over-[length]-ft/[state]/: filtered list pages, generated only where the list has 5+ airports; /aircraft/[type]/airports/: airports where a given type's runway needs are plausibly met (category-level, not performance guarantees)

**Risks:** AirNav.com, SkyVector and FAA already rank for these queries with much stronger domain authority; the site needs a differentiating tool, not a copy; Search volume is unreliable: a 2.48M total across the top 100 with kd 0 on JFK suggests keyword-group inflation, so validate with Search Console or Ads planner before building; Most of the ~5,000 public-use airports have near-zero search demand, so the long tail is thin pages; Safety liability: any aircraft performance or go/no-go claim could lead to harm; use prominent 'not for flight planning' disclaimers and avoid performance numbers not from the POH; FAA NASR updates every 28 days, so pages go stale unless the pipeline re-ingests each cycle; Google may treat near-identical airport pages as thin content unless each page adds computed or sourced value (density altitude, nearby airports, approach notes)

**Easy wins** (500+ searches, difficulty ≤ 30):

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| how many runways does jfk have | 720 | 0 | — |

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| how many runways does jfk have | 720 | 0 | — |
| elevation of albuquerque airport | 10 | — | — |

_Seeds: longest runway at denver airport, elevation of albuquerque airport, how many runways does jfk have. Data cost: US$0.102._

## US school district enrollment by county: 31/100

**Verdict:** The data is strong: NCES CCD is free, public domain, and covers about 13,000 districts with enrollment and finance fields, so unique per-district pages are feasible. But the sampled queries are tiny (20/mo for Austin ISD), the 2.3M/mo total does not square with that sample, and display-ad and affiliate value for enrollment numbers alone is weak; only homebuyer-adjacent lead generation makes this worth building.

**Site angle:** A district and county comparison site for families and homebuyers ('which districts in this county are growing, how big are they, what do they spend per pupil'), with enrollment as the hook and mortgage, insurance and moving leads as the revenue. Start with one state (for example Texas or Florida) to test whether the pages earn anything before scaling nationally.

**Data sources:** NCES Common Core of Data (CCD) directory and membership files (enrollment by district, grade and race/ethnicity), via nces.ed.gov and the Urban Institute Education Data Portal API; CCD School Finance (F-33) for per-pupil current spending; EDFacts adjusted cohort graduation rate files for graduation rates; Census county and place boundaries and ACS population data for county pages and context

**Money:** Lead generation for mortgage and refinance (e.g. via lead marketplaces) on district pages, since school quality drives relocation search; Home and auto insurance leads via networks such as EverQuote or MediaAlpha on county pages; Moving-company lead forms on compare pages; Amazon Associates for school supplies and tutoring-related items, low yield; Display ads (AdSense or Mediavine if traffic qualifies), low RPM, treat as a floor only

**Page types:** /district/[state]/[district-slug]/ (enrollment trend, grades, per-pupil spend, graduation rate); /county/[state]/[county-slug]/ (all districts in county, totals, largest and fastest-changing); /compare/[district-a]-vs-[district-b]/ for pairs within the same state or metro; /state/[state]/enrollment/ (state rollup and ranking); /[state]/districts-by-enrollment/ (sortable list)

**Risks:** Per-query volume is very low (about 20/mo in the sample); the 2.3M/mo aggregate needs checking because it implies ~23k per query on average, which contradicts the sample; Incumbents (GreatSchools, Niche, Public School Review, state DOE sites) already rank for these queries and have far more reviews and traffic; Thin-content risk: enrollment numbers alone are the same across dozens of pages; the copy and comparisons must add real analysis or the pages look mass-produced; CCD data lags 1-2 years and has suppressed or missing values for small districts and some states; pages will show stale or blank fields; Charter, multi-county and merged districts create identity and boundary mismatches that produce wrong or duplicated pages; Mortgage and insurance lead gen is regulated (TCPA, state licensing, advertising rules), and lead prices fall sharply for thin sites; Dependence on Google for a page set that is data-heavy but low-intent could mean a long wait before any revenue

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| how many students in austin isd | 20 | 5 | — |

_Seeds: school enrollment in harris county, how many students in austin isd, largest school districts in ohio. Data cost: US$0.102._

## Freshwater fish species by state: 28/100

**Verdict:** The headline 5.47M/mo figure cannot be reconciled with the listed terms: the largest listed search is 260/mo and most are 10-140/mo, so the real addressable volume looks like a few thousand searches a month at near-zero CPC. The data is public and the pattern is programmatic, but the monetisation ceiling is very low unless the site also captures adjacent fishing intent.

**Site angle:** fishbystate.com as a state-by-state freshwater fish and invasive species reference: one page per state (/[state]/freshwater-fish/) plus one per species-state pair only where USGS NAS or state agency records exist, with an invasive-species hub (/invasive-fish/[state]/). Skip lakeroster and fishroster, which don't match the pattern. Build only the states and species with verified records and treat it as a 50-state reference, not a 5,000-page farm.

**Data sources:** USGS Nonindigenous Aquatic Species (NAS) database: public domain US government data, state-level occurrence and status records; GBIF occurrence API: per-dataset licences, filter to CC0/CC-BY; State wildlife agency fish lists and regulations pages (check each agency's reuse terms); iNaturalist API: observation photos under per-item CC licences, for images with attribution; Wikidata/Wikipedia: CC0 and CC-BY-SA for species names and descriptions

**Money:** Amazon Associates: tackle, aquarium and identification guides, contextual to species pages; Bass Pro Shops affiliate programme for fishing gear, contextual to state pages; Display ads only once traffic justifies a network; at this volume, expect them to be marginal; Do NOT monetise live sales of invasive species (snakehead, lionfish, etc.); many states prohibit possession or sale, so this is a legal and reputational risk

**Page types:** /[state]/freshwater-fish/ : hub listing species with verified records in that state, native/introduced status from USGS NAS; /[species]-in-[state]/ : only where a USGS NAS or GBIF record exists for that pair; otherwise no page; /invasive-fish/[state]/ : invasive and nonindigenous species with control and reporting info from the state agency; /species/[species]/ : single species page with range map data, habitat and native status, shared across states

**Risks:** Headline volume figures are internally inconsistent; verify the 52858 and 5.47M numbers in a keyword tool before committing; Search volume is tiny and CPC near zero, so revenue per page is very low; NatureServe data is licence-restricted for commercial use; obtain permission or exclude it; FishBase terms are restrictive for commercial reuse; avoid bulk scraping; Thin-page risk: many state/species pairs will have no data; generating them anyway triggers Google's mass-produced content penalty; Invasive species content may be read as encouraging harmful releases or sales; include clear reporting and no-release guidance; Species-level habitat text and regulation details can go stale; they need refresh cycles and clear dating; Fish regulations and licensing sit near YMYL territory; avoid presenting regulations as authoritative without linking the state agency

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|
| snakehead fish in texas | 260 | 0 | — |
| freshwater fish in ohio | 140 | 0 | $0.03 |
| what fish live in lake michigan | 140 | 0 | — |
| invasive fish species in texas | 40 | 2 | — |
| fresh water fish in ohio | 20 | 0 | — |
| australian redclaw crayfish in texas | 10 | 0 | — |
| fresh water fish ohio | 10 | — | — |
| lionfish texas | 10 | 42 | — |
| ohio fresh water fish | 10 | — | — |
| ohio freshwater fish species | 10 | — | — |

_Seeds: freshwater fish in ohio, what fish live in lake michigan, invasive fish species in texas. Data cost: US$0.103._

## Rail travel times between NSW stations: 21/100

**Verdict:** The data is real and free, and the page pattern can scale, but Google already answers most of these queries with transit cards and Transport NSW's own planner, and rail queries have almost no direct affiliate income. It only works as a utility site monetised through adjacent travel offers, and the 1.37M/mo figure is probably inflated by grouped variants.

**Site angle:** railhop.com.au as a station-and-route reference: one page per station with first and last services by day type, plus route pages only for station pairs with a direct or single-change service in the GTFS data, not every possible pair. Launch with about 1,000 to 2,000 pages and add travel-adjacent modules (accommodation near each station, tours, car hire) to earn.

**Data sources:** Transport for NSW Open Data Hub GTFS Static timetable feed (free API key; check the current licence, which is expected to be CC BY 4.0 with attribution); GTFS stops.txt and stop_times.txt for station coordinates, stop sequences and first/last departures; OpenStreetMap or the NSW Spatial Data portal for station and suburb geography, to add local context; Optional: GTFS-Realtime feed for a live disruption flag, only if the feed's terms allow it

**Money:** Travel insurance comparison affiliate links on station and route pages (Australian comparison sites often pay per acquisition; verify rates); Booking.com Affiliate Partner Programme and Expedia Partner Solutions for stays near stations; Klook or GetYourGuide affiliate links for day trips from each station; Car hire affiliates (Discover Cars, or Rentalcars via Awin) on long-distance route pages; Display ads only after traffic is proven; travel RPM is modest; Do not expect Trainline or Opal-style rail booking commissions; I'm not aware of a usable AU rail-ticket affiliate, so verify before planning around one

**Page types:** /station/[station-slug]/ with first and last services by weekday, Saturday and Sunday, plus stop count on each line; /[origin]-to-[destination]-by-train/ only for pairs with a direct or single-change service, showing journey time range, stop count, first and last service, and change points; /line/[line-name]/ timetable hub pages linking to all stations on the line; /[station]-accommodation/ or /[station]-day-trips/ monetisation pages, only where there is real local content; Avoid bulk /[city]-to-[city]/ pages that repeat the same table with different names

**Risks:** Google's transit cards and Transport NSW's planner dominate the query, so click-through may be low even with good data; Scheduled journey times are not actual journey times; disruptions, engineering works and weekend variations can make pages wrong, which damages trust; Thin-content risk: a page that is only a timetable table with templated text may be treated as low value, so each page needs station-specific context; Search volume figures from grouped Google Ads keyword data may overstate the real addressable traffic; Licence and attribution compliance for TfNSW data; do not imply endorsement or use the TfNSW or Opal branding in a misleading way; Affiliate income per visitor is likely low for transit queries, so the site needs substantial traffic to pay off; Feed format changes or API key policy changes could break the whole codebase at once

**Biggest searches:**

| Search | /mo | Difficulty | CPC |
|---|---:|---:|---:|

_Seeds: how long to get from parramatta to central by train, train from wollongong to sydney how long, how far is epping station from town hall. Data cost: US$0.09._

## Money map: estimated revenue at maturity

Per month, once a site ranks (usually 6–18 months). Low / mid / high: visits × affiliate clicks × conversion × payout (average of the top 3 matching programmes), plus display ads. These numbers rank ideas against each other; they are not forecasts. They get replaced by our own measured rates as our sites earn.

**Model:** Calibrated from 302 page views, 2 affiliate clicks and 0 reported sales (trailers, vic, community-help-co): click rate 4.4% (assumed 5.0%), conversion 5.0% (assumed 5.0%). The assumption weighs as much as 2,000 views / 200 clicks, so real data takes over as it grows.

| Idea | Market | Visits/mo (mid) | Est. revenue/mo (low · mid · high) | Avg payout per sale | Score |
|---|---|---:|---|---:|---:|
| Dog breeds | United States | 274,520 | $1,501 · **$13,983** · $67,559 | $18.33 | 75 |
| US national parks and hiking trails | United States | 89,156 | $311 · **$2,709** · $12,569 | $9 | 74 |
| Anime: where to watch and watch order | United States | 102,419 | $198 · **$1,455** · $5,980 | $1.7 | 70 |
| TV shows: where to watch | United States | 27,719 | $110 · **$769** · $3,024 | $1.7 | 73 |
| Video games: release dates and trailers | United States | 70,520 | $60 · **$463** · $1,982 | $1.17 | 62 |
| Book series in reading order | United States | 24,564 | $22 · **$175** · $764 | $1.43 | 53 |
| Victoria: where to stay by town | Australia | 3,903 | $16 · **$144** · $674 | $11.33 | 66 |
| Movie soundtracks and film music | United States | 11,888 | $11 · **$85** · $370 | $1.43 | 53 |
| Board games | United States | 11,226 | $10 · **$79** · $345 | $1.4 | 61 |
| Victoria: things to do by town | Australia | 1,769 | $6 · **$53** · $259 | $11.33 | 60 |
| Retro game finder: where to play classic games today (US) | United States | 6,967 | $5 · **$41** · $172 | $0.87 | 58 |
| Victoria: where to eat by town | Australia | 779 | $2 · **$18** · $90 | $9 | 51 |
| Australian clothing brands directory (beason.com.au) | Australia | 949 | $2 · **$16** · $68 | $3.5 | 50 |
| Retro game finder: where to play classic games today (AU) | Australia | 423 | $0 · **$3** · $11 | $1 | 42 |
| Australian winter wear: beanies, jackets and knitwear | Australia | 122 | $0 · **$3** · $16 | $9 | 50 |
| US public library branches by city | United States | 226 | $0 · **$2** · $9 | $1.43 | 46 |
| Australian loungewear and comfortwear brands | Australia | 36 | $0 · **$1** · $5 | $9 | 42 |
| Hurricane history by coastal state | United States | 0 | $0 · **$0** · $0 | $3.83 | 33 |
| Freshwater fish species by state | United States | 3 | $0 · **$0** · $0 | $7 | 28 |
| Rail travel times between NSW stations | Australia | 0 | $0 · **$0** · $0 | $11.33 | 21 |
| US school district enrollment by county | United States | 0 | $0 · **$0** · $0 | $9 | 31 |
| US airport runway and elevation facts | United States | 4 | $0 · **$0** · $1 | $11.33 | 33 |

## Programmes to consider, by idea

### Dog breeds

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| BarkBox | $20.80 per sale | moderate | Application (likely via FlexOffers) with site + audience details; a website expected | not applied |
| Embrace Pet Insurance | Listed as $36 per lead; one listing says ~$5 per lead / $36 per policy sale (confirm in Impact) | moderate | Join via Impact; traffic must be US-based (US pets only); no adult, religious or political content | not applied |
| Chewy | $15 per new-customer order (Chewy says ~8% equivalent) | moderate | Join via Partnerize; no coupon/deal sites; required disclosure line; no "Chewy" in domain | not applied |
| Rover (pet sitting) | ~15% per referral | moderate | check | not applied |
| Ruffwear (dog gear) | ~8% | easy | check | not applied |
| Bookshop.org affiliates *(check)* | check (commonly quoted ~10%) | easy | check | not applied |
| Amazon Associates US: pet supplies | 3% | easy | Same Associates account | approved |
| Amazon Associates US: physical books | 4.5% | easy | Same Associates account | approved |

### US national parks and hiking trails

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Booking.com Affiliate Partner | Revenue share, up to ~40% of Booking's commission (roughly 4% of the stay) | moderate | Content site about travel; tax form + payment details (W-8BEN-E for AU companies) | applying |
| Hotel groups (Marriott, Hilton, IHG) | ~3–7% | moderate | check | not applied |
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | approved |
| Viator Partner Program | ~8% of booking value | easy | Website with travel content | approved |
| GetYourGuide Partner Program | ~8% baseline, tiered up for volume | easy | Website with travel content | approved |
| Ruffwear (dog gear) | ~8% | easy | check | not applied |
| REI | 5% per sale | moderate | Apply via AvantLink with site + audience details; $50 payout threshold | not applied |
| Klook Affiliate | 2–5% per booking | easy | Application via CJ with site + audience details; $50 payout threshold | approved |

### Anime: where to watch and watch order

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Anime streaming (e.g. Crunchyroll) *(check)* | check (may not run an open programme) | hard | check | not applied |
| Amazon Associates US: digital video (Prime Video) | 5% (digital video); bounties: $3 Prime trial, $5 first Prime Video stream | easy | 3 qualifying sales within 180 days of joining, or the account is closed | approved |
| Amazon Associates US: DVD and Blu-ray | 2.5% | easy | Same Associates account | approved |

### TV shows: where to watch

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Anime streaming (e.g. Crunchyroll) *(check)* | check (may not run an open programme) | hard | check | not applied |
| Amazon Associates US: digital video (Prime Video) | 5% (digital video); bounties: $3 Prime trial, $5 first Prime Video stream | easy | 3 qualifying sales within 180 days of joining, or the account is closed | approved |
| Amazon Associates US: DVD and Blu-ray | 2.5% | easy | Same Associates account | approved |

### Video games: release dates and trailers

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Amazon Associates US: digital video (Prime Video) | 5% (digital video); bounties: $3 Prime trial, $5 first Prime Video stream | easy | 3 qualifying sales within 180 days of joining, or the account is closed | approved |
| Green Man Gaming *(check)* | check | easy | check | not applied |
| Humble Bundle partner *(check)* | check | easy | check | not applied |
| Amazon Associates US: DVD and Blu-ray | 2.5% | easy | Same Associates account | approved |
| Amazon Associates US: video games | 1% physical / 2% digital | easy | Same Associates account | approved |

### Book series in reading order

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Bookshop.org affiliates *(check)* | check (commonly quoted ~10%) | easy | check | not applied |
| Amazon Associates US: digital video (Prime Video) | 5% (digital video); bounties: $3 Prime trial, $5 first Prime Video stream | easy | 3 qualifying sales within 180 days of joining, or the account is closed | approved |
| Amazon Associates US: physical books | 4.5% | easy | Same Associates account | approved |
| Amazon Associates US: DVD and Blu-ray | 2.5% | easy | Same Associates account | approved |

### Victoria: where to stay by town

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Discover Cars / Rentalcars (car hire) | 70% of Discover Cars' profit on the hire + 30% of Full Coverage revenue (their worked example: ~£17 on a 7-day hire) | easy | Free sign-up with your website URL; no stated traffic minimum. Paid monthly by PayPal or wire. | not applied |
| Booking.com Affiliate Partner | Revenue share, up to ~40% of Booking's commission (roughly 4% of the stay) | moderate | Content site about travel; tax form + payment details (W-8BEN-E for AU companies) | applying |
| Hotel groups (Marriott, Hilton, IHG) | ~3–7% | moderate | check | not applied |
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | approved |
| Viator Partner Program | ~8% of booking value | easy | Website with travel content | approved |
| GetYourGuide Partner Program | ~8% baseline, tiered up for volume | easy | Website with travel content | approved |
| Klook Affiliate | 2–5% per booking | easy | Application via CJ with site + audience details; $50 payout threshold | approved |
| Commission Factory (Australian network) | varies by brand | easy | Sign up as an Affiliate; ABN + GST status; at least one live, finished website; email on the site's own domain helps; clear promotion plan; AU$5 card pre-authorisation (refunded); review within 3 business days. Then apply to each brand inside the network. | rejected |

### Movie soundtracks and film music

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Bookshop.org affiliates *(check)* | check (commonly quoted ~10%) | easy | check | not applied |
| Amazon Associates US: digital video (Prime Video) | 5% (digital video); bounties: $3 Prime trial, $5 first Prime Video stream | easy | 3 qualifying sales within 180 days of joining, or the account is closed | approved |
| Amazon Associates US: physical books | 4.5% | easy | Same Associates account | approved |
| Amazon Associates US: DVD and Blu-ray | 2.5% | easy | Same Associates account | approved |

### Board games

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Board game retailers (e.g. Miniature Market) *(check)* | check | moderate | check | not applied |
| Amazon Associates US: toys and games | 3% | easy | Same Associates account | approved |
| Green Man Gaming *(check)* | check | easy | check | not applied |
| Humble Bundle partner *(check)* | check | easy | check | not applied |
| Amazon Associates US: video games | 1% physical / 2% digital | easy | Same Associates account | approved |

### Victoria: things to do by town

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Discover Cars / Rentalcars (car hire) | 70% of Discover Cars' profit on the hire + 30% of Full Coverage revenue (their worked example: ~£17 on a 7-day hire) | easy | Free sign-up with your website URL; no stated traffic minimum. Paid monthly by PayPal or wire. | not applied |
| Booking.com Affiliate Partner | Revenue share, up to ~40% of Booking's commission (roughly 4% of the stay) | moderate | Content site about travel; tax form + payment details (W-8BEN-E for AU companies) | applying |
| Hotel groups (Marriott, Hilton, IHG) | ~3–7% | moderate | check | not applied |
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | approved |
| Viator Partner Program | ~8% of booking value | easy | Website with travel content | approved |
| GetYourGuide Partner Program | ~8% baseline, tiered up for volume | easy | Website with travel content | approved |
| Klook Affiliate | 2–5% per booking | easy | Application via CJ with site + audience details; $50 payout threshold | approved |
| Commission Factory (Australian network) | varies by brand | easy | Sign up as an Affiliate; ABN + GST status; at least one live, finished website; email on the site's own domain helps; clear promotion plan; AU$5 card pre-authorisation (refunded); review within 3 business days. Then apply to each brand inside the network. | rejected |

### Retro game finder: where to play classic games today (US)

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Green Man Gaming *(check)* | check | easy | check | not applied |
| Humble Bundle partner *(check)* | check | easy | check | not applied |
| Amazon Associates US: video games | 1% physical / 2% digital | easy | Same Associates account | approved |

### Victoria: where to eat by town

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Booking.com Affiliate Partner | Revenue share, up to ~40% of Booking's commission (roughly 4% of the stay) | moderate | Content site about travel; tax form + payment details (W-8BEN-E for AU companies) | applying |
| Hotel groups (Marriott, Hilton, IHG) | ~3–7% | moderate | check | not applied |
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | approved |
| Viator Partner Program | ~8% of booking value | easy | Website with travel content | approved |
| GetYourGuide Partner Program | ~8% baseline, tiered up for volume | easy | Website with travel content | approved |
| Klook Affiliate | 2–5% per booking | easy | Application via CJ with site + audience details; $50 payout threshold | approved |
| Commission Factory (Australian network) | varies by brand | easy | Sign up as an Affiliate; ABN + GST status; at least one live, finished website; email on the site's own domain helps; clear promotion plan; AU$5 card pre-authorisation (refunded); review within 3 business days. Then apply to each brand inside the network. | rejected |
| Impact (affiliate network) | varies by brand | moderate | Publisher account; verify site by meta tag; then apply to each brand | applying |

### Australian clothing brands directory (beason.com.au)

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Ruffwear (dog gear) | ~8% | easy | check | not applied |
| Amazon Associates Australia | By category (third-party table, 2021): 9% pet, outdoors, home; 5.5% books; 5% electronics; 3.5% DVD/Blu-ray; 2% digital video; 4% other | easy | Separate amazon.com.au account; 3 qualifying sales within 180 days or the account closes | not applied |
| Commission Factory (Australian network) | varies by brand | easy | Sign up as an Affiliate; ABN + GST status; at least one live, finished website; email on the site's own domain helps; clear promotion plan; AU$5 card pre-authorisation (refunded); review within 3 business days. Then apply to each brand inside the network. | rejected |

### Retro game finder: where to play classic games today (AU)

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Amazon Associates Australia | By category (third-party table, 2021): 9% pet, outdoors, home; 5.5% books; 5% electronics; 3.5% DVD/Blu-ray; 2% digital video; 4% other | easy | Separate amazon.com.au account; 3 qualifying sales within 180 days or the account closes | not applied |
| Green Man Gaming *(check)* | check | easy | check | not applied |
| Humble Bundle partner *(check)* | check | easy | check | not applied |

### Australian winter wear: beanies, jackets and knitwear

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Booking.com Affiliate Partner | Revenue share, up to ~40% of Booking's commission (roughly 4% of the stay) | moderate | Content site about travel; tax form + payment details (W-8BEN-E for AU companies) | applying |
| Hotel groups (Marriott, Hilton, IHG) | ~3–7% | moderate | check | not applied |
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | approved |
| Ruffwear (dog gear) | ~8% | easy | check | not applied |
| Amazon Associates Australia | By category (third-party table, 2021): 9% pet, outdoors, home; 5.5% books; 5% electronics; 3.5% DVD/Blu-ray; 2% digital video; 4% other | easy | Separate amazon.com.au account; 3 qualifying sales within 180 days or the account closes | not applied |
| Commission Factory (Australian network) | varies by brand | easy | Sign up as an Affiliate; ABN + GST status; at least one live, finished website; email on the site's own domain helps; clear promotion plan; AU$5 card pre-authorisation (refunded); review within 3 business days. Then apply to each brand inside the network. | rejected |
| Impact (affiliate network) | varies by brand | moderate | Publisher account; verify site by meta tag; then apply to each brand | applying |

### US public library branches by city

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Bookshop.org affiliates *(check)* | check (commonly quoted ~10%) | easy | check | not applied |
| Amazon Associates US: digital video (Prime Video) | 5% (digital video); bounties: $3 Prime trial, $5 first Prime Video stream | easy | 3 qualifying sales within 180 days of joining, or the account is closed | approved |
| Amazon Associates US: physical books | 4.5% | easy | Same Associates account | approved |
| Amazon Associates US: DVD and Blu-ray | 2.5% | easy | Same Associates account | approved |

### Australian loungewear and comfortwear brands

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Booking.com Affiliate Partner | Revenue share, up to ~40% of Booking's commission (roughly 4% of the stay) | moderate | Content site about travel; tax form + payment details (W-8BEN-E for AU companies) | applying |
| Hotel groups (Marriott, Hilton, IHG) | ~3–7% | moderate | check | not applied |
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | approved |
| Amazon Associates Australia | By category (third-party table, 2021): 9% pet, outdoors, home; 5.5% books; 5% electronics; 3.5% DVD/Blu-ray; 2% digital video; 4% other | easy | Separate amazon.com.au account; 3 qualifying sales within 180 days or the account closes | not applied |
| Commission Factory (Australian network) | varies by brand | easy | Sign up as an Affiliate; ABN + GST status; at least one live, finished website; email on the site's own domain helps; clear promotion plan; AU$5 card pre-authorisation (refunded); review within 3 business days. Then apply to each brand inside the network. | rejected |
| Impact (affiliate network) | varies by brand | moderate | Publisher account; verify site by meta tag; then apply to each brand | applying |

### Hurricane history by coastal state

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Travel insurance (World Nomads, SafetyWing, Allianz) | ~10–40% | moderate | check | not applied |
| Bookshop.org affiliates *(check)* | check (commonly quoted ~10%) | easy | check | not applied |
| Amazon Associates US: digital video (Prime Video) | 5% (digital video); bounties: $3 Prime trial, $5 first Prime Video stream | easy | 3 qualifying sales within 180 days of joining, or the account is closed | approved |
| Amazon Associates US: physical books | 4.5% | easy | Same Associates account | approved |
| Amazon Associates US: DVD and Blu-ray | 2.5% | easy | Same Associates account | approved |

### Freshwater fish species by state

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Viator Partner Program | ~8% of booking value | easy | Website with travel content | approved |
| GetYourGuide Partner Program | ~8% baseline, tiered up for volume | easy | Website with travel content | approved |
| Ruffwear (dog gear) | ~8% | easy | check | not applied |
| REI | 5% per sale | moderate | Apply via AvantLink with site + audience details; $50 payout threshold | not applied |
| Klook Affiliate | 2–5% per booking | easy | Application via CJ with site + audience details; $50 payout threshold | approved |
| Bookshop.org affiliates *(check)* | check (commonly quoted ~10%) | easy | check | not applied |
| Amazon Associates US: sports and outdoors | 3% | easy | Same Associates account | approved |
| Amazon Associates US: physical books | 4.5% | easy | Same Associates account | approved |

### Rail travel times between NSW stations

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Discover Cars / Rentalcars (car hire) | 70% of Discover Cars' profit on the hire + 30% of Full Coverage revenue (their worked example: ~£17 on a 7-day hire) | easy | Free sign-up with your website URL; no stated traffic minimum. Paid monthly by PayPal or wire. | not applied |
| Booking.com Affiliate Partner | Revenue share, up to ~40% of Booking's commission (roughly 4% of the stay) | moderate | Content site about travel; tax form + payment details (W-8BEN-E for AU companies) | applying |
| Hotel groups (Marriott, Hilton, IHG) | ~3–7% | moderate | check | not applied |
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | approved |
| Viator Partner Program | ~8% of booking value | easy | Website with travel content | approved |
| GetYourGuide Partner Program | ~8% baseline, tiered up for volume | easy | Website with travel content | approved |
| Klook Affiliate | 2–5% per booking | easy | Application via CJ with site + audience details; $50 payout threshold | approved |
| Commission Factory (Australian network) | varies by brand | easy | Sign up as an Affiliate; ABN + GST status; at least one live, finished website; email on the site's own domain helps; clear promotion plan; AU$5 card pre-authorisation (refunded); review within 3 business days. Then apply to each brand inside the network. | rejected |

### US school district enrollment by county

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Booking.com Affiliate Partner | Revenue share, up to ~40% of Booking's commission (roughly 4% of the stay) | moderate | Content site about travel; tax form + payment details (W-8BEN-E for AU companies) | applying |
| Hotel groups (Marriott, Hilton, IHG) | ~3–7% | moderate | check | not applied |
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | approved |
| Bookshop.org affiliates *(check)* | check (commonly quoted ~10%) | easy | check | not applied |
| Amazon Associates US: physical books | 4.5% | easy | Same Associates account | approved |
| Impact (affiliate network) | varies by brand | moderate | Publisher account; verify site by meta tag; then apply to each brand | applying |

### US airport runway and elevation facts

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Discover Cars / Rentalcars (car hire) | 70% of Discover Cars' profit on the hire + 30% of Full Coverage revenue (their worked example: ~£17 on a 7-day hire) | easy | Free sign-up with your website URL; no stated traffic minimum. Paid monthly by PayPal or wire. | not applied |
| Booking.com Affiliate Partner | Revenue share, up to ~40% of Booking's commission (roughly 4% of the stay) | moderate | Content site about travel; tax form + payment details (W-8BEN-E for AU companies) | applying |
| Hotel groups (Marriott, Hilton, IHG) | ~3–7% | moderate | check | not applied |
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | approved |
| Impact (affiliate network) | varies by brand | moderate | Publisher account; verify site by meta tag; then apply to each brand | applying |

## Ad networks (when traffic qualifies)

| Network | Minimum traffic | Notes |
|---|---|---|
| Google AdSense | None | Easy to join; lower earnings than premium networks |
| Newor Media | Low (no figure published) | No niche restrictions |
| Raptive | 25,000 pageviews | Reviews content quality and niche fit |
| Mediavine | 50,000 sessions | Strong in lifestyle; check Journey (smaller-site tier) terms |
| Ezoic | 250,000 users (raised Feb 2026) |  |

_Catalogue: hq/affiliate-programs.json (31 programmes, updated 2026-10-21). "(check)" = terms not yet verified from a current source._
