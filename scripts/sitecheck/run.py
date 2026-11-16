"""Site check: one automated report card per site (errors, quality, SEO gaps, competitor moves), fixes ranked by impact.

Usage:
  python3 scripts/sitecheck/run.py                 # scan every site that is due today (max maxSitesPerDay)
  python3 scripts/sitecheck/run.py --site vic      # scan one site now (or --site all)
  python3 scripts/sitecheck/run.py --plan          # only print what is due and why
  options: --no-live (skip the pipeline Worker: Google top 10 + index status), --no-speed, --no-issues,
           --out DIR (where cards go; default hq/sitecheck; client sites must point at the private repo)

Reuses: scripts/seo_audit.py (per-page SEO checks), scripts/quality.py (thin/duplicate gate, run on the live HTML),
scripts/probe.py (fetcher with redirect chain), data/<brand>/stats.json (GA4 + Search Console),
the pipeline Worker's DataForSEO + Search Console access (POST /sitecheck), hq/portfolio.json + hq/finance.json (cadence).
Config: hq/sitecheck.json. Docs: docs/SITECHECK.md.
"""
import argparse, concurrent.futures as cf, html, json, os, re, shutil, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from seo_audit import page_facts, page_issues  # noqa: E402
from probe import fetch  # noqa: E402

UA = 'Mozilla/5.0 (site-factory-sitecheck; +https://github.com/simonpatrickfarrugia-beep/site-factory)'
WORKER = 'https://trailer-pipeline.simonpatrickfarrugia.workers.dev/sitecheck'
NOW = datetime.now(timezone.utc)
TODAY = NOW.astimezone(timezone(timedelta(hours=11))).date()  # Melbourne (AEDT); a day early/late in winter doesn't matter here
SEV = {'blocker': 10, 'high': 5, 'medium': 2.5, 'low': 1}
AREAS = [('health', 'Broken pages & links'), ('tracking', 'Tracking & money links'), ('indexing', 'Sitemap & indexing'),
         ('seo', 'Titles, descriptions & schema'), ('content', 'Thin & duplicate pages'), ('speed', 'Speed'),
         ('google', 'Google trend'), ('rivals', 'Competitors')]


def rd(p, default=None):
    try:
        return json.load(open(os.path.join(ROOT, p)))
    except Exception:
        return default


def wr(p, obj):
    full = os.path.join(ROOT, p) if not os.path.isabs(p) else p
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        if isinstance(obj, str): f.write(obj)
        else: json.dump(obj, f, indent=1, ensure_ascii=False); f.write('\n')


def get(url, timeout=25, method='GET'):
    """(status, final_url, body, headers, secs). Status 0 = couldn't connect."""
    if method == 'GET':
        try:
            code, final, body, hdrs, chain, secs = fetch(url)
            return code, final, body, hdrs, secs
        except Exception as e:
            return 0, url, str(e)[:160], {}, 0
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, method=method, headers={'user-agent': UA}), timeout=timeout)
        return r.status, r.geturl(), '', r.headers, 0
    except urllib.error.HTTPError as e:
        return e.code, url, '', e.headers, 0
    except Exception as e:
        return 0, url, str(e)[:160], {}, 0


# ---------- cadence ----------

def revenue_by_month(site, finance):
    out = {}
    for r in finance.get('revenue', []):
        who = ' '.join(str(r.get(k, '')) for k in ('site', 'brand', 'source')).lower()
        if site['id'] in who or site['name'].lower() in who:
            out[r.get('month', '')] = out.get(r.get('month', ''), 0) + (r.get('amount') or 0)
    return out


def stage_of(site, finance, portfolio, stats):
    if site.get('owner') == 'client':
        plan = site.get('carePlan', 'essentials')
        return 'client:' + plan, f'care plan "{plan}"'
    rev = revenue_by_month(site, finance)
    cutoff = (TODAY - timedelta(days=60)).strftime('%Y-%m')
    recent = sum(v for m, v in rev.items() if m >= cutoff)
    if recent <= 0:
        return 'building', 'no revenue in the last 60 days'
    months = [(TODAY.replace(day=1) - timedelta(days=1 + 31 * i)).strftime('%Y-%m') for i in range(3)]
    node = next((n for n in portfolio.get('nodes', []) if n.get('id') == site['brand']), {})
    target = (node.get('target90') or {}).get('views')
    views = ((stats or {}).get('totals') or {}).get('views', 0)
    if all(rev.get(m, 0) > 0 for m in months) and (not target or views >= target):
        return 'steady', f'revenue 3 months running and {views:,} visits/28 days' + (f' (target {target:,})' if target else '')
    return 'earning', f'A${recent:,.2f} revenue in the last 60 days'


def launch_date(site):
    """Launch day from hq/portfolio.json (node id = brand, or the site id), else the site's own `launched` in hq/sitecheck.json, else None."""
    nodes = (rd('hq/portfolio.json', {}) or {}).get('nodes', [])
    node = next((n for n in nodes if n.get('id') in (site.get('brand'), site.get('id'), site.get('portfolio'))), {})
    try:
        return datetime.strptime(node.get('launched') or site['launched'], '%Y-%m-%d').date()
    except (KeyError, TypeError, ValueError):
        return None


def cadence(cfg, stage):
    if stage.startswith('client:'):
        return cfg['carePlans'].get(stage.split(':', 1)[1], 30)
    return cfg['cadenceDays'][stage]


# ---------- crawl ----------

def sitemap_urls(base):
    code, _, body, _, _ = get(base + '/sitemap.xml')
    if code != 200: return code, []
    locs = re.findall(r'<loc>\s*(.*?)\s*</loc>', body)
    if '<sitemapindex' in body:
        out = []
        for sm in locs[:20]:
            c, _, b, _, _ = get(sm)
            if c == 200: out += re.findall(r'<loc>\s*(.*?)\s*</loc>', b)
        locs = out
    return code, [html.unescape(u) for u in locs]


A_RX = re.compile(r'<a\b([^>]*)>', re.I)


def links_of(s):
    out = []
    for attrs in A_RX.findall(s):
        h = re.search(r'href="([^"]*)"', attrs)
        if not h: continue
        rel = (re.search(r'rel="([^"]*)"', attrs) or [None, ''])[1]
        out.append((html.unescape(h.group(1)), rel, (re.search(r'data-cta="([^"]*)"', attrs) or [None, ''])[1]))
    return out


