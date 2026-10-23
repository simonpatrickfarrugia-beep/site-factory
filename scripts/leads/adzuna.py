"""
Second lead source for business travel: Australian companies advertising jobs that involve regular travel
(Adzuna job search API, free developer key). A company hiring "interstate travel required" roles will be booking flights.
Appends a "Hiring people who travel" section to leads/latest.md and rows to leads/latest.csv (run after austender.py).

Needs GitHub secrets ADZUNA_APP_ID and ADZUNA_APP_KEY (free at developer.adzuna.com). Without them it does nothing.
Usage: python3 scripts/leads/adzuna.py [days=7]
"""
import csv, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone

APP_ID, APP_KEY = os.environ.get('ADZUNA_APP_ID'), os.environ.get('ADZUNA_APP_KEY')
DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 7
TOP = 8
QUERIES = ['interstate travel', 'regular travel required', 'travel required', 'national travel', 'regional travel', 'fly in fly out']
TRAVEL = re.compile(r'\b(interstate travel|regular (interstate |domestic )?travel|travel (is )?required|national travel|regional travel|travel across|'
                    r'travel to (client|site)s?|fly[- ]in[- ]fly[- ]out|fifo|overnight travel|frequent travel|\d+% travel)\b', re.I)
# Not SME prospects, or not the real employer: recruiters, very large firms, government, travel companies.
SKIP = re.compile(r'\b(recruit\w*|personnel|staffing|talent|labour hire|hays|randstad|adecco|michael page|page personnel|robert walters|hudson|'
                  r'chandler macleod|programmed|manpower|people2people|seek|indeed|government|department|council|university|tafe|health service|'
                  r'telstra|optus|commonwealth bank|westpac|anz|nab|woolworths|coles|wesfarmers|bhp|rio tinto|fortescue|deloitte|kpmg|pwc|ernst|accenture|'
                  r'flight centre|corporate traveller|fcm|travel|qantas|virgin|confidential|private advertiser|anonymous)\b', re.I)


def search(what, page=1):
    q = urllib.parse.urlencode({'app_id': APP_ID, 'app_key': APP_KEY, 'what_phrase': what, 'max_days_old': DAYS, 'results_per_page': 50, 'content-type': 'application/json'})
    url = f'https://api.adzuna.com/v1/api/jobs/au/search/{page}?{q}'
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'SiteFactory-leads/1.0'}), timeout=45) as r:
                return json.load(r).get('results', [])
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403):
                raise RuntimeError(f'Adzuna rejected the request (HTTP {e.code}): check the API key') from e
            time.sleep(4 * (attempt + 1))
        except Exception:
            time.sleep(4 * (attempt + 1))
    return []


def main():
    if not (APP_ID and APP_KEY):
        print('Adzuna: no API key yet (ADZUNA_APP_ID / ADZUNA_APP_KEY), skipping.')
        return
    jobs = {}
    for qy in QUERIES:
        for j in search(qy):
            jobs[j.get('id') or j.get('redirect_url')] = j
        time.sleep(1)
    co = {}
    for j in jobs.values():
        name = ((j.get('company') or {}).get('display_name') or '').strip()
        text = f"{j.get('title', '')} {j.get('description', '')}"
        if not name or SKIP.search(name) or not TRAVEL.search(text):
            continue
        area = (j.get('location') or {}).get('area') or []
        c = co.setdefault(name.lower(), {'name': name, 'jobs': [], 'state': area[1] if len(area) > 1 else '', 'city': area[-1] if area else ''})
        c['jobs'].append({'title': j.get('title', '').strip(), 'url': j.get('redirect_url'), 'phrase': TRAVEL.search(text).group(0)})
    try:
        seen = json.load(open('leads/seen.json'))
    except Exception:
        seen = {}
    ranked = sorted((c for k, c in co.items() if f'adz:{k}' not in seen), key=lambda c: -len(c['jobs']))[:TOP]
    print(f'Adzuna: {len(jobs)} ads, {len(co)} employers with travel in the ad, {len(ranked)} new')
    if not ranked:
        return
    md = ['', '## Hiring people who travel', '', f'_Companies advertising roles with regular travel in the last {DAYS} days (Adzuna). Wash first: Salesforce, CT, Corporate Traveller._', '']
    for i, c in enumerate(ranked, 1):
        q = urllib.parse.quote_plus(c['name'])
        titles = '; '.join(sorted({j['title'] for j in c['jobs']})[:3])
        md += [f"**J{i}. {c['name']}** — {c['city']} {c['state']}".rstrip() + f" · {len(c['jobs'])} ad{'s' if len(c['jobs']) > 1 else ''}",
               f"- Hiring: {titles}",
               f"- Ad says: \"{c['jobs'][0]['phrase']}\"",
               "- Wash: ☐ Salesforce · ☐ CT · ☐ Corporate Traveller",
               f"- Opener: \"I saw you're hiring a {c['jobs'][0]['title']} with {c['jobs'][0]['phrase'].lower()}. As the team grows, who looks after booking that travel?\"",
               f"- Find: [Ad]({c['jobs'][0]['url']}) · [Google](https://www.google.com/search?q={q}) · [LinkedIn](https://www.linkedin.com/search/results/companies/?keywords={q})", '']
        seen[f"adz:{c['name'].lower()}"] = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    with open('leads/latest.md', 'a') as fh:
        fh.write('\n'.join(md) + '\n')
    new_file = not os.path.exists('leads/latest.csv')
    with open('leads/latest.csv', 'a', newline='') as fh:
        w = csv.writer(fh)
        if new_file:
            w.writerow(['Rank', 'Company', 'ABN', 'Suburb', 'State', 'Contract value (AUD)', 'Agency', 'Work', 'Why', 'Washed (Y/N)', 'Notes'])
        for i, c in enumerate(ranked, 1):
            w.writerow([f'J{i}', c['name'], '', c['city'], c['state'], '', '', '; '.join(sorted({j['title'] for j in c['jobs']})[:3]), f"Hiring with travel: {c['jobs'][0]['phrase']}", '', ''])
    json.dump(seen, open('leads/seen.json', 'w'), indent=1, sort_keys=True)


if __name__ == '__main__':
    main()
