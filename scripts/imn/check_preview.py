#!/usr/bin/env python3
"""Validate an IMN preview JSON (src/worker/preview.ts PreviewData) before it goes into D1 `previews`.
Usage: python3 -I scripts/imn/check_preview.py /tmp/preview.json   (keep the file outside the repo: it holds client details)."""
import json, re, sys

def main(path):
    d = json.load(open(path))
    errs, warns = [], []
    b = d.get('business') or {}
    for k in ('name', 'trade', 'tagline'):
        if not str(b.get(k, '')).strip(): errs.append(f'business.{k} is required')
    if not isinstance(b.get('areas'), list): errs.append('business.areas must be a list')
    if not b.get('phone') and not b.get('email'): warns.append('no phone or email: the site has no way to contact them')
    lic = b.get('licence')
    if lic and not (lic.get('label') and lic.get('number')): errs.append('licence needs label and number (or leave it out)')
    for k in ('reviewsUrl', 'facebookUrl'):
        if b.get(k) and not str(b[k]).startswith('https://'): errs.append(f'business.{k} must be https')
    lg = b.get('logo')
    if lg and not str(lg.get('src', '')).startswith('https://'): errs.append('business.logo.src must be https (their own file)')
    if not lg: warns.append('no logo: say "send us your logo" in the reply')
    if not (d.get('colors') or {}).get('brand'): warns.append('no brand colour: the preview uses neutral navy')
    s = d.get('services') or []
    if len(s) < 2: errs.append('at least 2 services')
    for x in s:
        if not (x.get('t') and x.get('d')): errs.append('each service needs t and d')
    for p in d.get('photos') or []:
        if not str(p.get('src', '')).startswith('https://'): errs.append(f"photo not https: {p.get('src')}")
        if not p.get('alt'): errs.append('every photo needs alt text')
    for k in ('brand', 'accent'):
        v = (d.get('colors') or {}).get(k)
        if v and not re.fullmatch(r'#[0-9a-fA-F]{6}', v): errs.append(f'colors.{k} must be #rrggbb')
    r = d.get('research') or {}
    if not r.get('checked'): errs.append('research.checked (date) is required')
    if not r.get('found'): warns.append('research.found is empty: say what you noticed')
    for q in r.get('searches') or []:
        if not isinstance(q.get('volume'), int) or q['volume'] <= 0: errs.append(f"search '{q.get('q')}' needs a real volume > 0 (drop zero rows)")
    if not r.get('searches'): warns.append('no searches: the calculated part is missing')
    if len(r.get('competitors') or []) > 5: warns.append('more than 5 competitors: keep it to 3')
    if not r.get('built'): errs.append('research.built: say what you built and why')
    if not d.get('sample') and not r.get('sources'): errs.append('research.sources: list the pages the details came from')
    for w in warns: print('warn:', w)
    for e in errs: print('ERROR:', e)
    print('ok' if not errs else f'{len(errs)} error(s)')
    sys.exit(1 if errs else 0)

if __name__ == '__main__':
    main(sys.argv[1])
