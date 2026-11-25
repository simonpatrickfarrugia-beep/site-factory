// IMN Website Health Check: free site scanner that captures leads + feeds cold outreach.
// Bindings: DB (D1 "health-check"), ADMIN_KEY (secret)
// Optional vars: BRAND_NAME, BRAND_URL, BRAND_COLOR, OFFER_TEXT, NOTIFY_WEBHOOK (POSTed JSON on each new lead)
import { runScan, normaliseUrl, CATEGORIES } from './checks.js';

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, url TEXT NOT NULL, host TEXT NOT NULL, total INTEGER, grade TEXT, data TEXT NOT NULL, gated INTEGER NOT NULL DEFAULT 1, source TEXT, ip TEXT, views INTEGER NOT NULL DEFAULT 0, last_view INTEGER)',
  'CREATE INDEX IF NOT EXISTS idx_reports_host ON reports(host, created_at)',
  'CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL, report_id TEXT, name TEXT, email TEXT, phone TEXT, business TEXT, host TEXT, total INTEGER)',
  'CREATE TABLE IF NOT EXISTS scans_by_ip (ip TEXT NOT NULL, at INTEGER NOT NULL)',
];
let ready = false;
const PUBLIC_LIMIT_PER_HOUR = 8;

export default {
  async fetch(request, env, ctx) {
    try {
      if (!ready) { await env.DB.batch(SCHEMA.map(s => env.DB.prepare(s))); ready = true; }
      return await route(request, env, ctx);
    } catch (e) {
      console.error(e);
      return new Response('Something went wrong', { status: 500 });
    }
  },
};

function brand(env) {
  return {
    name: env.BRAND_NAME || 'Independent Media Network',
    short: env.BRAND_SHORT || 'IMN',
    url: env.BRAND_URL || 'https://imnetwork.com.au',
    color: env.BRAND_COLOR || '#1f5eff',
    offer: env.OFFER_TEXT || 'We fix every issue on this list, then monitor your website every day, all for $99 + GST a month with no lock-in contract.',
  };
}

