// JSON API. Every client query is scoped to the logged-in client's own id; admin routes need role admin.

import {
  bad, clean, deliver, EMAIL_RE, getClient, json, now, pushTo, refreshNext, thisWeek, vapid,
  type ClientRow, type Env, type ReminderRow, type Session,
} from './core';
import { sendLogin } from './auth';
import { emailHtml, esc, mailConfigured, sendMail } from './mail';
import { addDays, DATE_RE, DEFAULT_TZ, localDate, localParts, TIME_RE, validTz, weekStart, pad } from './time';

type Body = Record<string, unknown>;
const int = (v: unknown) => (typeof v === 'number' ? Math.trunc(v) : typeof v === 'string' && /^\d+$/.test(v) ? +v : NaN);

// ---------- shared pieces ----------

async function goalsFor(env: Env, clientId: number, week: string) {
  const goals = (await env.DB.prepare('SELECT id, text, target, count, sort FROM goals WHERE client_id = ? AND week_start = ? ORDER BY sort, id')
    .bind(clientId, week).all<{ id: number; text: string; target: number; count: number; sort: number }>()).results;
  const done = goals.filter((g) => g.count >= g.target).length;
  return { week, goals, done, total: goals.length, allDone: goals.length > 0 && done === goals.length };
}

async function adjustGoal(env: Env, clientId: number, goalId: number, delta: number, via: string) {
  const g = await env.DB.prepare('SELECT * FROM goals WHERE id = ? AND client_id = ?').bind(goalId, clientId).first<{ id: number; count: number; target: number }>();
  if (!g) return null;
  const count = Math.max(0, Math.min(g.target, g.count + delta));
  if (count === g.count) return g;
  await env.DB.batch([
    env.DB.prepare('UPDATE goals SET count = ?, updated_at = ? WHERE id = ?').bind(count, now(), g.id),
    env.DB.prepare('INSERT INTO goal_events (goal_id, client_id, delta, via, at) VALUES (?, ?, ?, ?, ?)').bind(g.id, clientId, count - g.count, via, now()),
  ]);
  return { ...g, count };
}

/** Done / Not today on a reminder. A Done on a reminder linked to this week's goal ticks that goal once. */
export async function respond(env: Env, clientId: number, deliveryId: number, status: string | null, note: string) {
  const d = await env.DB.prepare('SELECT d.*, r.goal_id FROM deliveries d LEFT JOIN reminders r ON r.id = d.reminder_id WHERE d.id = ? AND d.client_id = ?')
    .bind(deliveryId, clientId).first<{ id: number; status: string | null; goal_credit_id: number | null; goal_id: number | null; local_date: string; opened_at: number | null }>();
  if (!d) return null;
  let credit = d.goal_credit_id;
  if (status === 'done' && d.status !== 'done' && d.goal_id) {
    const g = await env.DB.prepare('SELECT id, count, target, week_start FROM goals WHERE id = ? AND client_id = ?').bind(d.goal_id, clientId)
      .first<{ id: number; count: number; target: number; week_start: string }>();
    if (g && g.week_start === weekStart(d.local_date) && g.count < g.target) { await adjustGoal(env, clientId, g.id, 1, 'reminder'); credit = g.id; }
  }
  if (status !== 'done' && d.status === 'done' && d.goal_credit_id) { await adjustGoal(env, clientId, d.goal_credit_id, -1, 'reminder'); credit = null; }
  await env.DB.prepare('UPDATE deliveries SET status = ?, note = ?, responded_at = ?, goal_credit_id = ?, opened_at = COALESCE(opened_at, ?) WHERE id = ?')
    .bind(status, status === 'not_today' ? note || null : null, status ? now() : null, credit, now(), d.id).run();
  return { ok: true };
}

async function messagesFor(env: Env, clientId: number, reader: 'admin' | 'client') {
  const other = reader === 'admin' ? 'client' : 'admin';
  await env.DB.prepare('UPDATE messages SET read_at = ? WHERE client_id = ? AND sender = ? AND read_at IS NULL').bind(now(), clientId, other).run();
  return (await env.DB.prepare('SELECT id, sender, body, created_at, read_at FROM messages WHERE client_id = ? ORDER BY created_at DESC LIMIT 100')
    .bind(clientId).all()).results.reverse();
}

