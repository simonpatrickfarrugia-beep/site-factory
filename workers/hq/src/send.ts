// One-click send (7 Nov 2026): HQ sends outreach straight from the brand's address through
// Microsoft Graph, so Simon reviews and presses Send instead of copying into Outlook.
//
// How it fits the mail hub (claude/MAIL-HUB.md): the email leaves Microsoft 365 like any Outlook
// email, so the Exchange rules still add the brand signature and Bcc crm@<brand>. That crm@ copy
// reaches the imn-mail Worker, which moves the card to Sent exactly as before. This module only
// guards (opt-outs, daily ramp), sends, and keeps its own small send log for the ramp.
//
// Setup (Simon, once): an Entra app with the Mail.Send application permission. Its three values are
// Worker secrets MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET. MS_SENDER (var) is the mailbox that
// sends; the From is set to the brand alias. MS_SENDERS (optional var, JSON {brand: mailbox}) lets a
// brand send from its own shared mailbox instead, if Microsoft won't send from an alias.

export interface SendEnv {
  DB: D1Database;
  MS_TENANT_ID?: string;
  MS_CLIENT_ID?: string;
  MS_CLIENT_SECRET?: string;
  MS_SENDER?: string;
  MS_SENDERS?: string;
}

type Json = Record<string, unknown>;
type Brands = Record<string, { name: string; from?: string; mailReady?: boolean; active: boolean }>;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The warm-up ramp: fresh brand domains share one Microsoft 365 mailbox with Community Help Co,
 *  so volume climbs only as the domains build a sending history. Day 1 = the first HQ send. */
export const RAMP = [
  { untilDay: 7, totalPerDay: 5, perBrand: null as number | null, label: 'Week 1: 5 a day in total' },
  { untilDay: 14, totalPerDay: 10, perBrand: null as number | null, label: 'Week 2: 10 a day in total' },
  { untilDay: Infinity, totalPerDay: null as number | null, perBrand: 10, label: 'From week 3: up to 10 a day per brand' },
];

function melbDay(d = new Date()) {
  // Melbourne calendar day (UTC+10/+11). Good enough for a daily cap: midnight-ish rollover.
  return new Date(d.getTime() + 11 * 3600_000).toISOString().slice(0, 10);
}

export async function ensureTable(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS sends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER, brand TEXT NOT NULL, to_email TEXT NOT NULL, subject TEXT, kind TEXT NOT NULL,
    day TEXT NOT NULL, sent_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')))`).run();
}

export function configured(env: SendEnv) {
  return !!(env.MS_TENANT_ID && env.MS_CLIENT_ID && env.MS_CLIENT_SECRET && env.MS_SENDER);
}

/** Today's allowance: how many more first emails each brand can send. Follow-ups don't count. */
export async function sendStatus(env: SendEnv, brands: Brands) {
  await ensureTable(env.DB);
  const first = await env.DB.prepare(`SELECT MIN(day) AS d FROM sends`).first<{ d: string | null }>();
  const today = melbDay();
  const dayN = first?.d ? Math.floor((Date.parse(today) - Date.parse(first.d)) / 86400_000) + 1 : 1;
  const step = RAMP.find((r) => dayN <= r.untilDay)!;
  const rows = (await env.DB.prepare(`SELECT brand, COUNT(*) AS n FROM sends WHERE day = ? AND kind = 'first' GROUP BY brand`).bind(today).all<{ brand: string; n: number }>()).results;
  const sent: Record<string, number> = Object.fromEntries(rows.map((r) => [r.brand, r.n]));
  const total = rows.reduce((s, r) => s + r.n, 0);
  const left: Record<string, number> = {};
  for (const [k, b] of Object.entries(brands)) {
    if (!b.active || !b.mailReady || !b.from) { left[k] = 0; continue; }
    left[k] = step.perBrand != null ? Math.max(0, step.perBrand - (sent[k] ?? 0)) : Math.max(0, (step.totalPerDay ?? 0) - total);
  }
  return { configured: configured(env), day: dayN, ramp: step.label, totalPerDay: step.totalPerDay, perBrand: step.perBrand, sentToday: total, sentByBrand: sent, left };
}

let token: { v: string; exp: number } | null = null;
async function graphToken(env: SendEnv) {
  if (token && token.exp > Date.now() + 60_000) return token.v;
  const r = await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.MS_CLIENT_ID!, client_secret: env.MS_CLIENT_SECRET!, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!r.ok || !j.access_token) throw new Error('Microsoft sign-in failed: ' + (j.error_description ?? r.status).toString().split('\n')[0]);
  token = { v: j.access_token, exp: Date.now() + (j.expires_in ?? 3000) * 1000 };
  return token.v;
}

function senderFor(env: SendEnv, brand: string) {
  try { const m = JSON.parse(env.MS_SENDERS || '{}') as Record<string, string>; if (m[brand]) return m[brand]; } catch { /* ignore bad JSON */ }
  return env.MS_SENDER!;
}

