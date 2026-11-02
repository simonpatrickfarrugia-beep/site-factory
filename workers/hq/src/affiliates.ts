// Affiliate programme tracker: who we've applied to, who has approved, who is still waiting.
// Only public partner/tracking IDs are stored; never logins, tax, bank or card details.

export const AFF_STATUSES = ['not-applied', 'applied', 'approved', 'rejected', 'paused'] as const;
const CHASE_DAYS = 14;

type Row = {
  id: string; name: string; network: string | null; brands: string | null; status: string;
  applied_at: string | null; decided_at: string | null; live: string | null; ids: string | null;
  commission: string | null; signup_url: string | null; note: string | null; next_step: string | null;
  follow_up_at: string | null; updated_at: string;
};

const clean = (v: unknown, max = 1000): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

const SECRET = /\b(password|passcode|tfn|tax file|bsb|account number|card number|cvv)\b/i;

export async function listAffiliates(db: D1Database) {
  const rows = (await db.prepare('SELECT * FROM affiliates ORDER BY name').all<Row>()).results;
  const today = Date.now();
  const items = rows.map((r) => {
    const waiting = r.status === 'applied' && r.applied_at ? Math.floor((today - Date.parse(r.applied_at)) / 86400000) : null;
    const followDue = !!r.follow_up_at && Date.parse(r.follow_up_at) <= today;
    return {
      ...r,
      brandList: (r.brands ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      waiting,
      chase: (waiting !== null && waiting >= CHASE_DAYS) || followDue,
      notWired: r.status === 'approved' && !r.live,
    };
  });
  const count = (s: string) => items.filter((i) => i.status === s).length;
  return {
    statuses: AFF_STATUSES,
    counts: { approved: count('approved'), applied: count('applied'), notApplied: count('not-applied'), rejected: count('rejected'), paused: count('paused'), chase: items.filter((i) => i.chase).length, notWired: items.filter((i) => i.notWired).length },
    items,
  };
}

export async function affiliateDetail(db: D1Database, id: string) {
  const row = await db.prepare('SELECT * FROM affiliates WHERE id = ?').bind(id).first<Row>();
  if (!row) return { error: 'Programme not found' };
  const events = (await db.prepare('SELECT * FROM affiliate_events WHERE affiliate_id = ? ORDER BY at DESC, id DESC LIMIT 50').bind(id).all()).results;
  return { item: row, events };
}

export async function saveAffiliate(db: D1Database, id: string | null, b: Record<string, unknown>) {
  const fields: Record<string, string | null> = {};
  for (const k of ['name', 'network', 'brands', 'live', 'ids', 'commission', 'signup_url', 'note', 'next_step', 'follow_up_at', 'applied_at', 'decided_at'] as const) {
    if (k in b) fields[k] = clean(b[k], k === 'note' ? 2000 : 500);
  }
  for (const k of ['ids', 'note', 'live'] as const) {
    if (fields[k] && SECRET.test(fields[k]!)) return { error: 'That looks like a password, tax or bank detail. Keep those only in the programme’s own site.' };
  }
  const status = b.status !== undefined ? String(b.status) : undefined;
  if (status !== undefined && !(AFF_STATUSES as readonly string[]).includes(status)) return { error: `Unknown status "${status}"` };
  const today = new Date().toISOString().slice(0, 10);

  if (!id) {
    const name = fields.name;
    if (!name) return { error: 'Add the programme name' };
    const newId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'programme';
    const exists = await db.prepare('SELECT 1 FROM affiliates WHERE id = ?').bind(newId).first();
    if (exists) return { error: 'A programme with that name is already on the list' };
    const st = status ?? 'not-applied';
    await db.batch([
      db.prepare(`INSERT INTO affiliates (id, name, network, brands, status, applied_at, decided_at, live, ids, commission, signup_url, note, next_step, follow_up_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(newId, name, fields.network ?? null, fields.brands ?? null, st,
          fields.applied_at ?? (st === 'applied' ? today : null), fields.decided_at ?? (st === 'approved' || st === 'rejected' ? today : null),
          fields.live ?? null, fields.ids ?? null, fields.commission ?? null, fields.signup_url ?? null, fields.note ?? null, fields.next_step ?? null, fields.follow_up_at ?? null),
      db.prepare('INSERT INTO affiliate_events (affiliate_id, status, note) VALUES (?, ?, ?)').bind(newId, st, 'Added to the tracker'),
    ]);
    return { ok: true, id: newId };
  }

  const cur = await db.prepare('SELECT * FROM affiliates WHERE id = ?').bind(id).first<Row>();
  if (!cur) return { error: 'Programme not found' };
  const stmts: D1PreparedStatement[] = [];
  if (status && status !== cur.status) {
    if (status === 'applied' && !('applied_at' in fields)) fields.applied_at = cur.applied_at ?? today;
    if ((status === 'approved' || status === 'rejected') && !('decided_at' in fields)) fields.decided_at = today;
    if (status === 'not-applied') { fields.applied_at = null; fields.decided_at = null; }
    fields.status = status;
    stmts.push(db.prepare('INSERT INTO affiliate_events (affiliate_id, status, note) VALUES (?, ?, ?)').bind(id, status, clean(b.event_note) ?? `Marked ${status.replace('-', ' ')}`));
  } else if (clean(b.event_note)) {
    stmts.push(db.prepare('INSERT INTO affiliate_events (affiliate_id, status, note) VALUES (?, ?, ?)').bind(id, cur.status, clean(b.event_note)));
  }
  const keys = Object.keys(fields);
  if (keys.length) {
    stmts.unshift(db.prepare(`UPDATE affiliates SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`)
      .bind(...keys.map((k) => fields[k]), id));
  }
  if (stmts.length) await db.batch(stmts);
  return { ok: true, id };
}
