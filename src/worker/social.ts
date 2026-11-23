/**
 * Public likes, reactions, "my list" saves and comments for film pages (brands with SOCIAL="1"; trailers /watch).
 * Tables: film_votes, comments (workers/forms/migrations/0014_social.sql). Comment moderation: IMN HQ (workers/hq/src/comments.ts).
 *
 *   GET  /api/social?films=a,b,c         counts per film (max 12): { counts: { slug: { like, list, react: {emoji: n}, comments } } }
 *   POST /api/social/vote                { film, kind: like|list|react, on, value?, voter } → that film's counts
 *   GET  /api/comments?film=slug         the film's live comments, newest first (max 50)
 *   POST /api/comments                   { film, name, body, voter, _t, website } → { ok, status: live|held, message, comment? }
 *
 * Every count is COUNT(*) of real rows: nothing is seeded or rounded up. No accounts, no cookies. `voter` is a random id
 * the browser keeps; `net` is a short hash of the visitor's network (IPv4 /24, IPv6 /48) used only for rate limits.
 * Spam: src/worker/spam.ts, plus repeats, per-network rate limits and a flood switch here.
 */
import { screenComment, commentProblem } from './spam';

interface SocialEnv { DB: D1Database; ASSETS: Fetcher; BRAND: string }

const FILM = /^[a-z0-9-]{1,100}$/;
const VOTER = /^[A-Za-z0-9_-]{16,40}$/;
const KINDS = ['like', 'list', 'react'] as const;
export const REACTIONS = ['🍿', '😂', '😱', '😍', '🤯'];
const json = (body: unknown, status = 200, cache = 'no-store') => Response.json(body, { status, headers: { 'cache-control': cache } });

