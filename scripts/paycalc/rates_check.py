"""Monthly accuracy check for the pay calculator (data/paycalc/rates.json).

For each official source, fetch the page and confirm every figure we use still appears on it. Also watches for
signs that new figures are out (a new income year's tables, next year's Medicare instructions, the new
financial year starting). Anything off is written to rates-check.md and the workflow opens an issue.
Run: python3 scripts/paycalc/rates_check.py   (exit 1 = something needs a look)
"""
import datetime as dt, html, json, re, sys, urllib.request

R = json.load(open('data/paycalc/rates.json', encoding='utf8'))
today = dt.date.today()
money = lambda n: f"${n:,.0f}"

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (rates check; site-factory)', 'Accept': 'text/html'})
    with urllib.request.urlopen(req, timeout=30) as r:
        s = r.read().decode('utf8', 'replace')
    s = re.sub(r'(?is)<(script|style)\b.*?</\1>', ' ', s)
    s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    return re.sub(r'\s+', ' ', s).replace('–', '-').replace('‑', '-')

def exists(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (rates check; site-factory)'})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status == 200 and 'Page not found' not in r.read(200000).decode('utf8', 'replace')
    except Exception:
        return False

b = {x['from']: x['rate'] for x in R['brackets']}
h, l, m, s = R['help'], R['lito'], R['medicare'], R['super']
y1 = int(R['year'][:4]) + 1                       # 2026-27 -> 2027
next_year = f"{y1}-{str(y1 + 1)[2:]}"             # "2027-28"

checks = [
    ('Income tax rates', 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents',
     [money(18200), money(45000), money(135000), money(190000), money(4020), money(31020), money(51370),
      f"{round(b[18200] * 100)}c", f"{round(b[45000] * 100)}c", f"{round(b[135000] * 100)}c", f"{round(b[190000] * 100)}c"]),
    ('Low income tax offset', R['sources'][1]['url'],
     [money(l['max']), money(l['full']), money(l['mid']), money(l['midAmount']), '66,667']),
    ('Medicare low-income thresholds', R['sources'][2]['url'], [money(m['singleLower']), money(m['singleUpper'])]),
    ('HECS-HELP repayment thresholds', R['sources'][3]['url'],
     [money(h['nilTo']), money(h['bands'][1]['from']), money(h['flatFrom']), money(h['bands'][1]['base'])]),
    ('Super guarantee rate', R['sources'][5]['url'], [f"{s['rate'] * 100:.2f}%|{s['rate'] * 100:g}%|{s['rate'] * 100:g} %"]),
    ('Maximum super contribution base', R['sources'][4]['url'], [money(s['maxBase'])]),
]

problems, news, ok = [], [], []
for name, url, want in checks:
    try:
        text = fetch(url)
    except Exception as e:
        problems.append(f"**{name}**: couldn't load the source ({str(e)[:80]}). Check it by hand: {url}")
        continue
    # "a|b" = either form counts (e.g. 12% or 12.00%).
    missing = [w.split('|')[0] for w in want if not any(alt in text for alt in w.split('|'))]
    if missing:
        seen = sorted(set(re.findall(r'\$\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?\s?(?:%|per cent)', text)))[:25]
        problems.append(f"**{name}**: the source no longer shows {', '.join(missing)}. A figure may have changed: {url} (figures on the page now: {', '.join(seen) or 'none found'})")
    else:
        ok.append(f"{name}: all {len(want)} figures found")
    # A table for the next income year appearing on a page we watch = new figures to load.
    if name in ('HECS-HELP repayment thresholds', 'Income tax rates') and re.search(rf"\b{next_year}\b", text):
        news.append(f"**{name}**: the ATO page now mentions {next_year}. New figures may be out: {url}")

# Medicare thresholds for the current year arrive with the next tax return instructions (usually after the May Budget).
nxt = re.sub(r'20\d\d', lambda x: str(int(x.group()) + 1), R['sources'][2]['url'])  # ...-2026 → ...-2027
if m.get('thresholdYear', '').replace('–', '-') != R['year'] and exists(nxt):
    news.append(f"**Medicare levy**: next year's instructions are published, so the {R['yearLabel']} low-income thresholds are probably out: {nxt}")

# The financial year moved on and the rates file is still last year's.
if today >= dt.date(y1, 7, 1):
    problems.append(f"**New financial year**: it's past 1 July {y1} and the calculator still uses {R['yearLabel']} rates. Load the {next_year} figures.")
if today.month in (5, 6):
    news.append("**Budget season**: the federal Budget usually sets the Medicare low-income thresholds and can change tax settings. Worth a look this month.")

out = [f"## Pay calculator rates check ({today:%d %b %Y})", '',
       f"Rates file: {R['yearLabel']}, last checked {R['checked']}.", '']
if problems: out += ['### Needs a look', *[f"- {p}" for p in problems], '']
if news: out += ['### Heads-up', *[f"- {n}" for n in news], '']
out += ['### Confirmed', *([f"- {o}" for o in ok] or ['- nothing']), '',
        'To fix: in the Site Factory chat say "update the pay calculator rates". Claude checks the new figures against the ATO, updates `data/paycalc/rates.json` and the tests, and the site rebuilds.']
open('rates-check.md', 'w').write('\n'.join(out) + '\n')
print('\n'.join(out))
sys.exit(1 if problems or news else 0)
