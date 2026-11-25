import { DatabaseSync } from 'node:sqlite';
import worker from '../src/index.js';

const BAD = `<html><head><title>Home</title></head><body><h1>Welcome</h1><h1>Plumbing</h1>
<img src="http://x.com/a.jpg"><img src="b.jpg"><a href="/about">About</a><a href="/broken">x</a><p>© 2019 Smith Plumbing</p>
<script src="a.js"></script></body></html>`;
const GOOD = `<!doctype html><html lang="en-AU"><head><title>Emergency Plumber Brunswick | Smith Plumbing</title>
<meta name="description" content="24/7 emergency plumber in Brunswick and Melbourne's inner north. Upfront pricing, fast arrival. Call now for a free quote.">
<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://good.com.au/"><link rel="icon" href="/f.ico">
<meta property="og:title" content="Smith"><meta property="og:image" content="https://good.com.au/og.jpg">
<script type="application/ld+json">{}</script><script src="https://www.googletagmanager.com/gtag/js"></script></head>
<body><h1>Emergency plumber</h1><a href="tel:0400000000">Call</a><form></form><img src="a.webp" alt="van"><a href="/about">About</a><p>© ${new Date().getFullYear()}</p></body></html>`;

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const site = u.hostname.startsWith('bad') ? 'bad' : 'good';
  if (u.protocol === 'http:') {
    if (site === 'good') return new Response(null, { status: 301, headers: { location: 'https://' + u.hostname + '/' } });
    return Object.defineProperty(new Response(BAD, { status: 200 }), 'url', { value: url });
  }
  if (site === 'bad' && u.pathname === '/' ) throw new Error('TLS fail');
  if (u.pathname === '/robots.txt') return site === 'good' ? new Response('User-agent: *\nDisallow:\nSitemap: https://good.com.au/sitemap.xml') : new Response('nope', { status: 404 });
  if (u.pathname === '/sitemap.xml') return site === 'good' ? new Response('<urlset></urlset>') : new Response('', { status: 404 });
  if (u.pathname === '/broken') return new Response('', { status: 404 });
  if (u.pathname === '/about') return new Response('', { status: 200 });
  const r = new Response(site === 'good' ? GOOD : BAD, { status: 200, headers: site === 'good' ? { 'content-encoding': 'br', 'strict-transport-security': 'max-age=1', 'x-content-type-options': 'nosniff', 'referrer-policy': 'x' } : {} });
  return Object.defineProperty(r, 'url', { value: url });
};

const sql = new DatabaseSync(':memory:');
const stmt = (q, a = []) => ({ bind: (...x) => stmt(q, x), run: async () => (sql.prepare(q).run(...a), {}), all: async () => ({ results: sql.prepare(q).all(...a).map(r => ({ ...r })) }), first: async () => { const r = sql.prepare(q).get(...a); return r ? { ...r } : null; } });
const env = { ADMIN_KEY: 'k', DB: { prepare: q => stmt(q), batch: async l => { for (const s of l) await s.run(); } } };
const pend = [];
const call = async (path, init = {}, ip = '1.2.3.4') => { const r = await worker.fetch(new Request('https://hc.test' + path, { redirect: 'manual', ...init, headers: { 'cf-connecting-ip': ip, ...(init.headers || {}) } }), env, { waitUntil: p => pend.push(p) }); await Promise.all(pend.splice(0)); return r; };
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok -', m); };
const post = (path, body, headers = {}, ip) => call(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, ip);

let r = await call('/?url=smith.com.au');
ok(r.status === 302 && r.headers.get('location') === 'https://imnetwork.com.au/labs/website-check?url=smith.com.au', 'front page forwards to the IMN Labs page');
r = await post('/api/scan', { url: 'good.com.au' });
ok(r.status === 410, 'public scan API retired (lab uses /api/check)');
r = await call('/api/check?url=localhost');
ok(r.status === 400, 'rejects non-public host');