async function postMessage(env: Env, client: ClientRow, sender: 'admin' | 'client', text: string) {
  const row = await env.DB.prepare('INSERT INTO messages (client_id, sender, body, created_at) VALUES (?, ?, ?, ?) RETURNING id, sender, body, created_at')
    .bind(client.id, sender, text, now()).first();
  const base = env.APP_URL.replace(/\/$/, '');
  if (sender === 'admin') {
    const p = await pushTo(env, 'client', client.id, { title: 'Message from Simon', body: text.slice(0, 140), url: '/#messages', tag: 'msg' });
    // No phone notifications yet: a short email (no message text in it), at most every 30 minutes.
    if (!p.ok && (!client.last_email_notice_at || now() - client.last_email_notice_at > 30 * 60_000)) {
      await env.DB.prepare('UPDATE clients SET last_email_notice_at = ? WHERE id = ?').bind(now(), client.id).run();
      await sendMail(env, client.email, 'Simon sent you a message', emailHtml({
        hello: `Hi ${client.first_name},`, lines: ['Simon sent you a message in Check-in.'], button: { label: 'Read it', url: `${base}/#messages` },
      }));
    }
  } else {
    const p = await pushTo(env, 'admin', null, { title: `${client.first_name} sent a message`, body: text.slice(0, 140), url: `/#admin/c/${client.id}/messages`, tag: `msg${client.id}` });
    if (!p.ok) {
      const last = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(`admin_notice_${client.id}`).first<{ value: string }>();
      if (!last || now() - +last.value > 60 * 60_000) {
        await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(`admin_notice_${client.id}`, String(now())).run();
        for (const a of env.ADMIN_EMAILS.split(',').map((e) => e.trim()).filter(Boolean)) {
          await sendMail(env, a, `${client.first_name} sent you a message in Check-in`, emailHtml({
            hello: 'Hi Simon,', lines: [`${esc(client.first_name)} wrote: “${esc(text.slice(0, 300))}”`], button: { label: 'Reply in Check-in', url: `${base}/#admin/c/${client.id}/messages` },
          }));
        }
      }
    }
  }
  return row;
}

// ---------- push subscriptions (both roles) ----------

async function pushRoutes(env: Env, req: Request, s: Session, p: string) {
  if (p === '/api/push/key' && req.method === 'GET') return json({ key: (await vapid(env)).publicKey });
  if (p === '/api/push/subscribe' && req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; device?: string };
    const sub = b.subscription;
    if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) return bad('That subscription looks incomplete.');
    await env.DB.prepare(`INSERT INTO push_subs (role, client_id, endpoint, p256dh, auth, device, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET role = excluded.role, client_id = excluded.client_id, p256dh = excluded.p256dh, auth = excluded.auth, device = excluded.device, fail_count = 0`)
      .bind(s.role, s.client_id, sub.endpoint.slice(0, 1000), clean(sub.keys.p256dh, 200), clean(sub.keys.auth, 100), clean(b.device, 60) || null, now()).run();
    return json({ ok: true });
  }
  if (p === '/api/push/unsubscribe' && req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as { endpoint?: string };
    await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ? AND role = ? AND client_id IS ?').bind(String(b.endpoint ?? ''), s.role, s.client_id).run();
    return json({ ok: true });
  }
  if (p === '/api/push/test' && req.method === 'POST') {
    const r = await pushTo(env, s.role, s.client_id, { title: 'Notifications are on 🎉', body: 'This is what a Check-in reminder looks like.', url: s.role === 'admin' ? '/#admin' : '/#today', tag: 'test' });
    return json({ ok: r.ok > 0, devices: r.tried });
  }
  return null;
}

// ---------- client ----------

