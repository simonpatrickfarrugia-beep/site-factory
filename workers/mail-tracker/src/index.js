// Mail Tracker: open + click + one-click reply tracking for work and IMN emails.
// Bindings: DB (D1 "mail-tracker"), ADMIN_KEY (secret), SENDER_NAME (optional var)

const GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0));
const GRACE_MS = 90 * 1000; // opens this soon after creating are you composing, not them
const SCANNER_RE = /(microsoft|mimecast|proofpoint|barracuda|forcepoint|trend ?micro|cisco|fortinet|zscaler|symantec|broadcom|sophos|amazon|google|digitalocean|ovh|hetzner|linode|akamai|cloudflare|paloalto|checkpoint)/i;
const STATUSES = ['sent', 'fu1', 'fu2', 'replied', 'meeting', 'interested', 'not_interested', 'dead'];

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS emails (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, workspace TEXT NOT NULL DEFAULT 'imn', recipient TEXT, email TEXT, company TEXT, subject TEXT, notes TEXT, links TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'sent')",
  "CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, email_id TEXT NOT NULL, type TEXT NOT NULL, link_index INTEGER, at INTEGER NOT NULL, ip TEXT, org TEXT, country TEXT, city TEXT, ua TEXT, flag TEXT)",
  "CREATE INDEX IF NOT EXISTS idx_events_email ON events(email_id, at)",
  "CREATE TABLE IF NOT EXISTS own_ips (ip TEXT PRIMARY KEY, last_seen INTEGER NOT NULL)",
];
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch(SCHEMA.map(s => env.DB.prepare(s)));
  schemaReady = true;
}

