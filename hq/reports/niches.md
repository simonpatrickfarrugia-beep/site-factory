# Niche finder

Updated 2026-10-19. Google searches in the United States. Score = 30% demand + 25% money (CPC) + 25% ease (SEO difficulty) + 20% fit (Claude: data source, automation, monetisation, risk).

Add ideas by chat: "score these niches: …". Rules: launch at most one new site a month, only while the last one is on track.

## Ranking

| # | Idea | Score | Demand | Money | Ease | Fit | Searches/mo | Median CPC | Avg difficulty |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Anime: where to watch and watch order | **70** | 100 | 66 | 60 | 42 | 20,483,800 | $1.31 | 40 |
| 2 | Video games: release dates and trailers | **62** | 100 | 32 | 62 | 40 | 14,104,000 | $0.35 | 38 |

Not scored yet: TV shows: where to watch (failed: Unterminated string in JSON at position 987 (line 1 column 988)); Book series in reading order (failed: Claude: no JSON in reply (stop=max_tokens, blocks=thinking,text, text="{"fit": 46, "verdict": "The demand is real and the reading-order problem suits structured data, but Open Library's serie")); Board games (failed: Claude: no JSON in reply (stop=max_tokens, blocks=thinking,text, text="{"fit": 42, "verdict": "Only the co-op cluster fits your model: BGG's structured fields (player count, playtime, weight,")); US national parks and hiking trails (failed: DataForSEO dataforseo_labs/google/bulk_keyword_difficulty/live: HTTP 402 {"version":"0.1.20260917","status_code":20000,"status_message":"Ok.","time":"0 sec.","cost":0,"tasks_count":1,"tasks_error":1,"); Dog breeds; Movie soundtracks and film music.

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