def crawl(site, cfg):
    base = site['url'].rstrip('/')
    host = urllib.parse.urlsplit(base).netloc
    rcode, _, robots, _, _ = get(base + '/robots.txt')
    scode, urls = sitemap_urls(base)
    urls = urls[:cfg['maxPages']]
    pages = {}

    def one(u):
        code, final, body, hdrs, secs = get(u)
        return u, code, final, body, secs

    with cf.ThreadPoolExecutor(8) as ex:
        for u, code, final, body, secs in ex.map(one, urls):
            pages[u] = dict(code=code, final=final, body=body if code == 200 else '', secs=secs)
    return dict(base=base, host=host, robots_code=rcode, robots=robots if rcode == 200 else '', sitemap_code=scode, urls=urls, pages=pages)


def check_links(crawl_out, cfg):
    base, host, pages = crawl_out['base'], crawl_out['host'], crawl_out['pages']
    known = {u.rstrip('/') for u in crawl_out['urls']}
    internal, outside = {}, {}
    for u, p in pages.items():
        for href, rel, cta in links_of(p['body']):
            if href.startswith(('mailto:', 'tel:', '#', 'javascript:', 'sms:')): continue
            if '${' in href or '{{' in href: continue  # a template inside a script, not a real link
            full = urllib.parse.urljoin(u, href).split('#')[0]
            sp = urllib.parse.urlsplit(full)
            if sp.scheme not in ('http', 'https'): continue
            if sp.netloc == host or sp.netloc == 'www.' + host or 'www.' + sp.netloc == host:
                if '/hq' in sp.path or sp.path.startswith('/api/'): continue
                internal.setdefault(full.rstrip('/'), set()).add(u)
            else:
                outside.setdefault(full, set()).add(u)
    to_check = [l for l in internal if l not in known][:300]
    broken_int, broken_out, unsure_out = [], [], []
    with cf.ThreadPoolExecutor(8) as ex:
        for l, (code, *_r) in zip(to_check, ex.map(lambda l: get(l, method='GET'), to_check)):
            if code == 0 or code >= 400: broken_int.append(dict(url=l, code=code, on=sorted(internal[l])[:5], n=len(internal[l])))
    # Outside links: one per host+path, most-linked first. 403/429 = the site blocks robots (not counted as broken).
    rules = cfg['affiliateRules']
    plain = [l for l in sorted(outside, key=lambda l: -len(outside[l])) if not any(r['host'] in urllib.parse.urlsplit(l).netloc for r in rules)]
    plain = plain[:cfg['maxOutsideLinks']]

    def head(l):
        code = get(l, method='HEAD')[0]
        if code in (0, 405, 403, 404, 501) or code >= 500: code = get(l)[0]  # many sites don't do HEAD
        return code

    with cf.ThreadPoolExecutor(8) as ex:
        for l, code in zip(plain, ex.map(head, plain)):
            if code in (404, 410) or (code == 0):
                broken_out.append(dict(url=l, code=code, on=sorted(outside[l])[:5], n=len(outside[l])))
            elif code >= 500 or code in (401, 403, 429, 999):
                unsure_out.append(dict(url=l, code=code))
    return dict(internal=len(internal), outside=len(outside), checked_out=len(plain), broken_internal=broken_int,
                broken_outside=broken_out, unsure_outside=unsure_out, outside_map=outside)


def affiliate_check(crawl_out, cfg):
    """Every link to an affiliate programme's site must carry our ID and rel="sponsored"."""
    bad, ok = [], 0
    for u, p in crawl_out['pages'].items():
        for href, rel, cta in links_of(p['body']):
            full = urllib.parse.urljoin(u, href)
            netloc = urllib.parse.urlsplit(full).netloc
            rule = next((r for r in cfg['affiliateRules'] if netloc == r['host'] or netloc.endswith('.' + r['host'])), None)
            if not rule: continue
            # Plain links to a programme's own pricing/info page (e.g. fergus.com/au/pricing) aren't affiliate links:
            # only the programme's link hosts are checked (the rule host itself).
            missing = []
            if rule['needs'] not in full: missing.append(f'no `{rule["needs"]}`')
            if 'sponsored' not in rel: missing.append('no rel="sponsored"')
            if missing: bad.append(dict(page=u, link=full[:160], program=rule['program'], why=', '.join(missing)))
            else: ok += 1
    return ok, bad


def schema_check(body):
    errs, types = [], []
    for j in re.findall(r'<script type="application/ld\+json"[^>]*>(.*?)</script>', body, re.S):
        try:
            d = json.loads(j)
            for x in (d if isinstance(d, list) else d.get('@graph', [d]) if isinstance(d, dict) else []):
                if isinstance(x, dict): types.append(x.get('@type', '?') if isinstance(x.get('@type'), str) else ','.join(x.get('@type', [])))
        except Exception as e:
            errs.append(str(e)[:80])
    return types, errs


def run_quality(crawl_out, brand):
    """Run the build-time quality gate (scripts/quality.py) on the live HTML."""
    tmp = tempfile.mkdtemp(prefix='sitecheck-')
    try:
        for u, p in crawl_out['pages'].items():
            if not p['body']: continue
            path = urllib.parse.urlsplit(u).path.strip('/')
            out = os.path.join(tmp, path, 'index.html') if path else os.path.join(tmp, 'index.html')
            os.makedirs(os.path.dirname(out), exist_ok=True)
            open(out, 'w').write(p['body'])
        cwd = tempfile.mkdtemp(prefix='sitecheck-q-')
        subprocess.run([sys.executable, os.path.join(ROOT, 'scripts', 'quality.py'), tmp], cwd=cwd, env={**os.environ, 'BRAND': brand},
                       capture_output=True, text=True, timeout=600)
        md = open(os.path.join(cwd, 'quality.md')).read() if os.path.exists(os.path.join(cwd, 'quality.md')) else ''
        shutil.rmtree(cwd, ignore_errors=True)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    summary = next((l for l in md.splitlines() if 'indexable pages' in l), '')
    m = re.search(r'(\d+) indexable pages · average (\d+) words.*?· (\d+) thin · (\d+) near-duplicate pairs · (\d+) hard fails', summary)
    nums = dict(zip(['pages', 'avg', 'thin', 'near', 'nfails'], map(int, m.groups()))) if m else dict(pages=0, avg=0, thin=0, near=0, nfails=0)
    fails = [l[4:] for l in md.splitlines() if l.startswith('- ❌')]
    warns = [l[5:] for l in md.splitlines() if l.startswith('- ⚠️')]
    return dict(summary=summary.strip(), fails=fails, warns=warns, **nums)