async function clientRoutes(env: Env, req: Request, s: Session, p: string, url: URL) {
  const client = await getClient(env, s.client_id!);
  if (!client) return bad('Not logged in', 401);
  const tz = client.tz || DEFAULT_TZ;
  let m: RegExpMatchArray | null;

  if (p === '/api/today' && req.method === 'GET') {
    const today = localDate(now(), tz);
    const items = (await env.DB.prepare(`SELECT id, message, due_at, status, note, opened_at FROM deliveries
        WHERE client_id = ? AND local_date = ? AND reminder_id IS NOT NULL ORDER BY due_at`).bind(client.id, today).all()).results;
    const endOfDay = Date.parse(addDays(today, 1) + 'T00:00:00Z') + 14 * 3600_000; // generous; filtered by local date below
    const later = (await env.DB.prepare(`SELECT id, message, next_run_at FROM reminders WHERE client_id = ? AND enabled = 1
        AND next_run_at IS NOT NULL AND next_run_at > ? AND next_run_at < ? ORDER BY next_run_at`).bind(client.id, now(), endOfDay)
      .all<{ id: number; message: string; next_run_at: number }>()).results
      .filter((r) => localDate(r.next_run_at, tz) === today)
      .map((r) => { const l = localParts(r.next_run_at, tz); return { message: r.message, at: `${pad(l.hh)}:${pad(l.mm)}` }; });
    const unread = await env.DB.prepare(`SELECT COUNT(*) AS n FROM messages WHERE client_id = ? AND sender = 'admin' AND read_at IS NULL`).bind(client.id).first<{ n: number }>();
    return json({ name: client.first_name, today, items, later, goals: await goalsFor(env, client.id, weekStart(today)), unread: unread?.n ?? 0, paused: client.status !== 'active' });
  }
  if ((m = p.match(/^\/api\/deliveries\/(\d+)$/)) && req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as Body;
    const status = b.status === 'done' || b.status === 'not_today' ? b.status : null;
    const r = await respond(env, client.id, +m[1], status, clean(b.note, 280));
    return r ? json({ ...r, goals: await goalsFor(env, client.id, thisWeek(tz)) }) : bad('Not found', 404);
  }
  if ((m = p.match(/^\/api\/deliveries\/(\d+)\/opened$/)) && req.method === 'POST') {
    await env.DB.prepare('UPDATE deliveries SET opened_at = COALESCE(opened_at, ?) WHERE id = ? AND client_id = ?').bind(now(), +m[1], client.id).run();
    return json({ ok: true });
  }
  if (p === '/api/goals' && req.method === 'GET') return json(await goalsFor(env, client.id, thisWeek(tz)));
  if ((m = p.match(/^\/api\/goals\/(\d+)$/)) && req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as Body;
    const delta = b.delta === -1 ? -1 : 1;
    const g = await env.DB.prepare('SELECT week_start FROM goals WHERE id = ? AND client_id = ?').bind(+m[1], client.id).first<{ week_start: string }>();
    if (!g || g.week_start !== thisWeek(tz)) return bad('Only this week\'s goals can be ticked.', 404);
    await adjustGoal(env, client.id, +m[1], delta, 'tap');
    return json(await goalsFor(env, client.id, thisWeek(tz)));
  }
  if (p === '/api/messages' && req.method === 'GET') return json({ messages: await messagesFor(env, client.id, 'client') });
  if (p === '/api/messages' && req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as Body;
    const text = clean(b.body, 2000);
    if (!text) return bad('Type a message first.');
    return json({ message: await postMessage(env, client, 'client', text) });
  }
  void url;
  return null;
}

// ---------- admin ----------

function reminderInput(b: Body, tzFallback: string) {
  const kind = ['once', 'daily', 'weekdays', 'weekly'].includes(String(b.kind)) ? String(b.kind) : '';
  const days = Array.isArray(b.days) ? [...new Set(b.days.map(Number).filter((n) => n >= 1 && n <= 7))].sort().join(',') : '';
  const r = {
    message: clean(b.message, 200),
    kind,
    days: kind === 'weekly' ? days.split(',')[0] || '' : kind === 'weekdays' ? days : '',
    time_local: clean(b.time_local, 5),
    tz: clean(b.tz, 60) || tzFallback,
    start_date: clean(b.start_date, 10),
    end_date: clean(b.end_date, 10) || null,
    enabled: b.enabled === false || b.enabled === 0 ? 0 : 1,
    goal_id: Number.isFinite(int(b.goal_id)) ? int(b.goal_id) : null,
  };
  if (!r.message) return { error: 'Add the reminder message.' };
  if (!r.kind) return { error: 'Pick how often.' };
  if ((r.kind === 'weekdays' || r.kind === 'weekly') && !r.days) return { error: 'Pick at least one day.' };
  if (!TIME_RE.test(r.time_local)) return { error: 'Time must look like 11:00.' };
  if (!validTz(r.tz)) return { error: 'Unknown time zone.' };
  if (!DATE_RE.test(r.start_date)) return { error: 'Pick a start date.' };
  if (r.end_date && (!DATE_RE.test(r.end_date) || r.end_date < r.start_date)) return { error: 'End date must be after the start date.' };
  return { r };
}

