"""
Vic Tours photos from Wikipedia / Wikimedia Commons (free licences, credited on the page).
  towns:  the lead image of the town's English Wikipedia article ("<Town>, Victoria" first)
  places: the Wikidata image (P18) of places that carry a wikidata tag in OpenStreetMap
Writes data/vic/photos.json. Images are hot-linked from upload.wikimedia.org thumbnails, as Wikimedia allows.
"""
import json, re, time, urllib.parse, urllib.request

UA = 'VicToursBot/1.0 (https://victours.com.au; photos for town guides)'
OUT = 'data/vic/photos.json'


def get(url, params):
    q = urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2})
    req = urllib.request.Request(f'{url}?{q}', headers={'User-Agent': UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:
            print('  retry', e)
            time.sleep(5 * (attempt + 1))
    return {}


def strip(html):
    return re.sub(r'<[^>]+>', '', html or '').strip()


def file_info(filename, width):
    d = get('https://commons.wikimedia.org/w/api.php', {
        'action': 'query', 'titles': f'File:{filename}', 'prop': 'imageinfo',
        'iiprop': 'url|extmetadata', 'iiurlwidth': width})
    pages = d.get('query', {}).get('pages', [])
    if not pages or 'imageinfo' not in pages[0]:
        return None
    ii = pages[0]['imageinfo'][0]
    meta = ii.get('extmetadata', {})
    lic = strip(meta.get('LicenseShortName', {}).get('value'))
    if not lic or 'fair use' in lic.lower():
        return None
    return {
        'url': ii.get('thumburl') or ii.get('url'),
        'width': ii.get('thumbwidth'),
        'height': ii.get('thumbheight'),
        'file': filename,
        'page': ii.get('descriptionurl'),
        'artist': strip(meta.get('Artist', {}).get('value'))[:80] or 'Unknown',
        'license': lic,
    }


def town_photo(name):
    for title in (f'{name}, Victoria', name):
        d = get('https://en.wikipedia.org/w/api.php', {'action': 'query', 'titles': title, 'prop': 'pageimages', 'piprop': 'name', 'redirects': 1})
        pages = d.get('query', {}).get('pages', [])
        if pages and pages[0].get('pageimage') and not pages[0].get('missing'):
            img = pages[0]['pageimage']
            if re.search(r'(map|locator|location|logo|flag|coat|seal)', img, re.I):
                continue
            info = file_info(img, 1200)
            if info:
                return info
    return None


def wikidata_images(qids):
    out = {}
    for i in range(0, len(qids), 50):
        d = get('https://www.wikidata.org/w/api.php', {'action': 'wbgetentities', 'ids': '|'.join(qids[i:i + 50]), 'props': 'claims'})
        for qid, ent in (d.get('entities') or {}).items():
            claims = (ent.get('claims') or {}).get('P18') or []
            if claims:
                out[qid] = claims[0]['mainsnak']['datavalue']['value']
        time.sleep(1)
    return out


def main():
    towns = [t for t in json.load(open('data/vic/towns.json')) if t.get('published')]
    places = json.load(open('data/vic/places.json'))
    try:
        old = json.load(open(OUT))
    except Exception:
        old = {'towns': {}, 'places': {}}
    res = {'towns': dict(old.get('towns', {})), 'places': dict(old.get('places', {}))}
    for t in towns:
        if t['slug'] in res['towns']:
            continue
        name = 'Melbourne' if t['slug'] == 'melbourne-cbd' else t['name']
        p = town_photo(name)
        if p:
            res['towns'][t['slug']] = p
        print(f"{t['name']}: {'photo' if p else 'none'}")
        time.sleep(1)
    wanted = {p['tags']['wikidata']: p['id'] for p in places if p['tags'].get('wikidata') and p['id'] not in res['places']}
    imgs = wikidata_images(sorted(wanted))
    for qid, filename in imgs.items():
        info = file_info(filename, 480)
        if info:
            res['places'][wanted[qid]] = info
        time.sleep(0.5)
    json.dump(res, open(OUT, 'w'), indent=1, ensure_ascii=False)
    print(f"::notice title=vic-photos::{len(res['towns'])} town photos, {len(res['places'])} place photos")


if __name__ == '__main__':
    main()
