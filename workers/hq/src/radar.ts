// IMN Radar: the daily prospect feed in IMN HQ → Today.
// A Claude scheduled task (weekdays, morning) researches real organisations for the top targets,
// inserts them as orgs with found_by = 'radar', and rewrites the learned playbook. Simon reviews
// each one here: Draft email, Not a fit (with a reason), No public email, Already links, or Later.
// Those reviews are what the next run learns from.

export const QUEUE_SIZE = 5;
const REVIEWS = ['drafted', 'not_fit', 'no_email', 'already', 'later'] as const;

type Json = Record<string, unknown>;

export async function kvGet<T>(db: D1Database, k: string, fallback: T): Promise<T> {
  const r = await db.prepare('SELECT v, updated_at FROM hq_kv WHERE k = ?').bind(k).first<{ v: string; updated_at: string }>();
  if (!r) return fallback;
  try { return JSON.parse(r.v) as T; } catch { return fallback; }
}

export async function kvSet(db: D1Database, k: string, v: unknown) {
  await db.prepare(`INSERT INTO hq_kv (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`)
    .bind(k, JSON.stringify(v)).run();
}

export async function radar(db: D1Database, targetLabel: (brand: string, key: string | null) => string | null) {
  const now = new Date().toISOString();
  const queue = (await db.prepare(`
    SELECT o.id, o.brand, o.name, o.type, o.website, o.evidence_url, o.region, o.target, o.score, o.why, o.opener, o.draft_subject, o.draft_body, o.signals, o.why_now, o.trigger_date, o.gap, o.proof, o.ask, o.widget_url, o.source_url, o.created_at,
      c.name AS contact_name, c.role AS contact_role, c.email AS contact_email
    FROM orgs o LEFT JOIN contacts c ON c.id = (SELECT id FROM contacts WHERE org_id = o.id ORDER BY id LIMIT 1)
    WHERE o.found_by = 'radar' AND o.reviewed_at IS NULL AND (o.snooze_until IS NULL OR o.snooze_until <= ?)
    ORDER BY o.score DESC, o.created_at
  `).bind(now).all()).results.map((o) => ({ ...o, targetLabel: targetLabel(String(o.brand), (o.target as string) ?? null) }));
  const later = (await db.prepare(`SELECT COUNT(*) AS n FROM orgs WHERE found_by = 'radar' AND reviewed_at IS NULL AND snooze_until > ?`).bind(now).first<{ n: number }>())?.n ?? 0;
  const reviews = (await db.prepare(`
    SELECT brand, COALESCE(review, 'later') AS review, COUNT(*) AS n FROM orgs
    WHERE found_by = 'radar' AND (reviewed_at IS NOT NULL OR snooze_until IS NOT NULL) GROUP BY brand, review
  `).all<{ brand: string; review: string; n: number }>()).results;
  const bySegment = (await db.prepare(`
    SELECT brand, substr(target, 1, instr(target, ':') - 1) AS segment,
      COUNT(*) AS found,
      SUM(CASE WHEN review = 'drafted' THEN 1 ELSE 0 END) AS drafted,
      SUM(CASE WHEN review IN ('not_fit','no_email','already') THEN 1 ELSE 0 END) AS dropped,
      SUM(CASE WHEN stage IN ('replied','linked','won') THEN 1 ELSE 0 END) AS replied,
      SUM(CASE WHEN stage IN ('linked','won') THEN 1 ELSE 0 END) AS linked
    FROM orgs WHERE found_by = 'radar' AND target LIKE '%:%' GROUP BY brand, segment ORDER BY found DESC
  `).all()).results;
  return {
    size: QUEUE_SIZE,
    queue,
    later,
    reviews,
    bySegment,
    playbook: await kvGet<Json | null>(db, 'radar_playbook', null),
    coaching: await kvGet<{ text: string; at: string }[]>(db, 'radar_coaching', []),
    lastRun: await kvGet<Json | null>(db, 'radar_last_run', null),
  };
}

