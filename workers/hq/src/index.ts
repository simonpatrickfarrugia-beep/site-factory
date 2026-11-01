// imn-hq: IMN HQ outreach CRM board + prospecting engine (claude/OUTREACH.md).
// Private: Cloudflare Access sits in front of the workers.dev address, and this Worker
// also verifies the Access token itself, so nothing is served if Access is ever removed.

import PAGE from './page.html';
import TARGETS from '../../../hq/prospect-targets.json';

interface Env {
  DB: D1Database;
  ACCESS_TEAM: string;   // e.g. "imn.cloudflareaccess.com" (Zero Trust team domain)
  ACCESS_AUD: string;    // Application Audience (AUD) tag of the Access application
  ALLOWED_EMAILS: string; // comma list of emails allowed in
}

type Target = {
  brand: string; key: string; segment: string; segmentLabel: string; region: string; regionLabel: string;
  base: number; why: string; page?: string | null; offer: string; evidence: string; search: string[];
};
type BrandCfg = { name: string; active: boolean; weeklyCap: number; perTargetCap: number };
const T = TARGETS as unknown as { generated: string; brands: Record<string, BrandCfg>; targets: Target[] };

export const STAGES = ['found', 'drafted', 'sent', 'replied', 'linked', 'won', 'no'] as const;
const FOLLOW_UP_DAYS = 7;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const who = await accessEmail(req, env);
    if (!who) return deny(env);

    try {
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...SECURITY } });
      }
      if (url.pathname === '/api/board' && req.method === 'GET') return json(await board(env));
      if (url.pathname === '/api/summary' && req.method === 'GET') return json(await summary(env));
      if (url.pathname === '/api/prospects' && req.method === 'GET') return json(await prospects(env));
      if (url.pathname === '/api/replies' && req.method === 'GET') return json(await replies(env));
      const m = url.pathname.match(/^\/api\/orgs\/(\d+)(?:\/(stage|note|next))?$/);
      if (m) {
        const id = Number(m[1]);
        if (!m[2] && req.method === 'GET') return json(await orgDetail(env, id));
        if (req.method === 'POST' && m[2]) {
          const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
          if (m[2] === 'stage') return json(await setStage(env, id, String(body.stage ?? ''), str(body.note)));
          if (m[2] === 'note') return json(await addNote(env, id, String(body.note ?? '')));
          if (m[2] === 'next') return json(await setNext(env, id, str(body.next_step)));
        }
      }
      return json({ error: 'Not found' }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: (e as Error).message || 'Something went wrong' }, 500);
    }
  },
};

const SECURITY = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-robots-tag': 'noindex, nofollow',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...SECURITY } });
}

function str(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, 2000) : null;
}

function deny(env: Env): Response {
  const configured = env.ACCESS_TEAM && env.ACCESS_AUD && env.ALLOWED_EMAILS;
  const msg = configured
    ? 'Sign in through Cloudflare Access to open IMN HQ.'
    : 'IMN HQ is locked until Cloudflare Access is set up (ACCESS_TEAM, ACCESS_AUD and ALLOWED_EMAILS).';
  return new Response(`<!doctype html><meta name="viewport" content="width=device-width"><title>IMN HQ</title><p style="font:16px system-ui;padding:24px">${msg}</p>`, {
    status: 403,
    headers: { 'content-type': 'text/html; charset=utf-8', ...SECURITY },
  });
}

// ---------- Cloudflare Access token check (RS256 JWT, keys from the team's certs endpoint) ----------

let certCache: { at: number; keys: JsonWebKey[] } | null = null;