export default {
  async fetch(request, env, ctx) {
    try {
      await ensureSchema(env);
      return await route(request, env, ctx);
    } catch (err) {
      console.error(err);
      return new Response('Something went wrong', { status: 500 });
    }
  },
};

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const p = url.pathname;
  const m = request.method;
  let mt;

  // ---- Public, tracked endpoints (what recipients hit) ----
  if ((mt = p.match(/^\/o\/([A-Za-z0-9]{6,20})(?:\.gif)?$/))) {
    if (m === 'GET') ctx.waitUntil(logEvent(request, env, mt[1], 'open'));
    return new Response(GIF, { headers: { 'content-type': 'image/gif', 'cache-control': 'no-store, no-cache, must-revalidate, max-age=0', pragma: 'no-cache' } });
  }
  if ((mt = p.match(/^\/l\/([A-Za-z0-9]{6,20})\/(\d{1,2})$/))) {
    const email = await getEmail(env, mt[1]);
    const links = email ? JSON.parse(email.links || '[]') : [];
    const link = links[Number(mt[2])];
    if (!link) return new Response('Link not found', { status: 404 });
    if (m === 'GET') ctx.waitUntil(logEvent(request, env, mt[1], 'click', Number(mt[2])));
    return Response.redirect(link.url, 302);
  }
  if ((mt = p.match(/^\/x\/([A-Za-z0-9]{6,20})$/))) {
    const email = await getEmail(env, mt[1]);
    if (!email) return html(replyPage(env, null, null), 404);
    if (m === 'POST') {
      const form = await request.formData();
      const choice = form.get('choice') === 'interested' ? 'interested' : 'not_interested';
      await logEvent(request, env, email.id, choice);
      // Don't overwrite a stronger status you set yourself (meeting/replied)
      if (['sent', 'interested', 'not_interested'].includes(email.status)) {
        await env.DB.prepare('UPDATE emails SET status=?1 WHERE id=?2').bind(choice, email.id).run();
      }
      return html(replyPage(env, email, choice));
    }
    return html(replyPage(env, email, null)); // GET only shows buttons, so link scanners can't fake a reply
  }

  // ---- Auth ----
  if (p === '/login') {
    if (m === 'POST') {
      const form = await request.formData();
      if (env.ADMIN_KEY && safeEqual(String(form.get('key') || ''), env.ADMIN_KEY)) {
        const token = await sha256(env.ADMIN_KEY);
        return new Response(null, { status: 303, headers: { location: '/', 'set-cookie': 'mt=' + token + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7776000' } });
      }
      return html(loginPage('That key didn\'t match.'), 401);
    }
    return html(loginPage(env.ADMIN_KEY ? '' : 'Set the ADMIN_KEY secret on this Worker first.'));
  }
  if (p === '/logout') return new Response(null, { status: 303, headers: { location: '/login', 'set-cookie': 'mt=; Path=/; Max-Age=0' } });

  const authed = await isAuthed(request, env);
  if (!authed) {
    if (p.startsWith('/api/')) return json({ error: 'unauthorised' }, 401);
    return new Response(null, { status: 303, headers: { location: '/login' } });
  }
  ctx.waitUntil(rememberOwnIp(request, env));

  // ---- Dashboard + API (you only) ----
  if (p === '/' && m === 'GET') return html(DASHBOARD);

  if (p === '/api/emails' && m === 'GET') {
    const ws = url.searchParams.get('ws') || 'all';
    const { results } = await env.DB.prepare(
      `SELECT e.*,
        COALESCE(SUM(CASE WHEN v.type='open' AND v.flag IS NULL THEN 1 END),0) AS opens,
        COALESCE(SUM(CASE WHEN v.type='open' AND v.flag='auto' THEN 1 END),0) AS auto_opens,
        COALESCE(SUM(CASE WHEN v.type='click' AND v.flag IS NULL THEN 1 END),0) AS clicks,
        COALESCE(SUM(CASE WHEN v.type='click' AND v.flag='auto' THEN 1 END),0) AS auto_clicks,
        MIN(CASE WHEN v.type='open' AND v.flag IS NULL THEN v.at END) AS first_open,
        MAX(v.at) AS last_at
      FROM emails e LEFT JOIN events v ON v.email_id=e.id AND (v.flag IS NULL OR v.flag <> 'self')
      WHERE (?1='all' OR e.workspace=?1)
      GROUP BY e.id ORDER BY e.created_at DESC LIMIT 1000`).bind(ws).all();
    const feed = await env.DB.prepare(
      `SELECT v.id, v.email_id, v.type, v.link_index, v.at, v.org, v.country, v.city, v.flag,
              e.recipient, e.company, e.subject, e.workspace, e.links
       FROM events v JOIN emails e ON e.id=v.email_id
       WHERE (v.flag IS NULL OR v.flag <> 'self') AND (?1='all' OR e.workspace=?1)
       ORDER BY v.at DESC LIMIT 60`).bind(ws).all();
    return json({ emails: results, feed: feed.results, base: url.origin, sender: env.SENDER_NAME || 'Simon Farrugia' });
  }

  if (p === '/api/emails' && m === 'POST') {
    const b = await request.json();
    const links = (Array.isArray(b.links) ? b.links : [])
      .map(l => ({ label: String(l.label || l.url || '').slice(0, 120), url: String(l.url || '').trim() }))
      .filter(l => /^https?:\/\/[^\s]+$/i.test(l.url)).slice(0, 20);
    const id = randomId(10);
    const row = {
      // no_grace: emails sent by IMN HQ (Simon never renders the pixel), so an instant open by the recipient still counts.
      id, created_at: b.no_grace ? Date.now() - GRACE_MS - 1000 : Date.now(),
      workspace: b.workspace === 'work' ? 'work' : 'imn',
      recipient: clip(b.recipient, 120), email: clip(b.email, 160), company: clip(b.company, 120),
      subject: clip(b.subject, 200), notes: clip(b.notes, 1000), links: JSON.stringify(links),
    };
    await env.DB.prepare('INSERT INTO emails (id, created_at, workspace, recipient, email, company, subject, notes, links) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)')
      .bind(row.id, row.created_at, row.workspace, row.recipient, row.email, row.company, row.subject, row.notes, row.links).run();
    return json({ ...row, status: 'sent', base: url.origin });
  }

  if ((mt = p.match(/^\/api\/emails\/([A-Za-z0-9]{6,20})$/))) {
    if (m === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM events WHERE email_id=?1').bind(mt[1]),
        env.DB.prepare('DELETE FROM emails WHERE id=?1').bind(mt[1]),
      ]);
      return json({ ok: true });
    }
    if (m === 'GET') {
      const email = await getEmail(env, mt[1]);
      if (!email) return json({ error: 'not found' }, 404);
      const { results } = await env.DB.prepare('SELECT id, type, link_index, at, org, country, city, ua, flag FROM events WHERE email_id=?1 ORDER BY at DESC LIMIT 300').bind(mt[1]).all();
      return json({ email, events: results, base: url.origin });
    }
  }
  if ((mt = p.match(/^\/api\/emails\/([A-Za-z0-9]{6,20})\/status$/)) && m === 'POST') {
    const b = await request.json();
    if (!STATUSES.includes(b.status)) return json({ error: 'bad status' }, 400);
    await env.DB.prepare('UPDATE emails SET status=?1 WHERE id=?2').bind(b.status, mt[1]).run();
    return json({ ok: true });
  }

  return new Response('Not found', { status: 404 });
}

// ---------- helpers ----------
async function getEmail(env, id) {
  return env.DB.prepare('SELECT * FROM emails WHERE id=?1').bind(id).first();
}