/** Plain text → simple HTML in Outlook's default look: paragraphs, line breaks, clickable links. */
function toHtml(text: string) {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const link = (t: string) => t.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)"']/g, (u) => `<a href="${u}">${u}</a>`);
  const paras = text.replace(/\r\n/g, '\n').trim().split(/\n{2,}/).map((p) => `<p style="margin:0 0 12px">${link(esc(p)).replace(/\n/g, '<br>')}</p>`);
  return `<div style="font-family:Aptos,Calibri,Arial,sans-serif;font-size:11pt;color:#222">${paras.join('')}</div>`;
}

async function graphSend(env: SendEnv, brand: string, from: string, to: string, subject: string, body: string) {
  const mailbox = senderFor(env, brand);
  const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/sendMail`, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + (await graphToken(env)), 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject,
        // HTML, not plain text: Exchange's signature rule only adds the full designed (HTML) brand signature
        // to HTML emails; on plain-text emails it falls back to a text-only version.
        body: { contentType: 'HTML', content: toHtml(body) },
        from: { emailAddress: { address: from } },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });
  if (r.status !== 202) {
    const t = await r.text().catch(() => '');
    let msg = t; try { msg = (JSON.parse(t) as { error?: { message?: string } }).error?.message ?? t; } catch { /* keep text */ }
    throw new Error(`Microsoft didn't send it (${r.status}): ${msg.slice(0, 200)}`);
  }
}

/** Send one email for an organisation already on the board (Drafted, or Sent for a follow-up). */
export async function sendForOrg(env: SendEnv, brands: Brands, id: number, b: Json) {
  if (!configured(env)) return { error: 'Sending from HQ isn\'t switched on yet (Microsoft app not set up).' };
  const kind = b.kind === 'followup' ? 'followup' : 'first';
  const org = await env.DB.prepare('SELECT id, brand, stage FROM orgs WHERE id = ?').bind(id).first<{ id: number; brand: string; stage: string }>();
  if (!org) return { error: 'Organisation not found' };
  const cfg = brands[org.brand];
  if (!cfg?.from || !cfg.mailReady) return { error: `${cfg?.name ?? org.brand} isn't on the mail hub yet, so it can't send.` };
  const to = String(b.to ?? '').trim().toLowerCase();
  const subject = String(b.subject ?? '').trim().slice(0, 300);
  const body = String(b.body ?? '').trim();
  if (!EMAIL.test(to)) return { error: 'Add the email address they publish' };
  if (!subject || !body) return { error: 'Subject and email can\'t be empty' };
  if (!/no thanks/i.test(body)) return { error: 'Keep the opt-out line ("Reply \'no thanks\'…") in the email.' };
  const opted = await env.DB.prepare('SELECT 1 FROM contacts WHERE lower(email) = ? AND opted_out_at IS NOT NULL LIMIT 1').bind(to).first();
  if (opted) return { error: `${to} has opted out. No brand contacts them again.` };
  await ensureTable(env.DB);
  if (kind === 'first') {
    const already = await env.DB.prepare(`SELECT 1 FROM sends WHERE org_id = ? AND kind = 'first' LIMIT 1`).bind(id).first();
    if (already) return { error: 'The first email to them has already gone. Use the follow-up (7+ days, once).' };
    const st = await sendStatus(env, brands);
    if ((st.left[org.brand] ?? 0) <= 0) return { error: `Today's limit is reached (${st.ramp}). The queue keeps until tomorrow.` };
  } else {
    const f = await env.DB.prepare(`SELECT 1 FROM sends WHERE org_id = ? AND kind = 'followup' LIMIT 1`).bind(id).first();
    if (f) return { error: 'They\'ve already had the one follow-up.' };
  }

  await graphSend(env, org.brand, cfg.from, to, subject, body);

  const stmts = [
    env.DB.prepare('INSERT INTO sends (org_id, brand, to_email, subject, kind, day) VALUES (?, ?, ?, ?, ?, ?)').bind(id, org.brand, to, subject, kind, melbDay()),
    env.DB.prepare(`UPDATE orgs SET next_step = ? WHERE id = ?`).bind(kind === 'first' ? 'Wait for a reply (sent from HQ)' : 'Wait for a reply (follow-up sent)', id),
  ];
  const hasContact = await env.DB.prepare('SELECT 1 FROM contacts WHERE org_id = ? AND lower(email) = ?').bind(id, to).first();
  if (!hasContact) stmts.push(env.DB.prepare('INSERT INTO contacts (org_id, email, name) VALUES (?, ?, ?)').bind(id, to, typeof b.contact_name === 'string' ? b.contact_name.slice(0, 200) : null));
  await env.DB.batch(stmts);
  return { ok: true, status: await sendStatus(env, brands) };
}