/** Pull a target out of goal text: "Showered 3 times this week" → 3. */
export function guessTarget(text: string) {
  const m = text.match(/\b([2-9]|1[0-4])\s*(x|times|wins|sessions|days)\b/i);
  return m ? +m[1] : 1;
}

async function activity(env: Env, client: ClientRow, week: string) {
  const from = week, to = addDays(week, 6);
  const reminders = (await env.DB.prepare('SELECT id, message, kind, days, time_local, enabled, goal_id FROM reminders WHERE client_id = ? ORDER BY id').bind(client.id).all<{ id: number }>()).results;
  const deliveries = (await env.DB.prepare(`SELECT id, reminder_id, local_date, due_at, sent_at, channel, opened_at, status, note, responded_at
      FROM deliveries WHERE client_id = ? AND local_date BETWEEN ? AND ? AND reminder_id IS NOT NULL ORDER BY due_at`).bind(client.id, from, to)
    .all<{ reminder_id: number; status: string | null; opened_at: number | null; channel: string }>()).results;
  const per = reminders.map((r) => {
    const ds = deliveries.filter((d) => d.reminder_id === r.id);
    return { ...r, deliveries: ds, sent: ds.length, opened: ds.filter((d) => d.opened_at).length, done: ds.filter((d) => d.status === 'done').length, notToday: ds.filter((d) => d.status === 'not_today').length };
  }).filter((r) => r.sent || (r as { enabled?: number }).enabled);
  const goals = await goalsFor(env, client.id, week);
  const events = (await env.DB.prepare(`SELECT e.goal_id, e.delta, e.via, e.at FROM goal_events e JOIN goals g ON g.id = e.goal_id
      WHERE g.client_id = ? AND g.week_start = ? ORDER BY e.at`).bind(client.id, week).all()).results;
  return { client: { id: client.id, first_name: client.first_name, tz: client.tz }, week, reminders: per, goals, events };
}

async function exportClient(env: Env, id: number) {
  const q = (sql: string) => env.DB.prepare(sql).bind(id).all().then((r) => r.results);
  return {
    exported_at: new Date().toISOString(),
    note: 'Everything Community Help Co Check-in stores about this person.',
    client: await env.DB.prepare('SELECT id, first_name, email, status, tz, created_at, last_seen_at FROM clients WHERE id = ?').bind(id).first(),
    reminders: await q('SELECT * FROM reminders WHERE client_id = ?'),
    deliveries: await q('SELECT * FROM deliveries WHERE client_id = ?'),
    goals: await q('SELECT * FROM goals WHERE client_id = ?'),
    goal_events: await q('SELECT * FROM goal_events WHERE client_id = ?'),
    messages: await q('SELECT * FROM messages WHERE client_id = ?'),
    devices_with_notifications: (await env.DB.prepare('SELECT COUNT(*) AS n FROM push_subs WHERE client_id = ?').bind(id).first<{ n: number }>())?.n ?? 0,
  };
}

async function deleteClient(env: Env, c: ClientRow) {
  const t = ['reminders', 'deliveries', 'goals', 'goal_events', 'messages', 'push_subs', 'sessions'];
  await env.DB.batch([
    ...t.map((x) => env.DB.prepare(`DELETE FROM ${x} WHERE client_id = ?`).bind(c.id)),
    env.DB.prepare('DELETE FROM login_requests WHERE client_id = ? OR email = ?').bind(c.id, c.email),
    env.DB.prepare('DELETE FROM settings WHERE key = ?').bind(`admin_notice_${c.id}`),
    env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(c.id),
  ]);
}

