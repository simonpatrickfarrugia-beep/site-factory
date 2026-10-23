"""
Vic Tours bundle data (free, OpenStreetMap): every Victorian train station, plus per-town "extras" the bundle
recipes use: playgrounds, beaches, swimming pools, spas, wine cellars, ice cream, picnic spots, bike hire.
Writes data/vic/stations.json and data/vic/extras.json. Data © OpenStreetMap contributors (ODbL).

Usage: python3 scripts/vic/extras_probe.py   (run by .github/workflows/vic-extras.yml)
"""
import json, sys, time
sys.path.insert(0, 'scripts/vic')
from osm_probe import overpass, RADIUS, BIG  # same servers, retries and radii as the place probe

TOWNS = 'data/vic/towns.json'
FEATURES = {
    # key: (OSM filters, label)
    'playground': (['nwr["leisure"="playground"]'], 'Playground'),
    'beach': (['nwr["natural"="beach"]["name"]'], 'Beach'),
    'pool': (['nwr["leisure"="swimming_pool"]["access"!="private"]["name"]', 'nwr["leisure"="sports_centre"]["sport"~"swimming"]', 'nwr["leisure"="water_park"]'], 'Swimming pool'),
    'spa': (['nwr["leisure"="spa"]["name"]', 'nwr["amenity"="spa"]["name"]', 'nwr["shop"="beauty"]["beauty"~"spa"]["name"]', 'nwr["amenity"="public_bath"]["name"]'], 'Day spa'),
    'wine': (['nwr["tourism"="wine_cellar"]["name"]', 'nwr["craft"="winery"]["name"]'], 'Cellar door'),
    'icecream': (['nwr["amenity"="ice_cream"]["name"]', 'nwr["shop"="ice_cream"]["name"]'], 'Ice cream'),
    'picnic': (['nwr["tourism"="picnic_site"]', 'nwr["leisure"="picnic_table"]["name"]'], 'Picnic spot'),
    'bike': (['nwr["amenity"="bicycle_rental"]'], 'Bike hire'),
}
KEEP = ['website', 'contact:website', 'opening_hours', 'fee', 'access', 'description', 'addr:street', 'addr:housenumber', 'operator']


def pt(e):
    lat = e.get('lat') or (e.get('center') or {}).get('lat')
    lon = e.get('lon') or (e.get('center') or {}).get('lon')
    return (round(lat, 6), round(lon, 6)) if lat and lon else None


def stations():
    q = '''[out:json][timeout:120];
area["ISO3166-2"="AU-VIC"]["admin_level"="4"]->.vic;
(
  node["railway"="station"](area.vic);
  node["public_transport"="station"]["train"="yes"](area.vic);
);
out body;'''
    out, seen = [], set()
    for e in overpass(q).get('elements', []):
        t = e.get('tags', {})
        name = t.get('name')
        if not (t.get('railway') == 'station' or (t.get('public_transport') == 'station' and t.get('train') == 'yes')):
            continue
        if not name or t.get('railway') in ('disused', 'abandoned') or t.get('disused') == 'yes' or t.get('usage') == 'tourism':
            continue
        if t.get('station') in ('light_rail', 'subway') and 'tram' in (t.get('network') or '').lower():
            continue
        p = pt(e)
        if not p:
            continue
        key = (name, round(p[0], 3), round(p[1], 3))
        if key in seen:
            continue
        seen.add(key)
        net = t.get('network') or t.get('operator') or ''
        tourist = 'tourist' in (t.get('railway:preserved', '') + t.get('usage', '') + net).lower() or t.get('railway:preserved') == 'yes'
        out.append({'name': name.replace(' Railway Station', '').replace(' Station', ''), 'lat': p[0], 'lon': p[1],
                    'network': net, 'tourist': tourist})
    out.sort(key=lambda s: s['name'])
    return out


