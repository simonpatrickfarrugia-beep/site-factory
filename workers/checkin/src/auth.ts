// Passwordless login. The email has a link AND a 6-digit code:
// - the link works in the browser it's opened in (Android: Chrome, which the installed app shares);
// - the code is for an iPhone home-screen app, which doesn't share Safari's login.
// Links open a "Log me in" page and only a button press logs in, so email link scanners can't use them up.

import { bad, clean, EMAIL_RE, json, now, randomCode, randomToken, sha256, type Env, type Session, type ClientRow } from './core';
import { emailHtml, esc, sendMail } from './mail';

const COOKIE = 'ci_s';
const DAY = 86_400_000;
export const SESSION_DAYS = { client: 90, admin: 30 };

export function isAdminEmail(env: Env, email: string) {
  return env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

function cookieValue(req: Request, name: string) {
  const c = req.headers.get('cookie') || '';
  for (const part of c.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export async function getSession(env: Env, req: Request): Promise<{ s: Session; setCookie?: string } | null> {
  const raw = cookieValue(req, COOKIE);
  if (!raw || !/^[0-9a-f]{64}$/.test(raw)) return null;
  const id_hash = await sha256(raw);
  const row = await env.DB.prepare('SELECT * FROM sessions WHERE id_hash = ?').bind(id_hash).first<Session & { expires_at: number; last_seen_at: number }>();
  if (!row || row.expires_at < now()) return null;
  if (row.role === 'client') {
    const c = await env.DB.prepare('SELECT id FROM clients WHERE id = ?').bind(row.client_id).first();
    if (!c) return null; // client removed
  }
  let setCookie: string | undefined;
  // Sliding expiry: anyone who opens the app stays logged in.
  if (now() - row.last_seen_at > DAY) {
    const exp = now() + SESSION_DAYS[row.role] * DAY;
    await env.DB.batch([
      env.DB.prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id_hash = ?').bind(now(), exp, id_hash),
      ...(row.client_id ? [env.DB.prepare('UPDATE clients SET last_seen_at = ? WHERE id = ?').bind(now(), row.client_id)] : []),
    ]);
    setCookie = sessionCookie(raw, SESSION_DAYS[row.role]);
  }
  return { s: { role: row.role, client_id: row.client_id, email: row.email, id_hash }, setCookie };
}

function sessionCookie(value: string, days: number) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${days * 86400}`;
}

async function startSession(env: Env, role: 'admin' | 'client', clientId: number | null, email: string) {
  const raw = randomToken();
  const days = SESSION_DAYS[role];
  await env.DB.prepare('INSERT INTO sessions (id_hash, role, client_id, email, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(await sha256(raw), role, clientId, email, now(), now() + days * DAY, now()).run();
  if (clientId) await env.DB.prepare('UPDATE clients SET last_seen_at = ? WHERE id = ?').bind(now(), clientId).run();
  return sessionCookie(raw, days);
}

/** Make a login and email it. Invites from Simon last 7 days; ones people ask for last 20 minutes. */
export async function sendLogin(env: Env, email: string, opts: { invite?: boolean } = {}) {
  const admin = isAdminEmail(env, email);
  let client: ClientRow | null = null;
  if (!admin) {
    client = await env.DB.prepare('SELECT * FROM clients WHERE email = ?').bind(email).first<ClientRow>();
    if (!client) return { sent: false, reason: 'unknown' as const };
  }
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_requests WHERE email = ? AND created_at > ?').bind(email, now() - 3600_000).first<{ n: number }>();
  if ((recent?.n ?? 0) >= 6) return { sent: false, reason: 'limit' as const };

  const token = randomToken();
  const code = randomCode();
  const ttl = opts.invite ? 7 * DAY : 20 * 60_000;
  await env.DB.prepare('INSERT INTO login_requests (email, role, client_id, token_hash, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(email, admin ? 'admin' : 'client', client?.id ?? null, await sha256(token), await sha256(code + ':' + email.toLowerCase()), now() + ttl, now()).run();

  const base = env.APP_URL.replace(/\/$/, '');
  const link = `${base}/auth/verify?t=${token}`;
  const name = admin ? 'Simon' : client!.first_name;
  const html = opts.invite
    ? emailHtml({
        hello: `Hi ${name},`,
        lines: [
          'Simon has set you up on <strong>Check-in</strong>, your goals companion between our sessions. It sends friendly reminders to your phone and keeps this week\'s goals in one place.',
          'Open this email on your phone and tap the button:',
        ],
        button: { label: 'Open Check-in', url: link },
        after: [`Or type this code in the app: <strong style="font-size:22px;letter-spacing:3px">${code}</strong>`, 'This link works for 7 days. Your login then lasts 90 days.'],
      })
    : emailHtml({
        hello: `Hi ${name},`,
        lines: ['Here is your Check-in login.'],
        button: { label: 'Log me in', url: link },
        after: [`Or type this code in the app: <strong style="font-size:22px;letter-spacing:3px">${code}</strong>`, 'It works for 20 minutes. If you didn\'t ask for this, you can ignore it.'],
      });
  const sent = await sendMail(env, email, opts.invite ? 'Your Check-in with Simon' : `Your Check-in login code: ${code}`, html);
  return { sent, reason: sent ? undefined : ('mail' as const), dev: env.DEV_SHOW_LINKS === '1' ? { link, code } : undefined };
}

export async function handleAuth(env: Env, req: Request, url: URL): Promise<Response | null> {
  const p = url.pathname;

  if (p === '/auth/request' && req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const email = clean(b.email, 200).toLowerCase();
    if (!EMAIL_RE.test(email)) return bad('Please check your email address.');
    const r = await sendLogin(env, email);
    if (r.reason === 'limit') return bad('Too many tries. Please wait an hour, or ask Simon.', 429);
    // Same answer whether or not the email is registered, so nobody can test which emails are clients.
    return json({ ok: true, dev: r.dev });
  }

  if (p === '/auth/code' && req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const email = clean(b.email, 200).toLowerCase();
    const code = clean(b.code, 10).replace(/\D/g, '');
    if (!EMAIL_RE.test(email) || code.length !== 6) return bad('Please enter your email and the 6-digit code.');
    const row = await env.DB.prepare('SELECT * FROM login_requests WHERE email = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1')
      .bind(email, now()).first<{ id: number; code_hash: string; attempts: number; role: 'admin' | 'client'; client_id: number | null }>();
    if (!row || row.attempts >= 5) return bad('That code has expired. Ask for a new one.');
    if ((await sha256(code + ':' + email)) !== row.code_hash) {
      await env.DB.prepare('UPDATE login_requests SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run();
      return bad('That code doesn\'t match. Check the newest email.');
    }
    await env.DB.prepare('UPDATE login_requests SET used_at = ? WHERE id = ?').bind(now(), row.id).run();
    return json({ ok: true, role: row.role }, 200, { 'set-cookie': await startSession(env, row.role, row.client_id, email) });
  }

  if (p === '/auth/verify' && req.method === 'GET') {
    const t = url.searchParams.get('t') || '';
    return page('Log in to Check-in', `<h1>Welcome to Check-in</h1><p>Tap the button to finish logging in.</p>
<form method="post" action="/auth/verify"><input type="hidden" name="t" value="${esc(t)}"><button class="btn primary big" type="submit">Log me in</button></form>`);
  }

  if (p === '/auth/verify' && req.method === 'POST') {
    const form = await req.formData().catch(() => null);
    const t = String(form?.get('t') ?? '');
    if (!/^[0-9a-f]{64}$/.test(t)) return page('Link not valid', '<h1>That link isn\'t valid</h1><p><a class="btn primary big" href="/">Get a new one</a></p>', 400);
    const row = await env.DB.prepare('SELECT * FROM login_requests WHERE token_hash = ?').bind(await sha256(t))
      .first<{ id: number; email: string; role: 'admin' | 'client'; client_id: number | null; expires_at: number; used_at: number | null }>();
    if (!row || row.used_at || row.expires_at < now()) {
      return page('Link expired', '<h1>That link has expired or was already used</h1><p>No problem. Ask for a fresh one.</p><p><a class="btn primary big" href="/">Get a new link</a></p>', 400);
    }
    await env.DB.prepare('UPDATE login_requests SET used_at = ? WHERE id = ?').bind(now(), row.id).run();
    const cookie = await startSession(env, row.role, row.client_id, row.email);
    return new Response(null, { status: 303, headers: { location: row.role === 'admin' ? '/#admin' : '/?welcome=1#today', 'set-cookie': cookie } });
  }

  if (p === '/auth/logout' && req.method === 'POST') {
    const raw = cookieValue(req, COOKIE);
    if (raw && /^[0-9a-f]{64}$/.test(raw)) await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(await sha256(raw)).run();
    return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
  }
  return null;
}

/** Small server-rendered pages (login link, email one-tap). Same look as the app. */
export function page(title: string, body: string, status = 200) {
  return new Response(`<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><link rel="stylesheet" href="/app.css"><link rel="icon" href="/icons/favicon.png"></head>
<body><main class="wrap narrow simple">${body}</main></body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
