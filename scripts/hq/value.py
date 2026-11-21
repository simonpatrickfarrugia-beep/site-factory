"""Site value checker: what each IMN site (and lab) could sell for, at a glance. Writes hq/value.json for IMN HQ → Value.

Per site and per lab:
  - average monthly net profit = (revenue − its share of costs) over the last 12 months, or over the months it has been
    live if that's less (a 2-month-old site isn't averaged over 12).
  - value range = monthly profit × a multiple between 25 and 45 (hq/value-config.json; benchmarks dated there).
    The multiple moves with the site: under 12 months old → low end (25–30); one income source or mostly-Google
    traffic → lower; several income sources, an email list, backlinks, hands-off running → higher.
  - trend vs last month (same maths with the window ending last month), and flags: passes Simon's "worth selling"
    number; or profit hasn't grown for 3 months.
Revenue: hq/finance.json revenue[] {month, amount, site, source}. Costs: finance costs[] (one-offs; `site` = that site's,
otherwise shared) and monthlyRunning[] (shared). Shared costs are split evenly across IMN's own sites; labs carry only
costs tagged lab:<slug> (they live on imnetwork.com.au at no extra cost).
Estimates, not offers. Most sites are at ~A$0 profit in Nov 2026, so values start near $0.

Usage: python3 scripts/hq/value.py [--print]
"""
import json, os, sys
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'hq'))
from labstats import lab_rows  # noqa: E402

TODAY = datetime.now(timezone(timedelta(hours=11))).date()  # Melbourne


def rd(p, default):
    try:
        return json.load(open(os.path.join(ROOT, p)))
    except Exception:
        return default


def month_add(m, n):
    y, mo = int(m[:4]), int(m[5:7]) - 1 + n
    return f'{y + mo // 12:04d}-{mo % 12 + 1:02d}'


def months_back(end, n):
    return [month_add(end, -i) for i in range(n - 1, -1, -1)]


def matches(entry, keys):
    who = str(entry.get('site') or entry.get('brand') or '').strip().lower()
    return bool(who) and who in keys


def google_share(stats):
    ch = ((stats or {}).get('traffic') or {}).get('channels') or []
    found = [c for c in ch if c.get('source') != '(direct)']
    tot = sum(c.get('sessions', 0) for c in found)
    g = sum(c.get('sessions', 0) for c in found if 'google' in str(c.get('source', '')) and c.get('medium') == 'organic')
    return (g / tot) if tot >= 20 else None  # too little traffic to judge


def appraise(item, finance, cfg, n_shared, end):
    """Value for one site/lab with the 12-month window ending in `end` (YYYY-MM)."""
    keys = item['keys']
    launched = item.get('launched')
    first = launched[:7] if launched else None
    window = [m for m in months_back(end, 12) if not first or m >= first]
    if not window:
        return None
    rev = {m: 0.0 for m in window}
    cost = {m: 0.0 for m in window}
    sources = set()
    for r in finance.get('revenue') or []:
        if r.get('month') in rev and matches(r, keys):
            rev[r['month']] += float(r.get('amount') or 0)
            if float(r.get('amount') or 0) > 0:
                sources.add(str(r.get('source') or 'unknown').strip().lower())
    for c in finance.get('costs') or []:
        m = c.get('month')
        if m not in cost:
            continue
        if matches(c, keys):
            cost[m] += float(c.get('amount') or 0)
        elif not (c.get('site') or c.get('brand')) and item['kind'] == 'site':
            cost[m] += float(c.get('amount') or 0) / max(1, n_shared)
    if item['kind'] == 'site':
        running = sum(float(x.get('amount') or 0) for x in finance.get('monthlyRunning') or [] if not (x.get('site') or x.get('brand')))
        own = sum(float(x.get('amount') or 0) for x in finance.get('monthlyRunning') or [] if matches(x, keys))
        for m in window:
            cost[m] += running / max(1, n_shared) + own
    series = [dict(month=m, revenue=round(rev[m], 2), costs=round(cost[m], 2), profit=round(rev[m] - cost[m], 2)) for m in window]
    rev12, cost12 = sum(rev.values()), sum(cost.values())
    monthly = (rev12 - cost12) / len(window)
    age = len(months_back(end, 400)) if not first else max(1, (int(end[:4]) - int(first[:4])) * 12 + int(end[5:7]) - int(first[5:7]) + 1)

    low, high = float(cfg['multiple']['low']), float(cfg['multiple']['high'])
    why = []
    if age < 12:
        high = min(high, low + 5); why.append(f'{age} month{"s" if age != 1 else ""} old: low end until it has a 12-month record')
    if len(sources) <= 1:
        low, high = low - 3, high - 3; why.append('one income source' if sources else 'no income yet')
    elif len(sources) >= 2:
        low, high = low + 2, high + 3; why.append(f'{len(sources)} income sources')
    gs = item.get('googleShare')
    if gs is not None and gs >= 0.8:
        low, high = low - 3, high - 3; why.append(f'{round(gs * 100)}% of visits from Google search')
    sid = item['id']
    if (cfg.get('emailList') or {}).get(sid, 0) >= 100:
        low, high = low + 2, high + 2; why.append('email list of 100+')
    if (cfg.get('backlinks') or {}).get(sid, 0) >= 10:
        low, high = low + 2, high + 2; why.append('10+ sites link to it')
    if sid in (cfg.get('handsOff') or []):
        low, high = low + 2, high + 2; why.append('runs hands-off')
    low = max(15.0, min(low, float(cfg['multiple']['high'])))
    high = max(low, min(high, float(cfg['multiple']['high'])))
    base = max(0.0, monthly)
    return dict(window=[window[0], window[-1]], months=len(window), ageMonths=age, revenue12=round(rev12, 2), costs12=round(cost12, 2),
                profitMonthly=round(monthly, 2), sources=sorted(sources), multiple=dict(low=round(low, 1), high=round(high, 1), why=why),
                value=dict(low=round(base * low), high=round(base * high)), series=series)


