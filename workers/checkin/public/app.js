// Check-in app (no framework). Hash routes:
//   client: #today  #goals  #messages  #help  #notifications  #privacy
//   admin:  #admin  #admin/c/<id>/<activity|reminders|goals|messages|settings>
'use strict';

const S = { me: null, installEvt: null, poll: null, lastAllDone: null };
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const app = () => $('#app');
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TZS = ['Australia/Melbourne', 'Australia/Sydney', 'Australia/Brisbane', 'Australia/Adelaide', 'Australia/Perth', 'Australia/Hobart', 'Australia/Darwin'];

// ---------- helpers ----------
async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', credentials: 'same-origin', headers: { 'x-checkin': '1' } };
  if (opts.body !== undefined) { init.body = JSON.stringify(opts.body); init.headers['content-type'] = 'application/json'; }
  let res;
  try { res = await fetch(path, init); } catch { throw new Error('No connection. Check your internet and try again.'); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/me') { S.me = null; render(); throw new Error('Please log in again.'); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}
function toast(msg, ms = 2600) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
const fail = (e) => toast(e.message || String(e), 4000);
function route() { const h = location.hash.replace(/^#/, '').split('?')[0]; return h ? h.split('/') : []; }
function fmtHM(at) { const [h, m] = at.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; }
function go(h) { if (location.hash === '#' + h) render(); else location.hash = h; }
const fmtTime = (ms, tz) => new Date(ms).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', ...(tz ? { timeZone: tz } : {}) });
const fmtDay = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const shortDay = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtWhen = (ms) => new Date(ms).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function todayLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function progressHtml(g) {
  const pct = g.total ? Math.round((g.done / g.total) * 100) : 0;
  return `<p class="progress-label">${g.done} of ${g.total} done</p>
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${g.total}" aria-valuenow="${g.done}" aria-label="Goals done this week"><i style="width:${pct}%"></i></div>`;
}

// ---------- notifications ----------
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
function b64ToBytes(s) {
  const t = atob((s + '==='.slice((s.length + 3) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(t, (c) => c.charCodeAt(0));
}
function deviceName() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android';
  if (isIOS()) return 'iPhone';
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac/i.test(ua)) return 'Mac';
  return 'Browser';
}
async function pushState() {
  if (isIOS() && !standalone()) return 'ios-browser';
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'default') return 'default';
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) ? 'on' : 'default';
}
async function subscribe() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Notifications are blocked. See the steps below to allow them.' : 'Notifications weren\'t allowed.');
  const reg = await navigator.serviceWorker.ready;
  const { key } = await api('/api/push/key');
  let sub = await reg.pushManager.getSubscription();
  const keyMatches = sub && sub.options && sub.options.applicationServerKey
    && btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') === key;
  if (sub && !keyMatches) { await sub.unsubscribe(); sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
  await api('/api/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON(), device: deviceName() } });
}
/** Keep the server's copy of this phone's subscription fresh (quietly, on every start). */
async function resyncPush() {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await api('/api/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON(), device: deviceName() } });
  } catch { /* fine */ }
}

// ---------- shell ----------
function setTabs(items) {
  const nav = $('#tabs');
  if (!items) { nav.classList.add('hidden'); nav.innerHTML = ''; return; }
  const cur = route()[0] || items[0].h;
  nav.classList.remove('hidden');
  nav.innerHTML = items.map((t) => `<a href="#${t.h}" ${cur === t.h ? 'aria-current="page"' : ''}><span class="ico" aria-hidden="true">${t.i}</span>${esc(t.l)}${t.badge ? `<span class="badge" aria-label="${t.badge} new">${t.badge}</span>` : ''}</a>`).join('');
}
function clientTabs(unread = S.unread || 0) {
  setTabs([{ h: 'today', l: 'Today', i: '☀️' }, { h: 'goals', l: 'Goals', i: '🎯' }, { h: 'messages', l: 'Simon', i: '💬', badge: unread || 0 }, { h: 'help', l: 'Help', i: '⚙️' }]);
}
function topRight(html) { $('#top-right').innerHTML = html || ''; }

async function render() {
  clearInterval(S.poll); S.poll = null;
  const r = route();
  const publicPages = { notifications: viewNotifications, privacy: viewPrivacy };
  if (!S.me) {
    try { S.me = await api('/api/me'); } catch { S.me = null; }
  }
  if (!S.me) {
    setTabs(null); topRight('');
    if (publicPages[r[0]]) return publicPages[r[0]]();
    return viewLogin();
  }
  if (S.me.role === 'admin') {
    setTabs(null);
    topRight('<button class="btn small" data-act="logout">Log out</button>');
    if (r[0] === 'notifications') return viewNotifications();
    if (r[0] === 'privacy') return viewPrivacy();
    if (r[0] === 'admin' && r[1] === 'c' && r[2]) return viewClient(+r[2], r[3] || 'activity');
    return viewAdminHome();
  }
  topRight('');
  clientTabs();
  const v = { today: viewToday, goals: viewGoals, messages: viewMessages, help: viewHelp, notifications: viewNotifications, privacy: viewPrivacy }[r[0]] || viewToday;
  return v();
}

// ---------- login ----------
function viewLogin(step = 'email', email = '') {
  const iosApp = isIOS() && standalone();
  app().innerHTML = step === 'email' ? `
    <div class="wrap narrow" style="padding:0">
      <h1>Welcome to Check-in</h1>
      <p>Your goals companion between sessions with Simon.</p>
      <form id="f-email" class="card">
        <label class="field"><span>Your email</span><input type="email" name="email" autocomplete="email" inputmode="email" required value="${esc(email)}"></label>
        <button class="btn primary big" type="submit">Email me a login</button>
      </form>
      <p class="small muted">Already have a code from your email? <button class="btn link" data-act="have-code">Type the code</button></p>
      <p class="small"><a href="#privacy">How we look after your information</a></p>
    </div>`
    : `
    <div class="wrap narrow" style="padding:0">
      <h1>Check your email</h1>
      <p>We sent a login to <strong>${esc(email) || 'your email'}</strong>.</p>
      ${iosApp ? '<p><strong>On iPhone:</strong> type the 6-digit code here (the link opens Safari instead of this app).</p>' : '<p>Tap the button in the email, <strong>or</strong> type the 6-digit code here:</p>'}
      <form id="f-code" class="card">
        ${email ? `<input type="hidden" name="email" value="${esc(email)}">` : '<label class="field"><span>Your email</span><input type="email" name="email" autocomplete="email" required></label>'}
        <label class="field"><span>6-digit code</span><input class="code-input" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
        <button class="btn primary big" type="submit">Log in</button>
      </form>
      <p class="small muted">Nothing there? Check junk mail, or <button class="btn link" data-act="restart-login">try again</button>.</p>
      <div id="dev"></div>
    </div>`;
  const fe = $('#f-email');
  if (fe) fe.onsubmit = async (e) => {
    e.preventDefault();
    const em = fe.email.value.trim();
    fe.querySelector('button').disabled = true;
    try {
      const r = await api('/auth/request', { method: 'POST', body: { email: em } });
      viewLogin('code', em);
      if (r.dev) $('#dev').innerHTML = `<p class="card small">Test mode: <a href="${esc(r.dev.link)}">login link</a> · code ${esc(r.dev.code)}</p>`;
    } catch (err) { fail(err); fe.querySelector('button').disabled = false; }
  };
  const fc = $('#f-code');
  if (fc) {
    fc.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const r = await api('/auth/code', { method: 'POST', body: { email: fc.email.value.trim(), code: fc.code.value.trim() } });
        S.me = null;
        go(r.role === 'admin' ? 'admin' : 'today');
      } catch (err) { fail(err); }
    };
    fc.code.focus();
  }
}