async function accessEmail(req: Request, env: Env): Promise<string | null> {
  if (!env.ACCESS_TEAM || !env.ACCESS_AUD || !env.ALLOWED_EMAILS) return null;
  const cookie = req.headers.get('cookie') ?? '';
  const token = req.headers.get('cf-access-jwt-assertion') ?? cookie.match(/CF_Authorization=([^;]+)/)?.[1];
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(b64text(parts[0])) as { kid?: string; alg?: string };
    const payload = JSON.parse(b64text(parts[1])) as { aud?: string | string[]; exp?: number; iss?: string; email?: string };
    if (header.alg !== 'RS256') return null;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return null;
    const team = env.ACCESS_TEAM.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (payload.iss !== `https://${team}`) return null;
    const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!auds.includes(env.ACCESS_AUD)) return null;
    const email = (payload.email ?? '').toLowerCase();
    const allowed = env.ALLOWED_EMAILS.toLowerCase().split(',').map((s) => s.trim());
    if (!allowed.includes(email)) return null;

    const keys = await certs(team);
    const jwk = keys.find((k) => (k as { kid?: string }).kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64bytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    return ok ? email : null;
  } catch {
    return null;
  }
}

async function certs(team: string): Promise<JsonWebKey[]> {
  if (certCache && Date.now() - certCache.at < 3600_000) return certCache.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  const data = (await res.json()) as { keys: JsonWebKey[] };
  certCache = { at: Date.now(), keys: data.keys ?? [] };
  return certCache.keys;
}

