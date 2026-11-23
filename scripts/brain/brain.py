"""
IMN brain v1: lessons shared across every IMN site.

How it learns (runs inside scripts/sitecheck/run.py, daily):
  1. observe(): when a site check finding disappears between two scans, that's a fix. Record it with a baseline
     (Search Console impressions/clicks/position + visits for the affected pages, 28-day window, from data/<brand>/stats.json).
  2. measure(): 35+ days later (a fresh, non-overlapping 28-day window) compare the fixed pages against a control
     (the rest of the same site, or for site-wide fixes the rest of the portfolio). Growth beyond the control = lift.
     Verdict: win (lift >= +20%), flat, worse (<= -20%), or too-little-data (under 60 impressions across both windows).
  3. playbook(): roll verdicts up per finding type (e.g. schema-missing). A type with more wins than losses is "proven".
  4. annotate(): on every new site check card, a proven finding type gets its evidence in the detail and a 1.5x impact boost,
     so it climbs the top-5 list (IMN HQ notifications, morning report, auto-fixer).

Files: hq/brain/fixes.json (every fix and its result), hq/brain/playbook.json, hq/reports/brain.md.
Lessons only, never client data: client sites (owner "client") are measured, but their names and numbers stay out of the
public playbook; evidence text only ever names IMN's own sites.
"""
import json
import os
from datetime import date, datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FIXES = os.path.join(ROOT, 'hq/brain/fixes.json')
PLAYBOOK = os.path.join(ROOT, 'hq/brain/playbook.json')
REPORT = os.path.join(ROOT, 'hq/reports/brain.md')

LEARNABLE_AREAS = {'health', 'indexing', 'seo', 'content', 'speed', 'tracking'}
NOT_A_FIX = {'few-pages-in-google', 'impressions-drop'}  # these clear on their own; nobody "fixed" them
WAIT_DAYS = 35          # 28-day window + Search Console lag, so the after-window doesn't overlap the baseline
MIN_IMPRESSIONS = 60    # below this, a verdict would be noise
WIN, LOSS = 0.20, -0.20
BOOST = 1.5


def _rd(p, default):
    try:
        with open(p) as f: return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError): return default