// ---------- client: today ----------
function reminderCard(it, highlight) {
  const when = it.due_at ? fmtTime(it.due_at) : '';
  let body;
  if (it.status === 'done') {
    body = `<div class="row"><span class="status-pill">Done ✅</span><span class="spacer"></span><button class="btn link" data-act="undo" data-id="${it.id}">Change</button></div>`;
  } else if (it.status === 'not_today') {
    body = `<div class="row"><span class="status-pill nt">Not today</span><span class="spacer"></span><button class="btn link" data-act="undo" data-id="${it.id}">Change</button></div>${it.note ? `<p class="note">“${esc(it.note)}”</p>` : ''}`;
  } else {
    body = `<div class="actions"><button class="btn done big" data-act="done" data-id="${it.id}">Done ✅</button><button class="btn big" data-act="nt-open" data-id="${it.id}">Not today</button></div>
      <form class="nt-form hidden stack" data-id="${it.id}">
        <label class="field"><span>Want to tell Simon why? (optional)</span><input name="note" maxlength="280" placeholder="e.g. Feeling flat today"></label>
        <button class="btn primary big" type="submit">Save “Not today”</button>
      </form>`;
  }
  return `<article class="card reminder ${it.status === 'done' ? 'is-done' : ''}" id="d${it.id}" ${highlight ? 'style="outline:3px solid var(--forest)"' : ''}>
    <div class="when">${esc(when)}</div><div class="msg">${esc(it.message)}</div>${body}</article>`;
}