function b64bytes(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

function b64text(s: string): string {
  return new TextDecoder().decode(b64bytes(s));
}

// ---------- Board ----------

type OrgRow = {
  id: number; brand: string; name: string; type: string | null; website: string | null; evidence_url: string | null;
  region: string | null; notes: string | null; stage: string; next_step: string | null; stage_at: string; created_at: string;
  target: string | null; contact_name: string | null; contact_email: string | null; opted_out_at: string | null;
  last_at: string | null; last_note: string | null; last_in: string | null;
};

async function board(env: Env) {
  const { results } = await env.DB.prepare(`
    SELECT o.*, c.name AS contact_name, c.email AS contact_email, c.opted_out_at,
      (SELECT MAX(at) FROM touches t WHERE t.org_id = o.id) AS last_at,
      (SELECT COALESCE(t.note, t.subject) FROM touches t WHERE t.org_id = o.id ORDER BY t.at DESC, t.id DESC LIMIT 1) AS last_note,
      (SELECT MAX(at) FROM messages m WHERE m.org_id = o.id AND m.direction = 'in') AS last_in
    FROM orgs o
    LEFT JOIN contacts c ON c.id = (SELECT id FROM contacts WHERE org_id = o.id ORDER BY id LIMIT 1)
    ORDER BY o.stage_at DESC
  `).all<OrgRow>();
  const now = Date.now();
  const orgs = results.map((o) => {
    const days = Math.floor((now - Date.parse(o.stage_at)) / 86400000);
    return {
      ...o,
      days,
      followUpDue: o.stage === 'sent' && days >= FOLLOW_UP_DAYS,
      targetLabel: targetLabel(o.brand, o.target),
    };
  });
  return { stages: STAGES, brands: brandList(), orgs };
}

function brandList() {
  return Object.entries(T.brands).map(([key, b]) => ({ key, name: b.name, active: b.active }));
}

function targetLabel(brand: string, key: string | null): string | null {
  if (!key) return null;
  const t = T.targets.find((x) => x.brand === brand && x.key === key);
  return t ? `${t.segmentLabel} · ${t.regionLabel}` : key;
}

async function orgDetail(env: Env, id: number) {
  const org = await env.DB.prepare('SELECT * FROM orgs WHERE id = ?').bind(id).first();
  if (!org) return { error: 'Organisation not found' };
  const contacts = (await env.DB.prepare('SELECT * FROM contacts WHERE org_id = ? ORDER BY id').bind(id).all()).results;
  const touches = (await env.DB.prepare('SELECT * FROM touches WHERE org_id = ? ORDER BY at DESC, id DESC LIMIT 50').bind(id).all()).results;
  const messages = (await env.DB.prepare('SELECT id, brand, direction, mail_from, mail_to, subject, at FROM messages WHERE org_id = ? ORDER BY at DESC LIMIT 50').bind(id).all()).results;
  const links = (await env.DB.prepare('SELECT * FROM links_won WHERE org_id = ? ORDER BY first_seen DESC').bind(id).all()).results;
  const o = org as { brand: string; target: string | null };
  const target = o.target ? T.targets.find((x) => x.brand === o.brand && x.key === o.target) ?? null : null;
  return { org, contacts, touches, messages, links, target };
}

async function setStage(env: Env, id: number, stage: string, note: string | null) {
  if (!(STAGES as readonly string[]).includes(stage)) return { error: `Unknown stage "${stage}"` };
  const org = await env.DB.prepare('SELECT brand, stage FROM orgs WHERE id = ?').bind(id).first<{ brand: string; stage: string }>();
  if (!org) return { error: 'Organisation not found' };
  if (org.stage === stage && !note) return { ok: true, unchanged: true };
  const stmts = [
    env.DB.prepare(`INSERT INTO touches (org_id, brand, stage, channel, note) VALUES (?, ?, ?, 'board', ?)`).bind(id, org.brand, stage, note ?? `Moved to ${stage}`),
    env.DB.prepare(`UPDATE orgs SET stage = ?, stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`).bind(stage, id),
  ];
  // "No" from a reply means opt-out: record it on every contact so no brand emails them again.
  if (stage === 'no' && note && /no thanks|unsubscribe|opt.?out|don.?t contact/i.test(note)) {
    stmts.push(env.DB.prepare(`UPDATE contacts SET opted_out_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE org_id = ? AND opted_out_at IS NULL`).bind(id));
  }
  await env.DB.batch(stmts);
  return { ok: true };
}

async function addNote(env: Env, id: number, note: string) {
  const n = str(note);
  if (!n) return { error: 'Write a note first' };
  const org = await env.DB.prepare('SELECT brand, stage FROM orgs WHERE id = ?').bind(id).first<{ brand: string; stage: string }>();
  if (!org) return { error: 'Organisation not found' };
  await env.DB.prepare(`INSERT INTO touches (org_id, brand, stage, channel, note) VALUES (?, ?, ?, 'note', ?)`).bind(id, org.brand, org.stage, n).run();
  return { ok: true };
}

async function setNext(env: Env, id: number, next: string | null) {
  await env.DB.prepare('UPDATE orgs SET next_step = ? WHERE id = ?').bind(next, id).run();
  return { ok: true };
}

// ---------- Summary strip ----------

async function summary(env: Env) {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 19) + 'Z';
  const sentWeek = (await env.DB.prepare(`SELECT brand, COUNT(*) AS n FROM messages WHERE direction = 'out' AND org_id IS NOT NULL AND at >= ? GROUP BY brand`).bind(weekAgo).all<{ brand: string; n: number }>()).results;
  const stages = (await env.DB.prepare(`SELECT brand, stage, COUNT(*) AS n FROM orgs GROUP BY brand, stage`).all<{ brand: string; stage: string; n: number }>()).results;
  const links = (await env.DB.prepare(`SELECT brand, COUNT(*) AS n FROM links_won GROUP BY brand`).all<{ brand: string; n: number }>()).results;
  const due = (await env.DB.prepare(`SELECT brand, COUNT(*) AS n FROM orgs WHERE stage = 'sent' AND stage_at <= ? GROUP BY brand`).bind(weekAgo).all<{ brand: string; n: number }>()).results;
  const out: Record<string, { sentWeek: number; contacted: number; replied: number; replyRate: number | null; links: number; followUps: number; byStage: Record<string, number> }> = {};
  for (const b of Object.keys(T.brands)) out[b] = { sentWeek: 0, contacted: 0, replied: 0, replyRate: null, links: 0, followUps: 0, byStage: {} };
  for (const r of sentWeek) if (out[r.brand]) out[r.brand].sentWeek = r.n;
  for (const r of stages) if (out[r.brand]) out[r.brand].byStage[r.stage] = r.n;
  for (const r of links) if (out[r.brand]) out[r.brand].links = r.n;
  for (const r of due) if (out[r.brand]) out[r.brand].followUps = r.n;
  for (const s of Object.values(out)) {
    const g = (k: string) => s.byStage[k] ?? 0;
    s.replied = g('replied') + g('linked') + g('won');
    s.contacted = g('sent') + s.replied + g('no');
    s.replyRate = s.contacted ? Math.round((100 * (s.replied + g('no'))) / s.contacted) : null;
  }
  return out;
}

