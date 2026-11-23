// Comments to check (IMN HQ → Today). Public comments from the trailers /watch feed (site Worker src/worker/social.ts).
// The spam filter publishes clean comments straight away, holds anything doubtful here, and files obvious spam away.
// Simon approves or hides. Nothing is ever deleted: hiding only changes the status. Migration 0014_social.sql.

export async function listComments(db: D1Database) {
  const held = (await db.prepare(`SELECT id, brand, film, name, body, score, reasons, created_at FROM comments
    WHERE status = 'held' ORDER BY created_at LIMIT 50`).all()).results;
  const live = (await db.prepare(`SELECT id, brand, film, name, body, created_at FROM comments
    WHERE status = 'live' ORDER BY created_at DESC LIMIT 10`).all()).results;
  const totals = (await db.prepare(`SELECT status, COUNT(*) AS n FROM comments
    WHERE created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-7 days') GROUP BY status`).all<{ status: string; n: number }>()).results;
  return { held, live, week: Object.fromEntries(totals.map((t) => [t.status, t.n])) };
}

const NEXT: Record<string, string> = { approve: 'live', hide: 'hidden', spam: 'spam' };

export async function moderateComment(db: D1Database, id: number, action: string) {
  const status = NEXT[action];
  if (!status) return { error: 'Unknown action' };
  const r = await db.prepare(`UPDATE comments SET status = ?, moderated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`).bind(status, id).run();
  if (!r.meta.changes) return { error: 'Comment not found' };
  return { ok: true, id, status };
}