async function viewToday() {
  const params = new URLSearchParams(location.search);
  const focus = +params.get('d') || 0;
  if (focus) api(`/api/deliveries/${focus}/opened`, { method: 'POST', body: {} }).catch(() => {});
  let t;
  try { t = await api('/api/today'); } catch (e) { app().innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; }
  S.unread = t.unread; clientTabs(t.unread);
  S.lastAllDone = t.goals.allDone;
  const ps = await pushState().catch(() => 'unsupported');
  const welcome = params.get('welcome');
  app().innerHTML = `
    ${welcome ? `<div class="card mint"><h2>You're in, ${esc(t.name)}! 🎉</h2><p>Two quick steps so reminders reach your phone.</p><a class="btn primary big" href="#notifications">Set up my phone</a></div>` : ''}
    ${!welcome && ps !== 'on' ? `<div class="card sun"><p><strong>Reminders aren't reaching this phone yet.</strong></p><a class="btn primary big" href="#notifications">Turn on notifications</a></div>` : ''}
    ${t.paused ? '<div class="card">Reminders are paused for now.</div>' : ''}
    <h1>Hi ${esc(t.name)} 👋</h1>
    <p class="muted">${esc(fmtDay(t.today))}</p>
    ${t.items.length ? t.items.map((it) => reminderCard(it, it.id === focus)).join('') : (t.later.length ? '' : '<div class="card empty">No reminders today. Enjoy your day!</div>')}
    ${t.later.length ? `<div class="card"><h2>Coming up today</h2>${t.later.map((l) => `<div class="later"><span>${esc(l.message)}</span><strong>${esc(fmtHM(l.at))}</strong></div>`).join('')}</div>` : ''}
    <a class="card mint" href="#goals" style="display:block;text-decoration:none">
      <h2>This week's goals</h2>${t.goals.total ? progressHtml(t.goals) : '<p class="muted">Simon will add this week\'s goals after your session.</p>'}
      ${t.goals.total ? '<p class="small" style="margin:10px 0 0">Tap to tick off your goals →</p>' : ''}
    </a>`;
  if (focus) $('#d' + focus)?.scrollIntoView({ block: 'center' });
  if (focus || welcome) history.replaceState(null, '', '/' + location.hash);
}

async function respond(id, status, note) {
  try {
    const r = await api(`/api/deliveries/${id}`, { method: 'POST', body: { status, note } });
    if (status === 'done') toast('Nice work! ✅');
    if (r.goals.allDone && S.lastAllDone === false) celebrate();
    S.lastAllDone = r.goals.allDone;
    viewToday();
  } catch (e) { fail(e); }
}

// ---------- client: goals ----------
async function viewGoals() {
  let g;
  try { g = await api('/api/goals'); } catch (e) { app().innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; }
  S.lastAllDone = g.allDone;
  renderGoals(g);
}
function renderGoals(g) {
  app().innerHTML = `
    <p class="eyebrow">Week of ${esc(shortDay(g.week))}</p>
    <h1>This week's goals</h1>
    ${g.total ? `<div class="card">${progressHtml(g)}${g.allDone ? '<p style="margin:12px 0 0;font-weight:700">All green! 🎉 Every goal done.</p>' : ''}</div>
      <p class="small muted">Tap a goal when you've done it.</p>
      <div>${g.goals.map((x) => {
        const done = x.count >= x.target;
        return `<button class="goal ${done ? 'done' : ''}" data-act="goal" data-id="${x.id}" data-full="${done ? 1 : 0}" aria-pressed="${done}">
          <span class="tick" aria-hidden="true">${done ? '✓' : ''}</span>
          <span class="gtext">${esc(x.text)}${x.target > 1 ? `<span class="count">${x.count} of ${x.target}</span>` : ''}</span></button>
          ${x.target > 1 && x.count > 0 && !done ? `<div class="goal-step"><button class="btn small" data-act="goal-minus" data-id="${x.id}">Undo one</button></div>` : ''}`;
      }).join('')}</div>`
    : '<div class="card empty">No goals yet this week. Simon will add them after your session.</div>'}`;
}
async function tickGoal(id, delta) {
  try {
    const g = await api(`/api/goals/${id}`, { method: 'POST', body: { delta } });
    const was = S.lastAllDone;
    S.lastAllDone = g.allDone;
    renderGoals(g);
    if (g.allDone && was === false) celebrate();
  } catch (e) { fail(e); }
}

function celebrate() {
  const wrap = document.createElement('div');
  wrap.className = 'celebrate';
  wrap.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-labelledby="cel-h"><div class="big-emoji" aria-hidden="true">🎉</div>
    <h2 id="cel-h">All green!</h2><p>Every goal ticked off this week. That's something to be proud of.</p>
    <button class="btn done big" data-act="close-cel">Thanks!</button></div>`;
  const conf = document.createElement('div');
  conf.className = 'confetti';
  const colours = ['#9EF5CF', '#FFD66B', '#123B30', '#FFFFFF'];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colours[i % colours.length];
    p.style.animationDelay = Math.random() * 0.8 + 's';
    conf.appendChild(p);
  }
  document.body.append(wrap, conf);
  setTimeout(() => conf.remove(), 3500);
  wrap.querySelector('button').focus();
}

// ---------- messages (both) ----------
function threadHtml(msgs, me) {
  if (!msgs.length) return '<div class="card empty">No messages yet. Say hi!</div>';
  return `<div class="thread">${msgs.map((m) => `<div class="bubble ${m.sender === me ? 'me' : 'them'}">${esc(m.body)}<time>${esc(fmtWhen(m.created_at))}</time></div>`).join('')}</div>`;
}
async function viewMessages() {
  const draw = async (keep) => {
    const { messages } = await api('/api/messages');
    S.unread = 0; clientTabs(0);
    const text = keep ? $('#composer')?.value : '';
    app().innerHTML = `<h1>Messages with Simon</h1>${threadHtml(messages, 'client')}
      <form class="composer" id="f-msg"><label class="field"><span class="sr-only">Message</span><textarea id="composer" name="body" maxlength="2000" placeholder="Write to Simon…" required></textarea></label>
      <button class="btn primary big" type="submit">Send</button></form>
      <p class="small muted">Simon usually replies within a day. In an emergency, call 000.</p>`;
    if (text) $('#composer').value = text;
    $('#f-msg').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/api/messages', { method: 'POST', body: { body: $('#composer').value } }); $('#composer').value = ''; await draw(false); window.scrollTo(0, document.body.scrollHeight); } catch (err) { fail(err); }
    };
  };
  try { await draw(false); window.scrollTo(0, document.body.scrollHeight); } catch (e) { fail(e); }
  S.poll = setInterval(() => { if (document.visibilityState === 'visible' && document.activeElement?.id !== 'composer') draw(true).catch(() => {}); }, 20000);
}

// ---------- help / notifications / privacy ----------
function viewHelp() {
  app().innerHTML = `<h1>Help</h1>
    <a class="card" href="#notifications" style="display:block;text-decoration:none"><h2>🔔 Notifications</h2><p style="margin:0">Set up reminders on your phone, or send a test.</p></a>
    <a class="card" href="#privacy" style="display:block;text-decoration:none"><h2>🔒 Your privacy</h2><p style="margin:0">What we keep and who can see it.</p></a>
    <div class="card"><h2>Need Simon?</h2><p>Send a message in the app, or email <a href="mailto:simon@communityhelp.com.au">simon@communityhelp.com.au</a>.</p></div>
    <button class="btn big" data-act="logout">Log out of this phone</button>`;
}

