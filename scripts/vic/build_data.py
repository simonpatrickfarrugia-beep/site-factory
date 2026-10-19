"""
Builds the Vic Tours site snapshot from the probe data:
  data/vic/places.json  every place in a PUBLISHED town (towns.json "published": true),
                        each assigned to its nearest published town (no duplicates across neighbours),
                        with a usefulness score for ordering.
Run after the probe (vic-probe.yml does it) or by hand: python3 scripts/vic/build_data.py
"""
import json, math, os

TOWNS = 'data/vic/towns.json'
MELB = (-37.8136, 144.9631)


def km(a, b):
    r = 6371
    dlat, dlon = math.radians(b[0] - a[0]), math.radians(b[1] - a[1])
    h = math.sin(dlat / 2) ** 2 + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


PRIORITY = {  # what's most useful to show first within each group
    'stay': {'hotel': 3, 'motel': 3, 'guest_house': 3, 'apartment': 2, 'chalet': 3, 'caravan_site': 2, 'camp_site': 2, 'hostel': 2, 'alpine_hut': 1},
    'eat': {'restaurant': 3, 'cafe': 3, 'pub': 3, 'bar': 2, 'biergarten': 2},
    'do': {'attraction': 4, 'museum': 4, 'gallery': 3, 'zoo': 4, 'theme_park': 4, 'aquarium': 4, 'winery': 4, 'brewery': 3, 'distillery': 3,
           'viewpoint': 3, 'nature_reserve': 2, 'beach_resort': 2, 'water_park': 3, 'golf_course': 1, 'park': 1},
}


def score(p):
    t = p['tags']
    s = PRIORITY[p['group']].get(p['type'], 1) * 2
    s += 2 if ('website' in t or 'contact:website' in t) else 0
    s += 1 if 'opening_hours' in t else 0
    s += 1 if ('addr:street' in t) else 0
    s += 1 if ('cuisine' in t or 'stars' in t) else 0
    s += 2 if ('wikidata' in t or 'wikipedia' in t) else 0
    s -= 2 if 'brand' in t and p['group'] == 'eat' else 0  # chains last
    return s


def main():
    towns = json.load(open(TOWNS))
    pub = [t for t in towns if t.get('published') and os.path.exists(f"data/vic/places/{t['slug']}.json")]
    docs = {t['slug']: json.load(open(f"data/vic/places/{t['slug']}.json")) for t in pub}
    centres = {s: tuple(d['centre']) for s, d in docs.items()}
    best = {}
    for slug, d in docs.items():
        for p in d['places']:
            here = (p['lat'], p['lon'])
            if p['lat'] is None:
                continue
            nearest = min(centres, key=lambda s: km(centres[s], here))
            if nearest != slug:
                continue  # belongs to a closer published town
            key = p['id']
            if key in best:
                continue
            p = dict(p, town=slug, score=score(p))
            best[key] = p
    places = sorted(best.values(), key=lambda p: (p['town'], p['group'], -p['score'], p['name'].lower()))
    for t in towns:
        if t['slug'] in centres:
            t['centre'] = list(centres[t['slug']])
            t['kmFromMelbourne'] = round(km(MELB, centres[t['slug']]))
            t['counts'] = {g: sum(1 for p in places if p['town'] == t['slug'] and p['group'] == g) for g in ('stay', 'eat', 'do')}
    json.dump(places, open('data/vic/places.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump(towns, open(TOWNS, 'w'), indent=1, ensure_ascii=False)
    print(f'::notice title=vic-data::{len(places)} places in {len(pub)} published towns')


if __name__ == '__main__':
    main()