def robots_blocks_all(txt):
    """True only when the group for every crawler (User-agent: *) disallows the whole site.
    Cloudflare's managed robots.txt blocks AI training bots (GPTBot…) with their own groups; that's fine."""
    agents, rules, groups = [], [], []
    for line in txt.splitlines():
        line = line.split('#', 1)[0].strip()
        if ':' not in line: continue
        k, v = [x.strip() for x in line.split(':', 1)]
        k = k.lower()
        if k == 'user-agent':
            if rules: groups.append((agents, rules)); agents, rules = [], []
            agents.append(v.lower())
        elif k in ('allow', 'disallow'):
            rules.append((k, v))
    if agents: groups.append((agents, rules))
    return any('*' in a and ('disallow', '/') in r and not any(k == 'allow' and v == '/' for k, v in r) for a, r in groups)


def speed_lite(url, body, secs):
    """Our own speed signals when PageSpeed is unavailable: server time, HTML size, blocking files, image weight."""
    head = (re.search(r'<head.*?</head>', body, re.S | re.I) or [''])[0] if body else ''
    # Only scripts that stop the page drawing; one or two stylesheets are normal for Astro.
    blocking = len(re.findall(r'<script\b(?![^>]*\b(?:async|defer|type="module"))[^>]*\bsrc=', head, re.I)) + max(0, len(re.findall(r'<link\b[^>]*rel="stylesheet"', head, re.I)) - 2)
    imgs = re.findall(r'<img\b[^>]*>', body or '', re.I)
    no_dims = sum(1 for i in imgs if not (re.search(r'\bwidth=', i) and re.search(r'\bheight=', i)))
    srcs = list(dict.fromkeys(urllib.parse.urljoin(url, html.unescape(m)) for i in imgs[:15] for m in re.findall(r'\bsrc="([^"]+)"', i)))
    total = 0
    for src in srcs:
        code, _, _, hdrs, _ = get(src, method='HEAD')
        try: total += int((hdrs or {}).get('content-length') or 0)
        except Exception: pass
    return dict(url=url, lite=True, serverSecs=round(secs, 2), htmlKb=round(len((body or '').encode()) / 1024), blocking=blocking, images=len(imgs), noDims=no_dims, imageKb=round(total / 1024))


def pagespeed(url):
    key = os.environ.get('PSI_KEY', '')
    api = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?' + urllib.parse.urlencode({'url': url, 'strategy': 'mobile', 'category': 'performance', **({'key': key} if key else {})})
    for attempt in range(3):
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(api, headers={'user-agent': UA}), timeout=90))
            break
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 2: return dict(url=url, error=str(e)[:120])
            time.sleep(20 * (attempt + 1))
        except Exception as e:
            return dict(url=url, error=str(e)[:120])
    try:
        lh = d['lighthouseResult']
        a = lh['audits']
        return dict(url=url, score=round(lh['categories']['performance']['score'] * 100), lcp=round(a['largest-contentful-paint']['numericValue'] / 1000, 1),
                    cls=round(a['cumulative-layout-shift']['numericValue'], 3), tbt=round(a['total-blocking-time']['numericValue']),
                    weightKb=round(a.get('total-byte-weight', {}).get('numericValue', 0) / 1024))
    except Exception as e:
        return dict(url=url, error=str(e)[:120])


def live_google(site, keywords, inspect):
    """Ask the pipeline Worker for Google's top 10 per search (DataForSEO) and index status (Search Console)."""
    key = os.environ.get('PIPELINE_RUN_KEY', '')
    if not key: return dict(error='PIPELINE_RUN_KEY not set')
    body = json.dumps(dict(market=site['market'], gscSite=site.get('gsc'), keywords=keywords, inspect=inspect)).encode()
    try:
        r = urllib.request.urlopen(urllib.request.Request(f'{WORKER}?key={key}', data=body, method='POST',
                                   headers={'content-type': 'application/json', 'user-agent': UA}), timeout=240)
        return json.load(r)
    except urllib.error.HTTPError as e:
        return dict(error=f'HTTP {e.code} {e.read()[:200].decode("utf8", "replace")}')
    except Exception as e:
        return dict(error=str(e)[:200])


# ---------- Google numbers from stats.json ----------

def google_trend(stats):
    d = (stats or {}).get('gscDaily') or []
    d = [x for x in d if x.get('impressions') is not None]
    last, prev = d[-7:], d[-14:-7]
    s = lambda xs, k: sum(x.get(k, 0) for x in xs)
    daily = (stats or {}).get('daily') or []
    recent_views = sum(x.get('views', 0) for x in daily[-3:])
    last_day = daily[-1]['date'] if daily else None
    return dict(impr7=s(last, 'impressions'), imprPrev7=s(prev, 'impressions'), clicks7=s(last, 'clicks'), clicksPrev7=s(prev, 'clicks'),
                impr28=((stats or {}).get('totals') or {}).get('gscImpressions', 0), clicks28=((stats or {}).get('totals') or {}).get('gscClicks', 0),
                views28=((stats or {}).get('totals') or {}).get('views', 0), viewsPrev28=((stats or {}).get('totals') or {}).get('prevViews', 0),
                recentViews=recent_views, lastGa4Day=last_day, gscTo=((stats or {}).get('gscPeriod') or {}).get('end'))


def pick_keywords(stats, n):
    """Top searches by impressions, skipping addresses and near-duplicates (same words in another order)."""
    qs = sorted((stats or {}).get('queries') or [], key=lambda q: -q.get('impressions', 0))
    out, seen = [], []
    for q in qs:
        k = q['query'].strip().lower()
        if re.search(r'\b\d{2,5}\b.*\b(road|rd|street|st|ave|avenue|hwy|highway|drive|dr|vic|nsw|qld)\b', k) or re.search(r'\bnear me\b', k): continue
        toks = set(re.sub(r'(?<=[a-z])s\b', '', k).split())
        if any(len(toks & t) / max(1, min(len(toks), len(t))) >= 0.8 for t in seen): continue
        seen.append(toks)
        out.append(q)
        if len(out) >= n: break
    return out


# ---------- findings ----------

def traffic_map(stats):
    m = {}
    for p in (stats or {}).get('pages') or []:
        m[p['path'].rstrip('/') or '/'] = (p.get('views', 0) or 0) + (p.get('gscImpressions', 0) or 0) / 20
    return m


