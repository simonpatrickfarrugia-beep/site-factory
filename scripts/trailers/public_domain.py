#!/usr/bin/env python3
"""
Public domain films for movietrailer.channel: find candidates and check the ones we publish.

Every film on /watch must be in the public domain in the United States. The build enforces the rules in the data
(brands/trailers/public-domain.ts); this script checks them against outside sources, so nothing rests on memory:

  find   For each title/year in the input, look up Wikidata (earliest publication date, country, Internet Archive ID),
         whether Wikipedia's "List of films in the public domain in the United States" names it, and the most-used
         Internet Archive copies with red flags (restored, colorized, new score, narration, trailer, clip).
         Usage: public_domain.py find "Nosferatu|1922;Metropolis|1927"   → public-domain-find.json + .md
  check  Re-checks every film in data/trailers/public-domain.json: Wikidata year (and US origin for lapsed films),
         the Wikipedia list (lapsed films), and that the Archive copy still exists, is the right film at the right
         length and has no new red flags. Writes public-domain-check.md and exits 1 if anything needs a human.

Standard library only. Runs in GitHub Actions (chat sessions can't reach these sites).
"""
import json, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

UA = {'user-agent': 'site-factory-public-domain/1 (movietrailer.channel; hello@movietrailer.channel)'}
WIKI_LIST = 'List_of_films_in_the_public_domain_in_the_United_States'
# Words in an Archive copy's title or description that mean it may not be the plain original. A film can carry an
# accepted flag (audit.acceptedFlags) once a human has checked it, e.g. "music by" for a film's own original score.
RED_FLAGS = ['restored', 'restoration', 'remaster', 'coloriz', 'colouriz', 'new score', 'score by', 'music by',
             'soundtrack', 'narrat', 'trailer', 'clip', 'excerpt', 'edited', 're-edit', 'abridged', 'dubbed',
             'redux', 'hd upscale', 'upscaled', 'ai ', '4k', 'mst3k', 'rifftrax', 'riff', 'parody', 'fan edit']
VIDEO_FORMATS = ('MPEG4', 'h.264', 'Ogg Video', '512Kb MPEG4', 'h.264 IA', 'Matroska', 'MPEG2')


def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            if i == tries - 1:
                raise
            time.sleep(3 * (i + 1))


def jget(url):
    return json.loads(get(url))


def norm(s):
    s = re.sub(r'[^a-z0-9 ]', ' ', (s or '').lower().replace('&', 'and'))
    s = re.sub(r'\b(the|a|an)\b', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


# ---------- Wikidata ----------
FILM_TYPES = {'Q11424', 'Q24869', 'Q506240', 'Q202866', 'Q226730', 'Q24862', 'Q17013749', 'Q93204', 'Q20667187'}


def wd_entities(ids):
    if not ids:
        return {}
    url = 'https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode(
        {'action': 'wbgetentities', 'ids': '|'.join(ids), 'props': 'claims|labels|sitelinks|descriptions', 'languages': 'en', 'format': 'json'})
    return jget(url).get('entities', {})


def claim_values(ent, prop):
    out = []
    for c in ent.get('claims', {}).get(prop, []):
        v = c.get('mainsnak', {}).get('datavalue', {}).get('value')
        if v is not None:
            out.append(v)
    return out


def earliest_year(ent):
    years = []
    for v in claim_values(ent, 'P577'):
        m = re.match(r'[+-](\d{4})', v.get('time', ''))
        if m:
            years.append(int(m.group(1)))
    return min(years) if years else None


def wikidata_film(title, year, qid=None):
    if qid:
        ents = wd_entities([qid])
    else:
        url = 'https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode(
            {'action': 'wbsearchentities', 'search': title, 'language': 'en', 'type': 'item', 'limit': 15, 'format': 'json'})
        ids = [r['id'] for r in jget(url).get('search', [])]
        ents = wd_entities(ids)
    best = None
    for q, ent in ents.items():
        types = {v.get('id') for v in claim_values(ent, 'P31')}
        desc = ent.get('descriptions', {}).get('en', {}).get('value', '')
        if not (types & FILM_TYPES or 'film' in desc.lower()):
            continue
        y = earliest_year(ent)
        if qid is None and (y is None or abs(y - year) > 1):
            continue
        cand = {
            'qid': q,
            'label': ent.get('labels', {}).get('en', {}).get('value'),
            'description': desc,
            'year': y,
            'countries': [v.get('id') for v in claim_values(ent, 'P495')],
            'archiveIds': claim_values(ent, 'P724'),
            'sitelinks': len(ent.get('sitelinks', {})),
        }
        if best is None or cand['sitelinks'] > best['sitelinks']:
            best = cand
    return best


