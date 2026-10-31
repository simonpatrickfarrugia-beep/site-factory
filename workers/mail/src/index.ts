// imn-mail: Cloudflare Email Worker for the IMN mail hub (claude/OUTREACH.md).
//
// Email Routing on each hub domain sends hello@, simon@ and crm@ here.
//  - hello@ / simon@  → log to D1 (direction "in"), then forward to Simon's Outlook.
//  - crm@             → BCC copies of emails Simon sent (direction "out") or Outlook-rule copies of
//                       CHC outreach replies. Logged only, never forwarded.
// Forwarding always happens first, so a database problem can never lose an email.

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

    if (!isCrm) await message.forward(env.FORWARD_TO);

    ctx.waitUntil(log(message, env, brand, isCrm, domains).catch((e) => console.error('log failed', e)));
  },
};

async function log(
  message: ForwardableEmailMessage,
  env: Env,
  brand: string,
  isCrm: boolean,
  domains: Record<string, string>,
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

  await env.DB.prepare(
    `INSERT OR IGNORE INTO messages (brand, direction, mail_from, mail_to, subject, message_id, thread, contact_id, org_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(brand, direction, headerFrom, (direction === 'out' ? others.join(',') : message.to.toLowerCase()), subject, messageId || null, thread || null, contactId, orgId).run();

  if (!orgId) return;

  const org = await env.DB.prepare('SELECT stage, brand FROM orgs WHERE id = ?').bind(orgId).first<{ stage: string; brand: string }>();
  if (!org || LATE_STAGES.has(org.stage)) return;
  const stage = direction === 'out' ? 'sent' : 'replied';
  if (org.stage === 'replied' && stage === 'sent') return; // a follow-up after a reply doesn't move the card back

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO touches (org_id, contact_id, brand, stage, channel, subject, note) VALUES (?, ?, ?, ?, 'email', ?, 'auto: mail hub')`,
    ).bind(orgId, contactId, org.brand, stage, subject),
    env.DB.prepare(`UPDATE orgs SET stage = ?, stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`).bind(stage, orgId),
  ]);
}
