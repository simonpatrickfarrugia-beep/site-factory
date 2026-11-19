import { makeVapidKeys, sendPush, type Vapid } from './push';
import { emailHtml, esc, sendMail, type MailEnv } from './mail';
import { localDate, nextRun, weekStart, DEFAULT_TZ } from './time';

export interface Env extends MailEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_EMAILS: string;            // comma-separated; Simon
  APP_URL: string;                 // https://checkin.communityhelp.com.au
  VAPID_SUBJECT?: string;          // mailto: contact push services can reach
  DEV_SHOW_LINKS?: string;         // "1" only for local testing: show login links on screen
}

export interface Session { role: 'admin' | 'client'; client_id: number | null; email: string; id_hash: string }

export const now = () => Date.now();

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}
export const bad = (error: string, status = 400) => json({ error }, status);

export async function sha256(text: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function randomToken(bytes = 32) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

export const EMAIL_RE = /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/;
export const clean = (v: unknown, max = 500) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) : '');

export async function getSetting(env: Env, key: string) {
  return (await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>())?.value ?? null;
}
export async function setSetting(env: Env, key: string, value: string) {
  await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, value).run();
}

let vapidCache: Vapid | null = null;
export async function vapid(env: Env): Promise<Vapid> {
  if (vapidCache) return vapidCache;
  let raw = await getSetting(env, 'vapid');
  if (!raw) {
    const k = await makeVapidKeys();
    // INSERT OR IGNORE: if two requests race, both end up using the first stored pair.
    await env.DB.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').bind('vapid', JSON.stringify(k)).run();
    raw = (await getSetting(env, 'vapid'))!;
  }
  const k = JSON.parse(raw) as { publicKey: string; privateJwk: JsonWebKey };
  vapidCache = { ...k, subject: env.VAPID_SUBJECT || 'mailto:simon@communityhelp.com.au' };
  return vapidCache;
}