def extras(town, lat, lon):
    radius = RADIUS['city'] if town['name'] in BIG else RADIUS.get(town['kind'], 3000)
    around = f'(around:{radius},{lat},{lon})'
    parts = []
    for key, (filters, _) in FEATURES.items():
        parts += [f + around + ';' for f in filters]
    q = '[out:json][timeout:90];(' + ''.join(parts) + ');out center tags;'
    found = {k: [] for k in FEATURES}
    for e in overpass(q).get('elements', []):
        t = e.get('tags', {})
        p = pt(e)
        if not p:
            continue
        for key, (filters, label) in FEATURES.items():
            if match(key, t):
                found[key].append({'id': f"{e['type'][0]}{e['id']}", 'name': t.get('name') or label, 'named': bool(t.get('name')), 'lat': p[0], 'lon': p[1],
                                   'tags': {k: t[k] for k in KEEP if k in t}})
                break
    return {k: v[:40] for k, v in found.items()}


def match(key, t):
    g = t.get
    return {
        'playground': g('leisure') == 'playground',
        'beach': g('natural') == 'beach',
        'pool': g('leisure') in ('swimming_pool', 'water_park') or (g('leisure') == 'sports_centre' and 'swimming' in (g('sport') or '')),
        'spa': g('leisure') == 'spa' or g('amenity') in ('spa', 'public_bath') or (g('shop') == 'beauty' and 'spa' in (g('beauty') or '')),
        'wine': g('tourism') == 'wine_cellar' or g('craft') == 'winery',
        'icecream': g('amenity') == 'ice_cream' or g('shop') == 'ice_cream',
        'picnic': g('tourism') == 'picnic_site' or g('leisure') == 'picnic_table',
        'bike': g('amenity') == 'bicycle_rental',
    }[key]


def statewide(key):
    """All of one feature in Victoria in a single request (much faster than one query per town)."""
    filters, label = FEATURES[key]
    q = '[out:json][timeout:180];area["ISO3166-2"="AU-VIC"]["admin_level"="4"]->.vic;(' + ''.join(f + '(area.vic);' for f in filters) + ');out center tags;'
    items = []
    for e in overpass(q).get('elements', []):
        t = e.get('tags', {})
        p = pt(e)
        if p and match(key, t):
            items.append({'id': f"{e['type'][0]}{e['id']}", 'name': t.get('name') or label, 'named': bool(t.get('name')), 'lat': p[0], 'lon': p[1],
                          'tags': {k: t[k] for k in KEEP if k in t}})
    return items


def km(a, b):
    import math
    dlat = math.radians(b[0] - a[0]); dlon = math.radians(b[1] - a[1])
    h = math.sin(dlat / 2) ** 2 + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.sin(dlon / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def main():
    if '--extras-only' not in sys.argv:
        st = stations()
        json.dump({'_source': 'OpenStreetMap contributors (ODbL)', 'fetchedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'stations': st},
                  open('data/vic/stations.json', 'w'), indent=1, ensure_ascii=False)
        print(f'{len(st)} stations')
    towns = [t for t in json.load(open(TOWNS)) if t.get('published') and t.get('centre')]
    doc = {'_source': 'OpenStreetMap contributors (ODbL)', 'towns': {t['slug']: {k: [] for k in FEATURES} for t in towns}}
    for key in FEATURES:
        try:
            items = statewide(key)
        except Exception as e:
            print(f'  {key}: failed ({e})')
            continue
        for t in towns:
            radius = (RADIUS['city'] if t['name'] in BIG else RADIUS.get(t['kind'], 3000)) / 1000
            near = sorted((i for i in items if km(t['centre'], (i['lat'], i['lon'])) <= radius), key=lambda i: (not i['named'], km(t['centre'], (i['lat'], i['lon']))))
            doc['towns'][t['slug']][key] = near[:40]
        print(f'  {key}: {len(items)} in Victoria')
        doc['fetchedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        json.dump(doc, open('data/vic/extras.json', 'w'), indent=1, ensure_ascii=False)  # keep progress after each feature
        time.sleep(3)


if __name__ == '__main__':
    main()
