"""Fetch live pages and report what is actually on them (Claude's eyes on the live sites).

Usage: python3 scripts/probe.py "<url> [<url> ...]" ["<regex to find>"]
Writes probe.md. For each URL: status, redirects, final URL, size, title, description, canonical,
robots, GA4 tag, live build version, every call-to-action button (data-cta) with its text,
and up to 10 matches of the optional pattern (searched in the visible text and in the raw HTML).
"""
import html as htmllib, re, sys, time, urllib.error, urllib.parse, urllib.request

UA = 'Mozilla/5.0 (site-factory-probe; +https://github.com/simonpatrickfarrugia-beep/site-factory)'
urls = [u for u in re.split(r'[\s,]+', sys.argv[1].strip()) if u]
pattern = sys.argv[2].strip() if len(sys.argv) > 2 else ''
md = [f'# Probe {time.strftime("%Y-%m-%d %H:%M", time.gmtime())} UTC', '']


class Redirects(urllib.request.HTTPRedirectHandler):
    def __init__(self): self.chain = []
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.chain.append(f'{code} → {newurl}')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(url):
    h = Redirects()
    op = urllib.request.build_opener(h)
    t = time.time()
    try:
        r = op.open(urllib.request.Request(url, headers={'user-agent': UA}), timeout=30)
        code, final, body, hdrs = r.status, r.geturl(), r.read(), r.headers
    except urllib.error.HTTPError as e:
        code, final, body, hdrs = e.code, url, e.read(), e.headers
    return code, final, body.decode('utf-8', 'replace'), hdrs, h.chain, time.time() - t


def text_of(s):
    s = re.sub(r'(?is)<(script|style|noscript)\b.*?</\1>', ' ', s)
    s = re.sub(r'(?s)<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', htmllib.unescape(s)).strip()


def first(rx, s):
    m = re.search(rx, s, re.I | re.S)
    return htmllib.unescape(m.group(1)).strip() if m else ''


versions = {}
for url in urls:
    if not url.startswith('http'): url = 'https://' + url
    try:
        code, final, s, hdrs, chain, secs = fetch(url)
    except Exception as e:
        md += [f'## {url}', '', f'- ❌ unreachable: {str(e)[:200]}', '']
        continue
    host = urllib.parse.urlsplit(final)
    root = f'{host.scheme}://{host.netloc}'
    if root not in versions:
        try:
            _, _, v, _, _, _ = fetch(root + '/version.txt')
            versions[root] = v.split()[0][:7] if v.strip() and '<' not in v[:20] else 'n/a'
        except Exception:
            versions[root] = 'n/a'
    md += [f'## {url}', '']
    md.append(f'- **HTTP {code}** in {secs:.1f}s, {len(s):,} bytes' + (f' · redirects: {" ; ".join(chain)}' if chain else ''))
    if final != url: md.append(f'- Final URL: {final}')
    md.append(f'- Live build: `{versions[root]}` · cache: {hdrs.get("cf-cache-status", "-")}')
    title = first(r'<title[^>]*>(.*?)</title>', s)
    canon = first(r'<link\s+rel="canonical"\s+href="([^"]*)"', s) or 'none'
    robots = first(r'<meta\s+name="robots"\s+content="([^"]*)"', s) or 'default'
    h1 = text_of(first(r'<h1[^>]*>(.*?)</h1>', s))
    ga4 = first(r'gtag/js\?id=(G-[A-Z0-9]+)', s) or '❌ none'
    words = len(text_of(s).split())
    md.append(f'- Title ({len(title)}): {title}')
    d = first(r'<meta\s+name="description"\s+content="([^"]*)"', s)
    md.append(f'- Description ({len(d)}): {d}')
    md.append(f'- Canonical: {canon} · robots: {robots}')
    md.append(f'- H1: {h1}')
    md.append(f'- GA4: {ga4} · words: {words:,}')
    ctas = re.findall(r'<a\b([^>]*data-cta="([^"]+)"[^>]*)>(.*?)</a>', s, re.S)
    if ctas:
        seen = {}
        for attrs, name, inner in ctas:
            label = text_of(inner)
            key = (name, label)
            seen[key] = seen.get(key, 0) + 1
        md.append('- Buttons (data-cta → text × count): ' + ' · '.join(f'`{n}` "{l}" ×{c}' for (n, l), c in seen.items()))
        spons = sum('sponsored' in a for a, _, _ in ctas)
        md.append(f'- Sponsored links: {spons}')
    if pattern:
        txt = text_of(s)
        hits = [m for m in re.finditer(pattern, txt, re.I)][:10]
        raw = [m for m in re.finditer(pattern, s, re.I)][:5] if not hits else []
        if hits:
            md.append(f'- Matches for `{pattern}` in visible text ({len(re.findall(pattern, txt, re.I))}):')
            md += [f'  - …{txt[max(0, m.start() - 70):m.end() + 70]}…' for m in hits]
        elif raw:
            md.append(f'- Matches for `{pattern}` only in raw HTML:')
            md += [f'  - `{s[max(0, m.start() - 80):m.end() + 80].replace("`", "")}`' for m in raw]
        else:
            md.append(f'- ❌ No match for `{pattern}`')
    md.append('')

open('probe.md', 'w').write('\n'.join(md) + '\n')
print('\n'.join(md))
