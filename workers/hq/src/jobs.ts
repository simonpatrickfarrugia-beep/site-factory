// Claude queue: "Queue for Claude" in IMN HQ saves a job here instead of copy-and-paste. The claude-queue worker
// (.claude/skills/claude-queue, a scheduled Claude session every hour) picks queued jobs up, does them under CLAUDE.md,
// and writes back status + a one-line summary. The auto-fix worker logs the fixes it made on its own here too (kind 'auto').
// Status: queued → working → done | decide (needs Simon: see summary) | failed. Simon can cancel a queued job.

export async function ensureJobs(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS claude_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site TEXT NOT NULL, title TEXT NOT NULL, prompt TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'ask',
    status TEXT NOT NULL DEFAULT 'queued', summary TEXT, commit_sha TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')), started_at TEXT, done_at TEXT)`).run();
}

export async function listJobs(db: D1Database) {
  await ensureJobs(db);
  const jobs = (await db.prepare(`SELECT id, site, title, kind, status, summary, commit_sha, created_at, started_at, done_at FROM claude_jobs
    WHERE status IN ('queued','working') OR created_at > ? ORDER BY id DESC LIMIT 60`)
    .bind(new Date(Date.now() - 14 * 86400_000).toISOString()).all()).results;
  return { jobs, everyHour: true };
}

export async function queueJob(db: D1Database, b: Record<string, unknown>) {
  await ensureJobs(db);
  const site = String(b.site ?? '').slice(0, 60);
  const title = String(b.title ?? '').trim().slice(0, 300);
  const prompt = String(b.prompt ?? '').trim().slice(0, 8000);
  if (!/^[a-z0-9-]{1,60}$/.test(site) || !title || !prompt) return { error: 'Need a site, a title and the job.' };
  const dup = await db.prepare(`SELECT id FROM claude_jobs WHERE site = ? AND title = ? AND status IN ('queued','working')`).bind(site, title).first<{ id: number }>();
  if (dup) return { ok: true, id: dup.id, already: true };
  const r = await db.prepare(`INSERT INTO claude_jobs (site, title, prompt, kind) VALUES (?, ?, ?, ?)`).bind(site, title, prompt, b.kind === 'fix' ? 'fix' : 'ask').run();
  return { ok: true, id: r.meta.last_row_id };
}

export async function cancelJob(db: D1Database, id: number) {
  await ensureJobs(db);
  await db.prepare(`UPDATE claude_jobs SET status = 'cancelled', done_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ? AND status = 'queued'`).bind(id).run();
  return { ok: true };
}
