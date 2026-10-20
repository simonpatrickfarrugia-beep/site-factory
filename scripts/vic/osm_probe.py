"""
Vic Tours data probe: pulls free OpenStreetMap data (stay / eat / do) for the most-searched places
in data/vic/towns.json that haven't been probed yet, saves data/vic/places/<slug>.json and records
coverage counts on each town. Data © OpenStreetMap contributors (ODbL): attribution required on the site.

Usage: python3 scripts/vic/osm_probe.py [count] [slug,slug,...]   (run by .github/workflows/vic-probe.yml)
"""
import json, os, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

OVERPASS = 'https://overpass-api.de/api/interpreter'
UA = 'SiteFactory-VicTours-probe/1.0 (contact: owner of victours.com.au)'
TOWNS = 'data/vic/towns.json'
ALIASES = {'Melbourne CBD': 'Melbourne', 'High Country': 'Alpine Shire', 'Gippsland': 'Gippsland'}
RADIUS = {'city': 4000, 'suburb': 1500, 'town': 3000, 'region': 12000}
BIG = {'Ballarat', 'Bendigo', 'Geelong', 'Melbourne CBD', 'Mildura', 'Warrnambool', 'Shepparton'}

STAY = {'hotel', 'motel', 'guest_house', 'hostel', 'apartment', 'chalet', 'camp_site', 'caravan_site', 'alpine_hut'}
EAT = {'restaurant', 'cafe', 'pub', 'bar', 'biergarten'}
DO_TOURISM = {'attraction', 'museum', 'gallery', 'viewpoint', 'zoo', 'theme_park', 'aquarium'}
DO_CRAFT = {'winery', 'brewery', 'distillery'}
DO_LEISURE = {'park', 'nature_reserve', 'beach_resort', 'golf_course', 'water_park'}
KEEP = ['website', 'contact:website', 'phone', 'contact:phone', 'opening_hours', 'cuisine', 'stars', 'description',
        'wheelchair', 'outdoor_seating', 'internet_access', 'dog', 'wikidata', 'wikipedia', 'brand',
        'addr:housenumber', 'addr:street', 'addr:suburb', 'addr:city', 'addr:postcode', 'tourism', 'amenity', 'craft', 'leisure']


