// Outreach follow-through (claude/OUTREACH.md, 4 Nov 2026):
//  - Give first: feature an organisation on our page (table `featured`), so the email can say "we've already linked to you".
//  - One follow-up: 7+ days after sending with no reply, Today shows a prefilled nudge. After that, it's the last email.
//  - Auto-close: 14 days after the follow-up with still no reply, the card leaves the board ("No reply") so it stops nagging.
//  - Replies: the mail Worker triages each reply; anything that needs an answer stays on Today until answered or ticked off.

type Json = Record<string, unknown>;

export const FOLLOW_UP_DAYS = 7;
export const CLOSE_AFTER_DAYS = 14;

function pathOf(url: string): string | null {
  try { return new URL(url).pathname.replace(/\/+$/, '') || '/'; } catch { return null; }
}

function cleanUrl(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  let s = v.trim();
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.toString();
  } catch { return null; }
}

/** Feature an organisation on one of our pages. `page` is the target's page (full URL) when the org has a target. */
export async function feature(db: D1Database, id: number, b: Json, targetPage: string | null) {
  const org = await db.prepare('SELECT id, brand, name, website FROM orgs WHERE id = ?').bind(id).first<{ id: number; brand: string; name: string; website: string | null }>();
  if (!org) return { error: 'Organisation not found' };
  if (org.brand === 'paycalc') return { error: "MyPayCalc pages can't show featured links yet." };
  const url = cleanUrl(b.url) ?? cleanUrl(org.website);
  if (!url) return { error: "Add their website first, so the link has somewhere to go." };
  const path = (typeof b.path === 'string' && b.path.startsWith('/') ? b.path.replace(/\/+$/, '') || '/' : null) ?? (targetPage ? pathOf(targetPage) : null);
  if (!path) return { error: 'Which of our pages? This organisation has no target page.' };
  const name = (typeof b.name === 'string' && b.name.trim() ? b.name.trim() : org.name).slice(0, 120);
  const blurb = typeof b.blurb === 'string' && b.blurb.trim() ? b.blurb.trim().slice(0, 160) : null;
  const stmts = [
    db.prepare(`INSERT INTO featured (org_id, brand, path, name, url, blurb) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (org_id, path) DO UPDATE SET name = excluded.name, url = excluded.url, blurb = COALESCE(excluded.blurb, featured.blurb), removed_at = NULL`)
      .bind(id, org.brand, path, name, url, blurb),
    db.prepare(`INSERT INTO touches (org_id, brand, stage, channel, note) SELECT ?, brand, stage, 'board', ? FROM orgs WHERE id = ?`).bind(id, `Featured on ${path} (give first)`, id),
  ];
  if (!org.website) stmts.push(db.prepare('UPDATE orgs SET website = ? WHERE id = ?').bind(url, id));
  await db.batch(stmts);
  return { ok: true, path };
}

export async function unfeature(db: D1Database, id: number) {
  await db.batch([
    db.prepare(`UPDATE featured SET removed_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE org_id = ? AND removed_at IS NULL`).bind(id),
    db.prepare(`INSERT INTO touches (org_id, brand, stage, channel, note) SELECT ?, brand, stage, 'board', 'Removed from our page' FROM orgs WHERE id = ?`).bind(id, id),
  ]);
  return { ok: true };
}

export async function featuredFor(db: D1Database, id: number) {
  return (await db.prepare('SELECT path, name, url, blurb, created_at FROM featured WHERE org_id = ? AND removed_at IS NULL ORDER BY id').bind(id).all()).results;
}

/** Simon opened the follow-up in his mail app. Recorded here because brands off the mail hub (CHC) have no crm@ copy. */
export async function followUpOpened(db: D1Database, id: number, b: Json) {
  const org = await db.prepare('SELECT brand, stage FROM orgs WHERE id = ?').bind(id).first<{ brand: string; stage: string }>();
  if (!org) return { error: 'Organisation not found' };
  const opted = await db.prepare('SELECT 1 FROM contacts WHERE org_id = ? AND opted_out_at IS NOT NULL LIMIT 1').bind(id).first();
  if (opted) return { error: 'This contact has opted out. No brand contacts them again.' };
  await db.batch([
    db.prepare(`INSERT INTO touches (org_id, brand, stage, channel, subject, note) VALUES (?, ?, 'sent', 'email', ?, 'Follow-up opened')`)
      .bind(id, org.brand, typeof b.subject === 'string' ? b.subject.slice(0, 300) : null),
    db.prepare(`UPDATE orgs SET stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), next_step = 'Wait for a reply (follow-up sent)' WHERE id = ? AND stage = 'sent'`).bind(id),
  ]);
  return { ok: true };
}

/** Close a sent card without a follow-up (or after one): it leaves the board as "No reply". A later reply brings it back. */
export async function closeNoReply(db: D1Database, id: number, note = 'No reply: closed') {
  await db.batch([
    db.prepare(`INSERT INTO touches (org_id, brand, stage, channel, note) SELECT ?, brand, 'dropped', 'board', ? FROM orgs WHERE id = ?`).bind(id, note, id),
    db.prepare(`UPDATE orgs SET stage = 'dropped', review = COALESCE(review, 'no_reply'), stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), next_step = NULL WHERE id = ? AND stage = 'sent'`).bind(id),
  ]);
  return { ok: true };
}

export async function markHandled(db: D1Database, msgId: number) {
  await db.prepare(`UPDATE messages SET handled_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`).bind(msgId).run();
  return { ok: true };
}

/** Daily: cards whose follow-up went out 14+ days ago with no reply leave the board. */
export async function autoClose(db: D1Database) {
  const cutoff = new Date(Date.now() - CLOSE_AFTER_DAYS * 86400000).toISOString().slice(0, 19) + 'Z';
  const { results } = await db.prepare(`
    SELECT o.id FROM orgs o WHERE o.stage = 'sent' AND o.stage_at <= ?
      AND (EXISTS (SELECT 1 FROM touches t WHERE t.org_id = o.id AND t.note = 'Follow-up opened')
        OR (SELECT COUNT(*) FROM messages m WHERE m.org_id = o.id AND m.direction = 'out') >= 2)
      AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.org_id = o.id AND m.direction = 'in' AND COALESCE(m.triage, 'reply') != 'auto')
  `).bind(cutoff).all<{ id: number }>();
  for (const r of results) await closeNoReply(db, r.id, `No reply ${CLOSE_AFTER_DAYS} days after the follow-up (auto-closed)`);
  return results.length;
}

/** Outreach replies (matched to an organisation) that still need Simon: not automatic, not an opt-out, not answered or ticked off. */
export async function needsReply(db: D1Database) {
  return (await db.prepare(`
    SELECT m.id, m.brand, m.mail_from, m.mail_to, m.subject, m.body, m.at, m.triage, m.org_id, o.name AS org_name
    FROM messages m LEFT JOIN orgs o ON o.id = m.org_id
    WHERE m.direction = 'in' AND m.org_id IS NOT NULL AND m.handled_at IS NULL AND COALESCE(m.triage, 'reply') IN ('reply', 'positive')
    ORDER BY m.at DESC LIMIT 30
  `).all()).results;
}
