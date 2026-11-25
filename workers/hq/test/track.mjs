// Email tracking for HQ one-click sends (send.ts track()) against the real Mail Tracker code. Run: npx tsx workers/hq/test/track.mjs
import { DatabaseSync } from 'node:sqlite';
const { sendForOrg } = await import('../src/send.ts');
const mt = (await import('../../mail-tracker/src/index.js')).default;
const mkdb = () => { const sql = new DatabaseSync(':memory:'); const st = (q, a = []) => ({ bind: (...x) => st(q, x), run: async () => (sql.prepare(q).run(...a), {}), all: async () => ({ results: sql.prepare(q).all(...a).map(r => ({ ...r })) }), first: async (c) => { const r = sql.prepare(q).get(...a); return r ? (c ? r[c] : { ...r }) : null; } }); return { sql, prepare: q => st(q), batch: async l => { for (const s of l) await s.run(); } }; };
const db = mkdb();
db.sql.exec(`CREATE TABLE orgs (id INTEGER PRIMARY KEY, brand TEXT, name TEXT, stage TEXT, stage_at TEXT, next_step TEXT);
CREATE TABLE contacts (id INTEGER PRIMARY KEY, org_id INTEGER, email TEXT, name TEXT, opted_out_at TEXT);
CREATE TABLE touches (id INTEGER PRIMARY KEY, org_id INTEGER, brand TEXT, stage TEXT, channel TEXT, subject TEXT, note TEXT);
INSERT INTO orgs (id, brand, name, stage) VALUES (1,'imn','Smith Plumbing','drafted'), (2,'vic','Daylesford Info','drafted');`);
const mtEnv = { DB: mkdb(), ADMIN_KEY: 'mtk' };
const sent = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes('login.microsoftonline')) return Response.json({ access_token: 't', expires_in: 3600 });
  if (String(url).includes('graph.microsoft.com')) { sent.push(JSON.parse(init.body)); return new Response(null, { status: 202 }); }
  throw new Error('unexpected fetch ' + url);
};
const env = { DB: db, MS_TENANT_ID: 'a', MS_CLIENT_ID: 'b', MS_CLIENT_SECRET: 'c', MS_SENDER: 'simon@x', TRACK_BRANDS: 'imn', MT_KEY: 'mtk', MT_PUBLIC_URL: 'https://go.imnetwork.com.au',
  MAIL_TRACKER: { fetch: (req) => mt.fetch(req, mtEnv, { waitUntil() {} }) } };
const brands = { imn: { name: 'IMN', from: 'hello@imnetwork.com.au', mailReady: true, active: true }, vic: { name: 'Vic', from: 'hello@victours.com.au', mailReady: true, active: true } };
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok -', m); };
const body = 'Hi Dave,\n\nYour report: https://check.imnetwork.com.au/r/AbCd1234\nPricing: https://imnetwork.com.au/pricing and https://imnetwork.com.au.\n\nThanks,\n\nReply "no thanks" and I won\'t contact you again.';
let r = await sendForOrg(env, brands, 1, { to: 'dave@smith.com.au', subject: 'We checked', body, contact_name: 'Dave Smith' });
ok(r.ok && r.tracked && r.trackerId, 'IMN email sent tracked');
const html = sent[0].message.body.content;
ok(html.includes(`https://go.imnetwork.com.au/l/${r.trackerId}/0`) && html.includes(`/l/${r.trackerId}/1`) && html.includes(`/l/${r.trackerId}/2`), 'all 3 links tracked');
ok(!html.includes('check.imnetwork.com.au/r/') && !html.includes('imnetwork.com.au/pricing'), 'no raw links left');
ok(html.includes(`https://go.imnetwork.com.au/o/${r.trackerId}.gif`), 'open pixel added');
ok(html.includes('no thanks'), 'opt-out kept');
// tracked link resolves to the real page
let lr = await mt.fetch(new Request(`https://go.imnetwork.com.au/l/${r.trackerId}/1`), mtEnv, { waitUntil() {} });
ok(lr.status === 302 && lr.headers.get('location') === 'https://imnetwork.com.au/pricing', 'tracked link 1 → pricing page (longer URL not broken by shorter one)');
lr = await mt.fetch(new Request(`https://go.imnetwork.com.au/l/${r.trackerId}/2`), mtEnv, { waitUntil() {} });
ok((lr.headers.get('location')||'').replace(/\/$/,'') === 'https://imnetwork.com.au', 'tracked link 2 → home');
// open right away counts (no grace)
const pend = [];
await mt.fetch(new Request(`https://go.imnetwork.com.au/o/${r.trackerId}.gif`, { headers: { 'user-agent': 'Mozilla/5.0 (iPhone)', 'cf-connecting-ip': '5.5.5.5' } }), mtEnv, { waitUntil: p => pend.push(p) });
await Promise.all(pend);
const ev = mtEnv.DB.sql.prepare('SELECT type, flag FROM events').all();
ok(ev.filter(e => e.type === 'open').length === 1 && ev.find(e => e.type === 'open').flag === null, 'instant open counts as a real open');
const touch = db.sql.prepare('SELECT note FROM touches').get();
ok(touch.note === `Sent from HQ (tracked ${r.trackerId})`, 'board history notes the tracker');
// other brands untouched
r = await sendForOrg(env, brands, 2, { to: 'info@daylesford.com.au', subject: 'Hi', body: 'See https://victours.com.au/daylesford\n\nReply "no thanks" and I won\'t contact you again.' });
ok(r.ok && !r.tracked && sent[1].message.body.content.includes('https://victours.com.au/daylesford') && !sent[1].message.body.content.includes('<img'), 'Vic email untracked, unchanged');
// tracker down → still sends untracked
db.sql.exec(`INSERT INTO orgs (id, brand, name, stage) VALUES (3,'imn','Cafe','drafted')`);
env.MAIL_TRACKER = { fetch: async () => new Response('x', { status: 500 }) };
r = await sendForOrg(env, brands, 3, { to: 'hi@cafe.com.au', subject: 'Hi', body: body });
ok(r.ok && !r.tracked && r.trackError && sent[2].message.body.content.includes('check.imnetwork.com.au/r/AbCd1234'), 'Mail Tracker down: sent untracked, not blocked');
console.log('ALL PASSED');
