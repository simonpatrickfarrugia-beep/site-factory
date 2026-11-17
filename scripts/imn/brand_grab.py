#!/usr/bin/env python3
"""Find a business's logo and brand colours from its own website, for an IMN preview (imn-preview skill, step 1).
Runs on a GitHub runner (chat can't reach outside sites): brand-grab workflow, input url. Prints results only; writes nothing.
Logo candidates: <img> whose class/id/alt/src says logo, header images, apple-touch-icon, og:image, icons.
Colours: dominant non-grey colours of the best logo, plus theme-color and the most used hex colours in its CSS."""
import collections, io, json, re, sys, urllib.parse, urllib.request
from PIL import Image

UA = {'User-Agent': 'Mozilla/5.0 (compatible; IMN-preview/1.0; +https://imnetwork.com.au)'}

def get(url, limit=3_000_000):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read(limit), r.headers.get('content-type', ''), r.geturl()

def hexc(rgb): return '#%02X%02X%02X' % rgb[:3]

def is_grey(rgb, tol=18):
    r, g, b = rgb[:3]
    return max(r, g, b) - min(r, g, b) < tol

def palette(img):
    img = img.convert('RGBA'); img.thumbnail((200, 200))
    px = [p for p in img.getdata() if p[3] > 200]
    if not px: return [], None
    lum = sum(0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2] for p in px) / len(px)
    q = collections.Counter((p[0] // 24 * 24 + 12, p[1] // 24 * 24 + 12, p[2] // 24 * 24 + 12) for p in px if not is_grey(p))
    total = len(px)
    out = [(hexc(c), round(n / total * 100)) for c, n in q.most_common(6) if n / total > 0.02]
    return out, lum

def main(site):
    if not site.startswith('http'): site = 'https://' + site
    html_b, _, final = get(site)
    html = html_b.decode('utf-8', 'replace')
    base = final
    cands = []
    def add(u, why):
        if not u or u.startswith('data:'): return
        u = urllib.parse.urljoin(base, u.strip())
        if u.startswith('https://') and u not in [c[0] for c in cands]: cands.append((u, why))
    for m in re.finditer(r'<img\b[^>]*>', html, re.I):
        tag = m.group(0)
        src = re.search(r'''(?:data-src|src)=["']([^"']+)''', tag, re.I)
        if src and re.search(r'logo', tag, re.I): add(src.group(1), 'img tagged logo')
    head = re.search(r'<header\b.*?</header>', html, re.I | re.S)
    if head:
        for s in re.findall(r'''<img[^>]+(?:data-src|src)=["']([^"']+)''', head.group(0), re.I)[:2]: add(s, 'header image')
    for rel, why in (('apple-touch-icon', 'apple-touch-icon'), ('icon', 'site icon')):
        for s in re.findall(r'''<link[^>]+rel=["'][^"']*%s[^"']*["'][^>]*href=["']([^"']+)''' % rel, html, re.I): add(s, why)
    og = re.search(r'''<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)''', html, re.I)
    if og: add(og.group(1), 'og:image (share image)')
    theme = re.search(r'''<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"']+)''', html, re.I)
    css_text = ' '.join(re.findall(r'<style[^>]*>(.*?)</style>', html, re.I | re.S))
    for href in re.findall(r'''<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)''', html, re.I)[:3]:
        try: css_text += get(urllib.parse.urljoin(base, href), 800_000)[0].decode('utf-8', 'replace')
        except Exception: pass
    hexes = collections.Counter(h.upper() if len(h) == 7 else ('#' + ''.join(c * 2 for c in h[1:])).upper() for h in re.findall(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b', css_text))
    css_top = [(h, n) for h, n in hexes.most_common(20) if not is_grey(tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)))][:6]
    results = []
    for u, why in cands[:8]:
        try:
            data, ctype, _ = get(u)
            if 'svg' in ctype or u.lower().endswith('.svg'):
                cols = collections.Counter(h.upper() for h in re.findall(r'#[0-9a-fA-F]{6}\b', data.decode('utf-8', 'replace')))
                results.append(dict(url=u, why=why, kind='svg', size=None, colours=[(h, n) for h, n in cols.most_common(5)], light=None)); continue
            img = Image.open(io.BytesIO(data))
            cols, lum = palette(img)
            results.append(dict(url=u, why=why, kind=img.format, size=img.size, colours=cols, light=(lum is not None and lum > 200)))
        except Exception as e:
            results.append(dict(url=u, why=why, error=str(e)[:80]))
    out = dict(site=final, themeColor=theme.group(1) if theme else None, cssColours=css_top, logos=results)
    print(json.dumps(out, indent=1))
    lines = [f"site: {final}", f"theme-color: {out['themeColor']}", 'css colours: ' + ', '.join(f'{h} ×{n}' for h, n in css_top)]
    for r in results:
        lines.append(f"logo? {r['url']} ({r.get('why')}; {r.get('kind')} {r.get('size')}{'; mostly light, needs dark background' if r.get('light') else ''}) colours: " + ', '.join(f'{h} {p}%' if isinstance(p, int) and p <= 100 else f'{h}' for h, p in (r.get('colours') or [])) + (f" ERROR {r['error']}" if r.get('error') else ''))
    print('::notice title=brand::' + '%0A'.join(l.replace('%', '%25') for l in lines)[:6000])

if __name__ == '__main__':
    main(sys.argv[1])