async function logEvent(request, env, emailId, type, linkIndex = null) {
  const email = await getEmail(env, emailId);
  if (!email) return;
  const now = Date.now();
  const cf = request.cf || {};
  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 300);
  const org = String(cf.asOrganization || '');
  let flag = null;
  const own = ip ? await env.DB.prepare('SELECT 1 AS x FROM own_ips WHERE ip=?1 AND last_seen > ?2').bind(ip, now - 14 * 86400000).first() : null;
  const hasAdminCookie = await isAuthed(request, env);
  if (hasAdminCookie || own || (type === 'open' && now - email.created_at < GRACE_MS)) {
    flag = 'self';
  } else if (type === 'open' && /apple/i.test(org)) {
    flag = 'auto'; // Apple Mail Privacy Protection pre-loads images
  } else if (type === 'click' && (SCANNER_RE.test(org) || !/mozilla/i.test(ua))) {
    flag = 'auto'; // corporate link scanners (Defender, Mimecast, etc.)
  }
  await env.DB.prepare('INSERT INTO events (email_id, type, link_index, at, ip, org, country, city, ua, flag) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)')
    .bind(emailId, type, linkIndex, now, ip, org.slice(0, 120), cf.country || null, cf.city || null, ua, flag).run();
}

async function rememberOwnIp(request, env) {
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip) return;
  await env.DB.prepare('INSERT INTO own_ips (ip, last_seen) VALUES (?1, ?2) ON CONFLICT(ip) DO UPDATE SET last_seen=?2').bind(ip, Date.now()).run();
}

async function isAuthed(request, env) {
  if (!env.ADMIN_KEY) return false;
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ') && safeEqual(auth.slice(7), env.ADMIN_KEY)) return true;
  const cookie = request.headers.get('cookie') || '';
  const mm = cookie.match(/(?:^|;\s*)mt=([a-f0-9]{64})/);
  return !!mm && safeEqual(mm[1], await sha256(env.ADMIN_KEY));
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mail-tracker:' + s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function randomId(n) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return [...bytes].map(b => chars[b % chars.length]).join('');
}
function clip(v, n) { return v == null ? null : String(v).trim().slice(0, n) || null; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }); }
function html(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer' } });
}

const BASE_CSS = `*{box-sizing:border-box}body{margin:0;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f6f5f2;color:#1d1d1b}
.wrap{max-width:440px;margin:12vh auto;padding:28px;background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.06),0 8px 30px rgba(0,0,0,.05)}
h1{font-size:22px;margin:0 0 8px}p{color:#55534e;margin:0 0 18px}button,input{font:inherit}
input{width:100%;padding:12px 14px;border:1px solid #d9d6cf;border-radius:10px;margin-bottom:12px}
.btn{display:block;width:100%;padding:13px 16px;border:0;border-radius:10px;cursor:pointer;font-weight:600;margin-bottom:10px}
.dark{background:#1d1d1b;color:#fff}.light{background:#efede8;color:#1d1d1b}.err{color:#b3261e}`;

function loginPage(msg) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Mail Tracker</title><style>${BASE_CSS}</style></head>
<body><form class="wrap" method="post" action="/login"><h1>Mail Tracker</h1><p>Enter your key to open the dashboard.</p>
${msg ? `<p class="err">${esc(msg)}</p>` : ''}<input type="password" name="key" autocomplete="current-password" placeholder="Admin key" autofocus required>
<button class="btn dark" type="submit">Open dashboard</button></form></body></html>`;
}

function replyPage(env, email, choice) {
  const sender = esc(env.SENDER_NAME || 'Simon Farrugia');
  const head = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Thanks</title><style>${BASE_CSS}</style></head><body><div class="wrap">`;
  if (!email) return head + `<h1>Link expired</h1><p>This link is no longer active. No action needed.</p></div></body></html>`;
  if (choice === 'not_interested') return head + `<h1>Got it, thanks</h1><p>Thanks for letting ${sender} know. You won't get any more follow-ups about this.</p></div></body></html>`;
  if (choice === 'interested') return head + `<h1>Great, thanks!</h1><p>${sender} has been notified and will be in touch shortly.</p></div></body></html>`;
  const name = email.recipient ? ', ' + esc(email.recipient.split(' ')[0]) : '';
  return head + `<h1>Thanks for the reply${name}</h1><p>Just tap one option. It goes straight to ${sender}.</p>
<form method="post"><button class="btn dark" name="choice" value="not_interested">Not interested, please don't follow up</button>
<button class="btn light" name="choice" value="interested">Actually, I'd like to chat</button></form></div></body></html>`;
}