def main():
    finance = rd('hq/finance.json', {})
    cfg = rd('hq/value-config.json', {'multiple': {'low': 25, 'high': 45}})
    sitecfg = rd('hq/sitecheck.json', {'sites': []})
    portfolio = rd('hq/portfolio.json', {})
    nodes = {n.get('id'): n for n in portfolio.get('nodes') or []}
    items = []
    for s in sitecfg.get('sites') or []:
        if s.get('owner', 'imn') != 'imn':
            continue  # client sites aren't ours to sell
        node = nodes.get(s.get('brand')) or nodes.get(s['id']) or nodes.get({'community-help-co': 'chc'}.get(s.get('brand'), '')) or {}
        stats = rd(s['stats'], None) if s.get('stats') else None
        items.append(dict(id=s['id'], name=s['name'], url=s['url'], kind='site', launched=node.get('launched') or s.get('launched'),
                          keys={k.lower() for k in (s['id'], s.get('brand'), s['name']) if k}, googleShare=google_share(stats)))
    n_shared = len(items)
    for lb in lab_rows(ROOT, TODAY):
        if lb['status'] == 'graduated':
            continue  # valued as its own site once it's in hq/sitecheck.json
        items.append(dict(id=f'lab:{lb["slug"]}', name=f'{lb["name"]} (IMN Labs)', url=lb['url'], kind='lab', launched=lb.get('launched'),
                          keys={f'lab:{lb["slug"]}'}, googleShare=None))
    end = TODAY.isoformat()[:7]
    prev_end = month_add(end, -1)
    worth = cfg.get('worthSelling')
    out = []
    for it in items:
        now = appraise(it, finance, cfg, n_shared, end)
        if not now:
            continue
        before = appraise(it, finance, cfg, n_shared, prev_end)
        mid = (now['value']['low'] + now['value']['high']) / 2
        bmid = ((before['value']['low'] + before['value']['high']) / 2) if before else None
        trend = None if bmid is None else dict(change=round(mid - bmid), dir='up' if mid > bmid else 'down' if mid < bmid else 'flat')
        flags = []
        if worth and now['value']['low'] >= worth:
            flags.append(dict(kind='worth-selling', text=f'Low estimate A${now["value"]["low"]:,} passes your A${worth:,} "worth selling" number'))
        p = [m['profit'] for m in now['series']]
        if now['revenue12'] > 0 and len(p) >= 4 and p[-1] <= p[-2] <= p[-3] <= p[-4]:
            flags.append(dict(kind='stalled', text='Profit has not grown for 3 months'))
        out.append(dict(id=it['id'], name=it['name'], url=it['url'], kind=it['kind'], **now, trend=trend, flags=flags))
    out.sort(key=lambda x: (-x['value']['high'], -x['profitMonthly'], x['name']))
    doc = dict(
        _about='Written by scripts/hq/value.py (daily, brief workflow). Estimates, not offers. Settings and benchmarks: hq/value-config.json.',
        generatedAt=datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), month=end, worthSelling=worth,
        multiple=cfg['multiple'], note='Estimates, not offers. Value = average monthly net profit × 25–45, moved within that band for age, income sources, traffic mix, email list, links and hands-off running. Buyers and brokers decide the real price.',
        total=dict(low=sum(x['value']['low'] for x in out), high=sum(x['value']['high'] for x in out),
                   profitMonthly=round(sum(x['profitMonthly'] for x in out if x['kind'] == 'site'), 2)),
        sites=out)
    with open(os.path.join(ROOT, 'hq/value.json'), 'w') as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write('\n')
    if '--print' in sys.argv:
        for x in out:
            print(f'{x["name"]:32} profit/mo A${x["profitMonthly"]:>8,.2f}  value A${x["value"]["low"]:,}–{x["value"]["high"]:,}  ×{x["multiple"]["low"]}–{x["multiple"]["high"]}  ({"; ".join(x["multiple"]["why"])})')
    print(f'::notice title=value::{len(out)} sites/labs valued, total A${doc["total"]["low"]:,}–{doc["total"]["high"]:,}')


if __name__ == '__main__':
    main()
