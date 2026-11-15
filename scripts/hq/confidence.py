"""Confidence panel (IMN HQ → Home, first thing you see): micro (this week's work), macro (90-day trajectory per site)
and a predictor (low / likely / high visits and money clicks at 3, 6 and 12 months) that scores its own past forecasts.

Honest by design: nothing goes green because infrastructure exists. Micro scores only work done this week. Macro scores
each site's 28-day numbers against its target90 (hq/portfolio.json) on a new-site ramp, and can only go red once a site
is old enough (MIN_RED_AGE) and its trend is flat or falling. The outreach half of micro (emails sent vs the warm-up ramp,
follow-ups) lives in D1, so the HQ Worker adds it live and works out the top line (workers/hq/src/confidence.ts).

Runs daily in .github/workflows/brief.yml before the brief. Writes:
  hq/confidence.json          — what HQ shows (repo half)
  hq/confidence-history.json  — daily 28-day snapshots, Search Console days and site check fixes (trend memory)
  hq/forecasts.json           — every forecast made (weekly) and how it scored once due
Model notes: docs/CONFIDENCE.md.
"""
import json, math, os, subprocess
from datetime import datetime, timezone, date, timedelta

now = datetime.now(timezone.utc)
today = (now + timedelta(hours=11)).date()  # Melbourne calendar day (summer time; close enough for a daily job)
REPO = os.environ.get('GITHUB_REPOSITORY', 'simonpatrickfarrugia-beep/site-factory')

SITES = {  # brand slug -> portfolio node id
    'trailers': 'trailers', 'vic': 'vic', 'community-help-co': 'chc', 'trade-admin': 'trade-admin', 'paycalc': 'paycalc',
}
MONEY = {  # money clicks (CLAUDE.md)
    'trailers': ['prime', 'disc'], 'vic': ['book_stay', 'book_tour', 'book_car'],
    'trade-admin': ['tradify_offer_sent', 'partner_fergus', 'quiz_trial_fergus'],
}
COMMIT_PREFIX = {  # hand-made commit subjects that are site work
    'trailers': ('trailers', 'movietrailer'), 'vic': ('vic',), 'community-help-co': ('community help co', 'chc'),
    'trade-admin': ('trade admin',), 'paycalc': ('mypaycalc', 'paycalc'), 'simon-says-travel': ('simon says travel',),
}
MIN_RED_AGE = 45     # days live before a site can go red (Google indexing lag)
HORIZONS = [28, 90, 180, 365]  # 28 is only for scoring the model early; HQ shows 90 / 180 / 365


def load(p, default=None):
    try:
        return json.load(open(p))
    except Exception:
        return default


def save(p, obj):
    with open(p, 'w') as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
        f.write('\n')


def gh_json(path):
    try:
        out = subprocess.run(['gh', 'api', path], capture_output=True, text=True, check=True, timeout=60).stdout
        return json.loads(out)
    except Exception:
        return None


def light(score):  # 0..2 -> colour
    return 'green' if score >= 1.5 else 'amber' if score >= 0.75 else 'red'


SCORE = {'green': 2, 'amber': 1, 'red': 0}

portfolio = load('hq/portfolio.json', {})
nodes = {n['id']: n for n in portfolio.get('nodes', [])}
hist = load('hq/confidence-history.json', {}) or {}
hist.setdefault('days', {}); hist.setdefault('gsc', {}); hist.setdefault('fixes', {})
forecasts = load('hq/forecasts.json', {}) or {}
forecasts.setdefault('made', [])