def build_findings(site, c, links, aff_bad, schema, quality, facts, speed, trend, live, stats, prev):
    F = []
    tm = traffic_map(stats)
    total = sum(tm.values()) or 1
    path = lambda u: (urllib.parse.urlsplit(u).path.rstrip('/') or '/')
    weight = lambda urls: 1 + 4 * min(1, sum(tm.get(path(u), 0) for u in urls) / total) if urls else 1 + 2  # site-wide items weigh as a busy page

    def add(fid, area, sev, title, fix, pages=(), detail='', money=False, broken=False):
        pages = list(dict.fromkeys(pages))
        impact = round(SEV[sev] * weight(pages) * (2 if money else 1), 1)
        F.append(dict(id=fid, area=area, severity=sev, title=title, fix=fix, pages=[path(u) for u in pages[:8]], count=len(pages) or 1,
                      detail=detail[:400], impact=impact, broken=broken))

    base = c['base']
    # Health
    down = [u for u, p in c['pages'].items() if p['code'] != 200]
    if c['sitemap_code'] != 200: add('sitemap-missing', 'indexing', 'blocker', 'The sitemap doesn\'t load', 'Check /sitemap.xml builds and deploys (src/pages/sitemap.xml.ts).', [base + '/sitemap.xml'], f'HTTP {c["sitemap_code"]}', broken=True)
    if down: add('pages-down', 'health', 'blocker', f'{len(down)} sitemap page(s) don\'t load', 'Fix or remove them from the sitemap. Check the page still builds.', down, ', '.join(f'{path(u)} → {c["pages"][u]["code"]}' for u in down[:6]), broken=True)
    redir = [u for u, p in c['pages'].items() if p['code'] == 200 and p['final'].rstrip('/') != u.rstrip('/')]
    if redir: add('sitemap-redirects', 'indexing', 'medium', f'{len(redir)} sitemap URL(s) redirect', 'List the final URL in the sitemap instead.', redir)
    if links['broken_internal']:
        b = links['broken_internal']
        add('broken-internal', 'health', 'high', f'{len(b)} broken internal link(s)', 'Point the links at a live page (or add a redirect).', [p for x in b for p in x['on']],
            '; '.join(f'{x["url"].replace(base, "")} ({x["code"]}) on {x["n"]} page(s)' for x in b[:6]), broken=True)
    if links['broken_outside']:
        b = links['broken_outside']
        add('broken-outside', 'health', 'medium', f'{len(b)} outside link(s) go to a missing page', 'Update or remove the links (often an official website that moved).', [p for x in b for p in x['on']],
            '; '.join(f'{x["url"][:90]} ({x["code"] or "no answer"})' for x in b[:6]), broken=True)
    # Tracking & money
    pages200 = {u: p for u, p in c['pages'].items() if p['code'] == 200}
    no_ga = [f['url'] for f in facts if not f['ga4'] and not f['noindex']]
    wrong_ga = [f['url'] for f in facts if f['ga4'] and site.get('ga4') and f['ga4'] != site['ga4']]
    if no_ga: add('ga4-missing', 'tracking', 'high', f'GA4 tag missing on {len(no_ga)} page(s)', 'Those visits aren\'t counted. Check the page uses the Base layout.', no_ga, money=True)
    if wrong_ga: add('ga4-wrong', 'tracking', 'high', f'Wrong GA4 ID on {len(wrong_ga)} page(s)', f'Should be {site["ga4"]} (brand config analytics.ga4Id).', wrong_ga, money=True, broken=True)
    if stats is not None and trend['views28'] > 0 and trend['recentViews'] == 0:
        add('ga4-silent', 'tracking', 'high', 'GA4 recorded no visits in the last 3 days', 'Open GA4 Realtime and load the site with ?notrack=0. If nothing shows, the tag or property is broken.', money=True, broken=True)
    if aff_bad:
        add('affiliate-untagged', 'tracking', 'blocker', f'{len(aff_bad)} affiliate link(s) missing our ID or rel="sponsored"', 'Clicks on these won\'t earn (or break the programme\'s rules). Fix the link template.',
            [x['page'] for x in aff_bad], '; '.join(f'{x["program"]}: {x["why"]}' for x in aff_bad[:4]), money=True, broken=True)
    # Indexing
    noindex_in_map = [f['url'] for f in facts if f['noindex']]
    if noindex_in_map: add('noindex-in-sitemap', 'indexing', 'medium', f'{len(noindex_in_map)} noindex page(s) listed in the sitemap', 'Leave noindex pages out of the sitemap.', noindex_in_map)
    canon_off = [f['url'] for f in facts if f['canonical'] and f['canonical'].rstrip('/') != f['url'].rstrip('/')]
    if canon_off: add('canonical-mismatch', 'indexing', 'medium', f'{len(canon_off)} page(s) point their canonical elsewhere', 'A sitemap page should be its own canonical.', canon_off)
    if c['robots'] and robots_blocks_all(c['robots']): add('robots-blocks', 'indexing', 'blocker', 'robots.txt blocks the whole site', 'Remove "Disallow: /" from robots.txt.', [base + '/robots.txt'], broken=True)
    if c['robots'] and 'sitemap:' not in c['robots'].lower(): add('robots-no-sitemap', 'indexing', 'low', 'robots.txt doesn\'t name the sitemap', f'Add "Sitemap: {base}/sitemap.xml".', [base + '/robots.txt'])
    idx = (live or {}).get('index') or []
    notidx = [x for x in idx if not x.get('error') and (x.get('verdict') == 'FAIL' or re.search(r'not indexed|unknown to google|excluded|blocked', (x.get('coverage') or ''), re.I))]
    if notidx: add('not-indexed', 'indexing', 'high', f'{len(notidx)} of your top {len(idx)} pages aren\'t in Google\'s index', 'Make the page more useful than what ranks, link to it from the home page, then request indexing in Search Console.',
                   [x['url'] for x in notidx], '; '.join(f'{path(x["url"])}: {x["coverage"]}' for x in notidx[:5]))
    seen_pages = sum(1 for p in (stats or {}).get('pages') or [] if (p.get('gscImpressions') or 0) > 0)
    if stats is not None and len(pages200) >= 10 and seen_pages < 0.15 * len(pages200):
        # Google takes ~2 months to show most pages of a new site: until then this is a watch item, not a fix.
        launched = launch_date(site)
        due = launched + timedelta(days=60) if launched else None
        if due and TODAY < due:
            add('few-pages-in-google', 'indexing', 'low', f'Google shows only {seen_pages} of {len(pages200)} pages (site is {(TODAY - launched).days} days old)',
                f'Nothing to do yet: new sites take about 2 months to show in Google. If it is still under {int(0.15 * len(pages200))} pages on {due:%-d %b %Y}, cut or merge weak pages and earn a few links.')
        else:
            add('few-pages-in-google', 'indexing', 'medium', f'Google shows only {seen_pages} of {len(pages200)} pages', 'Cut or merge weak pages (noindex the thinnest), link the best ones from the home page, and earn a few links from other sites.')
    # SEO basics
    groups = {}
    for f in facts:
        for chk, msg in page_issues(f, f['url']):
            if chk in ('ga4', 'noindex', 'canonical'): continue
            groups.setdefault(chk, []).append(f['url'])
    seo_rules = {'title': ('medium', 'title outside 30–65 characters', 'Rewrite to 30–65 characters with the main search first.'),
                 'desc': ('low', 'description outside 70–160 characters', 'Rewrite to 70–160 characters: what the page gives the searcher.'),
                 'h1': ('low', 'page(s) without exactly one H1', 'One H1 per page, matching the title\'s topic.'),
                 'og': ('low', 'page(s) without a share image', 'Add an og:image so shared links show a picture.'),
                 'words': ('low', 'page(s) under 250 words', 'Fine for tools; for guides add the answer people search for.')}
    for chk, urls in groups.items():
        sev, what, fix = seo_rules[chk]
        add(f'seo-{chk}', 'seo', sev, f'{len(urls)} {what}', fix, urls)
    bad_schema = [u for u, (t, e) in schema.items() if e]
    no_schema = [u for u, (t, e) in schema.items() if not t and not e]
    if bad_schema: add('schema-broken', 'seo', 'high', f'Schema won\'t parse on {len(bad_schema)} page(s)', 'Google ignores broken structured data. Fix the JSON-LD.', bad_schema, broken=True)
    if no_schema: add('schema-missing', 'seo', 'low', f'{len(no_schema)} page(s) have no schema', 'Add WebPage/BreadcrumbList (or the page\'s own type) so Google understands it.', no_schema)
    # Content
    for fmsg in quality['fails']:
        add('quality-fail-' + re.sub(r'\W+', '-', fmsg[:40]).strip('-').lower(), 'content', 'high', fmsg[:120], 'Same rule as the build\'s quality gate: fix the content or noindex the page.',
            [base + m for m in re.findall(r'(/[\w\-/]*)', fmsg)[:8]])
    if quality.get('thin'): add('thin-pages', 'content', 'medium', f'{quality["thin"]} thin page(s) (under 80 words of their own)', 'Add real detail, merge them, or noindex until they grow.',
                                [base + m for w in quality['warns'] if 'thin' in w for m in re.findall(r'(/[\w\-/]*) \(', w)][:20])
    if quality.get('near'): add('near-duplicates', 'content', 'medium', f'{quality["near"]} near-duplicate page pair(s)', 'Make each page different (its own data, examples) or merge and redirect.',
                                [base + m for w in quality['warns'] if 'near-duplicate' in w for m in re.findall(r'(/[\w\-/]*) ≈', w)][:20])
    # Speed
    for s in speed:
        if s.get('lite'):
            p_ = path(s['url']); slug = (p_.strip('/') or 'home').replace('/', '-')
            if s['imageKb'] > 1500: add('speed-img-' + slug, 'speed', 'high', f'{p_}: {s["imageKb"]:,} KB of images in the first 15', 'Resize images to the size shown (max ~1600px wide), serve WebP/AVIF, lazy-load below the fold.', [s['url']])
            elif s['imageKb'] > 800: add('speed-img-' + slug, 'speed', 'medium', f'{p_}: {s["imageKb"]:,} KB of images in the first 15', 'Resize and compress the biggest images; lazy-load below the fold.', [s['url']])
            if s['htmlKb'] > 250: add('speed-html-' + slug, 'speed', 'medium', f'{p_}: {s["htmlKb"]:,} KB of HTML', 'Move long inlined data out of the page or load it on demand.', [s['url']])
            if s['serverSecs'] > 1.5: add('speed-server-' + slug, 'speed', 'medium', f'{p_}: took {s["serverSecs"]}s to arrive', 'Check the page is served as a static file (not through the Worker) and cached.', [s['url']])
            if s['blocking'] > 1: add('speed-blocking-' + slug, 'speed', 'low', f'{p_}: {s["blocking"]} files block the first paint', 'Add defer/async to scripts in <head>, inline critical CSS.', [s['url']])
            if s['noDims'] > 2: add('speed-cls-' + slug, 'speed', 'low', f'{p_}: {s["noDims"]} images without width/height', 'Give images width and height so the page doesn\'t jump while loading.', [s['url']])
            continue
        if s.get('error'): continue
        if s['score'] < 50 or s['lcp'] > 4: sev = 'high'
        elif s['score'] < 75 or s['lcp'] > 2.5 or s['cls'] > 0.1: sev = 'medium'
        else: continue
        add('speed-' + (path(s['url']).strip('/') or 'home').replace('/', '-'), 'speed', sev, f'{path(s["url"])} is slow on phones (score {s["score"]}, LCP {s["lcp"]}s)',
            'Shrink the biggest image, lazy-load below the fold, cut unused scripts.' + (f' Page weight {s["weightKb"]:,} KB.' if s.get('weightKb') else ''), [s['url']])
    # Google trend
    if stats is not None and trend['imprPrev7'] >= 30 and trend['impr7'] < 0.7 * trend['imprPrev7']:
        add('impressions-drop', 'google', 'high', f'Google impressions down {100 - round(100 * trend["impr7"] / trend["imprPrev7"])}% week on week', 'Check Search Console → Pages for dropped pages, and whether a recent change touched titles.')
    # Rivals: searches where we're shown but beyond page 1, ranked by searches we could win
    for r in (live or {}).get('serps') or []:
        if r.get('error'): continue
        ours = r.get('ourRank')
        gpos = r.get('gscPosition')
        if ours and ours <= 3: continue
        top = r.get('top') or []
        lead = top[0]['domain'] if top else '?'
        sev = 'medium' if (gpos or 99) <= 20 else 'low'
        add('rival-' + re.sub(r'\W+', '-', r['keyword']).strip('-'), 'rivals', sev,
            f'"{r["keyword"]}": we\'re {"#" + str(ours) if ours else "not in the top 10"}' + (f' (Search Console avg {gpos:.0f})' if gpos else '') + f'; {lead} leads',
            'Compare our page with the top 3: answer the search in the first screen, add what they lack (data, plan, tool), link to it from busy pages.',
            [base + r['ourPage']] if r.get('ourPage') else [], 'Top 5: ' + ', '.join(f'{t["rank"]}. {t["domain"]}' for t in top[:5]))
    F.sort(key=lambda f: -f['impact'])
    return F


