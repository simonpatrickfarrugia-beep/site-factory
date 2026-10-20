"""Where to start: rank niche ideas by risk-adjusted profit per build day.

For each scored niche:
  R      = mid monthly revenue at maturity (money map: traffic x clicks x conversion x payout + ads)
  P_rank = ease/100                      (keyword difficulty: can a small site rank?)
  P_fit  = 0.5 + fit/200                 (Claude's judgement of data, automation and monetisation fit)
  P_data = 1 - dataRisk                  (licence or source could block us)
  P_pay  = approval odds of the top 3 programmes (verified terms only count fully)
  P      = P_rank x P_fit x P_data x P_pay
  EV24   = sum over 24 months of R x P x ramp(t)  (ramp: 0 until monthsToFirst, then linear to full over 12 months)
  Priority = EV24 / effortDays           ($ expected per day of build)
Monte Carlo (5,000 runs): revenue drawn log-normally between the low and high scenarios, success drawn
from P, months-to-first jittered +/-2. Reports chance of reaching $500/month by month 18.
"""
import json, math, random, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
niches = json.load(open(root / 'hq/niches.json'))
inp = json.load(open(root / 'hq/priority-inputs.json'))
H, RAMP, AP = inp['horizonMonths'], inp['rampMonths'], inp['approval']

def ramp(t, t0):
    return 0.0 if t < t0 else min(1.0, (t - t0 + 1) / RAMP)

def p_pay(progs):
    top = sorted(progs, key=lambda p: -(p.get('estPerSaleUsd') or 0))[:3] or []
    if not top: return 0.5
    vals = []
    for p in top:
        v = AP.get(p.get('status')) if p.get('status') in ('approved', 'applying') else AP.get(p.get('approval'), 0.5)
        vals.append(v * (1 if p.get('verified') else inp['unverifiedPenalty']))
    return max(vals) * 0.6 + (sum(vals) / len(vals)) * 0.4  # one good programme is enough; more is a hedge

rows = []
random.seed(7)
for n in niches:
    if n.get('status') != 'scored' or not n.get('money'): continue
    a = inp['niches'].get(n['idea'])
    if not a: continue
    s, m = n['score'], n['money']
    lo, mid, hi = m['revenueUsd']
    P_rank, P_fit, P_data, P_pay = s['ease'] / 100, 0.5 + s['fit'] / 200, 1 - a['dataRisk'], p_pay(m.get('programs') or [])
    P = P_rank * P_fit * P_data * P_pay
    ev = sum(mid * P * ramp(t, a['monthsToFirst']) for t in range(1, H + 1))
    # Monte Carlo
    mu, sd = math.log(max(mid, 1)), (math.log(max(hi, 1)) - math.log(max(lo, 1))) / 3.3
    hits, evs = 0, []
    for _ in range(5000):
        ok = random.random() < P
        r = math.exp(random.gauss(mu, sd)) if ok else 0
        t0 = max(2, a['monthsToFirst'] + random.randint(-2, 2))
        evs.append(sum(r * ramp(t, t0) for t in range(1, H + 1)))
        if r * ramp(18, t0) >= 500: hits += 1
    evs.sort()
    rows.append(dict(idea=n['idea'], site=a['shared'], R=mid, P=P, parts=(P_rank, P_fit, P_data, P_pay), ev=ev,
                     days=a['effortDays'], prio=ev / a['effortDays'], p500=hits / 5000, p10=evs[500], p90=evs[4500]))

rows.sort(key=lambda r: -r['prio'])
out = ['# Where to start: niche × affiliate priority', '',
       'Risk-adjusted expected revenue over 24 months, divided by build days. Inputs: money map (`hq/niches.json`), '
       'programme approval odds (`hq/affiliate-programs.json`), hand-set effort and timing (`hq/priority-inputs.json`). '
       'Estimates for ranking, not forecasts.', '',
       '| # | Idea | Where | Mature $/mo | Odds it works | 24-mo expected | Build days | $ per build day | Chance of $500/mo by month 18 |',
       '|---|---|---|---:|---:|---:|---:|---:|---:|']
for i, r in enumerate(rows, 1):
    out.append(f"| {i} | {r['idea']} | {r['site']} | ${r['R']:,.0f} | {r['P']*100:.0f}% | ${r['ev']:,.0f} | {r['days']} | **${r['prio']:,.0f}** | {r['p500']*100:.0f}% |")
out += ['', '## Odds breakdown (rank × fit × data × affiliate approval)', '',
        '| Idea | Rank | Fit | Data | Approval | 24-mo range (10th–90th pct) |', '|---|---:|---:|---:|---:|---|']
for r in rows:
    a, b, c, d = r['parts']
    out.append(f"| {r['idea']} | {a:.2f} | {b:.2f} | {c:.2f} | {d:.2f} | ${r['p10']:,.0f} – ${r['p90']:,.0f} |")
# grouped by site (sections share build effort)
g = {}
for r in rows:
    k = r['site']; g.setdefault(k, {'ev': 0, 'days': 0, 'ideas': []})
    g[k]['ev'] += r['ev']; g[k]['days'] += r['days']; g[k]['ideas'].append(r['idea'])
out += ['', '## By site (sections combined)', '', '| Site | Ideas | 24-mo expected | Build days | $ per build day |', '|---|---|---:|---:|---:|']
for k, v in sorted(g.items(), key=lambda kv: -kv[1]['ev'] / kv[1]['days']):
    out.append(f"| {k} | {len(v['ideas'])} | ${v['ev']:,.0f} | {v['days']} | ${v['ev']/v['days']:,.0f} |")
(root / 'hq/reports/priority.md').write_text('\n'.join(out) + '\n')
print('\n'.join(out))
