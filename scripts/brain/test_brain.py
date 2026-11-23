"""Self-test for the IMN brain using real cards/stats from the repo (writes to a temp dir). Run: python3 scripts/brain/test_brain.py"""
import copy, json, os, sys, tempfile
from datetime import date, timedelta
sys.path.insert(0, os.path.dirname(__file__))
import brain as B

tmp = tempfile.mkdtemp()
B.FIXES, B.PLAYBOOK, B.REPORT = (os.path.join(tmp, n) for n in ('fixes.json', 'playbook.json', 'brain.md'))
R = B.ROOT
rd = lambda p: json.load(open(os.path.join(R, p)))
cfg = rd('hq/sitecheck.json')
sites = {s['id']: s for s in cfg['sites']}
stats = {sid: rd(s['stats']) for sid, s in sites.items() if s.get('stats') and os.path.exists(os.path.join(R, s['stats']))}
ok = lambda c, m: (print('ok -', m) if c else (print('FAIL', m), sys.exit(1)))

# Pick a site whose stats have a page with impressions; pretend a page-level schema fix happened there.
sid = max(stats, key=lambda k: (stats[k].get('totals') or {}).get('gscImpressions', 0))
page = max(stats[sid]['pages'], key=lambda r: r.get('gscImpressions', 0) or 0)['path']
prev = dict(scannedAt='2026-11-10T00:00:00Z', findings=[dict(id='schema-missing', area='seo', severity='medium', title='1 page(s) have no schema', fix='Add schema',
            pages=[page], count=1, detail='', impact=4, broken=False), dict(id='impressions-drop', area='google', severity='low', title='drop', fix='', pages=[], count=1, detail='', impact=1, broken=False)])
card = dict(scannedAt='2026-11-17T00:00:00Z', findings=[])
t0 = date(2026, 11, 17)
b = B.Brain(t0)
new = b.observe(sites[sid], card, prev, stats[sid]); b.stamp_portfolio(new, stats)
ok(len(new) == 1 and new[0]['findingId'] == 'schema-missing' and new[0]['scope'] == 'pages', f'fix spotted on {sid} {page} (and impressions-drop ignored)')
ok(b.measure(stats) == [], 'not measured before 35 days')
b.save()

# 40 days later: the fixed page tripled its impressions while the rest of the site stayed flat -> win
later = copy.deepcopy(stats)
for r in later[sid]['pages']:
    if r['path'] == page: r['gscImpressions'] = (r.get('gscImpressions') or 0) * 3 + 60
later[sid]['totals']['gscImpressions'] += sum((r.get('gscImpressions') or 0) for r in later[sid]['pages'] if r['path'] == page) - sum((r.get('gscImpressions') or 0) for r in stats[sid]['pages'] if r['path'] == page)
b2 = B.Brain(t0 + timedelta(days=40))
m = b2.measure(later)
ok(len(m) == 1 and m[0]['status'] == 'win' and m[0]['lift'] > 0.2, f'measured as win, lift {m[0]["lift"]:+.0%}')
book = b2.playbook()
ok(book['types']['schema-missing']['proven'], 'playbook marks schema-missing proven')

# Another site's card with the same finding gets the lesson + boost and moves to the top
other = dict(findings=[dict(id='thin-pages', area='content', severity='high', title='thin', fix='', pages=[], count=1, detail='', impact=5, broken=False),
                       dict(id='schema-missing', area='seo', severity='medium', title='3 page(s) have no schema', fix='Add schema', pages=['/a'], count=3, detail='', impact=4, broken=False)])
hits = b2.annotate(other)
ok(hits == 1 and other['findings'][0]['id'] == 'schema-missing' and 'IMN brain' in other['findings'][0]['detail'], 'lesson shared: proven fix climbs to #1 on another site')
ok(b2.annotate(other) == 0, 'no double boost')
b2.save()
rep = open(B.REPORT).read()
ok('1 wins' in rep and 'schema-missing' in rep, 'report written')

# Client sites are measured but never named in public evidence
b3 = B.Brain(t0)
b3.fixes['fixes'] = [dict(b2.fixes['fixes'][0], owner='client', name='secret-client.com.au')]
ok(b3.playbook()['types']['schema-missing']['evidence'] == [], 'client site never named in the playbook')
print('ALL PASSED')
