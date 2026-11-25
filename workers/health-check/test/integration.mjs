import { DatabaseSync } from 'node:sqlite';
import hc from '../src/index.js';
import mt from '../../mail-tracker/src/index.js';
const SITE = `<html><head><title>Home</title></head><body><h1>Hi</h1><a href="/about">a</a><p>© 2019</p></body></html>`;
globalThis.fetch = async (url) => { const u = new URL(url); if (u.pathname === '/robots.txt' || u.pathname === '/sitemap.xml') return new Response('', { status: 404 }); return Object.defineProperty(new Response(SITE), 'url', { value: url }); };
function db() { const sql = new DatabaseSync(':memory:'); const st = (q, a = []) => ({ bind: (...x) => st(q, x), run: async () => (sql.prepare(q).run(...a), {}), all: async () => ({ results: sql.prepare(q).all(...a).map(r => ({ ...r })) }), first: async () => { const r = sql.prepare(q).get(...a); return r ? { ...r } : null; } }); return { prepare: q => st(q), batch: async l => { for (const s of l) await s.run(); } }; }
const noop = { waitUntil() {} };
const mtEnv = { DB: db(), ADMIN_KEY: 'mtkey' };
const hcEnv = { DB: db(), ADMIN_KEY: 'hckey', MT_KEY: 'mtkey', MT_PUBLIC_URL: 'https://mail-tracker.simon.workers.dev', MAIL_TRACKER: { fetch: req => mt.fetch(req, mtEnv, noop) } };
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok -', m); };
let r = await hc.fetch(new Request('https://hc.test/api/outreach', { method: 'POST', headers: { authorization: 'Bearer hckey', 'content-type': 'application/json' }, body: JSON.stringify({ url: 'smithplumbing.com.au', name: 'Dave Smith', business: 'Smith Plumbing', email: 'dave@smith.com.au' }) }), hcEnv, noop);
const d = await r.json();
console.log('subject:', d.subject, '| score', d.total, '| urgent', d.urgent);
console.log(d.text);
ok(d.trackerId && d.html.includes('mail-tracker.simon.workers.dev/o/' + d.trackerId) && d.html.includes('/x/' + d.trackerId) && d.trackedLink.endsWith('/l/' + d.trackerId + '/0'), 'email has tracked link, pixel and opt-out');
r = await mt.fetch(new Request('https://x/api/emails?ws=imn', { headers: { authorization: 'Bearer mtkey' } }), mtEnv, noop);
const list = (await r.json()).emails;
ok(list.length === 1 && list[0].company === 'Smith Plumbing' && JSON.parse(list[0].links)[0].url === 'https://hc.test/r/' + d.id, 'Mail Tracker has the email, linked to the report');
// click the tracked link -> redirects to report
r = await mt.fetch(Object.defineProperty(new Request('https://x/l/' + d.trackerId + '/0', { headers: { 'cf-connecting-ip': '5.5.5.5', 'user-agent': 'Mozilla/5.0' } }), 'cf', { value: { asOrganization: 'Telstra' } }), mtEnv, noop);
ok(r.status === 302 && r.headers.get('location') === 'https://hc.test/r/' + d.id, 'tracked link opens the report');
// without tracker configured -> still works, untracked
r = await hc.fetch(new Request('https://hc.test/api/outreach', { method: 'POST', headers: { authorization: 'Bearer hckey', 'content-type': 'application/json' }, body: JSON.stringify({ url: 'x.com.au' }) }), { DB: hcEnv.DB, ADMIN_KEY: 'hckey' }, noop);
const u = await r.json();
ok(!u.trackerId && u.html.includes('hc.test/r/') && u.text.startsWith('Hi there'), 'works untracked when Mail Tracker not connected');
console.log('ALL PASSED');