# ---------- Wikipedia list ----------
_wiki_list = None


def on_wikipedia_list(title, year):
    """True if the US public domain films list has a row naming this title with this year."""
    global _wiki_list
    if _wiki_list is None:
        _wiki_list = get(f'https://en.wikipedia.org/w/index.php?title={WIKI_LIST}&action=raw')
    t = norm(title)
    for line in _wiki_list.split('\n|-'):
        if str(year) in line and t and t in norm(re.sub(r'\[\[([^|\]]*\|)?([^\]]*)\]\]', r'\2', line)):
            return True
    return False


# ---------- Internet Archive ----------
def archive_meta(identifier):
    return jget(f'https://archive.org/metadata/{urllib.parse.quote(identifier)}')


def runtime_minutes(meta):
    md = meta.get('metadata', {})
    rt = md.get('runtime')
    if isinstance(rt, list):
        rt = rt[0]
    if rt:
        parts = [float(p) for p in re.findall(r'[\d.]+', str(rt))]
        if ':' in str(rt) and len(parts) >= 2:
            return round(parts[-3] * 60 + parts[-2] + parts[-1] / 60) if len(parts) >= 3 else round(parts[0] + parts[1] / 60)
        if parts:
            v = parts[0]
            return round(v / 60) if v > 400 else round(v)  # seconds vs minutes
    longest = 0.0
    for f in meta.get('files', []):
        try:
            longest = max(longest, float(f.get('length') or 0))
        except ValueError:
            pass
    return round(longest / 60) if longest else None


def flags_in(text):
    t = ' ' + (text or '').lower() + ' '
    return sorted({w.strip() for w in RED_FLAGS if w in t})


def describe_item(identifier):
    meta = archive_meta(identifier)
    if not meta or 'metadata' not in meta:
        return {'id': identifier, 'exists': False}
    md = meta['metadata']
    text = ' '.join(str(md.get(k, '')) for k in ('title', 'description', 'subject'))
    files = meta.get('files', [])
    return {
        'id': identifier,
        'exists': True,
        'dark': bool(meta.get('is_dark')),
        'title': md.get('title'),
        'year': md.get('year') or md.get('date'),
        'runtime': runtime_minutes(meta),
        'license': md.get('licenseurl'),
        'collections': md.get('collection') if isinstance(md.get('collection'), list) else [md.get('collection')],
        'video': any(f.get('format') in VIDEO_FORMATS for f in files),
        'downloads': meta.get('item', {}).get('downloads') if isinstance(meta.get('item'), dict) else None,
        'flags': flags_in(text),
    }


def archive_search(title, year, rows=6):
    q = f'title:("{title}") AND mediatype:(movies)'
    url = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode(
        [('q', q), ('fl[]', 'identifier'), ('fl[]', 'downloads'), ('sort[]', 'downloads desc'), ('rows', rows), ('output', 'json')])
    docs = jget(url).get('response', {}).get('docs', [])
    return [d['identifier'] for d in docs]


# ---------- modes ----------
def find(spec):
    out = []
    for part in [p for p in spec.split(';') if p.strip()]:
        title, year = [s.strip() for s in part.split('|')][:2]
        year = int(year)
        row = {'title': title, 'year': year}
        try:
            row['wikidata'] = wikidata_film(title, year)
        except Exception as e:  # noqa: BLE001
            row['wikidata'] = {'error': repr(e)[:200]}
        try:
            row['onWikipediaPdList'] = on_wikipedia_list(title, year)
        except Exception as e:  # noqa: BLE001
            row['onWikipediaPdList'] = repr(e)[:200]
        ids = list(dict.fromkeys(((row.get('wikidata') or {}).get('archiveIds') or []) + archive_search(title, year)))[:7]
        items = []
        for i in ids:
            try:
                items.append(describe_item(i))
            except Exception as e:  # noqa: BLE001
                items.append({'id': i, 'error': repr(e)[:200]})
        row['archive'] = items
        out.append(row)
        print(f'found {title} ({year}): wikidata={(row.get("wikidata") or {}).get("qid")} list={row["onWikipediaPdList"]} items={len(items)}', flush=True)
    json.dump(out, open('public-domain-find.json', 'w'), indent=1)
    lines = ['# Public domain finder', '']
    for r in out:
        wd = r.get('wikidata') or {}
        lines.append(f"## {r['title']} ({r['year']})  wd={wd.get('qid')} y={wd.get('year')} c={','.join(wd.get('countries') or [])} list={r['onWikipediaPdList']}")
        for it in r['archive']:
            if it.get('exists'):
                lines.append(f"- {it['id']} | {it.get('title')} | {it.get('year')} | {it.get('runtime')}m | dl={it.get('downloads')} | video={it.get('video')} | lic={it.get('license')} | flags={','.join(it['flags'])}")
            else:
                lines.append(f"- {it['id']} | {it.get('error') or 'missing'}")
        lines.append('')
    open('public-domain-find.md', 'w').write('\n'.join(lines))
    print('\n'.join(lines))