async function netHash(request: Request, brand: string): Promise<string> {
  const ip = request.headers.get('cf-connecting-ip') ?? '';
  const prefix = ip.includes(':') ? ip.split(':').slice(0, 3).join(':') : ip.split('.').slice(0, 3).join('.');
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${brand}|${prefix}`));
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Only films that have a page on the site can be liked or commented on. */
async function filmExists(env: SocialEnv, request: Request, film: string): Promise<boolean> {
  if (!FILM.test(film)) return false;
  const r = await env.ASSETS.fetch(new Request(new URL(`/movies/${film}`, request.url), { method: 'HEAD' }));
  return r.ok;
}

async function countsFor(env: SocialEnv, films: string[]) {
  const counts: Record<string, { like: number; list: number; react: Record<string, number>; comments: number }> = {};
  if (!films.length) return counts;
  for (const f of films) counts[f] = { like: 0, list: 0, react: {}, comments: 0 };
  const q = films.map(() => '?').join(',');
  const votes = await env.DB.prepare(`SELECT film, kind, value, COUNT(*) AS n FROM film_votes WHERE brand = ? AND film IN (${q}) GROUP BY film, kind, value`)
    .bind(env.BRAND, ...films).all<{ film: string; kind: string; value: string; n: number }>();
  for (const v of votes.results) {
    const c = counts[v.film]; if (!c) continue;
    if (v.kind === 'like') c.like = v.n;
    else if (v.kind === 'list') c.list = v.n;
    else if (v.kind === 'react' && REACTIONS.includes(v.value)) c.react[v.value] = v.n;
  }
  const com = await env.DB.prepare(`SELECT film, COUNT(*) AS n FROM comments WHERE brand = ? AND status = 'live' AND film IN (${q}) GROUP BY film`)
    .bind(env.BRAND, ...films).all<{ film: string; n: number }>();
  for (const c of com.results) if (counts[c.film]) counts[c.film].comments = c.n;
  return counts;
}

async function body(request: Request): Promise<Record<string, unknown>> {
  try { return JSON.parse((await request.text()).slice(0, 4000)) as Record<string, unknown>; } catch { return {}; }
}

export async function social(request: Request, env: SocialEnv, path: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (path === '/api/social' && request.method === 'GET') {
      const films = [...new Set((url.searchParams.get('films') ?? '').split(',').map((s) => s.trim()).filter((s) => FILM.test(s)))].slice(0, 12);
      return json({ counts: await countsFor(env, films) }, 200, 'public, max-age=20');
    }
    if (path === '/api/social/vote' && request.method === 'POST') {
      const b = await body(request);
      const film = String(b.film ?? ''), kind = String(b.kind ?? ''), voter = String(b.voter ?? ''), on = b.on === true;
      const value = kind === 'react' ? String(b.value ?? '') : '';
      if (!(KINDS as readonly string[]).includes(kind) || !VOTER.test(voter) || (kind === 'react' && on && !REACTIONS.includes(value))) return json({ ok: false }, 400);
      if (!(await filmExists(env, request, film))) return json({ ok: false }, 404);
      const net = await netHash(request, env.BRAND);
      if (on) {
        const recent = await env.DB.prepare(`SELECT COUNT(*) AS n FROM film_votes WHERE net = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour')`).bind(net).first<{ n: number }>();
        if ((recent?.n ?? 0) >= 300) return json({ ok: false, message: 'Slow down a little.' }, 429);
        await env.DB.prepare(`INSERT INTO film_votes (brand, film, kind, voter, value, net) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT (brand, film, kind, voter) DO UPDATE SET value = excluded.value`).bind(env.BRAND, film, kind, voter, value, net).run();
      } else {
        // Un-like / un-save / un-react: removes only this viewer's own row.
        await env.DB.prepare('DELETE FROM film_votes WHERE brand = ? AND film = ? AND kind = ? AND voter = ?').bind(env.BRAND, film, kind, voter).run();
      }
      return json({ ok: true, counts: (await countsFor(env, [film]))[film] });
    }
    if (path === '/api/comments' && request.method === 'GET') {
      const film = url.searchParams.get('film') ?? '';
      if (!FILM.test(film)) return json({ comments: [] });
      const rows = await env.DB.prepare(`SELECT id, name, body, created_at AS at FROM comments WHERE brand = ? AND film = ? AND status = 'live' ORDER BY created_at DESC LIMIT 50`)
        .bind(env.BRAND, film).all();
      return json({ comments: rows.results }, 200, 'public, max-age=20');
    }
    if (path === '/api/comments' && request.method === 'POST') {
      const b = await body(request);
      const film = String(b.film ?? ''), voter = VOTER.test(String(b.voter ?? '')) ? String(b.voter) : '';
      const problem = commentProblem(String(b.body ?? ''));
      if (problem) return json({ ok: false, message: problem }, 400);
      if (!(await filmExists(env, request, film))) return json({ ok: false, message: 'That film isn’t on the site.' }, 404);
      const net = await netHash(request, env.BRAND);
      const rate = await env.DB.prepare(`SELECT
          SUM(created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 minutes')) AS m10,
          COUNT(*) AS d1
        FROM comments WHERE net = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')`).bind(net).first<{ m10: number | null; d1: number }>();
      if ((rate?.m10 ?? 0) >= 3 || (rate?.d1 ?? 0) >= 15) return json({ ok: false, message: 'You’ve posted a lot just now. Try again a bit later.' }, 429);

      const s = screenComment({ name: String(b.name ?? ''), body: String(b.body ?? ''), trap: String(b.website ?? ''), ageMs: Date.now() - Number(b._t) });
      let status = s.verdict;
      const reasons = [...s.reasons];
      let score = s.score;
      if (status !== 'spam') {
        // Same words again from the same network in a day: a bot or a copy-paste campaign.
        const dup = await env.DB.prepare(`SELECT 1 FROM comments WHERE net = ? AND body = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day') LIMIT 1`).bind(net, s.body).first();
        if (dup) { status = 'spam'; reasons.push('same comment posted again'); }
      }
      if (status === 'live') {
        // Flood switch: if the whole site gets more than 30 comments in an hour, hold everything until Simon looks.
        const flood = await env.DB.prepare(`SELECT COUNT(*) AS n FROM comments WHERE brand = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour')`).bind(env.BRAND).first<{ n: number }>();
        if ((flood?.n ?? 0) >= 30) { status = 'held'; score += 1; reasons.push('lots of comments this hour (flood check)'); }
      }
      const res = await env.DB.prepare(`INSERT INTO comments (brand, film, name, body, status, score, reasons, voter, net) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, created_at AS at`)
        .bind(env.BRAND, film, s.name, s.body, status, score, reasons.join('; '), voter, net).first<{ id: number; at: string }>();
      // Spam gets the same "held" reply as a real held comment, so bots learn nothing about the filter.
      const shown = status === 'live';
      return json({
        ok: true,
        status: shown ? 'live' : 'held',
        message: shown ? 'Posted. Thanks!' : 'Thanks! It’ll show once we’ve had a quick look.',
        comment: { id: res?.id ?? 0, name: s.name, body: s.body, at: res?.at ?? new Date().toISOString() },
      });
    }
    return new Response('Method not allowed', { status: 405 });
  } catch (e) {
    console.error('social failed', e);
    return json({ ok: false, message: 'Something went wrong. Please try again.' }, 500);
  }
}
