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
out tags;'''
    out, seen = [], set()
    for e in overpass(q).get('elements', []):
        t = e.get('tags', {})
        name = t.get('name')
        if not name or t.get('railway') in ('disused', 'abandoned') or t.get('disused') == 'yes' or t.get('usage') == 'tourism':
            continue
        if t.get('station') in ('light_rail', 'subway') and 'tram' in (t.get('network') or '').lower():
            continue
        key = (name, round(e['lat'], 3), round(e['lon'], 3))
        if key in seen:
            continue
        seen.add(key)
        net = t.get('network') or t.get('operator') or ''
        tourist = 'tourist' in (t.get('railway:preserved', '') + t.get('usage', '') + net).lower() or t.get('railway:preserved') == 'yes'
        out.append({'name': name.replace(' Railway Station', '').replace(' Station', ''), 'lat': round(e['lat'], 6), 'lon': round(e['lon'], 6),
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


def main():
    st = stations()
    json.dump({'_source': 'OpenStreetMap contributors (ODbL)', 'fetchedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'stations': st},
              open('data/vic/stations.json', 'w'), indent=1, ensure_ascii=False)
    print(f'{len(st)} stations')
    towns = json.load(open(TOWNS))
    try:
        doc = json.load(open('data/vic/extras.json'))
    except Exception:
        doc = {'_source': 'OpenStreetMap contributors (ODbL)', 'towns': {}}
    for t in towns:
        if not t.get('published') or not t.get('centre'):
            continue
        if t['slug'] in doc['towns'] and '--refresh' not in sys.argv:
            continue
        lat, lon = t['centre']
        try:
            doc['towns'][t['slug']] = extras(t, lat, lon)
        except Exception as e:
            print(f"  {t['slug']}: failed ({e})")
            continue
        print(f"  {t['slug']}: " + ', '.join(f'{k} {len(v)}' for k, v in doc['towns'][t['slug']].items() if v))
        json.dump(doc, open('data/vic/extras.json', 'w'), indent=1, ensure_ascii=False)  # keep progress
        time.sleep(2)
    doc['fetchedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    json.dump(doc, open('data/vic/extras.json', 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
