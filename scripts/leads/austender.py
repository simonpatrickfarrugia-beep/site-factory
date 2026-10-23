"""
Outbound leads for business travel: SMEs that just won Australian Government contracts (AusTender open data, OCDS API,
no key). A company in one state winning work for an agency in another state will be flying. Scores each supplier
and writes a daily call list.

Writes: leads/latest.md (top call list, read by the 08:41 daily report), leads/austender.json (all scored suppliers),
        leads/seen.json (ABNs already listed, so the list stays fresh).
Usage:  python3 scripts/leads/austender.py [days=7]

Data: AusTender contract notices (CC BY). Company details only; we don't harvest personal contact details. Find the
right person (office manager, ops, finance, EA) yourself before calling.
"""
import json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

API = 'https://api.tenders.gov.au/ocds/findByDates/contractPublished/{start}/{end}'
UA = 'SiteFactory-leads/1.0 (Independent Media Network)'
DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 7
MIN_VALUE, MAX_VALUE = 50_000, 10_000_000
TOP = 15

# Not SME prospects: very large firms, government bodies, universities, and travel companies themselves.
BIG = re.compile(r'\b(deloitte|kpmg|pwc|pricewaterhouse|ernst|\bey\b|accenture|ibm|microsoft|oracle|telstra|optus|vodafone|qantas|virgin|'
                 r'leidos|lockheed|bae systems|boeing|thales|raytheon|northrop|cisco|dell|hewlett|\bhp\b|fujitsu|unisys|datacom|nttdata|ntt data|'
                 r'downer|serco|sodexo|compass group|ventia|lendlease|cpb|john holland|kbr|jacobs|aecom|ghd|wsp|arup|mckinsey|boston consulting|bain|'
                 r'gartner|amazon|google|salesforce|sap |servicenow|commonwealth bank|westpac|anz|nab|national australia bank|australia post|'
                 r'flight centre|corporate travel management|fcm|american express|amex|gbt|helloworld|travel)\b', re.I)
GOV = re.compile(r'\b(university|department|council|commonwealth|government|agency|authority|commission|tafe|csiro|hospital|health service|'
                 r'police|defence|army|navy|air force|minister|court|tribunal|ombudsman|institute of technology)\b', re.I)
TRAVEL_WORDS = re.compile(r'\b(national|nationwide|regional|remote|on-?site|site visit|travel|field|inspection|audit|training delivery|'
                          r'deliver training|workshops?|facilitat|install|maintenance|survey|assessment|evaluation|review|consult|advisory|'
                          r'project management|implementation|roll-?out|engagement|research)\b', re.I)
STATES = {'ACT': 'Canberra', 'NSW': 'NSW', 'VIC': 'Victoria', 'QLD': 'Queensland', 'SA': 'South Australia', 'WA': 'Western Australia', 'TAS': 'Tasmania', 'NT': 'Northern Territory'}


def get(url):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'}), timeout=60) as r:
                return json.load(r)
        except Exception as e:
            print(f'  retry {attempt + 1}: {str(e)[:100]}')
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f'AusTender unavailable: {url}')


def releases(days):
    end = datetime.now(timezone.utc).replace(microsecond=0)
    out = []
    for d in range(days):  # one request per day keeps responses small
        a, b = end - timedelta(days=d + 1), end - timedelta(days=d)
        url = API.format(start=a.strftime('%Y-%m-%dT%H:%M:%SZ'), end=b.strftime('%Y-%m-%dT%H:%M:%SZ'))
        pages = 0
        while url and pages < 20:
            data = get(url)
            out += data.get('releases', [])
            url = (data.get('links') or {}).get('next')
            pages += 1
    return out


def state_of(addr):
    r = (addr or {}).get('region', '').upper().strip()
    return r if r in STATES else None


def money(v):
    try:
        return float((v or {}).get('amount') or 0)
    except (TypeError, ValueError):
        return 0.0