async function viewNotifications() {
  const st = await pushState().catch(() => 'unsupported');
  const loggedIn = !!S.me;
  const back = S.me?.role === 'admin' ? '<p><a href="#admin">← Back to clients</a></p>' : '';
  const status = {
    on: `<div class="card mint"><h2>Notifications are on ✅</h2><p>Reminders will pop up on this ${esc(deviceName())}.</p>
          <button class="btn big" data-act="push-test">Send me a test</button></div>`,
    default: loggedIn
      ? `<div class="card sun"><h2>One tap to go</h2><p>Tap the button, then choose <strong>Allow</strong>.</p><button class="btn primary big" data-act="push-on">Turn on notifications</button></div>`
      : `<div class="card sun"><p>Log in first, then come back here to turn notifications on.</p><a class="btn primary big" href="#">Log in</a></div>`,
    denied: `<div class="card warn"><h2>Notifications are blocked</h2><p>Your phone said “Don't allow” earlier. Follow the steps below to allow them again, then come back and tap the button.</p><button class="btn big" data-act="push-on">Try again</button></div>`,
    'ios-browser': `<div class="card sun"><h2>First, add Check-in to your Home Screen</h2><p>On iPhone, notifications only work from the Home Screen app. Follow the iPhone steps below.</p></div>`,
    unsupported: `<div class="card warn"><h2>This browser can't show notifications</h2><p>Open this page in <strong>Chrome</strong> (Android) or <strong>Safari</strong> (iPhone). Until then, reminders come by email.</p></div>`,
  }[st];
  const installBtn = S.installEvt && !standalone() ? '<button class="btn primary big" data-act="install">Install Check-in on this phone</button>' : '';
  app().innerHTML = `${back}<h1>Turn on notifications</h1>
    <p>So reminders and messages from Simon pop up on your phone, like a text.</p>
    ${status}
    <div class="guide">
      <details ${!isIOS() ? 'open' : ''}><summary>🤖 Android phone (Chrome)</summary>
        <ol>
          <li>Open the Check-in email on your phone and tap the button. It opens in Chrome.</li>
          <li>${installBtn || 'Tap the <strong>⋮ menu</strong> (top right) → <strong>Add to Home screen</strong> (or <strong>Install app</strong>) → <strong>Install</strong>.'}</li>
          <li>Open <strong>Check-in</strong> from your Home screen.</li>
          <li>Go to <strong>Help → Notifications</strong> and tap <strong>Turn on notifications</strong>, then <strong>Allow</strong>.</li>
          <li>Tap <strong>Send me a test</strong>. You should get a ping within a few seconds.</li>
        </ol>
        <p class="small muted">Not getting pings? Settings → Apps → Chrome (or Check-in) → Notifications → turn on. Battery saver can delay them too.</p>
      </details>
      <details ${isIOS() ? 'open' : ''}><summary>🍎 iPhone (Safari)</summary>
        <ol>
          <li>Open <strong>checkin.communityhelp.com.au</strong> in <strong>Safari</strong> (needs iOS 16.4 or newer).</li>
          <li>Tap the <strong>Share</strong> button (square with an arrow) → <strong>Add to Home Screen</strong> → <strong>Add</strong>.</li>
          <li>Open <strong>Check-in</strong> from your Home Screen. Ask for a login and <strong>type the 6-digit code</strong> from the email (the email link opens Safari, not the app).</li>
          <li>Go to <strong>Help → Notifications</strong> → <strong>Turn on notifications</strong> → <strong>Allow</strong>.</li>
          <li>Tap <strong>Send me a test</strong>.</li>
        </ol>
        <p class="small muted">Blocked by mistake? Settings → Notifications → Check-in → Allow Notifications.</p>
      </details>
    </div>
    <p class="small muted">No notifications? You'll still get reminders by email.</p>`;
}

function viewPrivacy() {
  app().innerHTML = `<h1>Your privacy</h1>
    <div class="card"><h2>What Check-in keeps</h2>
      <ul><li>Your first name and email</li><li>Your reminders, and when you tapped Done or Not today (plus any note you add)</li><li>This week's goal list and your ticks</li><li>Messages between you and Simon</li></ul>
      <p>That's all. No health or diagnosis details, no NDIS number, no address.</p></div>
    <div class="card"><h2>Who can see it</h2><p>Only you and Simon. Nobody else, and it's never sold or shared. The app is private, so search engines can't find it.</p></div>
    <div class="card"><h2>Your choices</h2><p>Ask Simon any time for a copy of your information, or to delete it. He can do both in a minute.</p>
      <p>It's stored securely with Cloudflare. Emails are sent from Community Help Co's Microsoft 365 account.</p></div>
    <p class="small"><a href="https://communityhelp.com.au/privacy-policy" rel="noopener">Community Help Co privacy policy</a></p>`;
}

// ---------- admin ----------
async function viewAdminHome() {
  let d;
  try { d = await api('/api/admin/clients'); } catch (e) { app().innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; }
  const ps = await pushState().catch(() => 'unsupported');
  app().innerHTML = `<h1>Clients</h1>
    ${!d.mail ? '<div class="card warn"><strong>Email isn\'t connected yet.</strong> Invites and email reminders can\'t send until it is (see setup steps).</div>' : ''}
    ${d.clients.length ? d.clients.map((c) => `<a class="card client-row" href="#admin/c/${c.id}/activity">
        <div><div class="name">${esc(c.first_name)}</div>
        <div class="small muted">${c.reminders} reminder${c.reminders === 1 ? '' : 's'} · ${c.devices ? '🔔 notifications on' : '✉️ email only'}${c.last_seen_at ? ' · seen ' + esc(fmtWhen(c.last_seen_at)) : ' · not logged in yet'}</div></div>
        <span class="spacer"></span>${c.status === 'paused' ? '<span class="tag paused">Paused</span>' : ''}${c.unread ? `<span class="tag unread">${c.unread} new</span>` : ''}</a>`).join('')
      : '<div class="card empty">No clients yet. Add your first one below.</div>'}
    <form class="card" id="f-add"><h2>Add a client</h2>
      <label class="field"><span>First name</span><input name="first_name" maxlength="40" required autocomplete="off"></label>
      <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="off"></label>
      <label class="row" style="margin-bottom:14px"><input type="checkbox" name="invite" checked style="width:28px;min-height:28px"> <span>Email them an invite now</span></label>
      <button class="btn primary big" type="submit">Add client</button>
      <p class="small muted" style="margin:10px 0 0">Only a first name and email. No health info, NDIS numbers or addresses.</p></form>
    <div class="card"><h2>Your notifications</h2><p>${ps === 'on' ? 'On ✅ You\'ll get a ping when a client messages you.' : 'Get a ping on this device when a client messages you.'}</p>
      <a class="btn" href="#notifications">${ps === 'on' ? 'Test them' : 'Turn on'}</a></div>`;
  const f = $('#f-add');
  f.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('/api/admin/clients', { method: 'POST', body: { first_name: f.first_name.value, email: f.email.value, invite: f.invite.checked } });
      toast(r.invited ? `Added. Invite sent to ${r.client.email}` : 'Added.');
      if (r.dev) console.log('invite', r.dev);
      go(`admin/c/${r.client.id}/reminders`);
    } catch (err) { fail(err); }
  };
}