export async function review(db: D1Database, id: number, b: Json) {
  const kind = String(b.review ?? '');
  if (!(REVIEWS as readonly string[]).includes(kind)) return { error: 'Unknown review' };
  const org = await db.prepare(`SELECT brand, stage FROM orgs WHERE id = ? AND found_by = 'radar'`).bind(id).first<{ brand: string; stage: string }>();
  if (!org) return { error: 'Prospect not found' };
  const reason = typeof b.reason === 'string' ? b.reason.trim().slice(0, 500) : '';
  const label: Record<string, string> = { not_fit: 'Not a fit', no_email: 'No public email', already: 'Already links to us', later: 'Later' };
  if (kind === 'later') {
    await db.prepare(`UPDATE orgs SET snooze_until = strftime('%Y-%m-%dT%H:%M:%SZ','now','+7 days'), review = 'later' WHERE id = ?`).bind(id).run();
    return { ok: true };
  }
  if (kind === 'drafted') {
    await db.prepare(`UPDATE orgs SET reviewed_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), review = 'drafted' WHERE id = ?`).bind(id).run();
    return { ok: true };
  }
  // Dropped prospects leave the board (stage 'dropped') but stay in the data so Radar learns from them.
  await db.batch([
    db.prepare(`UPDATE orgs SET reviewed_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), review = ?, stage = 'dropped', stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`).bind(kind, id),
    db.prepare(`INSERT INTO touches (org_id, brand, stage, channel, note) VALUES (?, ?, 'dropped', 'radar', ?)`).bind(id, org.brand, `${label[kind]}${reason ? ': ' + reason : ''}`),
  ]);
  return { ok: true };
}

export async function markDrafted(db: D1Database, id: number, b: Json) {
  const org = await db.prepare('SELECT brand, stage FROM orgs WHERE id = ?').bind(id).first<{ brand: string; stage: string }>();
  if (!org) return { error: 'Organisation not found' };
  const opted = await db.prepare('SELECT 1 FROM contacts WHERE org_id = ? AND opted_out_at IS NOT NULL LIMIT 1').bind(id).first();
  if (opted) return { error: 'This contact has opted out. No brand contacts them again.' };
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const stmts = [
    db.prepare(`UPDATE orgs SET stage = CASE WHEN stage IN ('found','dropped') THEN 'drafted' ELSE stage END, stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'),
      template_id = COALESCE(template_id, ?), reviewed_at = COALESCE(reviewed_at, strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      review = CASE WHEN found_by = 'radar' THEN 'drafted' ELSE review END, next_step = 'Send the draft from Outlook' WHERE id = ?`)
      .bind(typeof b.template_id === 'number' ? b.template_id : null, id),
    db.prepare(`INSERT INTO touches (org_id, brand, stage, channel, subject, note) VALUES (?, ?, 'drafted', 'email', ?, 'Draft opened in Outlook')`)
      .bind(id, org.brand, typeof b.subject === 'string' ? b.subject.slice(0, 300) : null),
  ];
  if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    const has = await db.prepare('SELECT 1 FROM contacts WHERE org_id = ? AND lower(email) = ?').bind(id, email).first();
    if (!has) stmts.push(db.prepare('INSERT INTO contacts (org_id, email, name) VALUES (?, ?, ?)').bind(id, email, typeof b.contact_name === 'string' ? b.contact_name.slice(0, 200) : null));
  }
  await db.batch(stmts);
  return { ok: true };
}

export async function saveCoaching(db: D1Database, b: Json) {
  const rules = Array.isArray(b.rules) ? b.rules : [];
  const clean = rules
    .map((r) => (typeof r === 'object' && r && 'text' in r ? r as { text: unknown; at?: unknown } : null))
    .filter((r): r is { text: unknown; at?: unknown } => !!r && typeof r.text === 'string' && r.text.trim().length > 0)
    .slice(0, 30)
    .map((r) => ({ text: String(r.text).trim().slice(0, 300), at: typeof r.at === 'string' ? r.at : new Date().toISOString() }));
  await kvSet(db, 'radar_coaching', clean);
  return { ok: true, rules: clean };
}