// ---------- Dashboard (single page, no build step) ----------
const DASHBOARD = String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex">
<title>Mail Tracker</title>
<style>
:root{--bg:#f6f5f2;--card:#fff;--ink:#1d1d1b;--mute:#6b6860;--line:#e7e4dd;--accent:#1f5eff;--hot:#e0541d;--ok:#1f8a4c;--warn:#b7791f;--bad:#9b9890}
@media (prefers-color-scheme:dark){:root{--bg:#121211;--card:#1c1c1a;--ink:#f1efea;--mute:#a19e96;--line:#2e2d2a;--accent:#7aa2ff;--hot:#ff8a5b;--ok:#5cc98a;--warn:#e0b25c;--bad:#77746d}}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
button,input,select,textarea{font:inherit;color:inherit}
header{position:sticky;top:0;z-index:5;background:var(--bg);padding:14px 16px 10px;border-bottom:1px solid var(--line)}
.top{display:flex;align-items:center;gap:10px;max-width:1100px;margin:0 auto}
h1{font-size:18px;margin:0;flex:1;letter-spacing:-.01em}
.seg{display:flex;gap:4px;max-width:1100px;margin:10px auto 0;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:3px;width:fit-content}
.seg button{border:0;background:none;padding:6px 14px;border-radius:7px;cursor:pointer;color:var(--mute);font-weight:600}
.seg button.on{background:var(--ink);color:var(--bg)}
.btn{border:0;border-radius:9px;padding:9px 14px;font-weight:600;cursor:pointer;background:var(--ink);color:var(--bg)}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.btn.sm{padding:6px 10px;font-size:13px}
main{max-width:1100px;margin:0 auto;padding:16px}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:18px}
@media (max-width:700px){.kpis{grid-template-columns:repeat(3,1fr)}.kpis .k:nth-child(n+4){grid-column:span 1}}
.k{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px}
.k .v{font-size:24px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.k .l{font-size:12px;color:var(--mute)}
.grid{display:grid;grid-template-columns:1fr 340px;gap:16px}
@media (max-width:900px){.grid{grid-template-columns:1fr}}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);margin:4px 0 8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.row{display:flex;gap:10px;align-items:center;padding:11px 14px;border-top:1px solid var(--line);cursor:pointer}
.row:first-child{border-top:0}.row:hover{background:color-mix(in srgb,var(--ink) 3%,transparent)}
.who{flex:1;min-width:0}.who b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.who span{display:block;color:var(--mute);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.grid>*{min-width:0}
.who span.ws{display:inline;font-size:10px;color:var(--mute);margin-left:6px}
@media (max-width:600px){.row{flex-wrap:wrap}.who{flex-basis:calc(100% - 110px)}.nums{order:3;flex-basis:100%;gap:14px}}
.nums{display:flex;gap:12px;font-variant-numeric:tabular-nums;font-size:13px;color:var(--mute);white-space:nowrap}
.nums b{color:var(--ink)}
.pill{font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px;white-space:nowrap;border:1px solid currentColor}
.p-sent{color:var(--bad)}.p-opened{color:var(--accent)}.p-hot{color:var(--hot)}.p-clicked{color:var(--hot)}
.p-replied,.p-meeting,.p-interested{color:var(--ok)}.p-not_interested,.p-dead{color:var(--bad)}
.ws{font-size:10px;font-weight:700;color:var(--mute);border:1px solid var(--line);border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:2px}
.feed .row{cursor:pointer;font-size:14px}.feed .t{color:var(--mute);font-size:12px;white-space:nowrap}
.dot{width:8px;height:8px;border-radius:50%;flex:none}
.empty{padding:28px 16px;text-align:center;color:var(--mute)}
.search{width:100%;padding:9px 12px;border:1px solid var(--line);border-radius:9px;background:var(--card);margin-bottom:10px}
dialog{border:0;border-radius:16px;padding:0;width:min(560px,94vw);max-height:90vh;background:var(--card);color:var(--ink);box-shadow:0 20px 60px rgba(0,0,0,.25)}
dialog::backdrop{background:rgba(0,0,0,.4)}
.dlg{padding:20px;overflow:auto;max-height:90vh}
.dlg h3{margin:0 0 14px;font-size:18px}
label{display:block;font-size:13px;color:var(--mute);margin:10px 0 4px}
input[type=text],input[type=email],textarea,select{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:var(--bg)}
textarea{min-height:70px;resize:vertical}
.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}
.preview{border:1px dashed var(--line);border-radius:10px;padding:12px 14px;margin:10px 0;background:var(--bg);font-family:Calibri,Arial,sans-serif}
.note{font-size:13px;color:var(--mute);margin:8px 0}
.tl{list-style:none;padding:0;margin:10px 0}
.tl li{display:flex;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:14px}
.tl li .t{color:var(--mute);font-size:12px;min-width:110px}
.maybe{opacity:.55}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:10px;font-weight:600;opacity:0;transition:.2s;pointer-events:none;z-index:50}
.toast.on{opacity:1}
.chk{display:flex;gap:8px;align-items:center;margin-top:12px;font-size:14px;color:var(--ink)}
</style></head><body>
<header><div class="top"><h1>Mail Tracker</h1><button class="btn" id="newBtn">+ New tracked email</button></div>
<div class="seg" id="seg"><button data-ws="all" class="on">All</button><button data-ws="work">Work</button><button data-ws="imn">IMN</button></div></header>
<main>
  <div class="kpis" id="kpis"></div>
  <div class="grid">
    <section><h2>Emails</h2><input class="search" id="q" placeholder="Search name, company, subject"><div class="card" id="list"></div></section>
    <aside><h2>Follow-ups due</h2><div class="card" id="due" style="margin-bottom:16px"></div><h2>Hot right now</h2><div class="card" id="hot" style="margin-bottom:16px"></div><h2>Live activity</h2><div class="card feed" id="feed"></div></aside>
  </div>
</main>

<dialog id="newDlg"><form class="dlg" id="newForm" method="dialog">
  <h3>New tracked email</h3>
  <div class="two"><div><label>For</label><select name="workspace"><option value="imn">IMN</option><option value="work">Work</option></select></div>
  <div><label>Recipient name</label><input type="text" name="recipient" placeholder="Jane Smith"></div></div>
  <div class="two"><div><label>Company</label><input type="text" name="company"></div><div><label>Email (optional)</label><input type="email" name="email"></div></div>
  <label>Subject</label><input type="text" name="subject" placeholder="So you know which email it is">
  <label>Links to track (optional, one per line: <i>Text | https://…</i>)</label>
  <textarea name="links" placeholder="Book a 15-min call | https://calendly.com/…&#10;See our work | https://imnetwork.com.au"></textarea>
  <label class="chk"><input type="checkbox" name="reply" checked> Add one-click "Not interested?" line</label>
  <label>That line's wording</label><input type="text" name="replyText" value="Not the right time? Let me know in one click and I won't follow up.">
  <label>Notes (only you see these)</label><input type="text" name="notes">
  <div class="actions"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn" id="createBtn" value="default">Create &amp; get snippet</button></div>
</form></dialog>

<dialog id="detDlg"><div class="dlg" id="det"></div></dialog>
<div class="toast" id="toast"></div>

<script>
var WS = localStorage.getItem('mt-ws') || 'all';
var DUE = [];
function fuText(e) {
  var first = e.recipient ? e.recipient.split(' ')[0] : 'there', links = [];
  try { links = JSON.parse(e.links || '[]'); } catch (x) {}
  var link = links.length ? DATA.base + '/l/' + e.id + '/0' : '';
  var L = link ? '\n\n' + link : '';
  if (e.fuStep === 2) return 'Hi ' + first + ',\n\nLast one from me, I promise. If the timing is not right, no stress at all.' + (link ? ' The report is here if you ever want it: ' + link : '') + '\n\nIf you would like a hand, just reply "yes" and I will take care of the rest.\n\nCheers,\nSimon';
  if (e.clicks || e.opens) return 'Hi ' + first + ',\n\nSaw you had a look at what I sent through. Any questions? Happy to fix the most urgent issue for free so you can see the difference before deciding anything.' + L + '\n\nCheers,\nSimon';
  return 'Hi ' + first + ',\n\nJust bumping this in case it got buried. I put together a quick health check on your website, with a few easy fixes that could bring in more enquiries.' + L + '\n\nCheers,\nSimon';
}
var DATA = { emails: [], feed: [], base: location.origin, sender: '' };
var $ = function (s) { return document.querySelector(s); };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function ago(t) { if (!t) return ''; var s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; if (s < 604800) return Math.floor(s / 86400) + 'd ago'; return new Date(t).toLocaleDateString(); }
function when(t) { return new Date(t).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }
function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('on'); setTimeout(function () { t.classList.remove('on'); }, 1800); }
function api(path, opts) { opts = opts || {}; opts.headers = Object.assign({ 'content-type': 'application/json' }, opts.headers || {}); return fetch(path, opts).then(function (r) { if (r.status === 401) { location.href = '/login'; throw new Error('auth'); } return r.json(); }); }

function stage(e) {
  if (['replied', 'meeting', 'interested', 'not_interested', 'dead'].indexOf(e.status) >= 0) return e.status;
  if (e.clicks > 0) return 'clicked';
  if (e.opens >= 3) return 'hot';
  if (e.opens > 0) return 'opened';
  return 'sent';
}
var LABEL = { fu1: 'Followed up', fu2: 'Followed up x2', sent: 'Not opened', opened: 'Opened', hot: 'Hot', clicked: 'Clicked', replied: 'Replied', meeting: 'Meeting', interested: 'Interested', not_interested: 'Not interested', dead: 'Closed' };

function load() {
  return api('/api/emails?ws=' + WS).then(function (d) { DATA = d; render(); });
}

function render() {
  var E = DATA.emails, n = E.length;
  var opened = E.filter(function (e) { return e.opens > 0; }).length;
  var clicked = E.filter(function (e) { return e.clicks > 0; }).length;
  var no = E.filter(function (e) { return e.status === 'not_interested'; }).length;
  var yes = E.filter(function (e) { return ['interested', 'replied', 'meeting'].indexOf(e.status) >= 0; }).length;
  function pct(x) { return n ? Math.round(x / n * 100) + '%' : '–'; }
  $('#kpis').innerHTML = [
    ['Tracked', n, ''], ['Opened', opened, pct(opened)], ['Clicked', clicked, pct(clicked)], ['Positive', yes, pct(yes)], ['Not interested', no, pct(no)]
  ].map(function (k) { return '<div class="k"><div class="v">' + k[1] + '</div><div class="l">' + k[0] + (k[2] ? ' · ' + k[2] : '') + '</div></div>'; }).join('');

  var q = ($('#q').value || '').toLowerCase();
  var list = E.filter(function (e) { return !q || [e.recipient, e.company, e.subject, e.email].join(' ').toLowerCase().indexOf(q) >= 0; });
  $('#list').innerHTML = list.length ? list.map(rowHtml).join('') : '<div class="empty">' + (n ? 'No matches.' : 'No tracked emails yet. Tap <b>+ New tracked email</b> to make your first one.') + '</div>';

  var week = Date.now() - 7 * 86400000;
  var hot = E.filter(function (e) { return e.last_at && e.last_at > week && (e.opens >= 2 || e.clicks > 0 || e.status === 'interested') && ['not_interested', 'dead'].indexOf(e.status) < 0; })
    .sort(function (a, b) { return (b.clicks * 3 + b.opens) - (a.clicks * 3 + a.opens) || b.last_at - a.last_at; }).slice(0, 6);
  $('#hot').innerHTML = hot.length ? hot.map(rowHtml).join('') : '<div class="empty">Nobody hot yet. People who open 2+ times or click show up here.</div>';

  var DAY = 86400000, now = Date.now();
  DUE = E.filter(function (e) { var age = now - e.created_at; return (e.status === 'sent' && age >= 3 * DAY) || (e.status === 'fu1' && age >= 7 * DAY); })
    .map(function (e) { e.fuStep = e.status === 'sent' ? 1 : 2; return e; })
    .sort(function (a, b) { return (b.clicks * 3 + b.opens) - (a.clicks * 3 + a.opens) || a.created_at - b.created_at; }).slice(0, 15);
  $('#due').innerHTML = DUE.length ? DUE.map(function (e, i) {
    var why = e.clicks ? 'clicked, so chase now' : e.opens ? 'opened ' + e.opens + 'x' : 'not opened yet';
    return '<div class="row" style="cursor:default"><div class="who"><b>' + esc(e.recipient || e.company || 'Unnamed') + '</b><span>Follow-up ' + e.fuStep + ' · ' + why + ' · sent ' + ago(e.created_at) + '</span></div><button class="btn sm ghost" data-fucopy="' + i + '">Copy</button><button class="btn sm" data-fudone="' + i + '">Done</button></div>';
  }).join('') : '<div class="empty">No follow-ups due. Day 3 and Day 7 nudges show up here.</div>';

  $('#feed').innerHTML = DATA.feed.length ? DATA.feed.map(function (v) {
    var col = v.type === 'open' ? 'var(--accent)' : v.type === 'click' ? 'var(--hot)' : v.type === 'interested' ? 'var(--ok)' : 'var(--bad)';
    var what = v.type === 'open' ? 'opened' : v.type === 'click' ? 'clicked ' + esc(linkLabel(v.links, v.link_index)) : v.type === 'interested' ? 'wants to chat' : 'said not interested';
    var loc = [v.city, v.country].filter(Boolean).join(', ');
    return '<div class="row ' + (v.flag === 'auto' ? 'maybe' : '') + '" data-id="' + v.email_id + '"><span class="dot" style="background:' + col + '"></span><div class="who"><b>' + esc(v.recipient || v.company || 'Unknown') + ' ' + what + '</b><span>' + esc(v.subject || '') + (loc ? ' · ' + esc(loc) : '') + (v.flag === 'auto' ? ' · maybe automated' : '') + '</span></div><span class="t">' + ago(v.at) + '</span></div>';
  }).join('') : '<div class="empty">Opens and clicks appear here live.</div>';
}

function linkLabel(links, i) { try { var l = JSON.parse(links || '[]')[i]; return l ? '"' + l.label + '"' : 'a link'; } catch (e) { return 'a link'; } }

function rowHtml(e) {
  var s = stage(e);
  return '<div class="row" data-id="' + e.id + '"><div class="who"><b>' + esc(e.recipient || e.email || 'Unnamed') + (WS === 'all' ? '<span class="ws">' + (e.workspace === 'work' ? 'WORK' : 'IMN') + '</span>' : '') + '</b><span>' + esc([e.company, e.subject].filter(Boolean).join(' · ') || ('Created ' + ago(e.created_at))) + '</span></div>' +
    '<div class="nums"><span title="Opens"><b>' + e.opens + '</b>' + (e.auto_opens ? '+' + e.auto_opens : '') + ' opens</span><span title="Clicks"><b>' + e.clicks + '</b> clicks</span></div>' +
    '<span class="pill p-' + s + '">' + LABEL[s] + '</span></div>';
}

document.addEventListener('click', function (ev) {
  var fc = ev.target.getAttribute('data-fucopy'), fd = ev.target.getAttribute('data-fudone');
  if (fc != null) { var t = fuText(DUE[+fc]); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Follow-up copied. Reply in the same thread'); }).catch(function () { prompt('Copy this follow-up:', t); }); return; }
  if (fd != null) { var e = DUE[+fd]; api('/api/emails/' + e.id + '/status', { method: 'POST', body: JSON.stringify({ status: e.fuStep === 1 ? 'fu1' : 'fu2' }) }).then(function () { toast('Marked as followed up'); load(); }); return; }
  var r = ev.target.closest('.row[data-id]'); if (r) openDetail(r.getAttribute('data-id'));
});
$('#seg').addEventListener('click', function (ev) {
  var b = ev.target.closest('button'); if (!b) return; WS = b.getAttribute('data-ws'); localStorage.setItem('mt-ws', WS);
  [].forEach.call(document.querySelectorAll('#seg button'), function (x) { x.classList.toggle('on', x === b); }); load();
});
$('#q').addEventListener('input', render);

// ---- New email ----
$('#newBtn').onclick = function () { var f = $('#newForm'); f.reset(); if (WS !== 'all') f.workspace.value = WS; $('#newDlg').showModal(); };
$('#newForm').addEventListener('submit', function (ev) {
  if (ev.submitter && ev.submitter.value === 'cancel') return;
  ev.preventDefault();
  var f = ev.target;
  var links = f.links.value.split('\n').map(function (line) { var parts = line.split('|'); var url = (parts.length > 1 ? parts.slice(1).join('|') : parts[0]).trim(); var label = parts.length > 1 ? parts[0].trim() : url; return { label: label, url: url }; }).filter(function (l) { return /^https?:\/\//i.test(l.url); });
  var body = { workspace: f.workspace.value, recipient: f.recipient.value, company: f.company.value, email: f.email.value, subject: f.subject.value, notes: f.notes.value, links: links };
  var opts = { reply: f.reply.checked, replyText: f.replyText.value };
  localStorage.setItem('mt-reply', JSON.stringify(opts));
  api('/api/emails', { method: 'POST', body: JSON.stringify(body) }).then(function (e) {
    $('#newDlg').close(); load(); showSnippet(e, opts, true);
  });
});

function snippetHtml(e, opts, forPreview) {
  var base = e.base || DATA.base, links = JSON.parse(e.links || '[]'), out = '';
  links.forEach(function (l, i) { out += '<p style="margin:0 0 8px"><a href="' + base + '/l/' + e.id + '/' + i + '" style="color:#1f5eff">' + esc(l.label) + '</a></p>'; });
  if (opts.reply) {
    var txt = esc(opts.replyText || "Not the right time? Let me know in one click and I won't follow up.");
    var m = txt.match(/^(.*?)(let me know in one click|let me know|one click)(.*)$/i);
    var line = m ? m[1] + '<a href="' + base + '/x/' + e.id + '" style="color:#777">' + m[2] + '</a>' + m[3] : txt + ' <a href="' + base + '/x/' + e.id + '" style="color:#777">Click here</a>';
    out += '<p style="margin:12px 0 0;font-size:12px;color:#777">' + line + '</p>';
  }
  out += forPreview ? '' : '<img src="' + base + '/o/' + e.id + '.gif" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">';
  return out;
}

function copyRich(htmlStr) {
  var text = htmlStr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
    return navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([htmlStr], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]).then(function () { toast('Copied. Paste at the bottom of your email'); }).catch(function () { fallbackCopy(htmlStr); });
  }
  fallbackCopy(htmlStr);
}
function fallbackCopy(htmlStr) {
  var d = document.createElement('div'); d.contentEditable = 'true'; d.innerHTML = htmlStr; d.style.position = 'fixed'; d.style.left = '-9999px'; document.body.appendChild(d);
  var r = document.createRange(); r.selectNodeContents(d); var s = getSelection(); s.removeAllRanges(); s.addRange(r);
  try { document.execCommand('copy'); toast('Copied. Paste at the bottom of your email'); } catch (e) { toast('Copy failed. Select the preview and copy it'); }
  s.removeAllRanges(); d.remove();
}

function showSnippet(e, opts, fresh) {
  var base = e.base || DATA.base;
  var links = JSON.parse(e.links || '[]');
  $('#det').innerHTML = '<h3>' + (fresh ? 'Ready. Paste this into your email' : 'Tracking snippet') + '</h3>' +
    '<p class="note">Write your email as normal in Outlook or Gmail, then paste this at the very bottom (under your signature is fine). It holds the invisible open tracker' + (links.length ? ', your tracked links' : '') + (opts.reply ? ' and the one-click reply line' : '') + '.</p>' +
    '<div class="preview">' + (snippetHtml(e, opts, true) || '<span class="note">(Invisible tracker only, nothing visible)</span>') + '</div>' +
    '<div class="actions" style="justify-content:flex-start"><button class="btn" id="cpAll">Copy for email</button>' +
    (links.length ? '<button class="btn ghost" id="cpLinks">Copy links only</button>' : '') +
    (opts.reply ? '<button class="btn ghost" id="cpX">Copy reply link</button>' : '') + '<button class="btn ghost" id="done">Done</button></div>' +
    '<p class="note">Tip: send it within a minute or two of pasting. Opens in the first 90 seconds, or from any device you open this dashboard on, are treated as you and ignored.</p>';
  if (!$('#detDlg').open) $('#detDlg').showModal();
  $('#cpAll').onclick = function () { copyRich(snippetHtml(e, opts, false)); };
  if ($('#cpLinks')) $('#cpLinks').onclick = function () { navigator.clipboard.writeText(links.map(function (l, i) { return l.label + ': ' + base + '/l/' + e.id + '/' + i; }).join('\n')).then(function () { toast('Links copied'); }); };
  if ($('#cpX')) $('#cpX').onclick = function () { navigator.clipboard.writeText(base + '/x/' + e.id).then(function () { toast('Reply link copied'); }); };
  $('#done').onclick = function () { $('#detDlg').close(); };
}

function openDetail(id) {
  api('/api/emails/' + id).then(function (d) {
    var e = d.email; e.base = d.base;
    var ev = d.events.filter(function (v) { return v.flag !== 'self'; });
    var selfN = d.events.length - ev.length;
    var opts = JSON.parse(localStorage.getItem('mt-reply') || '{"reply":true}');
    var items = ev.map(function (v) {
      var what = v.type === 'open' ? 'Opened' : v.type === 'click' ? 'Clicked ' + esc(linkLabel(e.links, v.link_index)) : v.type === 'interested' ? 'Tapped "I\'d like to chat"' : 'Tapped "Not interested"';
      var where = [v.city, v.country].filter(Boolean).join(', ');
      var dev = /iphone|ipad/i.test(v.ua) ? 'iPhone/iPad' : /android/i.test(v.ua) ? 'Android' : /windows/i.test(v.ua) ? 'Windows' : /mac os/i.test(v.ua) ? 'Mac' : /googleimageproxy/i.test(v.ua) ? 'Gmail' : '';
      return '<li class="' + (v.flag === 'auto' ? 'maybe' : '') + '"><span class="t">' + when(v.at) + '</span><span>' + what + '<br><span class="note">' + esc([where, dev, v.org].filter(Boolean).join(' · ')) + (v.flag === 'auto' ? ' · probably automated (Apple privacy or a security scanner)' : '') + '</span></span></li>';
    }).join('');
    var sel = ['sent', 'fu1', 'fu2', 'replied', 'meeting', 'interested', 'not_interested', 'dead'].map(function (s) { return '<option value="' + s + '"' + (e.status === s ? ' selected' : '') + '>' + (s === 'sent' ? 'Sent (auto)' : LABEL[s]) + '</option>'; }).join('');
    $('#det').innerHTML = '<h3>' + esc(e.recipient || e.email || 'Unnamed') + ' <span class="ws">' + (e.workspace === 'work' ? 'WORK' : 'IMN') + '</span></h3>' +
      '<p class="note">' + esc([e.company, e.email].filter(Boolean).join(' · ')) + '<br>' + esc(e.subject || '') + '<br>Created ' + when(e.created_at) + '</p>' +
      (e.notes ? '<p class="note"><b>Notes:</b> ' + esc(e.notes) + '</p>' : '') +
      '<label>Status</label><select id="st">' + sel + '</select>' +
      '<h2 style="margin-top:16px">Timeline</h2><ul class="tl">' + (items || '<li><span class="note">No opens yet.</span></li>') + '</ul>' +
      (selfN ? '<p class="note">' + selfN + ' of your own views ignored.</p>' : '') +
      '<div class="actions"><button class="btn ghost" id="del">Delete</button><button class="btn ghost" id="snip">Get snippet again</button><button class="btn" id="cl">Close</button></div>';
    if (!$('#detDlg').open) $('#detDlg').showModal();
    $('#st').onchange = function () { api('/api/emails/' + id + '/status', { method: 'POST', body: JSON.stringify({ status: this.value }) }).then(function () { toast('Status updated'); load(); }); };
    $('#cl').onclick = function () { $('#detDlg').close(); };
    $('#snip').onclick = function () { showSnippet(e, opts, false); };
    $('#del').onclick = function () { if (confirm('Delete this email and its tracking history?')) api('/api/emails/' + id, { method: 'DELETE' }).then(function () { $('#detDlg').close(); load(); }); };
  });
}

[].forEach.call(document.querySelectorAll('#seg button'), function (x) { x.classList.toggle('on', x.getAttribute('data-ws') === WS); });
load();
setInterval(function () { if (!document.hidden && !$('#detDlg').open && !$('#newDlg').open) load(); }, 20000);
document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
</script></body></html>`;