async function route(request, env, ctx) {
  const url = new URL(request.url), p = url.pathname, m = request.method;
  const ip = request.headers.get('cf-connecting-ip') || '';
  const B = brand(env);
  let mt;

  const pub = (env.PUBLIC_URL || url.origin).replace(/\/$/, '');

  // One free website check (merged 26 Nov 2026): the public front door is the IMN Labs page, which runs on this engine.
  if (p === '/' && m === 'GET') {
    const q = url.searchParams.get('url');
    return Response.redirect(LAB_URL + (q ? '?url=' + encodeURIComponent(q) : ''), 302);
  }

  // Engine for imnetwork.com.au/labs/website-check (the imn site Worker calls it over a service binding, passing the
  // visitor's cf-connecting-ip). Stores an open (ungated) report so the result has a shareable full report.
  if (p === '/api/check' && m === 'GET') {
    const admin = await isAuthed(request, env);
    let target;
    try { target = normaliseUrl(url.searchParams.get('url')); } catch (e) { return json({ ok: false, message: e.message }, 400); }
    const host = new URL(target).hostname;
    const recent = await env.DB.prepare('SELECT id, data FROM reports WHERE host=?1 AND created_at>?2 AND gated=0 ORDER BY created_at DESC LIMIT 1').bind(host, Date.now() - 1800e3).first();
    if (recent) return json(labShape(JSON.parse(recent.data), pub + '/r/' + recent.id, recent.id));
    if (!admin) {
      const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM scans_by_ip WHERE ip=?1 AND at>?2').bind(ip, Date.now() - 3600e3).first();
      if (c && c.n >= PUBLIC_LIMIT_PER_HOUR) return json({ ok: false, message: "You've run a lot of checks. Please try again in an hour." }, 429);
      ctx.waitUntil(env.DB.batch([
        env.DB.prepare('INSERT INTO scans_by_ip (ip, at) VALUES (?1, ?2)').bind(ip, Date.now()),
        env.DB.prepare('DELETE FROM scans_by_ip WHERE at<?1').bind(Date.now() - 86400e3),
      ]));
    }
    let scan;
    try { scan = await runScan(target); } catch (e) { return json({ ok: false, message: e.message || 'Something went wrong. Please try again.' }); }
    const id = randomId(8);
    await env.DB.prepare('INSERT INTO reports (id, created_at, url, host, total, grade, data, gated, source, ip) VALUES (?1,?2,?3,?4,?5,?6,?7,0,?8,?9)')
      .bind(id, Date.now(), scan.url, scan.host, scan.result.total, scan.result.grade, JSON.stringify(scan), admin ? 'outreach' : 'lab', '').run();
    return json(labShape(scan, pub + '/r/' + id, id));
  }

  if (p === '/api/scan' && m === 'POST') {
    const admin = await isAuthed(request, env);
    if (!admin) return json({ error: 'The free website check is at ' + LAB_URL }, 410);
    const body = await request.json().catch(() => ({}));
    let target;
    try { target = normaliseUrl(body.url); } catch (e) { return json({ error: e.message }, 400); }
    let scan;
    try { scan = await runScan(target); } catch (e) { return json({ error: e.message || 'Scan failed' }, 422); }
    const id = randomId(8);
    await env.DB.prepare('INSERT INTO reports (id, created_at, url, host, total, grade, data, gated, source, ip) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)')
      .bind(id, Date.now(), scan.url, scan.host, scan.result.total, scan.result.grade, JSON.stringify(scan), body.gated ? 1 : 0, 'outreach', ip).run();
    return json({ id, total: scan.result.total, grade: scan.result.grade, host: scan.host, link: pub + '/r/' + id });
  }

  if ((mt = p.match(/^\/r\/([A-Za-z0-9]{6,16})$/)) && m === 'GET') {
    const r = await env.DB.prepare('SELECT * FROM reports WHERE id=?1').bind(mt[1]).first();
    if (!r) return html(simplePage(B, 'Report not found', 'This report has expired. <a href="/">Run a new free check</a>.'), 404);
    const admin = await isAuthed(request, env);
    if (!admin) ctx.waitUntil(env.DB.prepare('UPDATE reports SET views=views+1, last_view=?1 WHERE id=?2').bind(Date.now(), r.id).run());
    return html(reportPage(B, r, JSON.parse(r.data), !r.gated || admin));
  }

  if ((mt = p.match(/^\/api\/unlock\/([A-Za-z0-9]{6,16})$/)) && m === 'POST') {
    const r = await env.DB.prepare('SELECT id, host, total FROM reports WHERE id=?1').bind(mt[1]).first();
    if (!r) return json({ error: 'not found' }, 404);
    const b = await request.json().catch(() => ({}));
    const email = String(b.email || '').trim().slice(0, 160);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Please enter a valid email' }, 400);
    const lead = { name: clip(b.name, 100), email, phone: clip(b.phone, 40), business: clip(b.business, 120) };
    await env.DB.batch([
      env.DB.prepare('INSERT INTO leads (created_at, report_id, name, email, phone, business, host, total) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)').bind(Date.now(), r.id, lead.name, lead.email, lead.phone, lead.business, r.host, r.total),
      env.DB.prepare('UPDATE reports SET gated=0 WHERE id=?1').bind(r.id),
    ]);
    if (env.NOTIFY_WEBHOOK) ctx.waitUntil(fetch(env.NOTIFY_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'health_check_lead', ...lead, site: r.host, score: r.total, report: url.origin + '/r/' + r.id }) }).catch(() => {}));
    return json({ ok: true });
  }

  // ---- Admin ----
  if (p === '/login') {
    if (m === 'POST') {
      const form = await request.formData();
      if (env.ADMIN_KEY && safeEqual(String(form.get('key') || ''), env.ADMIN_KEY)) {
        return new Response(null, { status: 303, headers: { location: '/admin', 'set-cookie': 'hc=' + (await sha256(env.ADMIN_KEY)) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7776000' } });
      }
      return html(loginPage(B, "That key didn't match."), 401);
    }
    return html(loginPage(B, env.ADMIN_KEY ? '' : 'Set the ADMIN_KEY secret first.'));
  }
  if (!(await isAuthed(request, env))) {
    if (p.startsWith('/api/')) return json({ error: 'unauthorised' }, 401);
    if (p === '/admin') return new Response(null, { status: 303, headers: { location: '/login' } });
    return new Response('Not found', { status: 404 });
  }
  if (p === '/admin' && m === 'GET') return html(ADMIN_PAGE.replace('__BRAND__', esc(B.short)));
  if (p === '/api/admin' && m === 'GET') {
    const reports = await env.DB.prepare('SELECT id, created_at, url, host, total, grade, gated, source, views, last_view FROM reports ORDER BY created_at DESC LIMIT 300').all();
    const leads = await env.DB.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT 300').all();
    return json({ reports: reports.results, leads: leads.results, origin: pub, tracker: trackerOn(env) });
  }
  if (p === '/api/outreach' && m === 'POST') {
    const b = await request.json().catch(() => ({}));
    let target;
    try { target = normaliseUrl(b.url); } catch (e) { return json({ error: e.message }, 400); }
    let scan;
    try { scan = await runScan(target); } catch (e) { return json({ error: e.message || 'Scan failed' }, 422); }
    const id = randomId(8);
    await env.DB.prepare('INSERT INTO reports (id, created_at, url, host, total, grade, data, gated, source, ip) VALUES (?1,?2,?3,?4,?5,?6,?7,0,?8,?9)')
      .bind(id, Date.now(), scan.url, scan.host, scan.result.total, scan.result.grade, JSON.stringify(scan), 'outreach', ip).run();
    const reportLink = pub + '/r/' + id;
    const o = { name: clip(b.name, 100), business: clip(b.business, 120), email: clip(b.email, 160), host: scan.host, total: scan.result.total, fixes: scan.result.fixes.length, urgent: scan.result.fixes.filter(f => f.max - f.pts >= 5).length };
    const subject = `Quick one about ${o.business || o.host}'s website`;
    let link = reportLink, pixel = '', optout = '', trackerId = null, trackerError = null;
    if (b.track !== false && trackerOn(env)) {
      try {
        const t = await trackerCall(env, '/api/emails', { workspace: 'imn', recipient: o.name, company: o.business || o.host, email: o.email, subject: `Health check: ${o.host} ${o.total}/100`, notes: `Outreach via health check. ${o.fixes} issues, ${o.urgent} urgent.`, links: [{ label: 'Website report', url: reportLink }] });
        const base = (env.MT_PUBLIC_URL || '').replace(/\/$/, '');
        trackerId = t.id; link = `${base}/l/${t.id}/0`; pixel = `${base}/o/${t.id}.gif`; optout = `${base}/x/${t.id}`;
      } catch (e) { trackerError = 'Mail Tracker not reachable, so this email is untracked: ' + e.message; }
    }
    return json({ id, ...o, reportLink, trackedLink: link, trackerId, trackerError, subject, ...composeEmail(o, link, pixel, optout, env.SENDER_FIRST || 'Simon'), check: labShape(scan, reportLink, id) });
  }
  if ((mt = p.match(/^\/api\/reports\/([A-Za-z0-9]{6,16})$/)) && m === 'DELETE') {
    await env.DB.prepare('DELETE FROM reports WHERE id=?1').bind(mt[1]).run();
    return json({ ok: true });
  }
  return new Response('Not found', { status: 404 });
}

const LAB_URL = 'https://imnetwork.com.au/labs/website-check';

/** A scan in the shape the IMN Labs page and IMN HQ use: checks with pass/warn/fail, top 3 fixes, plus the full report link. */
function labShape(scan, link, id) {
  const R = scan.result, f = scan.facts;
  const status = (i) => (i.ok ? 'pass' : i.pts > 0 ? 'warn' : 'fail');
  const rank = { fail: 0, warn: 1, pass: 2 };
  const fixes = R.items.filter((i) => !i.ok)
    .sort((a, b) => rank[status(a)] - rank[status(b)] || (b.max - b.pts) - (a.max - a.pts))
    .slice(0, 3).map((i) => ({ id: i.id, label: i.title, fix: i.fix }));
  return {
    ok: true, url: scan.url, finalUrl: scan.finalUrl || scan.url, host: scan.host, checkedAt: new Date(scan.fetchedAt).toISOString(),
    score: R.total, grade: R.grade, ms: f.ttfb, kb: f.htmlKb,
    checks: R.items.map((i) => ({ id: i.id, label: i.title, status: status(i), detail: i.why, fix: i.fix })),
    fixes, issues: R.fixes.length, cats: R.cats.map((c) => ({ key: c.key, label: c.label, score: c.score })),
    report: link, reportId: id,
  };
}

// ---------- outreach + Mail Tracker link ----------
function trackerOn(env) { return !!((env.MAIL_TRACKER || env.MT_URL) && env.MT_KEY && env.MT_PUBLIC_URL); }
async function trackerCall(env, path, body) {
  const init = { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.MT_KEY }, body: JSON.stringify(body) };
  const res = env.MAIL_TRACKER ? await env.MAIL_TRACKER.fetch(new Request('https://mail-tracker' + path, init)) : await fetch(env.MT_URL.replace(/\/$/, '') + path, init);
  if (!res.ok) throw new Error('status ' + res.status);
  return res.json();
}
function composeEmail(o, link, pixel, optout, sender) {
  const first = o.name ? o.name.split(' ')[0] : 'there';
  const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const urgentLine = o.urgent >= 2 ? ` ${words[o.urgent] || o.urgent} of them are costing you enquiries right now.` : o.urgent === 1 ? ' One of them is fairly urgent.' : '';
  const verdict = o.total < 50 ? 'There are some quick fixes that could bring in noticeably more enquiries.' : o.total < 75 ? "It's in decent shape, but a few quick fixes could bring in more enquiries." : "It's in good shape, with a couple of small wins available.";
  const p1 = `I ran ${o.host} through our free website health check and it scored ${o.total}/100. ${verdict}${urgentLine}`;
  const text = `Hi ${first},\n\n${p1}\n\nHere's your report (no sign-up needed): ${link}\n\nHappy to walk you through it in 10 minutes if that's useful.\n\nCheers,\n${sender}` + (optout ? `\n\nNot the right time? Let me know in one click and I won't follow up: ${optout}` : '');
  const html = `<p>Hi ${esc(first)},</p><p>${esc(p1)}</p><p><a href="${esc(link)}"><b>View your website report</b></a> (no sign-up needed)</p><p>Happy to walk you through it in 10 minutes if that's useful.</p><p>Cheers,<br>${esc(sender)}</p>` +
    (optout ? `<p style="font-size:12px;color:#777">Not the right time? <a href="${esc(optout)}" style="color:#777">Let me know in one click</a> and I won't follow up.</p>` : '') +
    (pixel ? `<img src="${esc(pixel)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">` : '');
  return { text, html };
}

// ---------- helpers ----------
async function isAuthed(request, env) {
  if (!env.ADMIN_KEY) return false;
  const a = request.headers.get('authorization') || '';
  if (a.startsWith('Bearer ') && safeEqual(a.slice(7), env.ADMIN_KEY)) return true;
  const c = (request.headers.get('cookie') || '').match(/(?:^|;\s*)hc=([a-f0-9]{64})/);
  return !!c && safeEqual(c[1], await sha256(env.ADMIN_KEY));
}
async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('health-check:' + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
function safeEqual(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
function randomId(n) { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; return [...crypto.getRandomValues(new Uint8Array(n))].map(b => c[b % c.length]).join(''); }
function clip(v, n) { return v == null ? null : String(v).trim().slice(0, n) || null; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function json(d, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }); }
function html(b, s = 200) { return new Response(b, { status: s, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'strict-origin-when-cross-origin' } }); }

function css(B) {
  return `:root{--brand:${B.color};--ink:#16181d;--mute:#5f6470;--line:#e6e8ee;--bg:#f5f6f8;--card:#fff;--good:#14895a;--ok:#c58a00;--bad:#d4380d}
*{box-sizing:border-box}body{margin:0;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
a{color:var(--brand)}button,input{font:inherit}
.nav{display:flex;align-items:center;justify-content:space-between;max-width:960px;margin:0 auto;padding:18px 20px}
.logo{font-weight:800;letter-spacing:-.02em;color:var(--ink);text-decoration:none}.logo span{color:var(--brand)}
.wrap{max-width:960px;margin:0 auto;padding:0 20px 60px}
.btn{display:inline-block;border:0;border-radius:12px;padding:14px 22px;font-weight:700;background:var(--brand);color:#fff;cursor:pointer;text-decoration:none;text-align:center}
.btn.dark{background:var(--ink)}.btn:disabled{opacity:.6;cursor:wait}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:24px}
input[type=text],input[type=email],input[type=tel],input[type=url],input[type=password]{width:100%;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:#fff}
.mute{color:var(--mute)}h1,h2,h3{letter-spacing:-.02em;line-height:1.15}
@media(max-width:520px){#unlock{grid-template-columns:1fr!important}#go{width:100%}}
footer{text-align:center;color:var(--mute);font-size:13px;padding:30px 20px}`;
}
function shell(B, title, body, extraHead = '') {
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<meta name="description" content="Free website health check for Australian businesses: speed, Google visibility, mobile, security and lead capture, scored out of 100 in 20 seconds.">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="Get your free website score out of 100 in 20 seconds.">${extraHead}
<style>${css(B)}</style></head><body><div class="nav"><a class="logo" href="${esc(B.url)}">${esc(B.short)}<span>.</span></a><a href="/" class="mute" style="text-decoration:none;font-size:14px">Free health check</a></div>${body}
<footer>Free website health check by <a href="${esc(B.url)}">${esc(B.name)}</a></footer></body></html>`;
}
function simplePage(B, title, msg) { return shell(B, title, `<div class="wrap"><div class="card" style="max-width:520px;margin:8vh auto"><h1>${esc(title)}</h1><p class="mute">${msg}</p></div></div>`); }
function loginPage(B, msg) {
  return shell(B, 'Admin', `<div class="wrap"><form class="card" method="post" action="/login" style="max-width:420px;margin:8vh auto"><h1 style="margin-top:0">Health Check admin</h1>${msg ? `<p style="color:var(--bad)">${esc(msg)}</p>` : ''}<input type="password" name="key" placeholder="Admin key" required autofocus><p><button class="btn dark" style="width:100%">Open</button></p></form></div>`);
}

function landingPage(B, prefill) {
  return shell(B, 'Free Website Health Check | ' + B.short, `
<div class="wrap" style="text-align:center;padding-top:6vh">
  <p style="display:inline-block;background:color-mix(in srgb,var(--brand) 12%,#fff);color:var(--brand);font-weight:700;font-size:13px;padding:6px 12px;border-radius:99px;margin:0 0 18px">Free · 20 seconds · No sign-up</p>
  <h1 style="font-size:clamp(32px,6vw,54px);margin:0 auto 14px;max-width:760px">Is your website losing you customers?</h1>
  <p class="mute" style="font-size:19px;max-width:620px;margin:0 auto 30px">Get an instant score out of 100 for speed, Google visibility, mobile, security and how well your site turns visitors into enquiries, plus exactly what to fix.</p>
  <form id="f" class="card" style="max-width:620px;margin:0 auto;display:flex;gap:10px;padding:12px;flex-wrap:wrap">
    <input type="text" id="u" name="url" inputmode="url" autocomplete="url" placeholder="yourbusiness.com.au" value="${esc(prefill)}" required style="flex:1;min-width:220px;border:0;font-size:18px">
    <button class="btn" id="go" style="flex:none">Check my site</button>
  </form>
  <p id="err" style="color:var(--bad);min-height:24px"></p>
  <div id="prog" style="display:none;max-width:420px;margin:10px auto;text-align:left" class="card"></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;max-width:860px;margin:50px auto 0;text-align:left">
    ${CATEGORIES.map(c => `<div class="card" style="padding:18px"><b>${esc(c.label)}</b><div class="mute" style="font-size:14px">${{ speed: 'How fast your site loads', seo: 'Whether Google can find and show you', mobile: 'How it works on phones', security: 'Padlock, redirects and safety', leads: 'Call buttons, forms and trust signals' }[c.key]}</div></div>`).join('')}
  </div>
</div>
<script>
var steps=['Connecting to your website','Measuring speed','Checking Google visibility','Testing mobile and security','Looking for broken links','Building your report'];
document.getElementById('f').addEventListener('submit',function(e){e.preventDefault();
  var b=document.getElementById('go'),pr=document.getElementById('prog'),er=document.getElementById('err');er.textContent='';b.disabled=true;b.textContent='Checking…';
  pr.style.display='block';var i=0;function tick(){pr.innerHTML=steps.map(function(s,j){return '<div style="padding:4px 0;color:'+(j<i?'var(--good)':j===i?'var(--ink)':'#b5b9c3')+'">'+(j<i?'✓ ':j===i?'● ':'○ ')+s+'</div>'}).join('');if(i<steps.length-1)i++;}
  tick();var iv=setInterval(tick,2200);
  fetch('/api/scan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:document.getElementById('u').value})})
  .then(function(r){return r.json()}).then(function(d){clearInterval(iv);if(d.id){location.href='/r/'+d.id}else{throw new Error(d.error||'Something went wrong')}})
  .catch(function(x){clearInterval(iv);pr.style.display='none';er.textContent=x.message;b.disabled=false;b.textContent='Check my site'});
});
</script>`);
}

function ring(score, size = 168) {
  const r = size / 2 - 12, c = 2 * Math.PI * r, col = score >= 70 ? 'var(--good)' : score >= 50 ? 'var(--ok)' : 'var(--bad)';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Score ${score} out of 100"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#eceef2" stroke-width="12"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(score / 100) * c} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="${size / 3.4}" font-weight="800" fill="var(--ink)">${score}</text><text x="50%" y="${size / 2 + size / 5.2}" text-anchor="middle" font-size="12" fill="var(--mute)">out of 100</text></svg>`;
}

function reportPage(B, row, scan, unlocked) {
  const R = scan.result, f = scan.facts;
  const verdict = R.total >= 85 ? 'Excellent. Your site is in great shape.' : R.total >= 70 ? 'Good, with a few quick wins available.' : R.total >= 50 ? 'Your site is costing you enquiries. These fixes would make a real difference.' : 'Your website is likely losing you customers every day.';
  const showFixes = unlocked ? R.fixes : R.fixes.slice(0, 3);
  const hidden = R.fixes.length - showFixes.length;
  const sev = i => { const lost = i.max - i.pts; return lost >= 5 ? ['High impact', 'var(--bad)'] : lost >= 3 ? ['Medium', 'var(--ok)'] : ['Quick win', 'var(--mute)']; };
  const fixCard = i => { const [l, c] = sev(i); return `<div class="card" style="padding:18px 20px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><b>${esc(i.title)}</b><span style="font-size:12px;font-weight:700;color:${c};white-space:nowrap">${l}</span></div><p style="margin:6px 0 4px">${esc(i.fix)}</p><p class="mute" style="margin:0;font-size:14px">${esc(i.why)}</p></div>`; };
  const passed = R.items.filter(i => i.ok);
  const when = new Date(row.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Melbourne' });
  return shell(B, `${row.host} scored ${R.total}/100 | Website Health Check`, `
<div class="wrap">
  <div class="card" style="display:flex;gap:28px;align-items:center;flex-wrap:wrap;margin-top:10px">
    ${ring(R.total)}
    <div style="flex:1;min-width:240px">
      <div class="mute" style="font-size:14px">Website health check · ${esc(when)}</div>
      <h1 style="margin:4px 0 8px;font-size:clamp(26px,4vw,36px);word-break:break-word">${esc(row.host)}</h1>
      <p style="font-size:18px;margin:0 0 6px">${esc(verdict)}</p>
      <p class="mute" style="margin:0">${R.fixes.length} issue${R.fixes.length === 1 ? '' : 's'} found · ${passed.length} checks passed${f.platform ? ' · Built on ' + esc(f.platform) : ''}</p>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:14px 0 30px">
    ${R.cats.map(c => { const col = c.score >= 70 ? 'var(--good)' : c.score >= 50 ? 'var(--ok)' : 'var(--bad)'; return `<div class="card" style="padding:16px"><div style="display:flex;justify-content:space-between"><b style="font-size:14px">${esc(c.label)}</b><b style="color:${col}">${c.score}</b></div><div style="height:6px;background:#eceef2;border-radius:9px;margin-top:10px"><div style="height:6px;width:${c.score}%;background:${col};border-radius:9px"></div></div></div>`; }).join('')}
  </div>
  <h2>What to fix first</h2>
  ${showFixes.length ? showFixes.map(fixCard).join('') : '<p class="mute">Nothing to fix. Impressive!</p>'}
  ${hidden > 0 ? `
  <div class="card" style="border:2px solid var(--brand);margin:18px 0">
    <h3 style="margin-top:0">+${hidden} more issue${hidden === 1 ? '' : 's'} found on your site</h3>
    <p class="mute">Enter your details to unlock the full report and every fix.</p>
    <form id="unlock" style="display:grid;gap:10px;grid-template-columns:1fr 1fr">
      <input type="text" name="name" placeholder="Your name" autocomplete="name">
      <input type="text" name="business" placeholder="Business name" autocomplete="organization">
      <input type="email" name="email" placeholder="Email" required autocomplete="email">
      <input type="tel" name="phone" placeholder="Phone (optional)" autocomplete="tel">
      <button class="btn" style="grid-column:1/-1">Show my full report</button>
      <p id="uerr" style="grid-column:1/-1;margin:0;color:var(--bad)"></p>
    </form>
  </div>` : ''}
  ${unlocked && passed.length ? `<h2 style="margin-top:34px">What you're doing well</h2><div class="card">${passed.map(i => `<div style="padding:6px 0">✓ ${esc(i.title)}</div>`).join('')}</div>` : ''}
  <div class="card" style="margin-top:34px;background:var(--ink);color:#fff;border:0">
    <h2 style="margin-top:0;color:#fff">Want this fixed, without lifting a finger?</h2>
    <p style="color:#c9ccd4;font-size:17px">${esc(B.offer)}</p>
    <a class="btn" href="${esc(B.url)}?utm_source=health-check&utm_medium=report&utm_content=${esc(row.host)}">Fix my website</a>
    <a href="/?url=" style="color:#c9ccd4;margin-left:14px;font-size:14px">Check another site</a>
  </div>
  <p class="mute" style="font-size:13px;margin-top:18px">This automated check looks at your home page and a sample of links. Scores are a guide, not a guarantee.</p>
</div>
${hidden > 0 ? `<script>document.getElementById('unlock').addEventListener('submit',function(e){e.preventDefault();var f=e.target,b=f.querySelector('button');b.disabled=true;
fetch('/api/unlock/${row.id}',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:f.name.value,business:f.business.value,email:f.email.value,phone:f.phone.value})})
.then(function(r){return r.json()}).then(function(d){if(d.ok){location.reload()}else{throw new Error(d.error||'Please try again')}}).catch(function(x){document.getElementById('uerr').textContent=x.message;b.disabled=false});});</script>` : ''}`);
}

const ADMIN_PAGE = String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Health Check admin</title>
<style>*{box-sizing:border-box}body{margin:0;font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f5f6f8;color:#16181d}
main{max-width:1000px;margin:0 auto;padding:18px}h1{font-size:20px;margin:0 0 14px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#5f6470;margin:22px 0 8px}
.card{background:#fff;border:1px solid #e6e8ee;border-radius:12px;overflow:hidden}.row{display:flex;gap:10px;align-items:center;padding:10px 14px;border-top:1px solid #e6e8ee;flex-wrap:wrap}.row:first-child{border-top:0}
.sc{font-weight:800;width:40px;font-variant-numeric:tabular-nums}.g{color:#14895a}.o{color:#c58a00}.b{color:#d4380d}.grow{flex:1;min-width:160px}.mute{color:#5f6470;font-size:13px}
textarea{width:100%;min-height:110px;padding:12px;border:1px solid #e6e8ee;border-radius:10px;font:inherit}button{font:inherit;border:0;border-radius:9px;padding:9px 14px;font-weight:600;background:#16181d;color:#fff;cursor:pointer}
button.gh{background:#eef0f4;color:#16181d}.kp{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.k{background:#fff;border:1px solid #e6e8ee;border-radius:12px;padding:12px}.k b{font-size:22px;display:block}
@media(max-width:600px){.kp{grid-template-columns:repeat(2,1fr)}}a{color:#1f5eff}.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#16181d;color:#fff;padding:9px 14px;border-radius:9px;opacity:0;transition:.2s}.toast.on{opacity:1}</style></head>
<body><main><h1>__BRAND__ Health Check</h1>
<div class="kp" id="kp"></div>
<h2>Outreach scanner</h2>
<div class="card" style="padding:14px"><p class="mute" style="margin-top:0">One business per line: <i>website, first name, business, email</i>, e.g. <i>smithplumbing.com.au, Dave, Smith Plumbing, dave@smithplumbing.com.au</i>. Each one gets scanned, a full report (no form) and a ready-to-send email with Mail Tracker tracking built in. Tap <b>Copy email</b> and paste it into Outlook.</p>
<textarea id="batch" placeholder="smithplumbing.com.au, Dave, Smith Plumbing, dave@smithplumbing.com.au"></textarea>
<p style="margin:10px 0 0;display:flex;gap:8px;flex-wrap:wrap"><button id="run">Scan all</button><button class="gh" id="copyAll">Copy all emails</button><span class="mute" id="bstat"></span></p></div>
<div class="card" id="bout" style="margin-top:10px"></div>
<h2>Leads (unlocked reports)</h2><div class="card" id="leads"></div>
<h2>All reports</h2><div class="card" id="reps"></div></main><div class="toast" id="t"></div>
<script>
var D={reports:[],leads:[],origin:location.origin},OUT=[];
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function cls(n){return n>=70?'g':n>=50?'o':'b'}
function ago(t){if(!t)return'never';var s=(Date.now()-t)/1e3;return s<60?'just now':s<3600?Math.floor(s/60)+'m ago':s<86400?Math.floor(s/3600)+'h ago':Math.floor(s/86400)+'d ago'}
function toast(m){var t=document.getElementById('t');t.textContent=m;t.classList.add('on');setTimeout(function(){t.classList.remove('on')},1600)}
function load(){fetch('/api/admin').then(function(r){return r.json()}).then(function(d){D=d;render()})}
function render(){var R=D.reports,L=D.leads;var out=R.filter(function(r){return r.source==='outreach'}),viewed=out.filter(function(r){return r.views>0});
document.getElementById('kp').innerHTML=[['Public checks',R.length-out.length],['Leads captured',L.length],['Outreach reports',out.length],['Outreach viewed',viewed.length+(out.length?' ('+Math.round(viewed.length/out.length*100)+'%)':'')]].map(function(k){return '<div class="k"><b>'+k[1]+'</b><span class="mute">'+k[0]+'</span></div>'}).join('');
document.getElementById('leads').innerHTML=L.length?L.map(function(l){return '<div class="row"><span class="sc '+cls(l.total)+'">'+l.total+'</span><div class="grow"><b>'+esc(l.name||l.email)+'</b> '+esc(l.business||'')+'<div class="mute">'+esc(l.email)+(l.phone?' · <a href="tel:'+esc(l.phone)+'">'+esc(l.phone)+'</a>':'')+' · '+esc(l.host)+' · '+ago(l.created_at)+'</div></div><a href="/r/'+l.report_id+'" target="_blank">Report</a></div>'}).join(''):'<div class="row mute">No leads yet. They appear when someone unlocks their full report.</div>';
document.getElementById('reps').innerHTML=R.length?R.map(function(r){return '<div class="row"><span class="sc '+cls(r.total)+'">'+r.total+'</span><div class="grow"><b>'+esc(r.host)+'</b><div class="mute">'+(r.source==='outreach'?'Outreach':'Public')+' · '+ago(r.created_at)+' · viewed '+r.views+'×'+(r.last_view?' (last '+ago(r.last_view)+')':'')+'</div></div><a href="/r/'+r.id+'" target="_blank">Open</a> <button class="gh" data-cp="'+D.origin+'/r/'+r.id+'">Copy link</button></div>'}).join(''):'<div class="row mute">No reports yet.</div>';}
function copyRich(h,t){if(window.ClipboardItem&&navigator.clipboard.write){return navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([h],{type:'text/html'}),'text/plain':new Blob([t],{type:'text/plain'})})]).then(function(){toast('Email copied. Paste into Outlook')}).catch(function(){fb(h)})}fb(h)}
function fb(h){var d=document.createElement('div');d.contentEditable='true';d.innerHTML=h;d.style.position='fixed';d.style.left='-9999px';document.body.appendChild(d);var r=document.createRange();r.selectNodeContents(d);var s=getSelection();s.removeAllRanges();s.addRange(r);try{document.execCommand('copy');toast('Email copied')}catch(e){}s.removeAllRanges();d.remove()}
function renderOut(){document.getElementById('bout').innerHTML=OUT.map(function(o,i){return '<div class="row">'+(o.error?'<span class="sc b">!</span><div class="grow"><b>'+esc(o.input)+'</b><div class="mute">'+esc(o.error)+'</div></div>':'<span class="sc '+cls(o.total)+'">'+o.total+'</span><div class="grow"><b>'+esc(o.business||o.host)+'</b> '+(o.name?esc(o.name):'')+'<div class="mute">'+(o.email?esc(o.email)+' · ':'')+(o.trackerId?'<span class="g">✓ tracked</span>':'<span class="o">'+esc(o.trackerError||'untracked (Mail Tracker not connected)')+'</span>')+' · Subject: '+esc(o.subject)+'</div></div><button class="gh" data-sub="'+i+'">Subject</button><button data-em="'+i+'">Copy email</button>')+'</div>'}).join('')}
document.getElementById('run').onclick=function(){var lines=document.getElementById('batch').value.split('\n').map(function(s){return s.trim()}).filter(Boolean);if(!lines.length)return;OUT=[];renderOut();var i=0,btn=this;btn.disabled=true;
(function next(){if(i>=lines.length){btn.disabled=false;document.getElementById('bstat').textContent='Done: '+lines.length+' scanned';load();return}
var parts=lines[i].split(',').map(function(s){return s.trim()});document.getElementById('bstat').textContent='Scanning '+(i+1)+' of '+lines.length+'…';
fetch('/api/outreach',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:parts[0],name:parts[1]||'',business:parts[2]||'',email:parts[3]||''})}).then(function(r){return r.json()}).then(function(d){
OUT.push(d.id?d:{input:parts[0],error:d.error||'Failed'});renderOut();i++;next()}).catch(function(){OUT.push({input:parts[0],error:'Failed'});renderOut();i++;next()})})()};
document.getElementById('copyAll').onclick=function(){var t=OUT.filter(function(o){return !o.error}).map(function(o){return '--- '+(o.email||o.host)+' ---\nSubject: '+o.subject+'\n\n'+o.text}).join('\n\n');navigator.clipboard.writeText(t).then(function(){toast('All emails copied (plain text)')})};
document.addEventListener('click',function(e){var c=e.target.getAttribute('data-cp'),m=e.target.getAttribute('data-em'),sb=e.target.getAttribute('data-sub');if(c)navigator.clipboard.writeText(c).then(function(){toast('Link copied')});if(m!=null)copyRich(OUT[+m].html,OUT[+m].text);if(sb!=null)navigator.clipboard.writeText(OUT[+sb].subject).then(function(){toast('Subject copied')})});
load();
</script></body></html>`;