def us_cutoff_year(now=None):
    """Works first published in year Y enter the US public domain on 1 January of Y + 96 (95-year term).
    Uses the date in Hawaii, the last US state to reach 1 January, so nothing is released early."""
    now = now or datetime.now(timezone.utc)
    hawaii = now.timestamp() - 10 * 3600
    return datetime.fromtimestamp(hawaii, timezone.utc).year - 96


def check():
    films = json.load(open('data/trailers/public-domain.json'))
    cutoff = us_cutoff_year()
    problems, ok = [], []
    for f in films:
        if f.get('status') == 'removed':
            continue
        name = f"{f['name']} ({f['year']}) [{f.get('status')}]"
        bad = []
        try:
            wd = wikidata_film(f['name'], int(f['year']), f.get('wikidata'))
            if not wd:
                bad.append(f"Wikidata item {f.get('wikidata')} not found or not a film")
            else:
                tol = 0 if f['basis'] == 'term-expired' else 1  # lapsed films: release dates vary by a year between sources
                if wd['year'] is None or abs(wd['year'] - int(f['year'])) > tol:
                    bad.append(f"Wikidata says first published {wd['year']}, we say {f['year']}")
                if f['basis'] != 'term-expired' and 'Q30' not in (wd.get('countries') or []):
                    bad.append('lapsed-copyright film is not marked as made in the US on Wikidata (foreign films were restored in 1996)')
            if f['basis'] == 'term-expired' and int(f['year']) > cutoff:
                if f.get('status') not in ('held', 'pending'):
                    bad.append(f'published {f["year"]}, still in copyright in the US (cutoff {cutoff})')
            if f['basis'] != 'term-expired' and not on_wikipedia_list(f['name'], int(f['year'])):
                bad.append("not on Wikipedia's US public domain films list (check the cited evidence by hand)")
            for e in f.get('evidence', []):
                try:
                    get(e['url'], tries=2)
                except Exception as ex:  # noqa: BLE001
                    bad_link = f"evidence link broken: {e['url']} ({repr(ex)[:80]})"
                    bad.append(bad_link)
            it = describe_item(f['archiveId'])
            accepted = set((f.get('audit') or {}).get('acceptedFlags') or [])
            if not it.get('exists') or it.get('dark'):
                bad.append(f"Archive copy {f['archiveId']} is gone or dark")
            else:
                if not it.get('video'):
                    bad.append('Archive copy has no playable video file')
                new_flags = [x for x in it['flags'] if x not in accepted]
                if new_flags:
                    bad.append(f"Archive copy mentions: {', '.join(new_flags)} (check it's the plain original; then add to audit.acceptedFlags)")
                rt, want = it.get('runtime'), f.get('runtimeMinutes')
                if rt and want and abs(rt - want) > max(8, want * 0.15):
                    bad.append(f'Archive copy runs {rt} min, the film runs ~{want} min (wrong version or cut?)')
                lic = (it.get('license') or '').lower()
                if lic and 'publicdomain' not in lic:
                    bad.append(f'Archive copy carries a licence ({lic}): someone may claim rights in this version')
        except Exception as e:  # noqa: BLE001
            bad.append(f'check failed: {repr(e)[:200]}')
        (problems if bad else ok).append((name, bad))
    lines = [f'# Public domain films: rights check ({datetime.now(timezone.utc):%Y-%m-%d})', '',
             f'US cutoff: films first published in {cutoff} or earlier are out of copyright by age.', '',
             f'{len(ok)} films confirmed, {len(problems)} need a look.', '']
    for name, bad in problems:
        lines.append(f'- **{name}**')
        lines += [f'  - {b}' for b in bad]
    if problems:
        lines += ['', 'Until fixed: say "pull <film> from /watch" in the Site Factory chat (sets status "removed"), or fix the entry.']
    open('public-domain-check.md', 'w').write('\n'.join(lines) + '\n')
    print('\n'.join(lines))
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'check'
    find(sys.argv[2]) if mode == 'find' else check()