// ---------- Prospecting engine: base score from the site's own data x live coverage ----------

async function prospects(env: Env) {
  const rows = (await env.DB.prepare(`SELECT brand, target, stage, created_at FROM orgs WHERE target IS NOT NULL`).all<{ brand: string; target: string; stage: string; created_at: string }>()).results;
  const weekAgo = Date.now() - 7 * 86400000;
  const cover = new Map<string, { found: number; contacted: number; linked: number }>();
  const segLinks = new Map<string, number>();
  const segTried = new Map<string, number>();
  const foundWeek: Record<string, number> = {};
  for (const r of rows) {
    const k = `${r.brand}|${r.target}`;
    const c = cover.get(k) ?? { found: 0, contacted: 0, linked: 0 };
    c.found++;
    if (['sent', 'replied', 'linked', 'won', 'no'].includes(r.stage)) c.contacted++;
    if (['linked', 'won'].includes(r.stage)) c.linked++;
    cover.set(k, c);
    const seg = `${r.brand}|${r.target.split(':')[0]}`;
    if (['sent', 'replied', 'linked', 'won', 'no'].includes(r.stage)) segTried.set(seg, (segTried.get(seg) ?? 0) + 1);
    if (['linked', 'won'].includes(r.stage)) segLinks.set(seg, (segLinks.get(seg) ?? 0) + 1);
    if (Date.parse(r.created_at) >= weekAgo) foundWeek[r.brand] = (foundWeek[r.brand] ?? 0) + 1;
  }

  const ranked = T.targets.map((t) => {
    const cfg = T.brands[t.brand];
    const c = cover.get(`${t.brand}|${t.key}`) ?? { found: 0, contacted: 0, linked: 0 };
    const seg = `${t.brand}|${t.segment}`;
    const tried = segTried.get(seg) ?? 0;
    const won = segLinks.get(seg) ?? 0;
    // Segments that convert get a lift once there is evidence (3+ contacted); ones that never do, a cut.
    const learn = tried >= 3 ? Math.min(1.5, Math.max(0.6, 0.8 + (2 * won) / tried)) : 1;
    const room = Math.max(0, cfg.perTargetCap - c.found) / cfg.perTargetCap;
    const score = Math.round(t.base * room * learn * 10) / 10;
    const status = c.found >= cfg.perTargetCap ? 'covered' : c.found > 0 ? 'started' : 'open';
    return { ...t, ...c, learn: Math.round(learn * 100) / 100, score, status };
  });

  const brands = Object.entries(T.brands).map(([key, b]) => {
    const list = ranked.filter((t) => t.brand === key).sort((a, z) => z.score - a.score);
    const left = Math.max(0, b.weeklyCap - (foundWeek[key] ?? 0));
    return {
      key,
      name: b.name,
      active: b.active,
      weeklyCap: b.weeklyCap,
      foundThisWeek: foundWeek[key] ?? 0,
      leftThisWeek: left,
      targets: list.length,
      covered: list.filter((t) => t.status === 'covered').length,
      started: list.filter((t) => t.status === 'started').length,
      next: list.filter((t) => t.score > 0).slice(0, Math.max(left, 5)),
      top: list.slice(0, 40),
    };
  });
  return { generated: T.generated, brands };
}

// ---------- Replies feed ----------

async function replies(env: Env) {
  const { results } = await env.DB.prepare(`
    SELECT m.id, m.brand, m.mail_from, m.mail_to, m.subject, m.at, m.org_id, o.name AS org_name, o.stage
    FROM messages m LEFT JOIN orgs o ON o.id = m.org_id
    WHERE m.direction = 'in' ORDER BY m.at DESC LIMIT 40
  `).all();
  return { messages: results };
}