async function viewClient(id, tab) {
  let c;
  try { c = (await api(`/api/admin/clients/${id}`)).client; } catch (e) { app().innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; }
  const tabs = [['activity', 'Activity'], ['reminders', 'Reminders'], ['goals', 'Goals'], ['messages', 'Messages'], ['settings', 'Settings']];
  app().innerHTML = `<p><a href="#admin">← All clients</a></p>
    <h1>${esc(c.first_name)} ${c.status === 'paused' ? '<span class="tag paused">Paused</span>' : ''}</h1>
    <nav class="subtabs" aria-label="Client">${tabs.map(([k, l]) => `<a href="#admin/c/${id}/${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
    <div id="pane"><p class="empty">Loading…</p></div>`;
  const pane = $('#pane');
  try {
    if (tab === 'reminders') await paneReminders(c, pane);
    else if (tab === 'goals') await paneGoals(c, pane, new URLSearchParams(location.hash.split('?')[1] || '').get('week'));
    else if (tab === 'messages') await paneMessages(c, pane);
    else if (tab === 'settings') paneSettings(c, pane);
    else await paneActivity(c, pane);
  } catch (e) { pane.innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
}

function weekNav(week, base) {
  return `<div class="week-nav"><a class="btn small" href="#${base}?week=${addDays(week, -7)}" aria-label="Previous week">←</a>
    <strong>Week of ${esc(shortDay(week))}</strong><a class="btn small" href="#${base}?week=${addDays(week, 7)}" aria-label="Next week">→</a></div>`;
}

async function paneActivity(c, pane) {
  const week = new URLSearchParams(location.hash.split('?')[1] || '').get('week') || '';
  const a = await api(`/api/admin/clients/${c.id}/activity${week ? '?week=' + week : ''}`);
  const dates = [...Array(7)].map((_, i) => addDays(a.week, i));
  const notes = [];
  const rem = a.reminders.map((r) => {
    const cells = dates.map((d, i) => {
      const ds = r.deliveries.filter((x) => x.local_date === d);
      if (!ds.length) return `<div>${DAYS[i]}<b>·</b></div>`;
      const x = ds[ds.length - 1];
      if (x.note) notes.push({ d, msg: r.message, note: x.note });
      if (x.status === 'done') return `<div class="d" title="Done ${esc(x.responded_at ? fmtTime(x.responded_at, a.client.tz) : '')}">${DAYS[i]}<b>✅</b></div>`;
      if (x.status === 'not_today') return `<div class="n" title="Not today">${DAYS[i]}<b>✋</b></div>`;
      if (x.opened_at) return `<div class="o" title="Opened, not ticked">${DAYS[i]}<b>👀</b></div>`;
      return `<div title="Sent by ${esc(x.channel)}, not opened">${DAYS[i]}<b>${x.channel === 'email' ? '✉️' : x.channel === 'none' ? '⚠️' : '📩'}</b></div>`;
    }).join('');
    return `<div class="card"><h3>${esc(r.message)}</h3>
      <p class="small muted" style="margin:0">${r.sent} sent · ${r.opened} opened · <strong>${r.done} done</strong> · ${r.notToday} not today${r.enabled ? '' : ' · (off)'}</p>
      <div class="strip">${cells}</div></div>`;
  }).join('');
  const g = a.goals;
  app().querySelector('#pane').innerHTML = `${weekNav(a.week, `admin/c/${c.id}/activity`)}
    <div class="card mint"><h2>Goals</h2>${g.total ? progressHtml(g) + `<table class="simple-t" style="margin-top:12px">${g.goals.map((x) => `<tr><td>${x.count >= x.target ? '✅' : '⬜'}</td><td>${esc(x.text)}</td><td style="text-align:right;white-space:nowrap">${x.count}/${x.target}</td></tr>`).join('')}</table>` : '<p class="muted">No goals this week. <a href="#admin/c/' + c.id + '/goals">Add them</a></p>'}</div>
    <h2>Reminders</h2>${rem || '<div class="card empty">No reminders yet.</div>'}
    <p class="legend">✅ done · ✋ not today · 👀 opened · 📩 sent (push) · ✉️ sent by email · ⚠️ couldn't reach · · nothing due</p>
    ${notes.length ? `<div class="card"><h2>Notes from “Not today”</h2>${notes.map((n) => `<p><strong>${esc(shortDay(n.d))} · ${esc(n.msg)}:</strong> “${esc(n.note)}”</p>`).join('')}</div>` : ''}`;
}

function reminderForm(c, r, goals) {
  const tomorrow = addDays(todayLocal(), 1);
  const v = r || { message: '', kind: 'daily', days: '', time_local: '11:00', tz: 'Australia/Melbourne', start_date: tomorrow, end_date: '', enabled: 1, goal_id: null };
  const days = String(v.days || '').split(',').filter(Boolean).map(Number);
  return `<form class="card f-rem" data-id="${r ? r.id : ''}">
    <h2>${r ? 'Edit reminder' : 'New reminder'}</h2>
    <label class="field"><span>Message</span><input name="message" maxlength="200" required value="${esc(v.message)}" placeholder="e.g. Shake time 🥤"></label>
    <fieldset class="field" style="border:0;padding:0;margin:0 0 14px"><legend style="font-weight:700;margin-bottom:6px">How often</legend>
      <div class="chips">${[['once', 'Once'], ['daily', 'Every day'], ['weekdays', 'Chosen days'], ['weekly', 'Weekly']].map(([k, l]) => `<button type="button" class="chip" data-kind="${k}" aria-pressed="${v.kind === k}">${l}</button>`).join('')}</div></fieldset>
    <div class="field days-field ${v.kind === 'weekdays' || v.kind === 'weekly' ? '' : 'hidden'}"><span>Which day${v.kind === 'weekly' ? '' : 's'}</span>
      <div class="chips">${DAYS.map((d, i) => `<button type="button" class="chip" data-day="${i + 1}" aria-pressed="${days.includes(i + 1)}">${d}</button>`).join('')}</div></div>
    <div class="row"><label class="field" style="flex:1"><span>Time</span><input type="time" name="time_local" required value="${esc(v.time_local)}"></label>
      <label class="field" style="flex:2"><span>Time zone</span><select name="tz">${TZS.map((z) => `<option ${z === v.tz ? 'selected' : ''}>${z}</option>`).join('')}</select></label></div>
    <div class="row"><label class="field" style="flex:1"><span><span class="start-label">${v.kind === 'once' ? 'Date' : 'Start'}</span></span><input type="date" name="start_date" required value="${esc(v.start_date)}"></label>
      <label class="field end-field ${v.kind === 'once' ? 'hidden' : ''}" style="flex:1"><span>End (optional)</span><input type="date" name="end_date" value="${esc(v.end_date || '')}"></label></div>
    <label class="field"><span>Linked goal (optional)</span><select name="goal_id"><option value="">None</option>${goals.map((g) => `<option value="${g.id}" ${g.id === v.goal_id ? 'selected' : ''}>${esc(g.text)}</option>`).join('')}</select>
      <small>Tapping Done on this reminder also ticks the goal.</small></label>
    <label class="row" style="margin-bottom:14px"><input type="checkbox" name="enabled" ${v.enabled ? 'checked' : ''} style="width:28px;min-height:28px"> <span>Reminder is on</span></label>
    <div class="row"><button class="btn primary" type="submit">${r ? 'Save' : 'Add reminder'}</button>${r ? '<button class="btn link" type="button" data-act="rem-cancel">Cancel</button><span class="spacer"></span><button class="btn danger small" type="button" data-act="rem-del">Delete</button>' : ''}</div>
  </form>`;
}
function readReminderForm(f) {
  const kind = f.querySelector('.chip[data-kind][aria-pressed="true"]')?.dataset.kind || 'daily';
  const days = [...f.querySelectorAll('.chip[data-day][aria-pressed="true"]')].map((b) => +b.dataset.day);
  return {
    message: f.message.value, kind, days, time_local: f.time_local.value, tz: f.tz.value, start_date: f.start_date.value,
    end_date: kind === 'once' ? '' : f.end_date.value, goal_id: f.goal_id.value ? +f.goal_id.value : null, enabled: f.enabled.checked,
  };
}
function describe(r) {
  const days = String(r.days || '').split(',').filter(Boolean).map((n) => DAYS[n - 1]).join(', ');
  const when = { once: `Once on ${shortDay(r.start_date)}`, daily: 'Every day', weekdays: days, weekly: `Weekly on ${days}` }[r.kind] || r.kind;
  return `${when} at ${r.time_local}${r.tz !== 'Australia/Melbourne' ? ' (' + r.tz.split('/')[1] + ')' : ''}${r.end_date ? ` until ${shortDay(r.end_date)}` : ''}`;
}
async function paneReminders(c, pane) {
  const [{ reminders }, g] = await Promise.all([api(`/api/admin/clients/${c.id}/reminders`), api(`/api/admin/clients/${c.id}/goals`)]);
  pane.innerHTML = `${reminders.map((r) => `<div class="card" data-rem="${r.id}">
      <h3>${esc(r.message)} ${r.enabled ? '' : '<span class="tag paused">Off</span>'}</h3>
      <p class="small muted" style="margin:0 0 6px">${esc(describe(r))}${r.goal_text ? ` · 🎯 ${esc(r.goal_text)}` : ''}</p>
      <p class="small" style="margin:0 0 10px">${r.next_run_at ? 'Next: ' + esc(fmtWhen(r.next_run_at)) : 'Nothing more scheduled'}</p>
      <div class="row"><button class="btn small" data-act="rem-edit" data-id="${r.id}">Edit</button>
        <button class="btn small ${r.enabled ? '' : 'on'}" data-act="rem-toggle" data-id="${r.id}" data-on="${r.enabled}">${r.enabled ? 'Turn off' : 'Turn on'}</button></div></div>`).join('')}
    ${reminders.length ? '' : '<div class="card empty">No reminders yet.</div>'}
    <div id="rem-new">${reminderForm(c, null, g.goals)}</div>
    <div class="card"><h2>Test</h2><p>Sends a test notification to ${esc(c.first_name)}'s phone right now.</p>
      <button class="btn big" data-act="test-push" data-id="${c.id}">Send test notification to ${esc(c.first_name)}</button></div>`;
  pane._data = { c, reminders, goals: g.goals };
}

async function paneGoals(c, pane, week) {
  const g = await api(`/api/admin/clients/${c.id}/goals${week ? '?week=' + week : ''}`);
  const rows = (g.goals.length ? g.goals : []).map((x) => goalRow(x)).join('');
  pane.innerHTML = `${weekNav(g.week, `admin/c/${c.id}/goals`)}
    <form class="card" id="f-goals"><h2>Goals for this week</h2>
      <p class="small muted">Aim for 5–7. “Times” is how many ticks make it done (e.g. 3 for “Showered 3 times”).</p>
      <div class="goal-edit small muted" aria-hidden="true"><span>Goal</span><span>Times</span><span></span></div>
      <div id="goal-rows">${rows || goalRow({ text: '', target: 1 })}</div>
      <div class="row" style="margin:6px 0 14px"><button class="btn small" type="button" data-act="goal-add">+ Add a goal</button></div>
      <details style="margin-bottom:14px"><summary style="min-height:44px;font-weight:700">Paste from the goals spreadsheet</summary>
        <label class="field" style="margin-top:8px"><span>One goal per line (or copied cells)</span><textarea id="paste"></textarea></label>
        <button class="btn small" type="button" data-act="goal-paste">Use these</button></details>
      <button class="btn primary big" type="submit">Save goals</button>
    </form>
    ${g.total ? `<div class="card mint">${progressHtml(g)}</div>` : '<button class="btn" data-act="goal-copy">Copy last week\'s goals</button>'}`;
  const f = $('#f-goals');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const goals = [...f.querySelectorAll('.goal-edit[data-row]')].map((r) => ({ id: r.dataset.id ? +r.dataset.id : null, text: r.querySelector('[name=text]').value, target: +r.querySelector('[name=target]').value || 1 }));
    try { await api(`/api/admin/clients/${c.id}/goals`, { method: 'PUT', body: { week: g.week, goals } }); toast('Goals saved'); paneGoals(c, pane, g.week); } catch (err) { fail(err); }
  };
  pane._data = { c, week: g.week };
}
function goalRow(x) {
  return `<div class="goal-edit" data-row="1" data-id="${x.id || ''}"><input name="text" maxlength="200" value="${esc(x.text)}" aria-label="Goal">
    <input name="target" type="number" min="1" max="14" value="${x.target || 1}" aria-label="Times">
    <button class="btn small danger" type="button" data-act="goal-remove" aria-label="Remove goal">✕</button></div>`;
}
function guessTarget(t) { const m = t.match(/\b([2-9]|1[0-4])\s*(x|times|wins|sessions|days)\b/i); return m ? +m[1] : 1; }

async function paneMessages(c, pane) {
  const draw = async (keep) => {
    const { messages } = await api(`/api/admin/clients/${c.id}/messages`);
    const text = keep ? $('#composer')?.value : '';
    pane.innerHTML = `${threadHtml(messages, 'admin')}
      <form class="composer" id="f-msg" style="bottom:0"><label class="field"><span class="sr-only">Message</span><textarea id="composer" maxlength="2000" placeholder="Message ${esc(c.first_name)}…" required></textarea></label>
      <button class="btn primary big" type="submit">Send</button></form>`;
    if (text) $('#composer').value = text;
    $('#f-msg').onsubmit = async (e) => {
      e.preventDefault();
      try { await api(`/api/admin/clients/${c.id}/messages`, { method: 'POST', body: { body: $('#composer').value } }); $('#composer').value = ''; await draw(false); } catch (err) { fail(err); }
    };
  };
  await draw(false);
  S.poll = setInterval(() => { if (document.visibilityState === 'visible' && document.activeElement?.id !== 'composer') draw(true).catch(() => {}); }, 20000);
}

function paneSettings(c, pane) {
  pane.innerHTML = `<div class="card"><h2>Details</h2><p>${esc(c.first_name)} · ${esc(c.email)}</p>
      <button class="btn" data-act="invite" data-id="${c.id}">Email a new login link</button></div>
    <div class="card"><h2>${c.status === 'paused' ? 'Paused' : 'Pause'}</h2><p>${c.status === 'paused' ? 'No reminders are being sent.' : 'Stops all reminders until you resume. Nothing is deleted.'}</p>
      <button class="btn" data-act="pause" data-id="${c.id}" data-to="${c.status === 'paused' ? 'active' : 'paused'}">${c.status === 'paused' ? 'Resume reminders' : 'Pause reminders'}</button></div>
    <div class="card"><h2>Export data</h2><p>Download everything stored about ${esc(c.first_name)} (one JSON file).</p>
      <a class="btn" href="/api/admin/clients/${c.id}/export" download>Download ${esc(c.first_name)}'s data</a></div>
    <div class="card warn"><h2>Remove and delete</h2><p>Deletes ${esc(c.first_name)} and all their reminders, goals, ticks and messages. This can't be undone. Export first if you need a copy.</p>
      <label class="field"><span>Type ${esc(c.first_name)} to confirm</span><input id="del-confirm" autocomplete="off"></label>
      <button class="btn danger" data-act="delete" data-id="${c.id}" data-name="${esc(c.first_name)}">Delete ${esc(c.first_name)}</button></div>`;
}

// ---------- events ----------
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act],[data-kind],[data-day]');
  if (!b) return;
  // Reminder form chips
  if (b.dataset.kind || b.dataset.day) {
    e.preventDefault();
    const f = b.closest('form');
    if (b.dataset.kind) {
      f.querySelectorAll('.chip[data-kind]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const k = b.dataset.kind;
      f.querySelector('.days-field').classList.toggle('hidden', !(k === 'weekdays' || k === 'weekly'));
      f.querySelector('.end-field').classList.toggle('hidden', k === 'once');
      f.querySelector('.start-label').textContent = k === 'once' ? 'Date' : 'Start';
      if (k === 'weekly') { const on = [...f.querySelectorAll('.chip[data-day][aria-pressed="true"]')]; on.slice(1).forEach((x) => x.setAttribute('aria-pressed', 'false')); }
    } else {
      const weekly = f.querySelector('.chip[data-kind="weekly"]').getAttribute('aria-pressed') === 'true';
      if (weekly) f.querySelectorAll('.chip[data-day]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      else b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    }
    return;
  }
  const act = b.dataset.act, id = +b.dataset.id;
  try {
    switch (act) {
      case 'have-code': return viewLogin('code', '');
      case 'restart-login': return viewLogin('email');
      case 'logout': await api('/auth/logout', { method: 'POST', body: {} }); S.me = null; location.hash = ''; return render();
      case 'done': b.disabled = true; return respond(id, 'done');
      case 'undo': return respond(id, null);
      case 'nt-open': { const f = document.querySelector(`.nt-form[data-id="${id}"]`); f.classList.remove('hidden'); f.note.focus(); return; }
      case 'goal': return tickGoal(id, b.dataset.full === '1' ? -1 : 1);
      case 'goal-minus': return tickGoal(id, -1);
      case 'close-cel': document.querySelector('.celebrate')?.remove(); return;
      case 'push-on': b.disabled = true; await subscribe(); toast('Notifications are on ✅'); return viewNotifications();
      case 'push-test': { const r = await api('/api/push/test', { method: 'POST', body: {} }); toast(r.ok ? 'Sent! It should pop up in a few seconds.' : 'Couldn\'t reach this phone. Try turning notifications off and on.'); return; }
      case 'install': if (S.installEvt) { S.installEvt.prompt(); await S.installEvt.userChoice; S.installEvt = null; viewNotifications(); } return;
      // admin
      case 'test-push': { b.disabled = true; const r = await api(`/api/admin/clients/${id}/test-push`, { method: 'POST', body: {} }); b.disabled = false;
        toast(r.ok ? 'Test sent ✅' : r.devices ? 'Their phone didn\'t accept it. Ask them to turn notifications off and on.' : 'They haven\'t turned on notifications yet.', 4500); return; }
      case 'rem-toggle': await api(`/api/admin/reminders/${id}`, { method: 'PATCH', body: { enabled: b.dataset.on !== '1' } }); return render();
      case 'rem-edit': {
        const pane = $('#pane'); const d = pane._data; const r = d.reminders.find((x) => x.id === id);
        const card = pane.querySelector(`[data-rem="${id}"]`); card.outerHTML = reminderForm(d.c, r, d.goals); return;
      }
      case 'rem-cancel': return render();
      case 'rem-del': { const f = b.closest('form'); if (!confirm('Delete this reminder?')) return; await api(`/api/admin/reminders/${f.dataset.id}`, { method: 'DELETE' }); toast('Deleted'); return render(); }
      case 'goal-add': $('#goal-rows').insertAdjacentHTML('beforeend', goalRow({ text: '', target: 1 })); $('#goal-rows .goal-edit:last-child input').focus(); return;
      case 'goal-remove': b.closest('.goal-edit').remove(); return;
      case 'goal-paste': {
        const lines = $('#paste').value.split(/[\r\n\t]+/).map((s) => s.trim()).filter(Boolean).slice(0, 12);
        if (!lines.length) return;
        const rows = $('#goal-rows');
        rows.querySelectorAll('.goal-edit').forEach((r) => { if (!r.querySelector('[name=text]').value.trim()) r.remove(); });
        rows.insertAdjacentHTML('beforeend', lines.map((t) => goalRow({ text: t, target: guessTarget(t) })).join(''));
        $('#paste').value = ''; toast(`${lines.length} goals added. Check the “times”, then Save.`); return;
      }
      case 'goal-copy': { const d = $('#pane')._data; await api(`/api/admin/clients/${d.c.id}/goals/copy`, { method: 'POST', body: { week: d.week } }); toast('Copied'); return render(); }
      case 'invite': { const r = await api(`/api/admin/clients/${id}/invite`, { method: 'POST', body: {} }); toast(r.ok ? 'Login link sent' : 'Test mode: link in console'); if (r.dev) console.log('invite', r.dev); return; }
      case 'pause': await api(`/api/admin/clients/${id}`, { method: 'PATCH', body: { status: b.dataset.to } }); toast(b.dataset.to === 'paused' ? 'Paused' : 'Resumed'); return render();
      case 'delete': {
        if ($('#del-confirm').value.trim().toLowerCase() !== b.dataset.name.toLowerCase()) return toast('Type the name to confirm.');
        await api(`/api/admin/clients/${id}`, { method: 'DELETE' }); toast('Deleted'); return go('admin');
      }
    }
  } catch (err) { fail(err); b.disabled = false; }
});

document.addEventListener('submit', async (e) => {
  const f = e.target;
  if (f.classList.contains('nt-form')) { e.preventDefault(); return respond(+f.dataset.id, 'not_today', f.note.value); }
  if (f.classList.contains('f-rem')) {
    e.preventDefault();
    const body = readReminderForm(f);
    const c = $('#pane')._data.c;
    try {
      if (f.dataset.id) await api(`/api/admin/reminders/${f.dataset.id}`, { method: 'PATCH', body });
      else await api(`/api/admin/clients/${c.id}/reminders`, { method: 'POST', body });
      toast('Reminder saved'); render();
    } catch (err) { fail(err); }
  }
});

window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; if (route()[0] === 'notifications') viewNotifications(); });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (ev) => {
    const m = ev.data || {};
    if (m.type === 'open' && m.url) { const u = new URL(m.url); history.replaceState(null, '', u.pathname + u.search + u.hash); render(); }
    if (m.type === 'push' && S.me) { const r = route()[0]; if (r === 'today' || !r || r === 'messages') render(); }
  });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.me?.role === 'client' && (route()[0] || 'today') === 'today') viewToday(); });

render().then(() => { if (S.me) resyncPush(); });