# ---------- per-site numbers + history ----------
sites = {}
for brand, node_id in SITES.items():
    s = load(f'data/{brand}/stats.json')
    node = nodes.get(node_id, {})
    if not s:
        continue
    t = s.get('totals', {})
    cta = t.get('cta') or {}
    money28 = sum(cta.get(k, 0) for k in MONEY.get(brand, []))
    # Search Console by day: merge into history so the trend outlives the 28-day window in stats.json
    g = hist['gsc'].setdefault(brand, {})
    for d in s.get('gscDaily', []):
        g[d['date']] = d.get('impressions', 0)
    views_daily = {d['date']: d.get('views', 0) for d in (s.get('allTime') or {}).get('daily', [])}
    at = s.get('allTime') or {}
    at_money = sum((at.get('cta') or {}).get(k, 0) for k in MONEY.get(brand, [])) if isinstance(at.get('cta'), dict) else 0
    launched = node.get('launched') or at.get('start')
    sites[brand] = {
        'name': node.get('name') or brand, 'launched': launched,
        'age': (today - date.fromisoformat(launched)).days if launched else None,
        'target': node.get('target90'), 'targetSet': node.get('targetSet'),
        'views28': t.get('views', 0), 'prev28': t.get('prevViews', 0), 'impr28': t.get('gscImpressions', 0),
        'clicks28': t.get('gscClicks', 0), 'money28': money28, 'tracksMoney': brand in MONEY,
        'viewsDaily': views_daily, 'allViews': at.get('views', 0), 'allMoney': at_money,
    }
    hist['days'].setdefault(today.isoformat(), {})[brand] = {
        'views28': sites[brand]['views28'], 'impr28': sites[brand]['impr28'], 'money28': money28}

# Site check fixes (each scan's "fixed" list, kept by scan time)
for f in os.listdir('hq/sitecheck') if os.path.isdir('hq/sitecheck') else []:
    if not f.endswith('.json') or f == 'index.json':
        continue
    c = load(f'hq/sitecheck/{f}') or {}
    ch = c.get('change') or {}
    if c.get('scannedAt') and ch.get('fixed') and not ch.get('first'):
        hist['fixes'].setdefault(c.get('id') or f[:-5], {})[c['scannedAt']] = ch['fixed']

# Trim history to ~400 days
cut = (today - timedelta(days=400)).isoformat()
hist['days'] = {k: v for k, v in hist['days'].items() if k >= cut}
for b in hist['gsc']:
    hist['gsc'][b] = {k: v for k, v in sorted(hist['gsc'][b].items()) if k >= cut}
for b in hist['fixes']:
    hist['fixes'][b] = {k: v for k, v in hist['fixes'][b].items() if k[:10] >= cut}


def window_sum(series, end, days, cap=None):
    vals = (series.get((end - timedelta(days=i)).isoformat(), 0) for i in range(days))
    return sum(min(v, cap) if cap else v for v in vals)


