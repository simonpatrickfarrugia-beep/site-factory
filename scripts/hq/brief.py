"""Daily brief: the whole factory's state in one file (hq/brief.md), so any new chat starts up to date in one read.

Runs in .github/workflows/brief.yml every morning after the stats job, and on demand (scripts/claude/brief.sh).
Reads repo data (stats, portfolio, finance, milestones), health.md from scripts/health.py if present,
the pipeline job status (needs RUN_KEY) and GitHub (open issues, recent commits; needs GH_TOKEN).
"""
import json, os, subprocess, urllib.request
from datetime import datetime, timezone, date, timedelta

now = datetime.now(timezone.utc)
mel = now + timedelta(hours=11)  # Melbourne summer time; label only
REPO = os.environ.get('GITHUB_REPOSITORY', 'simonpatrickfarrugia-beep/site-factory')


def load(p, default=None):
    try:
        return json.load(open(p))
    except Exception:
        return default


def gh(*args):
    try:
        return subprocess.run(['gh', *args], capture_output=True, text=True, check=True).stdout.strip()
    except Exception:
        return ''


def ago(iso):
    d = (now - datetime.fromisoformat(iso.replace('Z', '+00:00'))).total_seconds()
    return f'{d / 3600:.0f}h ago' if d < 172800 else f'{d / 86400:.0f}d ago'


portfolio = load('hq/portfolio.json', {})
finance = load('hq/finance.json', {})
milestones = load('hq/milestones.json', {})
goal = portfolio.get('goal', {})
sprint = goal.get('sprint', {})
todo = portfolio.get('todo', [])
open_items = [t for t in todo if not t.get('done')]
revenue = sum(r.get('amount', 0) for r in finance.get('revenue', []))

md = [f'# Site Factory brief — {mel:%a %d %b %Y} (generated {now:%H:%M} UTC)', '',
      '_Auto-written daily by scripts/hq/brief.py. Read this first in any new chat. Refresh: scripts/claude/brief.sh_', '']

# Headline
head = [f'Revenue to date **A${revenue:,.2f}**']
if sprint.get('deadline'):
    left = (date.fromisoformat(sprint['deadline']) - mel.date()).days
    head.append(f'sprint "{sprint.get("name")}" {"ends in " + str(left) + " days" if left >= 0 else "ended " + str(-left) + " days ago"}')
head.append(f'Simon has **{len(open_items)}** open items (~{sum(t.get("mins", 0) for t in open_items)} min)')
md += ['## Headline', '', ' · '.join(head), '']

# Traffic
names = {n['id']: (n.get('name'), n.get('url'), n.get('station')) for n in portfolio.get('nodes', [])}
md += ['## Traffic (last 28 days)', '', '| Site | Station | Views (prev) | Last 7 days | CTA clicks | Google clicks / impressions |', '|---|---|---|---|---|---|']
details = []
for brand, node in [('trailers', 'trailers'), ('vic', 'vic'), ('community-help-co', 'chc')]:
    s = load(f'data/{brand}/stats.json')
    nm, url, station = names.get(node, (brand, '', ''))
    if not s:
        md.append(f'| {nm} | {station or "-"} | not tracked yet | | | |')
        continue
    t = s.get('totals', {})
    last7 = ' '.join(str(d['views']) for d in s.get('daily', [])[-7:])
    cta = ', '.join(f'{k} {v}' for k, v in (t.get('cta') or {}).items()) or '0'
    md.append(f"| {nm} | {station or '-'} | {t.get('views', 0)} ({t.get('prevViews', 0)}) | {last7} | {cta} | {t.get('gscClicks', 0)} / {t.get('gscImpressions', 0)} |")
    pages = sorted(s.get('pages', []), key=lambda p: -p.get('views', 0))[:5]
    q = sorted([p for p in s.get('pages', []) if p.get('gscImpressions')], key=lambda p: -p['gscImpressions'])[:5]
    details.append(f'**{nm}** (stats {ago(s["generatedAt"])}) — top pages: ' + ', '.join(f'{p["path"]} {p["views"]}' for p in pages))
    if q:
        details.append('  Google: ' + '; '.join(f'"{p.get("topQuery") or p["path"]}" {p["gscImpressions"]} impr, pos {p.get("gscPosition") or "-"}' for p in q))