def _wr(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        json.dump(obj, f, indent=1, ensure_ascii=False); f.write('\n')


def _norm(path):
    return (path or '/').split('?')[0].rstrip('/') or '/'


def snapshot(stats, pages=None):
    """28-day Search Console + GA4 numbers for a set of pages (or the whole site when pages is empty/None)."""
    if not stats: return None
    if not pages:
        t = stats.get('totals') or {}
        return dict(impr=t.get('gscImpressions', 0) or 0, clicks=t.get('gscClicks', 0) or 0, views=t.get('views', 0) or 0, pos=None,
                    window=(stats.get('gscPeriod') or {}).get('end'))
    want = {_norm(p) for p in pages}
    rows = [r for r in stats.get('pages') or [] if _norm(r.get('path')) in want]
    if not rows: return None
    impr = sum(r.get('gscImpressions', 0) or 0 for r in rows)
    pos_rows = [(r['gscPosition'], r.get('gscImpressions', 0) or 0) for r in rows if r.get('gscPosition')]
    pos = round(sum(p * w for p, w in pos_rows) / max(1, sum(w for _, w in pos_rows)), 1) if pos_rows else None
    return dict(impr=impr, clicks=sum(r.get('gscClicks', 0) or 0 for r in rows), views=sum(r.get('views', 0) or 0 for r in rows), pos=pos,
                window=(stats.get('gscPeriod') or {}).get('end'), pages=sorted(want & {_norm(r.get('path')) for r in rows}))


def _minus(a, b):
    if not a or not b: return None
    return dict(impr=max(0, a['impr'] - b['impr']), clicks=max(0, a['clicks'] - b['clicks']), views=max(0, a['views'] - b['views']))


class Brain:
    def __init__(self, today=None):
        self.today = today or date.today()
        self.fixes = _rd(FIXES, {'_about': 'IMN brain: every site check fix and what it did to Google traffic. Written by scripts/brain/brain.py.', 'fixes': []})
        self.book = _rd(PLAYBOOK, {})

    # 1. Spot fixes ---------------------------------------------------------------------------------------------
    def observe(self, site, card, prev, stats):
        if not prev: return []
        now_ids = {f['id'] for f in card['findings']}
        open_keys = {(x['site'], x['findingId']) for x in self.fixes['fixes'] if x['status'] == 'measuring'}
        new = []
        for f in prev.get('findings') or []:
            if f['id'] in now_ids or f['area'] not in LEARNABLE_AREAS or f['id'] in NOT_A_FIX: continue
            if (site['id'], f['id']) in open_keys: continue
            page_level = bool(f.get('pages'))
            base = snapshot(stats, f['pages']) if page_level else None
            scope = 'pages' if base else 'site'
            if not base: base = snapshot(stats)
            if not base: continue
            site_now = snapshot(stats)
            x = dict(site=site['id'], owner=site.get('owner', 'imn'), name=site['name'], findingId=f['id'], area=f['area'], title=f['title'],
                     pages=f.get('pages') or [], scope=scope, fixedBy=card['scannedAt'][:10], seenFixedAfter=prev['scannedAt'][:10],
                     baseline=dict(target=base, site=site_now), status='measuring', measureFrom=date.fromordinal(self.today.toordinal() + WAIT_DAYS).isoformat())
            self.fixes['fixes'].append(x); new.append(x)
        return new

    # 2. Measure ------------------------------------------------------------------------------------------------
    def measure(self, sites_stats, portfolio_now=None):
        """sites_stats: {site_id: stats dict}. portfolio_now/baseline sums are built from the same dict."""
        port_now = self._portfolio(sites_stats)
        done = []
        for x in self.fixes['fixes']:
            if x['status'] != 'measuring' or self.today.isoformat() < x['measureFrom']: continue
            stats = sites_stats.get(x['site'])
            if not stats: continue
            after_site = snapshot(stats)
            if x['scope'] == 'pages':
                after = snapshot(stats, x['pages']) or dict(impr=0, clicks=0, views=0, pos=None)
                ctrl_b, ctrl_a = _minus(x['baseline']['site'], x['baseline']['target']), _minus(after_site, after)
            else:
                after = after_site
                ctrl_b = x['baseline'].get('portfolio') or None
                ctrl_a = _minus(port_now, after_site) if port_now else None
            x['after'] = dict(target=after, site=after_site)
            x['measuredOn'] = self.today.isoformat()
            b = x['baseline']['target']
            if b['impr'] + after['impr'] < MIN_IMPRESSIONS:
                x['status'] = 'too-little-data'; done.append(x); continue
            grow = (after['impr'] + 10) / (b['impr'] + 10)
            ctrl = ((ctrl_a['impr'] + 10) / (ctrl_b['impr'] + 10)) if ctrl_b and ctrl_a else 1.0
            lift = round(grow / ctrl - 1, 3)
            x['lift'] = lift
            x['clicks'] = [b['clicks'], after['clicks']]
            if b.get('pos') and after.get('pos'): x['positionChange'] = round(b['pos'] - after['pos'], 1)  # + = moved up
            x['status'] = 'win' if lift >= WIN else 'worse' if lift <= LOSS else 'flat'
            done.append(x)
        return done

    @staticmethod
    def _portfolio(sites_stats):
        s = [snapshot(v) for v in sites_stats.values() if v]
        s = [x for x in s if x]
        if not s: return None
        return dict(impr=sum(x['impr'] for x in s), clicks=sum(x['clicks'] for x in s), views=sum(x['views'] for x in s))

    def stamp_portfolio(self, new_fixes, sites_stats):
        """Site-wide fixes are compared with the rest of the portfolio: store that baseline at fix time."""
        port = self._portfolio(sites_stats)
        for x in new_fixes:
            if x['scope'] == 'site' and port:
                x['baseline']['portfolio'] = _minus(port, x['baseline']['site'])

    # 3. Playbook -----------------------------------------------------------------------------------------------
    def playbook(self):
        book = {}
        for x in self.fixes['fixes']:
            e = book.setdefault(x['findingId'], dict(area=x['area'], wins=0, flat=0, worse=0, measuring=0, tooLittle=0, lifts=[], evidence=[]))
            st = x['status']
            if st == 'measuring': e['measuring'] += 1; continue
            if st == 'too-little-data': e['tooLittle'] += 1; continue
            e[{'win': 'wins', 'flat': 'flat', 'worse': 'worse'}[st]] += 1
            e['lifts'].append(x['lift'])
            if st == 'win' and x.get('owner', 'imn') == 'imn':  # public evidence only ever names IMN's own sites
                e['evidence'].append(dict(site=x['name'], lift=x['lift'], measuredOn=x['measuredOn'], title=x['title']))
        for k, e in book.items():
            ls = sorted(e.pop('lifts'))
            e['medianLift'] = ls[len(ls) // 2] if ls else None
            e['measured'] = e['wins'] + e['flat'] + e['worse']
            e['proven'] = e['wins'] >= 1 and e['wins'] > e['worse']
            e['evidence'] = sorted(e['evidence'], key=lambda v: -v['lift'])[:3]
        self.book = dict(_about='IMN brain playbook: what each kind of fix has done to Google impressions across IMN sites (vs a control). '
                                'proven = more wins than losses. Written by scripts/brain/brain.py.',
                         updated=self.today.isoformat(), types=dict(sorted(book.items(), key=lambda kv: (-kv[1]['wins'], kv[0]))))
        return self.book

    # 4. Share the lesson ---------------------------------------------------------------------------------------
    def annotate(self, card):
        types = (self.book or {}).get('types') or {}
        hit = 0
        for f in card['findings']:
            e = types.get(f['id'])
            if not e or not e.get('proven') or not e['evidence']: continue
            best = e['evidence'][0]
            note = (f"IMN brain: fixing this lifted Google impressions {best['lift']:+.0%} on {best['site']}"
                    + (f" ({e['wins']} win{'s' if e['wins'] > 1 else ''} from {e['measured']} measured fixes)" if e['measured'] > 1 else '') + '.')
            if not f.get('proven'):
                f['proven'] = note
                f['impact'] = round(f['impact'] * BOOST, 1)
                f['detail'] = (note + ' ' + (f.get('detail') or '')).strip()[:400]
                hit += 1
        if hit: card['findings'].sort(key=lambda f: -f['impact'])
        return hit

    # Save + report ---------------------------------------------------------------------------------------------
    def save(self):
        self.fixes['updated'] = self.today.isoformat()
        _wr(FIXES, self.fixes)
        _wr(PLAYBOOK, self.book or self.playbook())
        os.makedirs(os.path.dirname(REPORT), exist_ok=True)
        with open(REPORT, 'w') as f: f.write(self.report())

    def report(self):
        F = self.fixes['fixes']
        c = lambda s: sum(1 for x in F if x['status'] == s)
        L = ['# IMN brain', '',
             f'Updated {self.today.isoformat()}. Every site check fix is recorded, then measured {WAIT_DAYS} days later against a control '
             '(rest of the site, or rest of the portfolio for site-wide fixes). Proven fix types climb the top-5 on every other site.', '',
             f'**{len(F)} fixes recorded** · {c("measuring")} measuring · {c("win")} wins · {c("flat")} flat · {c("worse")} worse · {c("too-little-data")} too little data', '']
        types = (self.book or {}).get('types') or {}
        if types:
            L += ['## Playbook', '', '| Fix type | Area | Wins | Flat | Worse | Measuring | Median lift | Proven |', '|---|---|---:|---:|---:|---:|---:|---|']
            for k, e in types.items():
                L.append(f'| {k} | {e["area"]} | {e["wins"]} | {e["flat"]} | {e["worse"]} | {e["measuring"]} | '
                         f'{"—" if e["medianLift"] is None else format(e["medianLift"], "+.0%")} | {"✅" if e["proven"] else ""} |')
        imn = [x for x in F if x.get('owner', 'imn') == 'imn']
        if imn:
            L += ['', '## Latest fixes (IMN sites)', '']
            for x in sorted(imn, key=lambda x: x['fixedBy'], reverse=True)[:15]:
                res = {'measuring': f'measuring from {x["measureFrom"]}', 'too-little-data': 'too little traffic to tell'}.get(x['status']) or f'{x["status"]} ({x["lift"]:+.0%})'
                L.append(f'- {x["fixedBy"]} · {x["name"]}: {x["title"]} → {res}')
        if not F: L.append('No fixes recorded yet: the first ones appear after the next site check scans.')
        L += ['', '_Made by scripts/brain/brain.py. Lift = growth in Google impressions on the fixed pages minus the control\'s growth. Early signals, not proof._']
        return '\n'.join(L) + '\n'
