"""90-day reviews: for each site in hq/portfolio.json whose launch was 90+ days ago, open one GitHub issue
(label "review") with its numbers against target90 and a recommendation. Runs inside the daily health workflow."""
import json, os, subprocess
from datetime import date

R = os.environ['GITHUB_REPOSITORY']
d = json.load(open('hq/portfolio.json'))
gh = lambda *a: subprocess.run(['gh', *a], capture_output=True, text=True)
existing = gh('api', f'repos/{R}/issues?labels=review&state=all&per_page=100', '--jq', '.[].title').stdout.splitlines()
gh('label', 'create', 'review', '--color', '1D76DB', '--description', '90-day site review')
MONEY = {'trailers': ['prime', 'disc'], 'vic': ['book_stay', 'book_tour', 'book_car']}
for n in d['nodes']:
    if not n.get('launched') or not n.get('target90') or not n.get('stats'): continue
    day = (date.today() - date.fromisoformat(n['launched'])).days
    title = f"90-day review: {n['name']}"
    if day < 90 or title in existing: continue
    t = json.load(open(n['stats']))['totals']
    clicks = sum(t['cta'].get(k, 0) for k in MONEY.get(n['id'], []))
    tv, tc = n['target90']['views'], n['target90']['moneyClicks']
    pv, pc = t['views'] / tv, clicks / tc if tc else 1
    avg = (pv + pc) / 2
    verdict = ('**Double down**: both targets hit. Add pages, promote, consider the next section.' if pv >= 1 and pc >= 1
               else '**Fix**: halfway there. Pick the one biggest lever (content, links or money placement) and give it one more 90 days.' if avg >= 0.5
               else '**Kill or merge**: well short of target. Merge the best pages into a stronger site or let it go; no zombies.')
    body = f"""Day {day} since launch ({n['launched']}). Last 28 days vs the 90-day target{' (provisional)' if n.get('targetSet') == 'provisional' else ''}:

| | Actual | Target | % |
|---|---:|---:|---:|
| Visits | {t['views']:,} | {tv:,} | {pv:.0%} |
| Money clicks | {clicks:,} | {tc:,} | {pc:.0%} |
| Google clicks | {t['gscClicks']:,} | | |

Recommendation: {verdict}

Reply here with the decision and Claude logs it in DECISIONS.md."""
    gh('issue', 'create', '--title', title, '--label', 'review', '--body', body)
    print(f'Opened: {title}')