def main():
    rels = releases(DAYS)
    print(f'{len(rels)} contract notices in the last {DAYS} days')
    sup = {}
    for r in rels:
        parties = r.get('parties', [])
        buyer = next((p for p in parties if 'procuringEntity' in p.get('roles', []) or 'buyer' in p.get('roles', [])), None) or r.get('buyer') or {}
        buyer_name = buyer.get('name') or (r.get('buyer') or {}).get('name') or 'an Australian Government agency'
        bstate = state_of(buyer.get('address'))
        for c in r.get('contracts', []) or [{}]:
            value = money(c.get('value'))
            desc = (c.get('description') or (r.get('tender') or {}).get('title') or (r.get('tender') or {}).get('description') or '').strip()
            cat = ' '.join(((i.get('classification') or {}).get('description') or '') for i in c.get('items', []) or [])
            for p in parties:
                if 'supplier' not in p.get('roles', []):
                    continue
                name = (p.get('name') or '').strip()
                abn = ((p.get('identifier') or {}).get('id') or '').replace(' ', '')
                if not name or BIG.search(name) or GOV.search(name):
                    continue
                s = sup.setdefault(abn or name.lower(), {'name': name, 'abn': abn, 'locality': (p.get('address') or {}).get('locality', '').title(),
                                                         'state': state_of(p.get('address')), 'contracts': []})
                s['contracts'].append({'value': value, 'buyer': buyer_name, 'buyerState': bstate, 'desc': desc[:180], 'category': cat[:120],
                                       'start': ((c.get('period') or {}).get('startDate') or '')[:10], 'end': ((c.get('period') or {}).get('endDate') or '')[:10],
                                       'id': c.get('id') or r.get('ocid')})
    try:
        seen = json.load(open('leads/seen.json'))
    except Exception:
        seen = {}
    scored = []
    for key, s in sup.items():
        total = sum(c['value'] for c in s['contracts'])
        if total < MIN_VALUE or total > MAX_VALUE:
            continue
        interstate = [c for c in s['contracts'] if c['buyerState'] and s['state'] and c['buyerState'] != s['state']]
        text = ' '.join(c['desc'] + ' ' + c['category'] for c in s['contracts'])
        months = 0
        for c in s['contracts']:
            try:
                months = max(months, (datetime.fromisoformat(c['end']) - datetime.fromisoformat(c['start'])).days / 30)
            except ValueError:
                pass
        score = 0.0
        score += 4 if interstate else 0
        score += 2 if TRAVEL_WORDS.search(text) else 0
        score += 2 if 100_000 <= total <= 3_000_000 else 1
        score += 1 if months >= 6 else 0
        score += min(len(s['contracts']) - 1, 3)
        score -= 3 if key in seen else 0
        why = []
        if interstate:
            c = max(interstate, key=lambda x: x['value'])
            why.append(f"based in {s['locality'] or STATES[s['state']]} {s['state']}, delivering for {c['buyer']} ({STATES.get(c['buyerState'], c['buyerState'])})")
        if len(s['contracts']) > 1:
            why.append(f"{len(s['contracts'])} new government contracts this week")
        if months >= 6:
            why.append(f'work runs {round(months)} months')
        scored.append({**s, 'total': round(total), 'score': round(score, 1), 'interstate': bool(interstate), 'why': why, 'seenBefore': key in seen})
    scored.sort(key=lambda x: (-x['score'], -x['total']))

    os.makedirs('leads', exist_ok=True)
    today = datetime.now(timezone(timedelta(hours=11))).strftime('%a %d %b %Y')
    md = [f'# Call list — {today}', '', f'_SMEs that won Australian Government contracts in the last {DAYS} days (AusTender). Interstate work = flights. '
          'Find the person who books travel (office manager, ops, finance, EA) before calling. Company details only; check the Do Not Call Register rules for any number you use._', '']
    for i, s in enumerate([x for x in scored if not x['seenBefore']][:TOP], 1):
        top = max(s['contracts'], key=lambda c: c['value'])
        where = f"{s['locality'] or ''} {s['state'] or ''}".strip()
        opener = (f"Congrats on the {top['buyer']} contract. With the team in {s['locality'] or STATES.get(s['state'], 'your home state')} and the work in "
                  f"{STATES.get(top['buyerState'], 'another state')}, who's looking after flights and accommodation for it?") if s['interstate'] else (
                  f"Congrats on the {top['buyer']} contract. Will the team be travelling to deliver it, and who books that travel today?")
        q = urllib.parse.quote_plus(s['name'])
        md += [f"**{i}. {s['name']}** — {where} · ${s['total']:,.0f} · score {s['score']}",
               f"- Why: {'; '.join(s['why']) or 'new government contract'}",
               f"- Work: {top['desc'] or top['category'] or 'see contract'}",
               f"- Opener: \"{opener}\"",
               f"- Find: [Google](https://www.google.com/search?q={q}) · [LinkedIn](https://www.linkedin.com/search/results/companies/?keywords={q})"
               + (f" · [ABN](https://abr.business.gov.au/ABN/View?abn={s['abn']})" if s['abn'] else ''), '']
    if not any(not x['seenBefore'] for x in scored):
        md.append('No new prospects this run.')
    open('leads/latest.md', 'w').write('\n'.join(md) + '\n')
    json.dump({'generatedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'days': DAYS, 'suppliers': scored[:300]}, open('leads/austender.json', 'w'), indent=1)
    for s in [x for x in scored if not x['seenBefore']][:TOP]:
        seen[s['abn'] or s['name'].lower()] = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    json.dump(seen, open('leads/seen.json', 'w'), indent=1, sort_keys=True)
    print(f"{len(scored)} SME suppliers scored; {sum(1 for x in scored if x['interstate'])} interstate")
    print('\n'.join(md[:40]))


if __name__ == '__main__':
    main()
