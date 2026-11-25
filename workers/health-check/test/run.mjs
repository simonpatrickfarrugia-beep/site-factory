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

let r = await call('/');
ok(r.status === 200 && (await r.text()).includes('Check my site'), 'landing page');
r = await post('/api/scan', { url: 'localhost' });
ok(r.status === 400, 'rejects non-public host');

r = await post('/api/scan', { url: 'badplumbing.com.au' });
const bad = await r.json();
console.log('bad site:', bad.total, bad.grade);
ok(bad.total < 40, 'bad site scores low');
r = await post('/api/scan', { url: 'https://good.com.au/' });
const good = await r.json();
console.log('good site:', good.total, good.grade);
ok(good.total >= 85, 'good site scores high');

r = await call('/r/' + bad.id);
let page = await r.text();
ok(page.includes('more issue') && page.includes('NOT SECURE'), 'public report is gated, shows top fixes');
const fixesShown = (page.match(/class="card" style="padding:18px 20px/g) || []).length;
ok(fixesShown === 3, 'only 3 fixes before unlock');
r = await post('/api/unlock/' + bad.id, { email: 'nope' });
ok(r.status === 400, 'invalid email rejected');
r = await post('/api/unlock/' + bad.id, { name: 'Dave Smith', email: 'dave@smith.com.au', business: 'Smith Plumbing' });
ok((await r.json()).ok, 'unlock with email');
page = await (await call('/r/' + bad.id)).text();
ok(!page.includes('more issue') && page.includes('broken link'), 'full report after unlock (broken link detected)');

// cache + rate limit
r = await post('/api/scan', { url: 'badplumbing.com.au' });
ok((await r.json()).cached, 'recent public report reused');
for (let i = 0; i < 8; i++) await post('/api/scan', { url: `good${i}.com.au` }, {}, '9.9.9.9');
r = await post('/api/scan', { url: 'good99.com.au' }, {}, '9.9.9.9');
ok(r.status === 429, 'rate limit after 8/hour');

// admin outreach scan: ungated
r = await post('/api/scan', { url: 'badplumbing.com.au' }, { authorization: 'Bearer k' });
const out = await r.json();
page = await (await call('/r/' + out.id)).text();
ok(!page.includes('more issue'), 'outreach report is ungated');
r = await call('/api/admin', { headers: { authorization: 'Bearer k' } });
const a = await r.json();
ok(a.leads.length === 1 && a.reports.find(x => x.id === out.id).views === 1, 'admin sees lead + view count');
r = await call('/api/admin');
ok(r.status === 401, 'admin API locked');
r = await call('/login', { method: 'POST', body: new URLSearchParams({ key: 'k' }) });
const cookie = r.headers.get('set-cookie').split(';')[0];
page = await (await call('/admin', { headers: { cookie } })).text();
new Function(page.split('<script>')[1].split('</script>')[0]);
const land = await (await call('/')).text();
new Function(land.split('<script>')[1].split('</script>')[0]);
ok(true, 'admin + landing scripts parse');
console.log('ALL PASSED');