md += [''] + [f'- {d}' if not d.startswith('  ') else f'  - {d.strip()}' for d in details] + ['']

hits = milestones.get('hit', [])
if hits:
    md += ['Latest milestones: ' + '; '.join(f'{h["date"]} {h["site"]}: {h["what"]}' for h in sorted(hits, key=lambda h: h['date'])[-3:]), '']

# Health
md += ['## Health', '']
if os.path.exists('health.md'):
    h = open('health.md').read()
    if 'Problems' in h:
        md += [l for l in h.splitlines() if l.startswith('- ') and '<' not in l][:10]
    else:
        md.append('All checks passing ✅ (sites up, pipeline jobs fresh, live builds current, no failing workflows)')
else:
    md.append('Health check not run in this build.')
md.append('')

# Pipeline jobs
try:
    req = urllib.request.Request(f"https://trailer-pipeline.simonpatrickfarrugia.workers.dev/status?key={os.environ['RUN_KEY']}",
                                 headers={'user-agent': 'site-factory-brief/1'})
    runs = json.loads(urllib.request.urlopen(req, timeout=30).read())
    md += ['## Pipeline jobs (last run)', '']
    for job, recs in sorted(runs.items(), key=lambda kv: kv[1][0]['at'] if kv[1] else '', reverse=True):
        if recs:
            r = recs[0]
            md.append(f"- {'✅' if r['ok'] else '❌'} `{job}` {ago(r['at'])}: {str(r.get('summary', ''))[:140]}")
    md.append('')
except Exception as e:
    md += ['## Pipeline jobs', '', f'- status unavailable ({str(e)[:80]})', '']

# Simon's list
md += ["## Simon's list (open)", '']
for t in sorted(open_items, key=lambda t: (not t.get('sprint'), t.get('kind') != 'do', t.get('mins', 99))):
    md.append(f"- {'⚡' if t.get('sprint') else '·'} [{t.get('kind', 'do')}, {t.get('mins', '?')} min] {t['what']} (`{t['id']}`)")
done_recent = [t for t in todo if t.get('done') and t.get('doneAt') and t['doneAt'] >= (mel.date() - timedelta(days=7)).isoformat()]
if done_recent:
    md += ['', 'Done in the last 7 days: ' + '; '.join(t['what'][:60] for t in done_recent)]
md.append('')

md += ['## Claude is on', ''] + [f"- {a['what']} ({a.get('site', '')})" for a in portfolio.get('actions', [])] + ['']

# GitHub
issues = gh('issue', 'list', '-R', REPO, '--state', 'open', '--json', 'number,title,labels', '--jq', '.[] | "- #\\(.number) \\(.title) [\\(.labels | map(.name) | join(","))]"')
md += ['## Open GitHub issues', '', issues or '- none', '']
since = (now - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')
commits = gh('api', f'repos/{REPO}/commits?sha=main&since={since}&per_page=100', '--jq', '.[] | [.commit.committer.date[0:10], .commit.author.name, (.commit.message | split("\\n")[0])] | @tsv')
lines = [c.split('\t') for c in commits.splitlines() if c]
human = [c for c in lines if not any(b in c[1].lower() for b in ('pipeline', 'probe', 'bot', 'brief'))]
bots = len(lines) - len(human)
md += ['## Changes in the last 7 days', '', f'{len(lines)} commits ({bots} automated data updates). Hand-made changes:', '']
md += [f'- {c[0]} {c[2][:110]}' for c in human[:25]] or ['- none']
md += ['', '## Where things live', '',
       '- HQ data: hq/portfolio.json (sites, Simon\'s list, goals), hq/finance.json, hq/milestones.json, hq/reports/*.md',
       '- Traffic: data/<brand>/stats.json (pipeline `stats` job, daily)',
       '- Helpers for chat sessions: scripts/claude/README.md (probe live pages, SEO audit, run pipeline jobs)',
       '- Decisions, costs, plans: the claude.ai Project docs (DECISIONS.md, COSTS.md, PRODUCTION-LINE.md, …)', '']

open('hq/brief.md', 'w').write('\n'.join(md))
print('\n'.join(md))
