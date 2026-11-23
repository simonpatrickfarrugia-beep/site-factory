# Draft: Things to do in Daylesford (strengthen /daylesford/do)

**Site:** victours.com.au · **Kind:** strengthen · **Page:** /daylesford/do (position 50.2)
**Monthly searches (AU):** "things to do in daylesford" 4,400 (DataForSEO 24 Nov 2026); Daylesford overall 20,600 (`data/vic/towns.json`)
**Searches Google already shows us for (24 Oct–20 Nov 2026):** "daylesford", "things to do in daylesford". 17 impressions, 0 clicks.

**What the searcher wants:** "What's worth doing in Daylesford for a day or a weekend?" A short plan: what's walkable in town, what's a short drive.

**Title (live, template since 12 Nov):** Things to Do in Daylesford: Attractions & Activities | Vic Tours
**Description (proposed, 136 chars):** Things to do in Daylesford, 89 km from Melbourne: the Convent Gallery, Mill Markets, the spa railway, mineral springs and Hepburn walks.

**Fixed today (live after "Check build"):** the list had two mapping notes ("Potential planting site", "Resident tree planting")
showing as things to do. They're now filtered out site-wide (6 such entries across 5 towns), so Daylesford lists 14 real places.

---

## What the page is missing (new `sections.do` in `data/vic/content.json` → daylesford)

**Para 1 (direct answer):** Daylesford is spa country, sitting on the largest concentration of mineral springs in Australia, so most
visits mix a soak in one of the bathhouses with a slow wander. Our list has 14 things to do, and the main ones are walkable from the centre.

**Para 2 (in town, on foot):** Start at the Convent Gallery (7 Daly Street, about 200 m from the centre, open 10am–4pm daily), then
walk up to the Pioneer Memorial Tower lookout, about 500 m away. The Daylesford Spa Country Railway is at the old railway station,
about 600 m from the centre. Lake Daylesford and the Wombat Hill Botanic Gardens are the classic slow-afternoon walks.

**Para 3 (a short drive):** The Amazing Mill Markets (105 Central Springs Road, about 1.3 km out, open 10am–6pm daily) is a big
browse. Hepburn Springs is about 3 km north: Hepburn Regional Park for walks, Hepburn Pool, and
Hepburn Springs Golf Club (18 holes, par 66). Kids: two playgrounds, the Daylesford Swimming Pool and seven picnic spots on our map.

**Links:** where to eat → /daylesford/eat · where to stay → /daylesford/stay · Goldfields Road Trip → /road-trips/goldfields-road-trip
· Daylesford day trip plan (check the path exists at publish; "daylesford day trip" 140/mo).

**Facts used:** names, addresses, hours, golf course details from `data/vic/places/daylesford.json` (OpenStreetMap, fetched 19 Oct 2026);
distances are straight-line from the town centre in that file; springs, bathhouses, lake and botanic gardens from `data/vic/content.json`
(daylesford intro); playgrounds, pool and picnic spots from `data/vic/extras.json` (OSM, 23 Oct 2026); 89 km from `data/vic/towns.json`.
Opening hours are as published on OSM: the page already tells people to check before they go.

---

## SIMON'S LINE

_(empty — your words go here)_

**Question to prompt it:** If you had one afternoon in Daylesford, what would you do first, and what would you skip?

**Suggested lines (Claude, 24 Nov — general tips, not personal claims; pick one, tweak it, or write your own):**
- **A:** Book the bathhouse first, then plan the rest of the day around your soak.
- **B:** Park once and walk: the gallery and the lookout are both within a short stroll of the main street.
- **C:** Go midweek if you can. Daylesford is a different, quieter town outside the weekend rush.

To use one: reply `publish daylesford-things-to-do with A` (or B / C). Your own words always beat these.