/** Key for signing one-tap links in fallback emails. Made on first use, kept in D1. */
export async function linkKey(env: Env) {
  let k = await getSetting(env, 'link_key');
  if (!k) {
    await env.DB.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').bind('link_key', randomToken()).run();
    k = (await getSetting(env, 'link_key'))!;
  }
  return k;
}
export async function sign(env: Env, text: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(await linkKey(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(s)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ClientRow { id: number; first_name: string; email: string; status: string; tz: string; created_at: number; last_seen_at: number | null; last_email_notice_at: number | null }
export async function getClient(env: Env, id: number) {
  return env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first<ClientRow>();
}

export const thisWeek = (tz = DEFAULT_TZ) => weekStart(localDate(now(), tz));

/** Push to every device of a client (or of the admin when clientId is null). Dead subscriptions are removed. */
export async function pushTo(env: Env, role: 'admin' | 'client', clientId: number | null, data: Record<string, unknown>) {
  const subs = (role === 'admin'
    ? await env.DB.prepare(`SELECT * FROM push_subs WHERE role = 'admin'`).all<{ id: number; endpoint: string; p256dh: string; auth: string }>()
    : await env.DB.prepare(`SELECT * FROM push_subs WHERE role = 'client' AND client_id = ?`).bind(clientId).all<{ id: number; endpoint: string; p256dh: string; auth: string }>()
  ).results;
  if (!subs.length) return { tried: 0, ok: 0 };
  const v = await vapid(env);
  let ok = 0;
  for (const s of subs.slice(0, 5)) {
    const r = await sendPush(s, data, v);
    if (r.ok) { ok++; await env.DB.prepare('UPDATE push_subs SET last_ok_at = ?, fail_count = 0 WHERE id = ?').bind(now(), s.id).run(); }
    else if (r.gone) await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(s.id).run();
    else await env.DB.prepare('UPDATE push_subs SET fail_count = fail_count + 1 WHERE id = ?').bind(s.id).run();
  }
  return { tried: subs.length, ok };
}

export interface ReminderRow {
  id: number; client_id: number; goal_id: number | null; message: string; kind: string; days: string; time_local: string; tz: string;
  start_date: string; end_date: string | null; enabled: number; next_run_at: number | null; created_at: number; updated_at: number;
}

/** Send one reminder now: record a delivery, push it, email it if push didn't reach any device. */
export async function deliver(env: Env, r: ReminderRow, client: ClientRow, dueAt: number, test = false) {
  const local = localDate(dueAt, r.tz);
  const d = await env.DB.prepare(`INSERT INTO deliveries (reminder_id, client_id, message, local_date, due_at) VALUES (?, ?, ?, ?, ?) RETURNING id`)
    .bind(test ? null : r.id, client.id, r.message, local, dueAt).first<{ id: number }>();
  const id = d!.id;
  const push = await pushTo(env, 'client', client.id, {
    title: test ? 'Test from Simon' : 'Check-in',
    body: r.message,
    url: `/?d=${id}#today`,
    tag: `d${id}`,
    deliveryId: id,
  });
  let channel = push.ok ? 'push' : 'none';
  if (!push.ok && !test) {
    const s = await sign(env, `d:${id}`);
    const base = env.APP_URL.replace(/\/$/, '');
    const sent = await sendMail(env, client.email, r.message, emailHtml({
      hello: `Hi ${client.first_name},`,
      lines: [`<strong>${esc(r.message)}</strong>`, 'Tap below to tick it off.'],
      button: { label: 'Done ✅', url: `${base}/r/${id}?a=done&s=${s}` },
      after: [`Not today? <a href="${base}/r/${id}?a=not_today&s=${s}">Tap here</a>.`, `Turn on phone notifications in the app so these arrive as a ping: <a href="${base}/#notifications">${esc(base.replace(/^https?:\/\//, ''))}</a>`],
    }));
    if (sent) channel = 'email';
  }
  if (test) channel = push.ok ? 'test' : 'none';
  await env.DB.prepare('UPDATE deliveries SET sent_at = ?, channel = ? WHERE id = ?').bind(now(), channel, id).run();
  return { id, channel, push };
}

/** Cron: every minute. Claims each due reminder (so overlapping runs can't double-send), sends, schedules the next. */
export async function runDue(env: Env) {
  const t = now();
  const due = (await env.DB.prepare(`SELECT r.*, c.status AS c_status FROM reminders r JOIN clients c ON c.id = r.client_id
      WHERE r.enabled = 1 AND r.next_run_at IS NOT NULL AND r.next_run_at <= ? ORDER BY r.next_run_at LIMIT 8`).bind(t)
    .all<ReminderRow & { c_status: string }>()).results;
  const out: { id: number; sent: boolean; channel?: string }[] = [];
  for (const r of due) {
    const next = nextRun(r, Math.max(t, r.next_run_at!));
    const claim = await env.DB.prepare('UPDATE reminders SET next_run_at = ? WHERE id = ? AND next_run_at = ?').bind(next, r.id, r.next_run_at).run();
    if (!claim.meta.changes) continue;
    // Paused clients get nothing; anything over 90 minutes late (an outage) is skipped, not sent at a silly hour.
    if (r.c_status !== 'active' || t - r.next_run_at! > 90 * 60_000) { out.push({ id: r.id, sent: false }); continue; }
    const client = await getClient(env, r.client_id);
    if (!client) continue;
    const res = await deliver(env, r, client, r.next_run_at!);
    out.push({ id: r.id, sent: true, channel: res.channel });
  }
  // Housekeeping once an hour: expired logins and sessions.
  if (new Date(t).getUTCMinutes() === 7) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM login_requests WHERE expires_at < ?').bind(t - 86_400_000),
      env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(t),
    ]);
  }
  return out;
}

export function refreshNext(r: Pick<ReminderRow, 'kind' | 'days' | 'time_local' | 'tz' | 'start_date' | 'end_date' | 'enabled'>) {
  return r.enabled ? nextRun(r, now()) : null;
}