def grades(F, links, quality, speed, trend, live, n_pages):
    score = {}
    for key, _ in AREAS:
        pen = sum(SEV[f['severity']] * (1.6 if f['severity'] == 'blocker' else 1) * min(3, 1 + f['count'] / max(10, n_pages / 5)) for f in F if f['area'] == key)
        score[key] = max(0, round(100 - 3 * pen))
    # Google trend and rivals: also reward progress, not only penalise problems
    if trend['impr28'] == 0: score['google'] = min(score['google'], 55)
    serps = [r for r in (live or {}).get('serps') or [] if not r.get('error')]
    if serps:
        top10 = sum(1 for r in serps if r.get('ourRank'))
        score['rivals'] = round(100 * (0.25 + 0.75 * top10 / len(serps))) if top10 else 35
    else:
        score['rivals'] = None
    if not [s for s in speed if not s.get('error')]: score['speed'] = None  # lite results count as checked
    letter = lambda v: None if v is None else 'A' if v >= 90 else 'B' if v >= 80 else 'C' if v >= 70 else 'D' if v >= 55 else 'F'
    weights = dict(health=3, tracking=3, indexing=2, seo=1.5, content=1.5, speed=1, google=1, rivals=1)
    vals = [(score[k], weights[k]) for k, _ in AREAS if score[k] is not None]
    overall = round(sum(v * w for v, w in vals) / sum(w for _, w in vals))
    return overall, letter(overall), {k: dict(score=score[k], grade=letter(score[k]), label=label) for k, label in AREAS}