def spike_cap(series, end):
    """One-day spikes (a single viral search or a bot) shouldn't read as a trend: cap days at 3x the typical day."""
    vals = sorted(v for v in (series.get((end - timedelta(days=i)).isoformat(), 0) for i in range(56)) if v > 0)
    return max(5, 3 * vals[len(vals) // 2]) if vals else None


def ramp(age):
    """Share of the 90-day target a typical new content site reaches by `age` days (slow start, then compounding)."""
    if age is None:
        return 1.0
    return max(0.08, min(1.0, (age / 90) ** 1.5))


# ---------- macro ----------
macro_sites = []
for brand, x in sites.items():
    end = today - timedelta(days=1)
    vc = spike_cap(x['viewsDaily'], end)
    v14, v_prev14 = window_sum(x['viewsDaily'], end, 14, vc), window_sum(x['viewsDaily'], end - timedelta(days=14), 14, vc)
    gsc = hist['gsc'].get(brand, {})
    gsc_end = date.fromisoformat(max(gsc)) if gsc else end
    ic = spike_cap(gsc, gsc_end)
    i14, i_prev14 = window_sum(gsc, gsc_end, 14, ic), window_sum(gsc, gsc_end - timedelta(days=14), 14, ic)
    # weekly impressions, oldest first (for the sparkline)
    weeks = [window_sum(gsc, gsc_end - timedelta(days=7 * w), 7) for w in range(7, -1, -1)]
    gsc_days = len(gsc)
    g_views = (v14 + 3) / (v_prev14 + 3)   # +3 damps tiny numbers
    g_impr = (i14 + 10) / (i_prev14 + 10)
    trend = 'up' if max(g_views, g_impr) >= 1.15 and min(g_views, g_impr) >= 0.9 else 'down' if max(g_views, g_impr) < 0.9 else 'flat'
    tgt = x['target'] or {}
    exp_views = (tgt.get('views') or 0) * ramp(x['age'])
    pace = x['views28'] / exp_views if exp_views else None
    exp_money = (tgt.get('moneyClicks') or 0) * ramp(max(0, (x['age'] or 0) - 30))  # money lags visits ~a month
    money_pace = x['money28'] / exp_money if exp_money else None
    young = x['age'] is not None and x['age'] < MIN_RED_AGE
    reasons = []
    if pace is None:
        status = 'green' if trend == 'up' else 'amber'
        reasons.append('no 90-day target yet: judged on trend only')
    elif young:
        status = 'green' if (trend == 'up' or pace >= 1) else 'amber'
        reasons.append(f'{x["age"]} days live: too early for red (Google indexing lag)')
    else:
        if pace >= 0.8 and trend != 'down':
            status = 'green'
        elif trend in ('flat', 'down') and pace < 0.5 and gsc_days >= 28:
            status = 'red'
        else:
            status = 'amber'
    if status == 'green' and money_pace is not None and (x['age'] or 0) >= 60 and x['money28'] == 0:
        status = 'amber'
        reasons.append('visits growing but no money clicks yet')
    if pace is not None:
        reasons.insert(0, f'{x["views28"]:,} visits vs {round(exp_views):,} expected by day {x["age"]} ({round(pace * 100)}% of pace)')
    pct = abs(round((g_impr - 1) * 100))
    reasons.append(f'Google impressions {"up" if g_impr > 1.05 else "down" if g_impr < 0.95 else "flat"}'
                   f'{"" if 0.95 <= g_impr <= 1.05 else " " + ("200%+" if pct > 200 else f"{pct}%")} (last 14 days vs the 14 before, spikes smoothed)')
    macro_sites.append({
        'id': brand, 'name': x['name'], 'age': x['age'], 'status': status, 'trend': trend,
        'views28': x['views28'], 'prev28': x['prev28'], 'impr28': x['impr28'], 'clicks28': x['clicks28'],
        'money28': x['money28'] if x['tracksMoney'] else None,
        'target': tgt or None, 'targetConfirmed': bool(x['targetSet'] and str(x['targetSet']).startswith('confirmed')),
        'pace': round(pace, 2) if pace is not None else None, 'moneyPace': round(money_pace, 2) if money_pace is not None else None,
        'growth': {'views': round(g_views, 2), 'impressions': round(g_impr, 2)}, 'imprWeeks': weeks, 'gscDays': gsc_days,
        'why': reasons,
    })
n = len(macro_sites) or 1
reds = sum(m['status'] == 'red' for m in macro_sites)
greens = sum(m['status'] == 'green' for m in macro_sites)
downs = sum(m['trend'] == 'down' for m in macro_sites)
# Green needs most sites green, none red and none sliding: a falling site is worth knowing about even if others grow.
macro_status = 'red' if reds * 2 >= n else 'green' if greens * 2 >= n and reds == 0 and downs == 0 else 'amber'
ups = sum(m['trend'] == 'up' for m in macro_sites)
macro = {
    'status': macro_status,
    'summary': f'{greens} green, {n - greens - reds} amber, {reds} red · trend up on {ups}, down on {downs} of {n} sites',
    'sites': macro_sites,
}

# ---------- predictor ----------
scored = [f for f in forecasts['made'] if f.get('actual') is not None]
ratios = sorted(f['actual'] / max(1, f['likely']) for f in scored)
calib = min(2.0, max(0.5, ratios[len(ratios) // 2])) if len(ratios) >= 3 else 1.0
hits = [f for f in scored if f['low'] <= f['actual'] <= f['high']]
hit_rate = len(hits) / len(scored) if scored else None
widen = 1.0 if hit_rate is None or hit_rate >= 0.7 else 1.0 + (0.7 - hit_rate)  # missing a lot -> wider bands


def scenarios(g, measured=1.0):
    """Monthly growth and how fast it fades (months) for each line. Low: growth stalls (or the current slide carries on).
    High: the work compounds."""
    return {'low': (min(1 + (g - 1) * 0.35 - 0.03 * widen, measured), 3), 'likely': (g, 5), 'high': (1 + (g - 1) * 1.4 * widen + 0.03, 7)}


def project(v0, g_month, months, decay):
    """28-day visits after `months`, with monthly growth that fades as the site matures."""
    v = v0
    for m in range(months):
        v *= 1 + (g_month - 1) * math.exp(-m / decay)
    return v


predict = []
for m in macro_sites:
    x = sites[m['id']]
    v0 = max(1, m['views28'])
    measured = max(0.85, min(1.8, m['growth']['impressions'] ** 2))  # 14-day ratio -> ~28-day growth
    prior = 1.25 if (x['age'] or 0) < 180 else 1.08                  # typical young content site, per month
    w = min(1.0, m['gscDays'] / 90)                                  # trust our own data more as it builds up
    g = (measured ** w) * (prior ** (1 - w))
    scen = scenarios(g, measured)
    rate = (x['allMoney'] / x['allViews']) if x['allViews'] >= 300 and x['allMoney'] else None
    rates = {'low': 0.003, 'likely': 0.01, 'high': 0.025} if rate is None else {'low': rate * 0.5, 'likely': rate, 'high': rate * 1.8}
    rows = []
    for months, label in [(3, '3 months'), (6, '6 months'), (12, '12 months')]:
        v = {k: project(v0, gm, months, dec) * (calib if k == 'likely' else 1) for k, (gm, dec) in scen.items()}
        v['low'], v['high'] = min(v['low'], v['likely']), max(v['high'], v['likely'])
        row = {'horizon': label, 'visits': {k: int(round(val, -1 if val >= 100 else 0)) for k, val in v.items()}}
        if x['tracksMoney']:
            row['money'] = {k: round(v[k] * rates[k]) for k in v}
        rows.append(row)
    predict.append({'id': m['id'], 'name': m['name'], 'monthlyGrowth': round(g, 2), 'measured': round(measured, 2), 'rows': rows,
                    'moneyRate': 'own click rate' if rate else 'typical 0.3–2.5% of visits (no history yet)'})

# Log forecasts weekly (Mondays, or if the last log is 7+ days old) and score the ones that came due.
last_made = max((f['made'] for f in forecasts['made']), default='')
if not last_made or (today - date.fromisoformat(last_made)).days >= 7:
    for p in predict:
        m = next(s for s in macro_sites if s['id'] == p['id'])
        v0 = max(1, m['views28'])
        g = p['monthlyGrowth']
        for h in HORIZONS:
            months = h / 30.4
            mm = max(1, round(months))
            sc = scenarios(g, p['measured'])
            lik = project(v0, sc['likely'][0], mm, sc['likely'][1]) * calib
            lo = min(lik, project(v0, sc['low'][0], mm, sc['low'][1]))
            hi = max(lik, project(v0, sc['high'][0], mm, sc['high'][1]))
            if h == 28:  # one month: tighter band
                lik, lo, hi = v0 * g * calib, v0 * min(g, 1) * 0.7, v0 * max(g, 1) * 1.4
            forecasts['made'].append({'made': today.isoformat(), 'site': p['id'], 'metric': 'views28', 'from': m['views28'],
                                      'due': (today + timedelta(days=h)).isoformat(), 'low': round(lo), 'likely': round(lik), 'high': round(hi)})
for f in forecasts['made']:
    if f.get('actual') is None and f['due'] <= today.isoformat():
        snap = hist['days'].get(f['due'], {}).get(f['site']) or (hist['days'].get(today.isoformat(), {}).get(f['site'])
                                                                  if (today - date.fromisoformat(f['due'])).days <= 3 else None)
        if snap:
            f['actual'] = snap['views28']
            f['hit'] = f['low'] <= f['actual'] <= f['high']
scored = [f for f in forecasts['made'] if f.get('actual') is not None]
accuracy = {
    'scored': len(scored), 'hits': sum(1 for f in scored if f.get('hit')),
    'hitRate': round(sum(1 for f in scored if f.get('hit')) / len(scored), 2) if scored else None,
    'calibration': round(calib, 2), 'logged': len(forecasts['made']),
    'firstCheck': min((f['due'] for f in forecasts['made'] if f.get('actual') is None), default=None),
}

# ---------- micro (repo half: Simon + Claude's work this week) ----------
week_ago = now - timedelta(days=7)
fixes7 = []
for site_id, scans in hist['fixes'].items():
    for at, items in scans.items():
        if datetime.fromisoformat(at.replace('Z', '+00:00')) >= week_ago:
            fixes7 += [{'site': site_id, 'what': i} for i in items]
seen = set(); fixes7 = [f for f in fixes7 if (k := (f['site'], f['what'])) not in seen and not seen.add(k)]

commits = gh_json(f'repos/{REPO}/commits?since={week_ago.strftime("%Y-%m-%dT%H:%M:%SZ")}&per_page=100') or []
shipped = {}
for c in commits:
    msg = (c.get('commit', {}).get('message') or '').split('\n')[0]
    if '[skip ci]' in msg or (c.get('commit', {}).get('author') or {}).get('name') != 'Claude':
        continue
    low = msg.lower()
    for b, prefs in COMMIT_PREFIX.items():
        if any(low.startswith(p + ':') or low.startswith(p + ' ') for p in prefs):
            shipped.setdefault(b, []).append(msg)
            break
n_shipped = sum(len(v) for v in shipped.values())

todo = portfolio.get('todo', [])
done7 = [t for t in todo if t.get('done') and t.get('doneAt') and date.fromisoformat(t['doneAt'][:10]) >= today - timedelta(days=7)]
open_todo = [t for t in todo if not t.get('done')]


def item(key, label, value, target, fix, unit=''):
    ratio = value / target if target else 1.0
    st = 'green' if ratio >= 0.8 else 'amber' if ratio >= 0.34 else 'red'
    return {'key': key, 'label': label, 'value': value, 'target': target, 'status': st, 'unit': unit, 'fix': fix, 'weight': 1}


micro_items = [
    item('fixes', 'Site check fixes cleared', len(fixes7), 3, 'Clear the top fix on the lowest-graded site (IMN HQ → its app → Fix with Claude)'),
    item('shipped', 'Site improvements shipped', n_shipped, 3, 'Ship one improvement on the site with the most Google impressions'),
    item('todos', 'Your to-dos done', len(done7), min(3, len(open_todo)) or 0,
         f'Knock off your quickest open to-do: {min(open_todo, key=lambda t: (t["what"].startswith("Monthly"), t.get("mins", 99)))["what"][:90]}' if open_todo else 'Nothing open'),
]

out = {
    'generatedAt': now.strftime('%Y-%m-%dT%H:%M:%SZ'), 'day': today.isoformat(),
    'micro': {'items': micro_items, 'fixed': fixes7[:20], 'shipped': {b: v[:5] for b, v in shipped.items()},
              'note': 'Outreach (emails sent vs warm-up, follow-ups) is added live by IMN HQ from D1.'},
    'macro': macro, 'predict': predict, 'accuracy': accuracy,
    'rules': {'minRedAge': MIN_RED_AGE, 'ramp': '(age/90)^1.5 of target90', 'doc': 'docs/CONFIDENCE.md'},
}
save('hq/confidence.json', out)
save('hq/confidence-history.json', hist)
save('hq/forecasts.json', forecasts)
print(f'Confidence: macro {macro_status} ({macro["summary"]}); micro (repo) ' +
      ', '.join(f'{i["label"]} {i["value"]}/{i["target"]} {i["status"]}' for i in micro_items) +
      f'; forecasts logged {accuracy["logged"]}, scored {accuracy["scored"]}')
