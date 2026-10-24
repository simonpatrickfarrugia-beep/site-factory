"""
Match Vic Tours day trips and ticketed attractions to real Viator products (Viator Partner API, free for approved partners).
Reads data/vic/viator-queries.json, writes data/vic/viator.json. Buttons only appear on the site where a product
title actually contains one of the query's 'must' words, so visitors never land on an unrelated tour.

Needs the VIATOR_API_KEY secret (GitHub). Without it, does nothing. Usage: python3 scripts/vic/viator_match.py
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone

KEY = os.environ.get('VIATOR_API_KEY')
PID, MCID = 'P00327691', '42383'
API = 'https://api.viator.com/partner'


def search(term, count=10):
    body = json.dumps({'searchTerm': term, 'currency': 'AUD',
                       'searchTypes': [{'searchType': 'PRODUCTS', 'pagination': {'start': 1, 'count': count}}]}).encode()
    req = urllib.request.Request(f'{API}/search/freetext', data=body, method='POST', headers={
        'exp-api-key': KEY, 'Accept': 'application/json;version=2.0', 'Accept-Language': 'en-AU', 'Content-Type': 'application/json'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                return (json.load(r).get('products') or {}).get('results') or []
        except urllib.error.HTTPError as e:
            msg = e.read()[:300].decode('utf-8', 'replace')
            if e.code in (400, 401, 403):
                sys.exit(f'Viator API refused the request (HTTP {e.code}): {msg}')
            time.sleep(3 * (attempt + 1))
        except Exception:
            time.sleep(3 * (attempt + 1))
    return []


def tracked(url, campaign):
    """Make sure every link carries our partner ID and a campaign label (product URLs from the API usually already do)."""
    p = urllib.parse.urlsplit(url)
    q = dict(urllib.parse.parse_qsl(p.query))
    q.setdefault('pid', PID); q.setdefault('mcid', MCID); q.setdefault('medium', 'api')
    q['campaign'] = campaign
    return urllib.parse.urlunsplit((p.scheme, p.netloc, p.path, urllib.parse.urlencode(q), ''))


def pick(results, must, n, campaign):
    out = []
    for r in results:
        title = (r.get('title') or '').strip()
        if not title or not any(m in title.lower() for m in must):
            continue
        rev = r.get('reviews') or {}
        price = ((r.get('pricing') or {}).get('summary') or {}).get('fromPrice')
        dur = r.get('duration') or {}
        mins = dur.get('fixedDurationInMinutes') or dur.get('variableDurationToMinutes')
        out.append({'code': r.get('productCode'), 'title': title, 'url': tracked(r.get('productUrl') or '', campaign),
                    'from': round(price) if isinstance(price, (int, float)) else None, 'mins': mins,
                    'reviews': rev.get('totalReviews') or 0})
    # Most-reviewed first: the safest pick for visitors. Ratings aren't shown on the site.
    out.sort(key=lambda x: -x['reviews'])
    return [x for x in out if x['url']][:n]


def main():
    if not KEY:
        print('Viator: no API key yet (VIATOR_API_KEY), skipping.')
        return
    qs = json.load(open('data/vic/viator-queries.json'))
    data = {'checkedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'), 'daytrips': {}, 'attractions': {}}
    for slug, q in qs['daytrips'].items():
        hits = pick(search(q['q']), q['must'], 3, f'victours-daytrip-{slug}')
        if hits: data['daytrips'][slug] = hits
        print(f'day trip {slug}: {len(hits)} tours')
        time.sleep(1)
    for name, q in qs['attractions'].items():
        hits = pick(search(q['q']), q['must'], 1, 'victours-' + ''.join(c if c.isalnum() else '-' for c in name.lower()).strip('-'))
        if hits: data['attractions'][name] = hits[0]
        print(f'attraction {name}: {"matched" if hits else "none"}')
        time.sleep(1)
    json.dump(data, open('data/vic/viator.json', 'w'), indent=1, ensure_ascii=False)
    print(f"::notice title=viator::{len(data['daytrips'])} day trips and {len(data['attractions'])} attractions matched to Viator products")


if __name__ == '__main__':
    main()