def overpass(q):
    data = urllib.parse.urlencode({'data': q}).encode()
    for attempt in range(4):
        try:
            req = urllib.request.Request(OVERPASS, data=data, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except Exception as e:  # 429 / 504 from a busy public server: back off
            print(f'  overpass retry {attempt + 1}: {e}')
            time.sleep(20 * (attempt + 1))
    raise RuntimeError('Overpass unavailable')


def centre(name, kind):
    n = ALIASES.get(name, name).replace('"', '')
    q = f'''[out:json][timeout:60];
area["ISO3166-2"="AU-VIC"]["admin_level"="4"]->.vic;
(
  node["place"~"^(city|town|village|suburb|locality|island|hamlet)$"]["name"="{n}"](area.vic);
  relation["place"]["name"="{n}"](area.vic);
  relation["boundary"~"administrative|national_park|protected_area"]["name"~"^{n}"](area.vic);
  way["name"="{n}"]["place"](area.vic);
);
out center 5;'''
    els = overpass(q).get('elements', [])
    if not els and kind == 'region':
        els = overpass(f'[out:json][timeout:60];area["ISO3166-2"="AU-VIC"]["admin_level"="4"]->.vic;nwr["name"~"^{n}"](area.vic);out center 3;').get('elements', [])
    rank = {'city': 0, 'town': 1, 'suburb': 2, 'village': 3, 'island': 4, 'locality': 5}
    els.sort(key=lambda e: (0 if e['type'] == 'node' else 1, rank.get(e.get('tags', {}).get('place', ''), 9)))
    for e in els:
        lat = e.get('lat') or (e.get('center') or {}).get('lat')
        lon = e.get('lon') or (e.get('center') or {}).get('lon')
        if lat and lon:
            return lat, lon
    return None


def classify(tags):
    t, a, c, l = tags.get('tourism'), tags.get('amenity'), tags.get('craft'), tags.get('leisure')
    if t in STAY: return 'stay', t
    if a in EAT: return 'eat', a
    if t in DO_TOURISM: return 'do', t
    if c in DO_CRAFT: return 'do', c
    if l in DO_LEISURE: return 'do', l
    return None, None


def probe(town):
    kind = town['kind']
    radius = RADIUS['city'] if town['name'] in BIG else RADIUS.get(kind, 3000)
    c = centre(town['name'], kind)
    if not c:
        return None, {'at': now(), 'error': 'place not found in OpenStreetMap'}
    lat, lon = c
    around = f'(around:{radius},{lat},{lon})'
    q = f'''[out:json][timeout:120];
(
  nwr{around}["tourism"~"^({'|'.join(sorted(STAY | DO_TOURISM))})$"]["name"];
  nwr{around}["amenity"~"^({'|'.join(sorted(EAT))})$"]["name"];
  nwr{around}["craft"~"^({'|'.join(sorted(DO_CRAFT))})$"]["name"];
  nwr{around}["leisure"~"^({'|'.join(sorted(DO_LEISURE))})$"]["name"];
);
out center tags;'''
    places, seen = [], set()
    for e in overpass(q).get('elements', []):
        tags = e.get('tags', {})
        group, typ = classify(tags)
        if not group:
            continue
        key = (tags['name'].lower(), group)
        if key in seen:
            continue
        seen.add(key)
        places.append({
            'id': f"{e['type'][0]}{e['id']}",
            'name': tags['name'],
            'group': group,
            'type': typ,
            'lat': e.get('lat') or (e.get('center') or {}).get('lat'),
            'lon': e.get('lon') or (e.get('center') or {}).get('lon'),
            'tags': {k: tags[k] for k in KEEP if k in tags},
        })
    counts = {g: sum(1 for p in places if p['group'] == g) for g in ('stay', 'eat', 'do')}
    rich = lambda k: sum(1 for p in places if any(x in p['tags'] for x in k))
    summary = {'at': now(), 'radiusM': radius, 'centre': [lat, lon], 'counts': counts,
               'withWebsite': rich(['website', 'contact:website']), 'withHours': rich(['opening_hours']), 'total': len(places)}
    doc = {'town': town['name'], 'slug': town['slug'], 'centre': [lat, lon], 'radiusM': radius, 'fetchedAt': summary['at'],
           'attribution': 'Data © OpenStreetMap contributors, ODbL (openstreetmap.org/copyright)', 'places': places}
    return doc, summary


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def main():
    count = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].strip() else 15
    only = [s.strip() for s in (sys.argv[2] if len(sys.argv) > 2 else '').split(',') if s.strip()]
    towns = json.load(open(TOWNS))
    if only:  # probe these slugs (re-probing allowed), in the given order
        todo = [t for s in only for t in towns if t['slug'] == s]
    else:
        todo = [t for t in sorted(towns, key=lambda t: -(t.get('volume') or 0)) if not (t.get('probe') or {}).get('counts')][:count]
    os.makedirs('data/vic/places', exist_ok=True)
    lines = []
    for t in todo:
        print(f"Probing {t['name']} …")
        try:
            doc, summary = probe(t)
        except Exception as e:
            doc, summary = None, {'at': now(), 'error': str(e)[:200]}
        if doc:
            json.dump(doc, open(f"data/vic/places/{t['slug']}.json", 'w'), indent=1, ensure_ascii=False)
            c = summary['counts']
            lines.append(f"{t['name']}: stay {c['stay']}, eat {c['eat']}, do {c['do']} ({summary['withWebsite']} with website, {summary['withHours']} with hours)")
        else:
            lines.append(f"{t['name']}: {summary.get('error')}")
        t['probe'] = summary
        time.sleep(8)  # be polite to the public Overpass server
    json.dump(towns, open(TOWNS, 'w'), indent=1, ensure_ascii=False)
    msg = ' | '.join(lines) or 'Nothing to probe'
    print(f'::notice title=vic-probe::{msg[:3500]}')


if __name__ == '__main__':
    main()