def diff(card, prev):
    if not prev: return dict(first=True)
    old = {f['id']: f for f in prev.get('findings', [])}
    new = {f['id']: f for f in card['findings']}
    g, pg = card['google'], prev.get('google', {})
    rival_moves = []
    pserps = {r['keyword']: r for r in (prev.get('live') or {}).get('serps') or [] if not r.get('error')}
    for r in (card.get('live') or {}).get('serps') or []:
        p = pserps.get(r['keyword'])
        if not p or r.get('error'): continue
        now5 = [t['domain'] for t in (r.get('top') or [])[:5]]
        was5 = [t['domain'] for t in (p.get('top') or [])[:5]]
        came = [d for d in now5 if d not in was5]
        went = [d for d in was5 if d not in now5]
        moved = (p.get('ourRank'), r.get('ourRank')) if p.get('ourRank') != r.get('ourRank') else None
        if came or went or moved: rival_moves.append(dict(keyword=r['keyword'], new=came, dropped=went, ours=moved))
    qprev = {q['query']: q for q in prev.get('queries', [])}
    qmoves = [dict(query=q['query'], was=round(qprev[q['query']]['position'], 1), now=round(q['position'], 1)) for q in card.get('queries', []) if q['query'] in qprev and abs(q['position'] - qprev[q['query']]['position']) >= 3]
    return dict(first=False, since=prev.get('scannedAt'), score=card['score'] - prev.get('score', card['score']),
                newIssues=[new[i]['title'] for i in new if i not in old], fixed=[old[i]['title'] for i in old if i not in new],
                impr28=g['impr28'] - pg.get('impr28', 0), clicks28=g['clicks28'] - pg.get('clicks28', 0), views28=g['views28'] - pg.get('views28', 0),
                rivals=rival_moves[:8], positions=sorted(qmoves, key=lambda m: m['now'] - m['was'])[:8])


# ---------- output ----------

def card_md(card):
    d, g = card['change'], card['google']
    sign = lambda n: f'+{n:,}' if n > 0 else f'{n:,}'
    L = [f'# Site check: {card["name"]}', '',
         f'**{card["grade"]} · {card["score"]}/100** · scanned {card["scannedAt"][:16].replace("T", " ")} UTC · {card["pages"]} pages · next scan {card["nextDue"]} ({card["stageWhy"]}, every {card["cadenceDays"]} days)', '']
    if not d.get('first'):
        L += [f'**Since {d["since"][:10]}:** score {sign(d["score"])} · Google impressions (28 days) {sign(d["impr28"])} · clicks {sign(d["clicks28"])} · visits {sign(d["views28"])}'
              + (f' · new issues {len(d["newIssues"])}' if d['newIssues'] else '') + (f' · fixed {len(d["fixed"])}' if d['fixed'] else ''), '']
    else:
        L += ['First scan: next time this shows what changed.', '']
    L += ['## Top 5 fixes', '']
    for i, f in enumerate(card['findings'][:5], 1):
        L.append(f'{i}. **{f["title"]}** ({f["severity"]}, impact {f["impact"]}). {f["fix"]}' + (f' Pages: {", ".join(f["pages"][:4])}' if f['pages'] else '') + (f'. {f["detail"]}' if f['detail'] else ''))
    if not card['findings']: L.append('Nothing to fix. 🎉')
    L += ['', '## Report card', '', '| Area | Grade | Score |', '|---|---|---:|']
    L += [f'| {a["label"]} | {a["grade"] or "—"} | {a["score"] if a["score"] is not None else "not checked"} |' for a in card['areas'].values()]
    L += ['', '## Google', '', f'- Last 7 days: {g["impr7"]:,} impressions ({sign(g["impr7"] - g["imprPrev7"])}), {g["clicks7"]} clicks ({sign(g["clicks7"] - g["clicksPrev7"])}). 28 days: {g["impr28"]:,} impressions, {g["clicks28"]} clicks, {g["views28"]:,} visits. Search Console data to {g["gscTo"]}.']
    for r in (card.get('live') or {}).get('serps') or []:
        if r.get('error'): L.append(f'- "{r["keyword"]}": check failed ({r["error"][:80]})'); continue
        L.append(f'- "{r["keyword"]}" ({r.get("impressions", 0)} impressions, Search Console avg {r.get("gscPosition") or "—"}): us {"#" + str(r["ourRank"]) if r.get("ourRank") else "not in top 10"}. Top 5: ' + ', '.join(f'{t["rank"]}. {t["domain"]}' for t in (r.get('top') or [])[:5]))
    if not d.get('first') and (d['rivals'] or d['positions'] or d['newIssues'] or d['fixed']):
        L += ['', '## What changed', '']
        L += [f'- "{m["keyword"]}": ' + ' · '.join(x for x in [('new in top 5: ' + ', '.join(m['new'])) if m['new'] else '', ('dropped out: ' + ', '.join(m['dropped'])) if m['dropped'] else '',
              (f'us {m["ours"][0] or "—"} → {m["ours"][1] or "—"}') if m['ours'] else ''] if x) for m in d['rivals']]
        L += [f'- "{m["query"]}": position {m["was"]} → {m["now"]}' for m in d['positions']]
        L += [f'- New: {t}' for t in d['newIssues'][:6]] + [f'- Fixed: {t}' for t in d['fixed'][:6]]
    sp = [s for s in card['speed'] if not s.get('error')]
    if sp: L += ['', '## Speed (phones)', ''] + [(f'- {urllib.parse.urlsplit(s["url"]).path or "/"}: PageSpeed unavailable ({s.get("psiError", "")[:40]}), own check: arrived in {s["serverSecs"]}s, HTML {s["htmlKb"]} KB, '
                                                  f'images {s["imageKb"]:,} KB (first 15), {s["blocking"]} blocking files, {s["noDims"]} images without size') if s.get('lite') else
                                                 f'- {urllib.parse.urlsplit(s["url"]).path or "/"}: score {s["score"]}, LCP {s["lcp"]}s, CLS {s["cls"]}, blocking {s["tbt"]} ms' for s in sp]
    L += ['', '## All findings', '', '| # | Area | Severity | Impact | Finding |', '|---:|---|---|---:|---|']
    L += [f'| {i} | {f["area"]} | {f["severity"]} | {f["impact"]} | {f["title"]} |' for i, f in enumerate(card['findings'], 1)]
    L += ['', f'Links: {card["links"]["internal"]} internal, {card["links"]["outside"]} outside ({card["links"]["checkedOutside"]} checked; {card["links"]["unsureOutside"]} block robots, not counted). '
          f'Affiliate links tagged correctly: {card["affiliateOk"]}. Live Google check cost US${card.get("costUsd", 0):.3f}.', '',
          f'_Made by scripts/sitecheck/run.py. Check a page yourself: `scripts/claude/probe.sh "<url>"`. Rules: hq/sitecheck.json._']
    return '\n'.join(L) + '\n'


