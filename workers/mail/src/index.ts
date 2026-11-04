// imn-mail: Cloudflare Email Worker for the IMN mail hub (claude/OUTREACH.md).
//
// Email Routing on each hub domain sends hello@, simon@ and crm@ here.
//  - hello@ / simon@  → log to D1 (direction "in"), then forward to Simon's Outlook.
//  - crm@             → BCC copies of emails Simon sent (direction "out") or Outlook-rule copies of
//                       CHC outreach replies. Logged only, never forwarded.
// The raw email is read once (for the text shown in IMN HQ), then forwarded. If reading fails the
// email is still forwarded, and a database problem can never lose an email.
// Incoming replies are triaged (triage.ts): opt-outs are recorded at once, automatic mail never counts
// as a reply, and a "yes" moves its organisation to the front of the next morning's link check.

import { emailText } from './mime';
import { triage, type Triage } from './triage';

interface Env {
  DB: D1Database;
  FORWARD_TO: string;    // verified destination address in Email Routing
  BRAND_DOMAINS: string; // JSON: { "victours.com.au": "vic", ... }
  INBOXES: string;       // comma list of local parts that forward: "hello,simon"
}

const LATE_STAGES = new Set(['linked', 'won', 'no']);

function addr(raw: string | null): string {
  if (!raw) return '';
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
}

function addrs(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map((p) => addr(p)).filter((a) => a.includes('@'));
}

function domainOf(a: string): string {
  return a.split('@')[1] ?? '';
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    const domains: Record<string, string> = JSON.parse(env.BRAND_DOMAINS);
    const inboxes = env.INBOXES.split(',').map((s) => s.trim());
    const to = message.to.toLowerCase();
    const [local, domain] = to.split('@');
    const brand = domains[domain] ?? null;

    if (!brand) {
      message.setReject('Unknown domain');
      return;
    }

    const isCrm = local === 'crm';
    if (!isCrm && !inboxes.includes(local)) {
      message.setReject('Unknown address');
      return;
    }

    let body = '';
    try {
      if (message.rawSize < 5_000_000) body = emailText(new Uint8Array(await new Response(message.raw).arrayBuffer()));
    } catch (e) {
      console.error('read failed', e);
    }

    if (!isCrm) await message.forward(env.FORWARD_TO);

    ctx.waitUntil(log(message, env, brand, isCrm, domains, body).catch((e) => console.error('log failed', e)));
  },
};

async function log(
  message: ForwardableEmailMessage,
  env: Env,
  brand: string,
  isCrm: boolean,
  domains: Record<string, string>,
  body: string,
): Promise<void> {
  const h = message.headers;
  const headerFrom = addr(h.get('from')) || message.from.toLowerCase();
  const subject = (h.get('subject') ?? '').slice(0, 300);
  const messageId = h.get('message-id') ?? '';
  const refs = (h.get('references') ?? h.get('in-reply-to') ?? '').trim();
  const thread = refs ? refs.split(/\s+/)[0] : messageId;

  // crm@ copies: sent by us when From is one of our domains (or CHC); otherwise a forwarded reply.
  const fromOurs = headerFrom in domains || domainOf(headerFrom) in domains || domainOf(headerFrom) === 'communityhelp.com.au';
  const direction = isCrm && fromOurs ? 'out' : 'in';

  // The other party: recipients for outgoing mail, sender for incoming.
  const others = direction === 'out'
    ? [...addrs(h.get('to')), ...addrs(h.get('cc'))].filter((a) => !(domainOf(a) in domains))
    : [headerFrom];

  let contactId: number | null = null;
  let orgId: number | null = null;
  for (const email of others) {
    const row = await env.DB.prepare('SELECT id, org_id FROM contacts WHERE lower(email) = ? ORDER BY id DESC LIMIT 1')
      .bind(email).first<{ id: number; org_id: number }>();
    if (row) { contactId = row.id; orgId = row.org_id; break; }
  }

  const kind: Triage | null = direction === 'in' ? triage(subject, body, h) : null;
  // Automatic mail and opt-outs need nothing from Simon, so they're handled on arrival.
  const handled = kind === 'auto' || kind === 'optout';

  const ins = await env.DB.prepare(
    `INSERT OR IGNORE INTO messages (brand, direction, mail_from, mail_to, subject, message_id, thread, contact_id, org_id, body, triage, handled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? THEN strftime('%Y-%m-%dT%H:%M:%SZ','now') END)`,
  ).bind(brand, direction, headerFrom, (direction === 'out' ? others.join(',') : message.to.toLowerCase()), subject, messageId || null, thread || null, contactId, orgId, body || null, kind, handled ? 1 : 0).run();
  if (!ins.meta.changes) return; // same message seen twice (e.g. To and Cc both on the hub)

  // An email we sent answers whatever they last sent us.
  if (direction === 'out' && orgId) {
    await env.DB.prepare(`UPDATE messages SET handled_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE org_id = ? AND direction = 'in' AND handled_at IS NULL`).bind(orgId).run();
  }

  // Opt-out: every contact with that address, for every brand, is never emailed again.
  if (kind === 'optout') {
    await env.DB.prepare(`UPDATE contacts SET opted_out_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE lower(email) = ? AND opted_out_at IS NULL`).bind(headerFrom).run();
  }

  if (!orgId) return;
  if (kind === 'auto') return; // an out-of-office isn't a reply: the card stays where it is

  if (kind === 'optout') {
    const org = await env.DB.prepare('SELECT brand FROM orgs WHERE id = ?').bind(orgId).first<{ brand: string }>();
    if (!org) return;
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO touches (org_id, contact_id, brand, stage, channel, subject, note) VALUES (?, ?, ?, 'no', 'email', ?, 'Opted out (auto: reply triage)')`).bind(orgId, contactId, org.brand, subject),
      env.DB.prepare(`UPDATE orgs SET stage = 'no', stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), next_step = NULL WHERE id = ? AND stage NOT IN ('linked','won')`).bind(orgId),
    ]);
    return;
  }

  // A "yes": check their page for our link first thing in the next daily run.
  if (kind === 'positive') await env.DB.prepare('UPDATE orgs SET checked_at = NULL WHERE id = ?').bind(orgId).run();

  const org = await env.DB.prepare('SELECT stage, brand FROM orgs WHERE id = ?').bind(orgId).first<{ stage: string; brand: string }>();
  if (!org || LATE_STAGES.has(org.stage)) return;
  const stage = direction === 'out' ? 'sent' : 'replied';
  if (org.stage === 'replied' && stage === 'sent') return; // a follow-up after a reply doesn't move the card back

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO touches (org_id, contact_id, brand, stage, channel, subject, note) VALUES (?, ?, ?, ?, 'email', ?, ?)`,
    ).bind(orgId, contactId, org.brand, stage, subject, kind === 'positive' ? 'auto: mail hub (sounds like a yes)' : 'auto: mail hub'),
    env.DB.prepare(`UPDATE orgs SET stage = ?, stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`).bind(stage, orgId),
  ]);
}
