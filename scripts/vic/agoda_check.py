"""Which Vic Tours towns have their own Agoda city page (agoda.com/city/<name>-au.html)?

Agoda only has city pages for some towns (Ballarat yes, Daylesford no → 404), so the "Compare on Agoda" link is shown
only where the page really exists. Writes data/vic/agoda.json: { checkedAt, places: { "<Town name>": "<agoda slug>" } }.
Run by the agoda-check workflow (monthly + on demand). Read by src/components/vic/AffiliateLink.astro via
data/vic/content.json → affiliates.stay.alt (template with {agoda}).
"""
import json, os, re, time, urllib.error, urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'


def slug(name):
    s = re.sub(r'[^a-z0-9]+', '-', name.lower().replace('&', 'and')).strip('-')
    return re.sub(r'-cbd$', '', s)


def exists(agoda, name):
    url = f'https://www.agoda.com/city/{agoda}.html'
    req = urllib.request.Request(url, headers={'user-agent': UA, 'accept-language': 'en-AU,en;q=0.9'})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            final, body = r.geturl(), r.read(400_000).decode('utf-8', 'ignore')
    except urllib.error.HTTPError:
        return False
    except Exception as e:
        print(f'   ! {name}: {e}')
        return None
    if 'pagenotfound' in final or '/city/' not in final:
        return False
    # Must be OUR town: same-named places exist in other states (Richmond, Williamstown…). Agoda's breadcrumb links the
    # state's region page, so a Victorian town's page contains /region/victoria-state-au.html.
    low = body.lower()
    return name.split()[0].lower() in low and '/region/victoria-state-au.html' in low


def main():
    towns = json.load(open(os.path.join(ROOT, 'data/vic/towns.json')))
    out_path = os.path.join(ROOT, 'data/vic/agoda.json')
    prev = (json.load(open(out_path)) if os.path.exists(out_path) else {}).get('places', {})
    places = {}
    for t in towns:
        if not t.get('published'):
            continue
        name = t['name']
        a = f'{slug(name)}-au'
        ok = exists(a, name)
        if ok is None:  # network hiccup: keep what we knew
            if name in prev: places[name] = prev[name]
            continue
        print(f'{"✓" if ok else "·"} {name} ({a})')
        if ok:
            places[name] = a
        time.sleep(1.5)
    json.dump({'_about': 'Vic towns with their own Agoda city page (scripts/vic/agoda_check.py). Only these get "Compare on Agoda".',
               'checkedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'places': places},
              open(out_path, 'w'), indent=1, ensure_ascii=False)
    print(f'::notice title=agoda::{len(places)} towns have an Agoda city page')


if __name__ == '__main__':
    main()