// Public check (the Labs page engine): lab-shaped, open report
r = await call('/api/check?url=badplumbing.com.au');
const bad = await r.json();
console.log('bad site:', bad.score, bad.grade, bad.fixes.map(f => f.id).join(','));
ok(bad.ok && bad.score < 40 && bad.fixes.length === 3 && bad.checks.length === 26 && bad.report.endsWith('/r/' + bad.reportId), 'bad site scores low, lab shape');
ok(bad.checks.every(c => ['pass', 'warn', 'fail'].includes(c.status) && c.id && c.label && c.fix), 'every check has id, label, status, fix');
ok(bad.fixes[0].id === 'mobile' && bad.fixes.some(f => f.id === 'https'), 'biggest fails first (mobile, then HTTPS)');
r = await call('/api/check?url=https://good.com.au/');
const good = await r.json();
console.log('good site:', good.score, good.grade);
ok(good.score >= 85, 'good site scores high');
let page = await (await call('/r/' + bad.reportId)).text();
ok(!page.includes('more issue') && page.includes('NOT SECURE') && page.includes('broken link'), 'lab report is open, full fixes');
r = await call('/api/check?url=badplumbing.com.au');
ok((await r.json()).reportId === bad.reportId, 'recent report reused');
for (let i = 0; i < 8; i++) await call(`/api/check?url=good${i}.com.au`, {}, '9.9.9.9');
r = await call('/api/check?url=good99.com.au', {}, '9.9.9.9');
ok(r.status === 429, 'rate limit after 8/hour');
r = await call('/api/check?url=good98.com.au', { headers: { authorization: 'Bearer k' } }, '9.9.9.9');
ok((await r.json()).ok, 'admin not rate limited');

// Gated reports (admin can still make one) + unlock
r = await post('/api/scan', { url: 'badplumbing2.com.au', gated: true }, { authorization: 'Bearer k' });
const gated = await r.json();
page = await (await call('/r/' + gated.id)).text();
ok(page.includes('more issue'), 'gated report shows top fixes only');
const fixesShown = (page.match(/class="card" style="padding:18px 20px/g) || []).length;
ok(fixesShown === 3, 'only 3 fixes before unlock');
r = await post('/api/unlock/' + gated.id, { email: 'nope' });
ok(r.status === 400, 'invalid email rejected');
r = await post('/api/unlock/' + gated.id, { name: 'Dave Smith', email: 'dave@smith.com.au', business: 'Smith Plumbing' });
ok((await r.json()).ok, 'unlock with email');
page = await (await call('/r/' + gated.id)).text();
ok(!page.includes('more issue'), 'full report after unlock');

// Outreach (HQ): untracked when asked, carries the lab-shaped check
r = await post('/api/outreach', { url: 'badplumbing.com.au', business: 'Bad Plumbing', track: false }, { authorization: 'Bearer k' });
const o = await r.json();
ok(o.reportLink && !o.trackerId && o.check && o.check.fixes.length === 3 && o.check.report === o.reportLink, 'outreach returns report + lab shape');
page = await (await call('/r/' + o.id)).text();
ok(!page.includes('more issue'), 'outreach report is ungated');
r = await call('/api/admin', { headers: { authorization: 'Bearer k' } });
const a = await r.json();
ok(a.leads.length === 1 && a.reports.find(x => x.id === o.id).views === 1, 'admin sees lead + view count');
r = await call('/api/admin');
ok(r.status === 401, 'admin API locked');
r = await call('/login', { method: 'POST', body: new URLSearchParams({ key: 'k' }) });
const cookie = r.headers.get('set-cookie').split(';')[0];
page = await (await call('/admin', { headers: { cookie } })).text();
new Function(page.split('<script>')[1].split('</script>')[0]);
ok(true, 'admin script parses');
env.PUBLIC_URL = 'https://check.imnetwork.com.au';
r = await call('/api/check?url=fresh.com.au', { headers: { authorization: 'Bearer k' } });
ok((await r.json()).report.startsWith('https://check.imnetwork.com.au/r/'), 'report links use PUBLIC_URL');
console.log('ALL PASSED');
