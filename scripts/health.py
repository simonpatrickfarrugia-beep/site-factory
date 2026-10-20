"""Daily health check. Writes health.md (job summary / issue body) and exits 1 if anything is wrong."""
import json, os, subprocess, sys, urllib.request
from datetime import datetime, timezone

cfg = json.load(open('hq/health.json'))
now = datetime.now(timezone.utc)
since = datetime.fromisoformat(cfg['trackingSince']).replace(tzinfo=timezone.utc)
problems, ok = [], []

def age_days(iso):
    return (now - datetime.fromisoformat(iso.replace('Z', '+00:00'))).total_seconds() / 86400

def get(url, timeout=30):
    req = urllib.request.Request(url, headers={'user-agent': 'site-factory-health/1'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()

# 1. Sites up
for u in cfg['sites']:
    try:
        code, body = get(u)
        (ok if code == 200 and len(body) > 500 else problems).append(f'{u} → HTTP {code}, {len(body):,} bytes')
    except Exception as e:
        problems.append(f'{u} → down ({str(e)[:120]})')

# 2. Pipeline jobs ran recently and succeeded
try:
    _, body = get(f"https://trailer-pipeline.simonpatrickfarrugia.workers.dev/status?key={os.environ['RUN_KEY']}")
    runs = json.loads(body)
    for job, max_days in cfg['jobsMaxAgeDays'].items():
        recs = runs.get(job) or []
        last = recs[0] if recs else None
        if last and not last['ok']:
            problems.append(f"Pipeline `{job}` failed {age_days(last['at']):.1f} days ago: {last['summary']}")
        elif last and age_days(last['at']) > max_days:
            problems.append(f"Pipeline `{job}` hasn't run for {age_days(last['at']):.1f} days (expected every {max_days})")
        elif not last and (now - since).days > max_days:
            problems.append(f"Pipeline `{job}` has no recorded run since tracking began ({cfg['trackingSince']})")
        elif last:
            ok.append(f"Pipeline `{job}` OK {age_days(last['at']):.1f} days ago")
        else:
            ok.append(f"Pipeline `{job}`: waiting for first tracked run")
except Exception as e:
    problems.append(f'Pipeline status unreachable ({str(e)[:150]})')

# 3. Data files fresh
for f in cfg['freshFiles']:
    try:
        d = json.load(open(f['path']))
        a = age_days(d[f['field']])
        (ok if a <= f['maxAgeDays'] else problems).append(f"{f['path']} updated {a:.1f} days ago (limit {f['maxAgeDays']})")
    except Exception as e:
        problems.append(f"{f['path']}: unreadable ({str(e)[:100]})")

# 4. Each workflow's latest run on main (in the last 26 hours) didn't fail; a later success clears an earlier failure
try:
    out = subprocess.run(['gh', 'api', f"repos/{os.environ['GITHUB_REPOSITORY']}/actions/runs?per_page=100&branch=main",
                          '--jq', '.workflow_runs[] | [.name, .created_at, (.conclusion // .status), .html_url] | @tsv'], capture_output=True, text=True, check=True).stdout
    latest = {}
    for l in out.strip().splitlines():
        name, at, result, url = l.split('\t')
        if name not in latest and result not in ('in_progress', 'queued', 'cancelled', 'skipped'):
            latest[name] = (at, result, url)  # newest first
    bad = [(n, at, url) for n, (at, r, url) in latest.items() if r == 'failure' and n != 'health' and age_days(at) <= 26 / 24]
    for name, at, url in bad:
        problems.append(f'GitHub workflow **{name}** failed {at[:16].replace("T", " ")} UTC: {url}')
    if not bad:
        ok.append('No GitHub workflow is currently failing')
except Exception as e:
    problems.append(f'Could not read GitHub workflow runs ({str(e)[:120]})')

md = [f"# Health check {now:%Y-%m-%d %H:%M} UTC", '']
md += (['## ❌ Problems', ''] + [f'- {p}' for p in problems] + ['']) if problems else ['All good ✅', '']
md += ['<details><summary>Passing checks</summary>', ''] + [f'- {o}' for o in ok] + ['', '</details>']
open('health.md', 'w').write('\n'.join(md) + '\n')
print('\n'.join(md))
sys.exit(1 if problems else 0)
