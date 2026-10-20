# Niche finder

Updated 2026-10-20. Google searches in the United States unless an idea says otherwise (Market column). Score = 30% demand + 25% money (CPC) + 25% ease (SEO difficulty) + 20% fit (Claude: data source, automation, monetisation, risk).

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
| 9 | Book series in reading order | United States | **53** | 90 | 25 | 50 | 38 | 4,912,700 | $0.27 | — |
| 10 | Movie soundtracks and film music | United States | **53** | 79 | 0 | 81 | 45 | 2,377,600 | $0.08 | 19 |
| 11 | Victoria: where to eat by town | Australia | **51** | 40 | 41 | 96 | 22 | 155,710 | $0.50 | 4 |

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

## Money map: estimated revenue at maturity

Per month, once a site ranks (usually 6–18 months). Low / mid / high: visits × affiliate clicks × conversion × payout (average of the top 3 matching programmes), plus display ads. These numbers rank ideas against each other; they are not forecasts. They get replaced by our own measured rates as our sites earn.

| Idea | Market | Visits/mo (mid) | Est. revenue/mo (low · mid · high) | Avg payout per sale | Score |
|---|---|---:|---|---:|---:|
| Dog breeds | United States | 274,520 | $1,955 · **$22,511** · $215,498 | $24.67 | 75 |
| US national parks and hiking trails | United States | 89,156 | $300 · **$3,120** · $28,084 | $9 | 74 |
| Anime: where to watch and watch order | United States | 102,419 | $165 · **$1,342** · $9,832 | $1.7 | 70 |
| Video games: release dates and trailers | United States | 70,520 | $104 · **$811** · $5,642 | $1.17 | 62 |
| TV shows: where to watch | United States | 27,719 | $45 · **$363** · $2,661 | $1.7 | 73 |
| Book series in reading order | United States | 24,564 | $38 · **$302** · $2,162 | $1.43 | 53 |
| Victoria: where to stay by town | Australia | 3,903 | $14 · **$152** · $1,386 | $10.33 | 66 |
| Movie soundtracks and film music | United States | 11,888 | $18 · **$146** · $1,046 | $1.43 | 53 |
| Board games | United States | 11,226 | $17 · **$137** · $977 | $1.4 | 61 |
| Victoria: things to do by town | Australia | 1,769 | $7 · **$69** · $628 | $10.33 | 60 |
| Victoria: where to eat by town | Australia | 779 | $3 · **$27** · $245 | $9 | 51 |

## Programmes to consider, by idea

### Dog breeds

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Embrace Pet Insurance | ~$36 per lead | moderate | check | not applied |
| Chewy | ~$20 per new customer | moderate | check | not applied |
| BarkBox | ~$18 per subscription | moderate | check | not applied |
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
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | not applied |
| Viator Partner Program | ~8% of booking value | easy | Website with travel content | not applied |
| GetYourGuide Partner Program | ~8% baseline, tiered up for volume | easy | Website with travel content | not applied |
| Ruffwear (dog gear) | ~8% | easy | check | not applied |
| REI *(check)* | check (commonly quoted ~5%) | moderate | check | not applied |
| Klook Affiliate *(check)* | check | easy | check | not applied |

### Anime: where to watch and watch order

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

### TV shows: where to watch

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Anime streaming (e.g. Crunchyroll) *(check)* | check (may not run an open programme) | hard | check | not applied |
| Amazon Associates US: digital video (Prime Video) | 5% (digital video); bounties: $3 Prime trial, $5 first Prime Video stream | easy | 3 qualifying sales within 180 days of joining, or the account is closed | approved |
| Amazon Associates US: DVD and Blu-ray | 2.5% | easy | Same Associates account | approved |

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
| Discover Cars / Rentalcars (car hire) | ~4–8% | easy | check | not applied |
| Booking.com Affiliate Partner | Revenue share, up to ~40% of Booking's commission (roughly 4% of the stay) | moderate | Content site about travel; tax form + payment details (W-8BEN-E for AU companies) | applying |
| Hotel groups (Marriott, Hilton, IHG) | ~3–7% | moderate | check | not applied |
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | not applied |
| Viator Partner Program | ~8% of booking value | easy | Website with travel content | not applied |
| GetYourGuide Partner Program | ~8% baseline, tiered up for volume | easy | Website with travel content | not applied |
| Klook Affiliate *(check)* | check | easy | check | not applied |
| Commission Factory (Australian network) *(check)* | varies by brand | easy | Australian publishers welcome; join once, then apply to brands | not applied |

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
| Discover Cars / Rentalcars (car hire) | ~4–8% | easy | check | not applied |
| Booking.com Affiliate Partner | Revenue share, up to ~40% of Booking's commission (roughly 4% of the stay) | moderate | Content site about travel; tax form + payment details (W-8BEN-E for AU companies) | applying |
| Hotel groups (Marriott, Hilton, IHG) | ~3–7% | moderate | check | not applied |
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | not applied |
| Viator Partner Program | ~8% of booking value | easy | Website with travel content | not applied |
| GetYourGuide Partner Program | ~8% baseline, tiered up for volume | easy | Website with travel content | not applied |
| Klook Affiliate *(check)* | check | easy | check | not applied |
| Commission Factory (Australian network) *(check)* | varies by brand | easy | Australian publishers welcome; join once, then apply to brands | not applied |

### Victoria: where to eat by town

| Programme | Pays | Approval | To qualify | Status |
|---|---|---|---|---|
| Booking.com Affiliate Partner | Revenue share, up to ~40% of Booking's commission (roughly 4% of the stay) | moderate | Content site about travel; tax form + payment details (W-8BEN-E for AU companies) | applying |
| Hotel groups (Marriott, Hilton, IHG) | ~3–7% | moderate | check | not applied |
| Expedia Group Affiliate | ~2–6% by product | moderate | Travel content site | not applied |
| Viator Partner Program | ~8% of booking value | easy | Website with travel content | not applied |
| GetYourGuide Partner Program | ~8% baseline, tiered up for volume | easy | Website with travel content | not applied |
| Klook Affiliate *(check)* | check | easy | check | not applied |
| Commission Factory (Australian network) *(check)* | varies by brand | easy | Australian publishers welcome; join once, then apply to brands | not applied |

## Ad networks (when traffic qualifies)

| Network | Minimum traffic | Notes |
|---|---|---|
| Google AdSense | None | Easy to join; lower earnings than premium networks |
| Newor Media | Low (no figure published) | No niche restrictions |
| Raptive | 25,000 pageviews | Reviews content quality and niche fit |
| Mediavine | 50,000 sessions | Strong in lifestyle; check Journey (smaller-site tier) terms |
| Ezoic | 250,000 users (raised Feb 2026) |  |

_Catalogue: hq/affiliate-programs.json (28 programmes, updated 2026-10-21). "(check)" = terms not yet verified from a current source._
