"""Opportunity finder: which searches each site is already shown for in Google, and what would win the click.

Reads the Search Console queries in data/<brand>/stats.json (top 100 per site, last 28 days, refreshed daily),
groups spelling variants, drops brand and street-address searches, and scores each search by how much traffic
a better page could win. Optional monthly volumes (hq/opportunity-volumes.json, filled by the opportunity-engine
worker via scripts/claude/volumes.sh) sharpen the score.

Kinds:
  fix-snippet  ranked on page 1-2 but nobody clicks: rewrite the title/description (quick, reversible)
  strengthen   the right page exists but ranks page 3+: deepen it (FAQ, better intro, the answer up top)
  new-page     the search lands on a page that doesn't really answer it: write a dedicated page

Usage: python3 scripts/hq/opportunities.py [brand ...]   (default: vic paycalc)
Writes hq/opportunities.json and hq/reports/opportunities.md. Free: no API calls.
"""
import json, os, re, sys
from datetime import datetime, timezone

BRANDS = sys.argv[1:] or ['vic', 'paycalc']
TOP = 8  # opportunities per site in the report

# Searches for the site's own name are not opportunities.
BRAND_TERMS = {
    'vic': ['victours', 'vic tours', 'vic tour'],
    'paycalc': ['mypaycalc', 'my pay calc', 'mypaycal'],
    'trailers': ['movietrailer', 'movie trailer channel'],
    'trade-admin': ['tradeadmin', 'trade admin'],
    'community-help-co': ['community help co', 'communityhelp'],
    'simon-says-travel': ['simon says travel', 'simonsaystravel'],
}
SPELLING = {'paycalculator': 'pay calculator', 'accomodation': 'accommodation', 'accomadation': 'accommodation', 'restraunts': 'restaurants', 'resturants': 'restaurants'}
STOP = {'in', 'the', 'a', 'to', 'of', 'for', 'and', 'my', 'i', 'am', 'what', 'is', 'near', 'best', 'vic', 'victoria', 'victorian', 'australia', 'australian', 'au', 'current'}
ADDRESS = re.compile(r'^\d|\b(road|rd|street|st|avenue|ave|highway|hwy|drive|dr|parade|pde)\b.*\b3\d{3}\b|\b3\d{3}\b')
# Expected click-through at each position; the gap to the page-1 rate is the prize.
def ctr(pos):
    for limit, rate in ((1, .28), (2, .16), (3, .11), (5, .07), (10, .03), (20, .01), (50, .003)):
        if pos <= limit:
            return rate
    return .001


def norm(q):
    q = q.lower().strip()
    for bad, good in SPELLING.items():
        q = q.replace(bad, good)
    return q


def cluster_key(q):
    toks = sorted({re.sub(r'(?<=[a-z]{3})s$', '', t) for t in re.findall(r'[a-z0-9]+', q) if t not in STOP})
    return ' '.join(toks) or q


def slug_words(page):
    return set(re.findall(r'[a-z0-9]+', page.lower()))


def kind_of(brand, page, toks, pos, clicks):
    # A search for another year (e.g. "tax brackets 2021") wants a page about that year.
    years = [t for t in toks if re.fullmatch(r'20\d\d', t)]
    if years and not any(y in page for y in years) and not set(years) <= {'2026', '2027'}:
        return 'new-page'
    if pos <= 20 and clicks == 0:
        return 'fix-snippet'
    # A specific search landing on the home page, or on a page whose path shares no words with it.
    if page == '/' and brand != 'paycalc':
        return 'new-page'
    words = slug_words(page)
    if page != '/' and words and not (words & set(toks)) and not any(w.startswith(t[:5]) for w in words for t in toks if len(t) > 4):
        return 'new-page'
    return 'strengthen'


def vic_pages():
    """Vic Tours: stored AU monthly searches per town page (data/vic/towns.json volumes, from the vic-probe job),
    and the neighbourhood list pages kept out of Google on purpose (site.ts noindex), which are never opportunities."""
    vols, skip = {}, set()
    for t in json.load(open('data/vic/towns.json')):
        v = t.get('volumes') or {}
        vols[f"/{t['slug']}"] = v.get('do')
        for g in ('stay', 'eat', 'do'):
            vols[f"/{t['slug']}/{g}"] = v.get(g)
            if t.get('kind') == 'suburb':
                skip.add(f"/{t['slug']}/{g}")
    return vols, skip