async function saveGoals(env: Env, client: ClientRow, week: string, list: unknown) {
  if (!Array.isArray(list)) return bad('Goals missing.');
  const rows = list.slice(0, 12).map((g, i) => {
    const o = (g ?? {}) as Body;
    const text = clean(o.text, 200);
    const target = Math.max(1, Math.min(14, int(o.target) || 1));
    return { id: Number.isFinite(int(o.id)) ? int(o.id) : null, text, target, sort: i };
  }).filter((g) => g.text);
  const existing = (await env.DB.prepare('SELECT id, count FROM goals WHERE client_id = ? AND week_start = ?').bind(client.id, week).all<{ id: number; count: number }>()).results;
  const keep = new Set(rows.map((r) => r.id).filter((x) => x != null));
  const stmts: D1PreparedStatement[] = [];
  for (const e of existing) if (!keep.has(e.id)) {
    stmts.push(env.DB.prepare('DELETE FROM goals WHERE id = ?').bind(e.id));
    stmts.push(env.DB.prepare('DELETE FROM goal_events WHERE goal_id = ?').bind(e.id));
    stmts.push(env.DB.prepare('UPDATE reminders SET goal_id = NULL WHERE goal_id = ?').bind(e.id));
  }
  for (const r of rows) {
    if (r.id != null && existing.some((e) => e.id === r.id)) {
      stmts.push(env.DB.prepare('UPDATE goals SET text = ?, target = ?, count = MIN(count, ?), sort = ?, updated_at = ? WHERE id = ? AND client_id = ?').bind(r.text, r.target, r.target, r.sort, now(), r.id, client.id));
    } else {
      stmts.push(env.DB.prepare('INSERT INTO goals (client_id, week_start, text, target, sort, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(client.id, week, r.text, r.target, r.sort, now()));
    }
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json(await goalsFor(env, client.id, week));
}

async function adminRoutes(env: Env, req: Request, p: string, url: URL) {
  let m: RegExpMatchArray | null;

  if (p === '/api/admin/clients' && req.method === 'GET') {
    const rows = (await env.DB.prepare(`SELECT c.id, c.first_name, c.email, c.status, c.last_seen_at, c.created_at,
        (SELECT COUNT(*) FROM push_subs s WHERE s.client_id = c.id) AS devices,
        (SELECT COUNT(*) FROM messages mm WHERE mm.client_id = c.id AND mm.sender = 'client' AND mm.read_at IS NULL) AS unread,
        (SELECT COUNT(*) FROM reminders r WHERE r.client_id = c.id AND r.enabled = 1) AS reminders
      FROM clients c ORDER BY c.status, c.first_name`).all()).results;
    return json({ clients: rows, mail: mailConfigured(env), week: thisWeek() });
  }
  if (p === '/api/admin/clients' && req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as Body;
    const first = clean(b.first_name, 40);
    const email = clean(b.email, 200).toLowerCase();
    if (!first) return bad('Add a first name.');
    if (!EMAIL_RE.test(email)) return bad('That email doesn\'t look right.');
    if (env.ADMIN_EMAILS.toLowerCase().split(',').map((e) => e.trim()).includes(email)) return bad('That\'s your admin email. Use a different one for a client.');
    const dupe = await env.DB.prepare('SELECT id FROM clients WHERE email = ?').bind(email).first();
    if (dupe) return bad('A client with that email already exists.');
    const c = await env.DB.prepare('INSERT INTO clients (first_name, email, created_at) VALUES (?, ?, ?) RETURNING *').bind(first, email, now()).first<ClientRow>();
    const invite = b.invite ? await sendLogin(env, email, { invite: true }) : null;
    return json({ client: c, invited: invite?.sent ?? false, dev: invite?.dev });
  }

  if (!(m = p.match(/^\/api\/admin\/clients\/(\d+)(\/.*)?$/)) && !(m = p.match(/^\/api\/admin\/reminders\/(\d+)()$/))) return null;
  const isReminder = p.startsWith('/api/admin/reminders/');

  if (isReminder) {
    const r = await env.DB.prepare('SELECT * FROM reminders WHERE id = ?').bind(+m[1]).first<ReminderRow>();
    if (!r) return bad('Reminder not found', 404);
    if (req.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM reminders WHERE id = ?').bind(r.id).run();
      return json({ ok: true });
    }
    if (req.method === 'PATCH') {
      const b = (await req.json().catch(() => ({}))) as Body;
      const v = reminderInput({ ...r, days: r.days ? r.days.split(',').map(Number) : [], ...b }, r.tz);
      if ('error' in v) return bad(v.error!);
      const x = v.r!;
      const next = refreshNext(x);
      await env.DB.prepare(`UPDATE reminders SET message = ?, kind = ?, days = ?, time_local = ?, tz = ?, start_date = ?, end_date = ?, enabled = ?, goal_id = ?, next_run_at = ?, updated_at = ? WHERE id = ?`)
        .bind(x.message, x.kind, x.days, x.time_local, x.tz, x.start_date, x.end_date, x.enabled, x.goal_id, next, now(), r.id).run();
      return json({ ok: true, next_run_at: next });
    }
    return bad('Method not allowed', 405);
  }

  const client = await getClient(env, +m[1]);
  if (!client) return bad('Client not found', 404);
  const sub = m[2] || '';

  if (sub === '' && req.method === 'GET') return json({ client });
  if (sub === '' && req.method === 'PATCH') {
    const b = (await req.json().catch(() => ({}))) as Body;
    const status = b.status === 'paused' || b.status === 'active' ? b.status : client.status;
    const first = clean(b.first_name, 40) || client.first_name;
    await env.DB.prepare('UPDATE clients SET status = ?, first_name = ? WHERE id = ?').bind(status, first, client.id).run();
    return json({ ok: true });
  }
  if (sub === '' && req.method === 'DELETE') { await deleteClient(env, client); return json({ ok: true }); }
  if (sub === '/export' && req.method === 'GET') {
    const safe = client.first_name.replace(/[^A-Za-z0-9-]/g, '') || 'client';
    return new Response(JSON.stringify(await exportClient(env, client.id), null, 2), {
      headers: { 'content-type': 'application/json', 'content-disposition': `attachment; filename="checkin-${safe}-${localDate(now(), DEFAULT_TZ)}.json"`, 'cache-control': 'no-store' },
    });
  }
  if (sub === '/invite' && req.method === 'POST') {
    const r = await sendLogin(env, client.email, { invite: true });
    return r.sent || r.dev ? json({ ok: r.sent, dev: r.dev }) : bad(r.reason === 'limit' ? 'Too many invites this hour.' : 'Email isn\'t connected yet (see setup).', 400);
  }
  if (sub === '/test-push' && req.method === 'POST') {
    const r = await deliver(env, { id: 0, client_id: client.id, goal_id: null, message: `Hi ${client.first_name}, this is a test from Simon 👋`, kind: 'once', days: '', time_local: '00:00', tz: client.tz, start_date: '', end_date: null, enabled: 1, next_run_at: null, created_at: 0, updated_at: 0 }, client, now(), true);
    return json({ ok: r.push.ok > 0, devices: r.push.tried });
  }
  if (sub === '/reminders' && req.method === 'GET') {
    const rows = (await env.DB.prepare(`SELECT r.*, g.text AS goal_text FROM reminders r LEFT JOIN goals g ON g.id = r.goal_id WHERE r.client_id = ? ORDER BY r.enabled DESC, r.time_local`).bind(client.id).all()).results;
    return json({ reminders: rows, today: localDate(now(), client.tz) });
  }
  if (sub === '/reminders' && req.method === 'POST') {
    const v = reminderInput((await req.json().catch(() => ({}))) as Body, client.tz);
    if ('error' in v) return bad(v.error!);
    const x = v.r!;
    if (x.goal_id) {
      const g = await env.DB.prepare('SELECT id FROM goals WHERE id = ? AND client_id = ?').bind(x.goal_id, client.id).first();
      if (!g) x.goal_id = null;
    }
    const next = refreshNext(x);
    const row = await env.DB.prepare(`INSERT INTO reminders (client_id, goal_id, message, kind, days, time_local, tz, start_date, end_date, enabled, next_run_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`)
      .bind(client.id, x.goal_id, x.message, x.kind, x.days, x.time_local, x.tz, x.start_date, x.end_date, x.enabled, next, now(), now()).first();
    return json({ reminder: row });
  }
  if (sub === '/goals' && req.method === 'GET') {
    const week = DATE_RE.test(url.searchParams.get('week') || '') ? weekStart(url.searchParams.get('week')!) : thisWeek(client.tz);
    return json(await goalsFor(env, client.id, week));
  }
  if (sub === '/goals' && req.method === 'PUT') {
    const b = (await req.json().catch(() => ({}))) as Body;
    const week = DATE_RE.test(String(b.week)) ? weekStart(String(b.week)) : thisWeek(client.tz);
    return saveGoals(env, client, week, b.goals);
  }
  if (sub === '/goals/copy' && req.method === 'POST') {
    // Copy last week's goals into this week (counts start at 0) and move goal-linked reminders across.
    const b = (await req.json().catch(() => ({}))) as Body;
    const week = DATE_RE.test(String(b.week)) ? weekStart(String(b.week)) : thisWeek(client.tz);
    const prev = (await env.DB.prepare('SELECT * FROM goals WHERE client_id = ? AND week_start = ? ORDER BY sort, id').bind(client.id, addDays(week, -7)).all<{ id: number; text: string; target: number; sort: number }>()).results;
    const have = await env.DB.prepare('SELECT COUNT(*) AS n FROM goals WHERE client_id = ? AND week_start = ?').bind(client.id, week).first<{ n: number }>();
    if (!prev.length) return bad('No goals last week to copy.');
    if (have?.n) return bad('This week already has goals.');
    for (const g of prev) {
      const n = await env.DB.prepare('INSERT INTO goals (client_id, week_start, text, target, sort, updated_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id').bind(client.id, week, g.text, g.target, g.sort, now()).first<{ id: number }>();
      await env.DB.prepare('UPDATE reminders SET goal_id = ? WHERE goal_id = ? AND client_id = ?').bind(n!.id, g.id, client.id).run();
    }
    return json(await goalsFor(env, client.id, week));
  }
  if ((m = sub.match(/^\/goals\/(\d+)$/)) && req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as Body;
    await adjustGoal(env, client.id, +m[1], b.delta === -1 ? -1 : 1, 'admin');
    const g = await env.DB.prepare('SELECT week_start FROM goals WHERE id = ?').bind(+m[1]).first<{ week_start: string }>();
    return json(await goalsFor(env, client.id, g?.week_start ?? thisWeek(client.tz)));
  }
  if (sub === '/messages' && req.method === 'GET') return json({ messages: await messagesFor(env, client.id, 'admin') });
  if (sub === '/messages' && req.method === 'POST') {
    const b = (await req.json().catch(() => ({}))) as Body;
    const text = clean(b.body, 2000);
    if (!text) return bad('Type a message first.');
    return json({ message: await postMessage(env, client, 'admin', text) });
  }
  if (sub === '/activity' && req.method === 'GET') {
    const week = DATE_RE.test(url.searchParams.get('week') || '') ? weekStart(url.searchParams.get('week')!) : thisWeek(client.tz);
    return json(await activity(env, client, week));
  }
  return null;
}

export async function handleApi(env: Env, req: Request, url: URL, s: Session): Promise<Response | null> {
  const p = url.pathname;
  if (p === '/api/me') {
    const c = s.client_id ? await getClient(env, s.client_id) : null;
    return json({ role: s.role, email: s.email, name: c?.first_name ?? 'Simon' });
  }
  const push = await pushRoutes(env, req, s, p);
  if (push) return push;
  if (p.startsWith('/api/admin/')) return s.role === 'admin' ? adminRoutes(env, req, p, url) : bad('Admins only', 403);
  if (s.role === 'client') return clientRoutes(env, req, s, p, url);
  return null;
}
