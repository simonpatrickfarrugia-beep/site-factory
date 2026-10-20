"""Quality gate: checks every indexable page in dist/ after a build.

Hard fails (block the deploy check):
  - an indexable page with almost no content (< 30 words in <main>)
  - two indexable pages with identical main content
  - missing or duplicate <title>, missing meta description
Warnings (listed, don't block):
  - thin pages: fewer than 80 words that aren't shared template text (boilerplate = phrases on 50%+ of pages in the same section)
  - near-duplicates: any two pages sharing 85%+ of their 5-word phrases
Usage: python3 scripts/quality.py [dist]   (writes quality.md)
"""
import hashlib, html, os, re, sys
from collections import Counter, defaultdict

dist = sys.argv[1] if len(sys.argv) > 1 else 'dist'
brand = os.environ.get('BRAND', '?')
pages = []
for root, _, files in os.walk(dist):
    for f in files:
        if not f.endswith('.html') or f == '404.html': continue
        p = os.path.join(root, f)
        s = open(p, encoding='utf8').read()
        if re.search(r'<meta name="robots" content="[^"]*noindex', s): continue
        url = '/' + os.path.relpath(p, dist)[:-5].replace('index', '').rstrip('/')
        m = re.search(r'<main[^>]*>(.*?)</main>', s, re.S)
        body = m.group(1) if m else ''
        body = re.sub(r'<(script|style|svg|template)[^>]*>.*?</\1>', ' ', body, flags=re.S)
        text = html.unescape(re.sub(r'<[^>]+>', ' ', body))
        words = re.findall(r"[a-z0-9][a-z0-9'’-]*", text.lower())
        title = re.search(r'<title>(.*?)</title>', s, re.S)
        desc = re.search(r'<meta name="description" content="([^"]*)"', s)
        section = url.strip('/').split('/')[0] if url.count('/') > 1 else '(top level)'
        pages.append(dict(url=url or '/', words=words, title=(title.group(1).strip() if title else ''), desc=(desc.group(1).strip() if desc else ''), section=section))

fails, warns = [], []
# Hard rules
for p in pages:
    if len(p['words']) < 30: fails.append(f"{p['url']}: almost empty ({len(p['words'])} words)")
    if not p['title']: fails.append(f"{p['url']}: no <title>")
    if not p['desc']: fails.append(f"{p['url']}: no meta description")
for t, n in Counter(p['title'] for p in pages if p['title']).items():
    if n > 1: fails.append(f"{n} pages share the title \"{t[:70]}\": " + ', '.join(p['url'] for p in pages if p['title'] == t)[:200])
by_hash = defaultdict(list)
for p in pages: by_hash[hashlib.sha1(' '.join(p['words']).encode()).hexdigest()].append(p['url'])
for urls in by_hash.values():
    if len(urls) > 1: fails.append('Identical content: ' + ', '.join(urls[:5]))

# Thin and near-duplicate (within a section)
sh = lambda w: {' '.join(w[i:i + 5]) for i in range(max(0, len(w) - 4))}
groups = defaultdict(list)
for p in pages: p['sh'] = sh(p['words']); groups[p['section']].append(p)
thin, near = [], []
for sec, ps in groups.items():
    df = Counter(x for p in ps for x in p['sh'])
    cut = max(2, len(ps) * 0.5) if len(ps) >= 4 else 10**9
    for p in ps:
        p['unique'] = sum(1 for x in p['sh'] if df[x] < cut) if len(ps) >= 4 else len(p['words'])
        if p['unique'] < 80: thin.append(p)
# Near-duplicates anywhere on the site (pairs sharing 85%+ of their 5-word phrases)
if len(pages) <= 2000:
    for i in range(len(pages)):
        for j in range(i + 1, len(pages)):
            a, b = pages[i]['sh'], pages[j]['sh']
            if len(a) < 20 or len(b) < 20: continue
            sim = len(a & b) / min(len(a), len(b))
            if sim >= 0.85: near.append((sim, pages[i]['url'], pages[j]['url']))
thin.sort(key=lambda p: p['unique'])
near.sort(reverse=True)
if thin: warns.append(f"{len(thin)} thin page(s) (< 80 words of their own): " + ', '.join(f"{p['url']} ({p['unique']})" for p in thin[:12]))
if near: warns.append(f"{len(near)} near-duplicate pair(s): " + ', '.join(f"{a} ≈ {b} ({s:.0%})" for s, a, b in near[:8]))

avg = sum(p.get('unique', 0) for p in pages) / max(1, len(pages))
md = [f"## Quality gate ({brand})", '', f"{len(pages)} indexable pages · average {avg:.0f} words of their own per page · {len(thin)} thin · {len(near)} near-duplicate pairs · {len(fails)} hard fails", '']
md += [f"- ❌ {f}" for f in fails] + [f"- ⚠️ {w}" for w in warns]
out = '\n'.join(md) + '\n'
open('quality.md', 'w').write(out)
print(out)
esc = lambda s: s.replace('%', '%25').replace('\n', '%0A')
print(f"::notice title=Quality ({brand})::{len(pages)} pages, avg {avg:.0f} own words, {len(thin)} thin, {len(near)} near-dup pairs, {len(fails)} hard fails")
for w in warns: print(f"::warning title=Quality ({brand})::{esc(w[:900])}")
for f in fails[:20]: print(f"::error title=Quality ({brand})::{esc(f[:900])}")
sys.exit(1 if fails else 0)
