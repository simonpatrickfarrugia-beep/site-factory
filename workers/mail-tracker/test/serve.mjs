import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/index.js';
const sql = new DatabaseSync(':memory:');
const stmt = (q, a = []) => ({ bind: (...x) => stmt(q, x), run: async () => (sql.prepare(q).run(...a), {}), all: async () => ({ results: sql.prepare(q).all(...a).map(r => ({ ...r })) }), first: async () => { const r = sql.prepare(q).get(...a); return r ? { ...r } : null; } });
const env = { ADMIN_KEY: 'k', DB: { prepare: q => stmt(q), batch: async l => { for (const s of l) await s.run(); } } };
await worker.fetch(new Request('http://x/login'), env, { waitUntil() {} });
const now = Date.now(), H = 3600e3;
const seed = [
  ['a1b2c3d4e5', 'work', 'Jane Smith', 'Acme Mining', 'Corporate travel review', 'sent', 30 * H, [[0.5, 'open'], [2, 'open'], [3, 'open'], [3.1, 'click']]],
  ['b1b2c3d4e5', 'imn', 'Tom Nguyen', 'Nguyen Plumbing', 'Your new website', 'interested', 20 * H, [[1, 'open'], [1.2, 'interested']]],
  ['c1b2c3d4e5', 'work', 'Priya Patel', 'Southern Logistics', 'Quick intro', 'sent', 10 * H, [[4, 'open']]],
  ['d1b2c3d4e5', 'imn', 'Mark Lee', 'Lee Electrical', 'Website for tradies', 'not_interested', 50 * H, [[5, 'open'], [5.1, 'not_interested']]],
  ['e1b2c3d4e5', 'work', 'Sarah Jones', 'Vic Health Group', 'Follow up', 'sent', 2 * H, []],
];
for (const [id, ws, r, c, s, st, age, evs] of seed) {
  sql.prepare('INSERT INTO emails (id,created_at,workspace,recipient,company,subject,links,status) VALUES (?,?,?,?,?,?,?,?)').run(id, now - age, ws, r, c, s, '[{"label":"Book a call","url":"https://x.com"}]', st);
  for (const [h, t] of evs) sql.prepare("INSERT INTO events (email_id,type,link_index,at,city,country,org,ua) VALUES (?,?,?,?,?,?,?,?)").run(id, t, t === 'click' ? 0 : null, now - age + h * H, 'Melbourne', 'AU', 'Telstra', 'Mozilla/5.0 (Windows NT 10.0)');
}
sql.prepare("INSERT INTO events (email_id,type,at,org,flag) VALUES ('c1b2c3d4e5','open',?,'Apple Inc.','auto')").run(now - 9 * H);
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const r = new Request('http://localhost:8787' + req.url, { method: req.method, headers: { ...req.headers, cookie: 'mt=' + (await sha('k')) }, body: chunks.length ? Buffer.concat(chunks) : undefined });
  const out = await worker.fetch(r, env, { waitUntil() {} });
  res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer()));
}).listen(8787, () => console.log('up'));
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mail-tracker:' + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