def run(brand, volumes):
    path = f'data/{brand}/stats.json'
    if not os.path.exists(path):
        return None
    stats = json.load(open(path))
    page_vols, skip_pages = vic_pages() if brand == 'vic' else ({}, set())
    brand_terms = BRAND_TERMS.get(brand, [])
    groups = {}
    for row in stats.get('queries', []):
        q = norm(row['query'])
        if any(t in q.replace('.', '') for t in brand_terms) or ADDRESS.search(q) or row['page'] in skip_pages:
            continue
        key = (row['page'], cluster_key(q))
        g = groups.setdefault(key, {'page': row['page'], 'queries': [], 'impressions': 0, 'clicks': 0, 'posw': 0.0})
        g['queries'].append(row['query'])
        g.setdefault('byq', {})[row['query']] = row['impressions']
        g['impressions'] += row['impressions']
        g['clicks'] += row['clicks']
        g['posw'] += row['position'] * row['impressions']
    out = []
    for (page, key), g in groups.items():
        pos = round(g['posw'] / g['impressions'], 1) if g['impressions'] else 0
        lead = max(g['queries'], key=lambda q: (q == norm(q), g['byq'][q]))  # most-seen wording, spelt right
        vol = None
        for q in g['queries']:
            v = volumes.get(norm(q))
            if isinstance(v, (int, float)):
                vol = max(vol or 0, v)
        # Monthly demand: real volume when we have it, else 28-day impressions as a floor.
        demand = vol if vol else g['impressions']
        gain = max(ctr(3) - ctr(pos), 0)
        out.append({
            'search': lead,
            'variants': sorted(set(g['queries']) - {lead}),
            'page': page,
            'kind': kind_of(brand, page, key.split(), pos, g['clicks']),
            'impressions28': g['impressions'],
            'clicks28': g['clicks'],
            'position': pos,
            'volume': vol,
            'score': round(demand * gain * 100, 1),
        })
    # One item per page: Google treats a page as one answer, so work is planned per page.
    # A new-page search stays its own item (it needs a page that doesn't exist yet).
    pages = {}
    for o in out:
        if o['kind'] == 'new-page':
            continue
        pg = pages.setdefault(o['page'], {'page': o['page'], 'items': []})
        pg['items'].append(o)
    merged = [o for o in out if o['kind'] == 'new-page']
    for page, pg in pages.items():
        items = sorted(pg['items'], key=lambda o: -o['impressions28'])
        impr = sum(o['impressions28'] for o in items)
        pos = round(sum(o['position'] * o['impressions28'] for o in items) / impr, 1) if impr else 0
        clicks = sum(o['clicks28'] for o in items)
        vol = page_vols.get(page) or max([o['volume'] for o in items if o['volume']] or [0]) or None
        merged.append({
            'search': items[0]['search'],
            'variants': [o['search'] for o in items[1:6]],
            'page': page,
            'kind': 'fix-snippet' if pos <= 20 and clicks == 0 else 'strengthen',
            'impressions28': impr, 'clicks28': clicks, 'position': pos, 'volume': vol,
            'score': round((vol or impr) * max(ctr(3) - ctr(pos), 0) * 100, 1),
        })
    for o in merged:
        if o['kind'] == 'new-page':
            o['score'] = round((o['volume'] or o['impressions28']) * max(ctr(3) - ctr(o['position']), 0) * 100, 1)
    out = sorted(merged, key=lambda o: -o['score'])
    return {'brand': brand, 'site': stats.get('period'), 'gscPeriod': stats.get('gscPeriod'), 'opportunities': out}


def more(o):
    return f" (+{len(o['variants'])})" if o['variants'] else ''


def main():
    vpath = 'hq/opportunity-volumes.json'
    volumes = json.load(open(vpath)).get('volumes', {}) if os.path.exists(vpath) else {}
    result = {'generatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'sites': {}}
    lines = ['# Search opportunities', '',
             'Searches each site is already shown for in Google, ranked by the traffic a better page could win.',
             'fix-snippet = rewrite title/description · strengthen = deepen the page · new-page = write a page that answers it.', '']
    for b in BRANDS:
        r = run(b, volumes)
        if not r:
            continue
        result['sites'][b] = r
        gp = r['gscPeriod'] or {}
        lines += [f"## {b} (Search Console {gp.get('start', '?')} to {gp.get('end', '?')})", '',
                  '| # | Top search (and others) | Kind | Position | Impr. 28d | Searches/mo | Page |', '|---|---|---|---|---|---|---|']
        for i, o in enumerate(r['opportunities'][:TOP], 1):
            lines.append(f"| {i} | {o['search']}{more(o)} | {o['kind']} | {o['position']} | {o['impressions28']} | {o['volume'] if o['volume'] is not None else '–'} | `{o['page']}` |")
        lines.append('')
    json.dump(result, open('hq/opportunities.json', 'w'), indent=1, ensure_ascii=False)
    open('hq/opportunities.json', 'a').write('\n')
    os.makedirs('hq/reports', exist_ok=True)
    open('hq/reports/opportunities.md', 'w').write('\n'.join(lines))
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
