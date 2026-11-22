// Text to book a call (IMN HQ → Today). For prospects whose only published contact is a business phone number.
// Simon sends every text himself from his own phone: HQ opens Messages with the text filled in, then records what he
// marks (sent, they replied, got their email, STOP). Nothing here sends anything. Migration 0013_texts.sql.
//
// Spam Act 2003 basics built in (not legal advice): the text names the business and how to reach it, carries a working
// "Reply STOP" opt-out, and a STOP is recorded the moment Simon marks it so the card never offers a text again.

type Json = Record<string, unknown>;

// Keep it short (about 2 SMS), honest, and about booking a call at a time that suits them.
// {organisation} is filled in by HQ. Simon can edit before sending.
export const TEXT_TEMPLATE =
  `Hi, it's Simon from Independent Media Network Pty Ltd (imnetwork.com.au). ` +
  `{organisation} has great Google reviews but no website yet, and I'd love to build you a simple one for free, yours to keep. ` +
  `Could I give you a quick 5-min call? Weeknights or Saturday suit me. Reply STOP to opt out.`;


export async function listTexts(db: D1Database) {
  const rows = (await db.prepare(`
    SELECT o.id, o.brand, o.name, o.region, o.type, o.score, o.why, o.gap, o.why_now, o.notes, o.phone, o.phone_source,
      o.evidence_url, o.stage, o.texted_at, o.next_step, o.created_at,
      (SELECT COUNT(*) FROM contacts c WHERE c.org_id = o.id) AS emails
    FROM orgs o
    WHERE o.phone IS NOT NULL AND o.phone != '' AND o.sms_opted_out_at IS NULL
      AND o.stage IN ('found', 'replied') AND (o.snooze_until IS NULL OR o.snooze_until <= strftime('%Y-%m-%dT%H:%M:%SZ','now'))
      AND NOT EXISTS (SELECT 1 FROM contacts c WHERE c.org_id = o.id AND c.opted_out_at IS NOT NULL)
    ORDER BY (o.texted_at IS NOT NULL), o.score DESC, o.created_at
    LIMIT 40
  `).all()).results;
  return { template: TEXT_TEMPLATE, items: rows };
}

const ACTIONS = ['sent', 'replied', 'email', 'stop', 'no', 'later'] as const;

export async function textAction(db: D1Database, id: number, b: Json) {
  const action = String(b.action ?? '');
  if (!(ACTIONS as readonly string[]).includes(action)) return { error: 'Unknown action' };
  const org = await db.prepare(`SELECT id, brand, stage, phone, sms_opted_out_at FROM orgs WHERE id = ?`).bind(id)
    .first<{ id: number; brand: string; stage: string; phone: string | null; sms_opted_out_at: string | null }>();
  if (!org) return { error: 'Prospect not found' };
  if (!org.phone) return { error: 'No phone number on this card' };
  const touch = (stage: string, note: string) =>
    db.prepare(`INSERT INTO touches (org_id, brand, stage, channel, note) VALUES (?, ?, ?, 'sms', ?)`).bind(id, org.brand, stage, note);

  if (action === 'sent') {
    if (org.sms_opted_out_at) return { error: 'They replied STOP: no more texts' };
    await db.batch([
      db.prepare(`UPDATE orgs SET texted_at = COALESCE(texted_at, strftime('%Y-%m-%dT%H:%M:%SZ','now')), next_step = 'Wait for a text back' WHERE id = ?`).bind(id),
      touch('sent', 'Text sent from Simon\'s phone'),
    ]);
    return { ok: true };
  }
  if (action === 'replied') {
    const note = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 300) : 'Texted back';
    await db.batch([
      db.prepare(`UPDATE orgs SET stage = 'replied', stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), next_step = ? WHERE id = ?`).bind(note, id),
      touch('replied', note),
    ]);
    return { ok: true };
  }
  if (action === 'email') {
    const email = String(b.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: 'That email doesn\'t look right' };
    const name = typeof b.name === 'string' ? b.name.trim().slice(0, 80) || null : null;
    await db.batch([
      db.prepare(`INSERT INTO contacts (org_id, name, email, source_url) VALUES (?, ?, ?, ?)`).bind(id, name, email, 'Given to Simon by text or phone'),
      db.prepare(`UPDATE orgs SET stage = 'replied', stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), ask = 'preview', next_step = 'Build their free website preview (say "preview for <business>" in chat), then email the link' WHERE id = ?`).bind(id),
      touch('replied', `Gave their email (${email}) by text/phone`),
    ]);
    return { ok: true };
  }
  if (action === 'stop') {
    await db.batch([
      db.prepare(`UPDATE orgs SET sms_opted_out_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), stage = 'no', stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), next_step = 'Opted out by text (STOP): never contact again' WHERE id = ?`).bind(id),
      touch('no', 'Replied STOP: opted out'),
    ]);
    return { ok: true };
  }
  if (action === 'no') {
    await db.batch([
      db.prepare(`UPDATE orgs SET stage = 'no', stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), next_step = 'Said no by text/phone' WHERE id = ?`).bind(id),
      touch('no', 'Said no thanks by text/phone'),
    ]);
    return { ok: true };
  }
  // later: hide for 3 weeks
  await db.batch([
    db.prepare(`UPDATE orgs SET snooze_until = strftime('%Y-%m-%dT%H:%M:%SZ','now','+21 days') WHERE id = ?`).bind(id),
    touch(org.stage, 'Text: later (snoozed 3 weeks)'),
  ]);
  return { ok: true };
}