def issue_sync(card, enabled):
    """One GitHub issue per site for anything broken; closes itself when the next scan is clean."""
    if not enabled or not os.environ.get('GH_TOKEN'): return None
    broken = [f for f in card['findings'] if f['broken']]
    title = f'Site check: {card["name"]} has something broken'
    try:
        subprocess.run(['gh', 'label', 'create', 'sitecheck', '--color', 'D93F0B', '--description', 'Site check report card'], capture_output=True)
        found = subprocess.run(['gh', 'issue', 'list', '--label', 'sitecheck', '--state', 'open', '--search', f'in:title "{card["name"]}"', '--json', 'number,title'], capture_output=True, text=True).stdout
        num = next((i['number'] for i in json.loads(found or '[]') if i['title'] == title), None)
        if broken:
            body = '\n'.join([f'Site check {card["scannedAt"][:10]} found {len(broken)} broken thing(s) on {card["url"]}:', ''] +
                             [f'- **{f["title"]}**. {f["fix"]}' + (f' Pages: {", ".join(f["pages"][:5])}' if f['pages'] else '') + (f'\n  {f["detail"]}' if f['detail'] else '') for f in broken] +
                             ['', f'Full card: hq/reports/sitecheck/{card["id"]}.md · IMN HQ → Site check. This issue closes itself after a clean scan.'])
            if num: subprocess.run(['gh', 'issue', 'comment', str(num), '--body', body], capture_output=True)
            else: subprocess.run(['gh', 'issue', 'create', '--title', title, '--label', 'sitecheck', '--body', body], capture_output=True)
            return 'open'
        if num:
            subprocess.run(['gh', 'issue', 'close', str(num), '--comment', f'Clean scan {card["scannedAt"][:10]} ✅'], capture_output=True)
            return 'closed'
    except Exception as e:
        print('issue sync failed:', e)
    return None


def scan(site, cfg, args, prev, stage, why, days):
    t0 = time.time()
    stats = rd(site['stats']) if site.get('stats') else None
    print(f'== {site["id"]}: crawling {site["url"]}', flush=True)
    c = crawl(site, cfg)
    facts, schema = [], {}
    for u, p in c['pages'].items():
        if p['code'] != 200: continue
        f = page_facts(u, p['body'], c['base'])
        facts.append(f)
        schema[u] = schema_check(p['body'])
    print(f'   {len(c["urls"])} sitemap URLs, {len(facts)} loaded; checking links', flush=True)
    links = check_links(c, cfg)
    aff_ok, aff_bad = affiliate_check(c, cfg)
    quality = run_quality(c, site.get('brand', site['id']))
    trend = google_trend(stats)
    tm = traffic_map(stats)
    busiest = sorted((f['url'] for f in facts), key=lambda u: -tm.get(urllib.parse.urlsplit(u).path.rstrip('/') or '/', 0))
    speed = []
    if not args.no_speed:
        for u in list(dict.fromkeys([c['base'] + '/'] + [b for b in busiest if b.rstrip('/') != c['base']][:1])):
            r = pagespeed(u)
            if r.get('error'):
                pg = c['pages'].get(u) or c['pages'].get(u.rstrip('/')) or {}
                r = {**speed_lite(u, pg.get('body', ''), pg.get('secs', 0)), 'psiError': r['error']}
            speed.append(r)
    kws = pick_keywords(stats, cfg['keywordsPerSite'])
    live = None
    if not args.no_live and (kws or busiest):
        inspect = list(dict.fromkeys([c['base'] + '/'] + busiest))[:cfg['inspectPerSite']]
        print(f'   live Google check: {len(kws)} searches, {len(inspect)} pages', flush=True)
        live = live_google(site, [q['query'] for q in kws], inspect if site.get('gsc') else [])
        host = urllib.parse.urlsplit(c['base']).netloc.replace('www.', '')
        for r in live.get('serps') or []:
            q = next((x for x in kws if x['query'] == r['keyword']), {})
            r['impressions'], r['gscPosition'] = q.get('impressions', 0), round(q['position'], 1) if q.get('position') else None
            r['ourPage'] = q.get('page')
            mine = next((t for t in r.get('top') or [] if t['domain'].replace('www.', '') == host), None)
            r['ourRank'] = mine['rank'] if mine else None
    F = build_findings(site, c, links, aff_bad, schema, quality, facts, speed, trend, live, stats, prev)
    overall, letter, areas = grades(F, links, quality, speed, trend, live, len(facts))
    card = dict(id=site['id'], name=site['name'], url=site['url'], owner=site.get('owner', 'imn'), scannedAt=NOW.strftime('%Y-%m-%dT%H:%M:%SZ'),
                stage=stage, stageWhy=why, cadenceDays=days, nextDue=(TODAY + timedelta(days=days)).isoformat(),
                score=overall, grade=letter, areas=areas, pages=len(facts), findings=F[:60], google=trend,
                queries=[dict(query=q['query'], position=q['position'], impressions=q['impressions']) for q in ((stats or {}).get('queries') or [])[:50]],
                live=dict(serps=(live or {}).get('serps') or [], index=(live or {}).get('index') or [], error=(live or {}).get('error')) if live else None,
                costUsd=(live or {}).get('costUsd', 0) or 0, speed=speed, quality=dict(summary=quality['summary'], thin=quality.get('thin', 0), near=quality.get('near', 0)),
                links=dict(internal=links['internal'], outside=links['outside'], checkedOutside=links['checked_out'], unsureOutside=len(links['unsure_outside'])),
                affiliateOk=aff_ok, secs=round(time.time() - t0))
    card['change'] = diff(card, prev)
    hist = (prev or {}).get('history', []) + ([dict(at=prev['scannedAt'], score=prev['score'], grade=prev['grade'], impr28=prev['google']['impr28'], clicks28=prev['google']['clicks28'])] if prev else [])
    card['history'] = hist[-12:]
    return card


