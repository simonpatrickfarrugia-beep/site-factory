import { DatabaseSync } from 'node:sqlite';
import worker from '../src/index.js';

const sql = new DatabaseSync(':memory:');
function stmt(q, args = []) {
  return {
    bind: (...a) => stmt(q, a),
    _q: q, _a: args,
    // D1 uses ?1 style; node:sqlite supports ?NNN too
    async run() { sql.prepare(q).run(...args); return { success: true }; },
    async all() { return { results: sql.prepare(q).all(...args).map(r => ({ ...r })) }; },
    async first() { const r = sql.prepare(q).get(...args); return r ? { ...r } : null; },
  };
}
const env = {
  ADMIN_KEY: 'secret-key-123',
  DB: { prepare: q => stmt(q), batch: async list => { for (const s of list) await s.run(); return []; } },
};
const pending = [];
const ctx = { waitUntil: p => pending.push(p) };
const B = 'https://mt.example.workers.dev';
async function call(path, init = {}, ip = '1.1.1.1', cf = {}) {
  const req = new Request(B + path, { redirect: 'manual', ...init, headers: { 'cf-connecting-ip': ip, 'user-agent': 'Mozilla/5.0 (iPhone)', ...(init.headers || {}) } });
  Object.defineProperty(req, 'cf', { value: cf });
  const res = await worker.fetch(req, env, ctx);
  await Promise.all(pending.splice(0));
  return res;
}
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok -', m); };

let r = await call('/');
ok(r.status === 303 && r.headers.get('location') === '/login', 'dashboard redirects to login');
r = await call('/login', { method: 'POST', body: new URLSearchParams({ key: 'wrong' }) });
ok(r.status === 401, 'wrong key rejected');
r = await call('/login', { method: 'POST', body: new URLSearchParams({ key: 'secret-key-123' }) });
const cookie = r.headers.get('set-cookie').split(';')[0];
ok(r.status === 303 && cookie.startsWith('mt='), 'login sets cookie');
const auth = { cookie };
r = await call('/', { headers: auth }, '9.9.9.9');
ok(r.status === 200 && (await r.text()).includes('Mail Tracker'), 'dashboard loads (and marks 9.9.9.9 as own IP)');

r = await call('/api/emails', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ workspace: 'work', recipient: 'Jane Smith', company: 'Acme', subject: 'Travel program', links: [{ label: 'Book a call', url: 'https://cal.com/simon' }, { label: 'bad', url: 'javascript:alert(1)' }] }) }, '9.9.9.9');
const e = await r.json();
ok(e.id && JSON.parse(e.links).length === 1, 'email created, unsafe link dropped');

// open within grace window -> self
await call(`/o/${e.id}.gif`, {}, '5.5.5.5');
// age the email past grace
sql.prepare('UPDATE emails SET created_at=created_at-200000').run();
r = await call(`/o/${e.id}.gif`, {}, '5.5.5.5', { asOrganization: 'Telstra', city: 'Sydney', country: 'AU' });
ok(r.headers.get('content-type') === 'image/gif', 'pixel returns gif');
await call(`/o/${e.id}.gif`, {}, '6.6.6.6', { asOrganization: 'Apple Inc.' });
await call(`/o/${e.id}.gif`, {}, '9.9.9.9'); // own IP
r = await call(`/l/${e.id}/0`, {}, '5.5.5.5', { asOrganization: 'Telstra' });
ok(r.status === 302 && r.headers.get('location') === 'https://cal.com/simon', 'click redirects');
await call(`/l/${e.id}/0`, {}, '7.7.7.7', { asOrganization: 'Microsoft Corporation' });
r = await call(`/l/${e.id}/5`);
ok(r.status === 404, 'unknown link index 404s (no open redirect)');

r = await call(`/x/${e.id}`);
ok((await r.text()).includes('Not interested'), 'reply page shows buttons on GET');
let em = sql.prepare('SELECT status FROM emails WHERE id=?').get(e.id);
ok(em.status === 'sent', 'GET does not change status (scanner-safe)');
r = await call(`/x/${e.id}`, { method: 'POST', body: new URLSearchParams({ choice: 'not_interested' }) }, '5.5.5.5', { asOrganization: 'Telstra' });
ok((await r.text()).includes('Got it'), 'not-interested confirmed');

r = await call('/api/emails?ws=all', { headers: auth }, '9.9.9.9');
const d = await r.json();
const row = d.emails[0];
console.log(JSON.stringify({ opens: row.opens, auto_opens: row.auto_opens, clicks: row.clicks, auto_clicks: row.auto_clicks, status: row.status, feed: d.feed.length }));
ok(row.opens === 1 && row.auto_opens === 1 && row.clicks === 1 && row.auto_clicks === 1 && row.status === 'not_interested', 'counts split real vs automated vs self correctly');
ok(d.feed.length === 5, 'feed excludes self events');
r = await call('/api/emails?ws=imn', { headers: auth });
ok((await r.json()).emails.length === 0, 'workspace filter works');
r = await call(`/api/emails/${e.id}/status`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'meeting' }) });
ok((await r.json()).ok, 'status update');
r = await call('/api/emails', { headers: {} });
ok(r.status === 401, 'API locked without key');
r = await call(`/api/emails/${e.id}`, { method: 'DELETE', headers: auth });
ok((await r.json()).ok && !sql.prepare('SELECT 1 FROM events').get(), 'delete removes email + events');

// Check the dashboard's inline script parses
const page = await (await call('/', { headers: auth })).text();
const script = page.split('<script>')[1].split('</script>')[0];
new Function(script);
ok(true, 'dashboard script parses');
console.log('ALL PASSED');
