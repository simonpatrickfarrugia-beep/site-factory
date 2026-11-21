"""IMN Labs numbers: each lab's own slice of imnetwork.com.au (GA4 + Search Console for /labs/<slug>/, 28 days).

Shared by scripts/sitecheck/run.py (lab rows on the imnetwork card) and scripts/hq/value.py (labs valued like sites).
Same maths as labRows() in src/lib/hq.ts (the /hq/traffic page). Registry: data/imn/labs.json.
"""
import json, os
from datetime import date

METRIC = {'gsc_impressions': 'Google impressions', 'gsc_clicks': 'Google clicks', 'visits': 'visits', 'money_clicks': 'money clicks'}


def _rd(path, default):
    try:
        return json.load(open(path))
    except Exception:
        return default


def lab_rows(root='.', today=None):
    today = today or date.today()
    reg = _rd(os.path.join(root, 'data/imn/labs.json'), {'labs': []})
    stats = _rd(os.path.join(root, 'data/imn/stats.json'), {}) or {}
    pages, queries = stats.get('pages') or [], stats.get('queries') or []
    out = []
    for l in reg.get('labs') or []:
        if l.get('status') == 'closed':
            continue
        base = f"/labs/{l['slug']}"
        mine = lambda p: p == base or p.startswith(base + '/')
        ps = [p for p in pages if mine(str(p.get('path') or ''))]
        qs = sorted([q for q in queries if mine(str(q.get('page') or ''))], key=lambda q: -(q.get('impressions') or 0))
        keys = l.get('moneyKeys') or []
        nums = dict(
            visits=sum(p.get('views') or 0 for p in ps),
            prevVisits=sum(p.get('prevViews') or 0 for p in ps),
            gsc_clicks=sum(p.get('gscClicks') or 0 for p in ps),
            gsc_impressions=sum(p.get('gscImpressions') or 0 for p in ps),
            money_clicks=sum((p.get('cta') or {}).get(k, 0) for p in ps for k in keys),
        )
        t = l.get('target') or {}
        goal = t.get('number') or 0
        have = nums.get(t.get('metric'), 0)
        day = (today - date.fromisoformat(l['launched'])).days if l.get('launched') else None
        out.append(dict(slug=l['slug'], name=l.get('name', l['slug']), status=l.get('status'), domain=l.get('domain') or '',
                        url=f'https://imnetwork.com.au{base}', launched=l.get('launched'), day=day, pages=len(ps), **nums,
                        target=dict(metric=METRIC.get(t.get('metric'), t.get('metric')), have=have, goal=goal, pct=min(100, round(100 * have / goal))) if goal else None,
                        topQueries=[dict(query=q.get('query'), impressions=q.get('impressions', 0), clicks=q.get('clicks', 0), position=q.get('position')) for q in qs[:3]]))
    return out


if __name__ == '__main__':
    print(json.dumps(lab_rows(), indent=1))