def top_fixes(card):
    """Top 5 fixes for IMN HQ's home screen notifications (each opens a prefilled Claude chat)."""
    return [dict(id=f['id'], title=f['title'], severity=f['severity'], area=f['area'], fix=f['fix'], pages=f['pages'][:4], detail=f['detail'][:200], broken=f['broken'])
            for f in card['findings'][:5]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--site'); ap.add_argument('--plan', action='store_true'); ap.add_argument('--no-live', action='store_true')
    ap.add_argument('--no-speed', action='store_true'); ap.add_argument('--no-issues', action='store_true'); ap.add_argument('--out', default='hq/sitecheck')
    args = ap.parse_args()
    cfg, finance, portfolio = rd(os.environ.get('SITECHECK_CONFIG', 'hq/sitecheck.json')), rd('hq/finance.json', {}), rd('hq/portfolio.json', {})
    out_dir = args.out if os.path.isabs(args.out) else os.path.join(ROOT, args.out)
    index = rd(os.path.join(out_dir, 'index.json'), None) or {'sites': {}}
    plan = []
    for site in cfg['sites']:
        prev = rd(os.path.join(out_dir, f'{site["id"]}.json'))
        stage, why = stage_of(site, finance, portfolio, rd(site['stats']) if site.get('stats') else None)
        days = cadence(cfg, stage)
        last = date.fromisoformat(prev['scannedAt'][:10]) if prev else None
        due = last is None or (TODAY - last).days >= days
        plan.append((site, prev, stage, why, days, due, last))
    if args.site and args.site != 'all': todo = [p for p in plan if p[0]['id'] == args.site]
    elif args.site == 'all': todo = plan
    else: todo = sorted([p for p in plan if p[5]], key=lambda p: p[6] or date.min)[:cfg['maxSitesPerDay']]
    for site, prev, stage, why, days, due, last in plan:
        print(f'{site["id"]:20} {stage:10} every {days:2}d  last {last or "never"}  {"DUE" if due else ""}  {"→ scanning" if any(t[0] is site for t in todo) else ""}')
    if args.plan: return
    done = []
    for site, prev, stage, why, days, due, last in todo:
        try:
            card = scan(site, cfg, args, prev, stage, why, days)
        except Exception as e:
            print(f'!! {site["id"]} failed: {e}')
            import traceback; traceback.print_exc()
            continue
        card['issue'] = issue_sync(card, not args.no_issues and site.get('owner') != 'client')
        wr(os.path.join(out_dir, f'{site["id"]}.json'), card)
        md_path = os.path.join(out_dir, 'reports', f'{site["id"]}.md') if site.get('owner') == 'client' else os.path.join(ROOT, 'hq/reports/sitecheck', f'{site["id"]}.md')
        wr(md_path, card_md(card))
        top = card['findings'][0] if card['findings'] else None
        index['sites'][site['id']] = dict(name=card['name'], url=card['url'], owner=card['owner'], scannedAt=card['scannedAt'], score=card['score'], grade=card['grade'],
                                          change=card['change'].get('score'), first=card['change'].get('first', False), stage=stage, cadenceDays=days, nextDue=card['nextDue'],
                                          topFix=top['title'] if top else None, broken=sum(1 for f in card['findings'] if f['broken']), newIssues=len(card['change'].get('newIssues', [])),
                                          fixed=len(card['change'].get('fixed', [])), costUsd=card['costUsd'],
                                          top=top_fixes(card))
        done.append(card)
        print(f'   {card["grade"]} {card["score"]}/100, {len(card["findings"])} findings, top: {top["title"] if top else "-"} ({card["secs"]}s, US${card["costUsd"]:.3f})', flush=True)
    for site, prev, stage, why, days, due, last in plan:  # keep next-due dates current for sites not scanned today
        e = index['sites'].get(site['id'])
        if e and not any(d['id'] == site['id'] for d in done):
            e['stage'], e['cadenceDays'] = stage, days
            e['nextDue'] = (date.fromisoformat(e['scannedAt'][:10]) + timedelta(days=days)).isoformat()
    index['updated'] = NOW.strftime('%Y-%m-%dT%H:%M:%SZ')
    index['lastRun'] = dict(at=index['updated'], scanned=[d['id'] for d in done])
    wr(os.path.join(out_dir, 'index.json'), index)
    summary = ' · '.join(f'{d["name"]} {d["grade"]} {d["score"]}' + (f' ({d["change"]["score"]:+d})' if not d['change'].get('first') else ' (first)') for d in done) or 'nothing due today'
    print('SUMMARY:', summary)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as f:
            f.write('# Site check\n\n' + summary + '\n\n')
            for d in done: f.write(card_md(d) + '\n---\n')
    open(os.path.join(ROOT, 'sitecheck-summary.txt'), 'w').write(summary)


if __name__ == '__main__':
    main()
