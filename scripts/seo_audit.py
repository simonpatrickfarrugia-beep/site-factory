"""Live SEO audit: crawls a site's sitemap and checks each page's basics.
Usage: python3 scripts/seo_audit.py https://example.com  -> writes seo.md"""
import html, json, re, sys, urllib.request
from collections import Counter

base = sys.argv[1].rstrip('/')
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={'user-agent': 'site-factory-seo-audit/1'}), timeout=30).read().decode('utf8', 'replace')
robots = get(base + '/robots.txt')
urls = re.findall(r'<loc>(.*?)</loc>', get(base + '/sitemap.xml'))
import random
random.seed(1)
if len(urls) > 25: urls = urls[:5] + random.sample(urls[5:], 20)
rows, issues, titles, descs = [], [], Counter(), Counter()
for u in urls:
    s = get(u)
    t = html.unescape((re.search(r'<title>(.*?)</title>', s, re.S) or [None, ''])[1].strip())
    d = html.unescape((re.search(r'<meta name="description" content="([^"]*)"', s) or [None, ''])[1])
    canon = (re.search(r'<link rel="canonical" href="([^"]*)"', s) or [None, ''])[1]
    noindex = bool(re.search(r'name="robots" content="[^"]*noindex', s))
    h1 = re.findall(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    og = bool(re.search(r'property="og:image"', s))
    types = sorted({m for j in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S) for m in re.findall(r'"@type":"([A-Za-z]+)"', j)})
    main = re.search(r'<main[^>]*>(.*?)</main>', s, re.S)
    words = len(re.findall(r"[A-Za-z']+", re.sub(r'<[^>]+>', ' ', main.group(1) if main else '')))
    internal = len(set(re.findall(r'href="(/[^"#]*)"', s)))
    ga4 = (re.search(r'gtag/js\?id=(G-[A-Z0-9]+)', s) or [None, ''])[1]
    ctas = len(re.findall(r'data-cta="', s))
    sponsored = len(re.findall(r'rel="[^"]*sponsored', s))
    titles[t] += 1; descs[d] += 1
    path = u.replace(base, '') or '/'
    rows.append((path, len(t), len(d), len(h1), og, words, internal, ','.join(types), ga4 or 'none', ctas, sponsored))
    if not ga4: issues.append(f'{path}: no GA4 tag (visits not counted)')
    if not (30 <= len(t) <= 65): issues.append(f'{path}: title {len(t)} chars (aim 30-65): "{t}"')
    if not (70 <= len(d) <= 160): issues.append(f'{path}: description {len(d)} chars (aim 70-160)')
    if canon.rstrip('/') != u.rstrip('/'): issues.append(f'{path}: canonical {canon} != {u}')
    if noindex: issues.append(f'{path}: noindex but in sitemap')
    if len(h1) != 1: issues.append(f'{path}: {len(h1)} H1 tags')
    if not og: issues.append(f'{path}: no og:image (plain link previews when shared)')
    if words < 250: issues.append(f'{path}: {words} words of content (thin for ranking)')
for t, n in titles.items():
    if n > 1: issues.append(f'{n} pages share the title "{t}"')
md = [f'# SEO audit: {base}', '', f'robots.txt allows crawling: {"Disallow: /" not in robots.replace("Disallow: /hq/", "")}; sitemap URLs: {len(urls)}', '',
      '| Page | Title len | Desc len | H1s | og:image | Words | Internal links | Schema | GA4 | CTA links | Sponsored |', '|---|---:|---:|---:|---|---:|---:|---|---|---:|---:|']
md += [f'| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {"yes" if r[4] else "no"} | {r[5]} | {r[6]} | {r[7]} | {r[8]} | {r[9]} | {r[10]} |' for r in rows]
md += ['', '## Issues', ''] + [f'- {i}' for i in issues] + ([] if issues else ['None'])
open('seo.md', 'w').write('\n'.join(md) + '\n')
print('\n'.join(md))
