// imn-hq: IMN HQ outreach CRM board + prospecting engine (claude/OUTREACH.md).
// Private: Cloudflare Access sits in front of the workers.dev address, and this Worker
// also verifies the Access token itself, so nothing is served if Access is ever removed.

import PAGE from './page.html';
import TARGETS from '../../../hq/prospect-targets.json';
import { defaultTemplate } from './templates';
import { pipeline, daily } from './pipeline';
import { listAffiliates, affiliateDetail, saveAffiliate } from './affiliates';
import { radar, review, markDrafted, saveCoaching, kvSet } from './radar';
import { ICON_SVG, ICON_180, ICON_512, MANIFEST } from './app-assets';

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
type BrandCfg = { name: string; active: boolean; weeklyCap: number; perTargetCap: number; site?: string; from?: string; mailReady?: boolean; segments?: Record<string, string> };
const T = TARGETS as unknown as { generated: string; brands: Record<string, BrandCfg>; targets: Target[] };

export const STAGES = ['found', 'drafted', 'sent', 'replied', 'linked', 'won', 'no'] as const;
const FOLLOW_UP_DAYS = 7;

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(daily(env.DB, T.brands));
    ctx.waitUntil(radarTargets(env));
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const who = await accessEmail(req, env);
    if (!who) return deny(env);

    try {
      if (url.pathname === '/manifest.webmanifest') return new Response(MANIFEST, { headers: { 'content-type': 'application/manifest+json', ...SECURITY } });
      if (url.pathname === '/icon.svg') return new Response(ICON_SVG, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'max-age=86400', ...SECURITY } });
      if (url.pathname === '/icon.png' || url.pathname === '/icon-512.png') {
        const bin = atob(url.pathname === '/icon.png' ? ICON_180 : ICON_512);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Response(bytes, { headers: { 'content-type': 'image/png', 'cache-control': 'max-age=86400', ...SECURITY } });
      }
      if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', ...SECURITY } });
      }
      if (url.pathname === '/api/board' && req.method === 'GET') return json(await board(env));
      if (url.pathname === '/api/summary' && req.method === 'GET') return json(await summary(env));
      if (url.pathname === '/api/prospects' && req.method === 'GET') return json(await prospects(env));
      if (url.pathname === '/api/replies' && req.method === 'GET') return json(await replies(env));
      if (url.pathname === '/api/pipeline' && req.method === 'GET') return json(await pipeline(env.DB, T.brands));
      if (url.pathname === '/api/radar' && req.method === 'GET') return json(await radar(env.DB, targetLabel));
      if (url.pathname === '/api/radar/coaching' && req.method === 'POST') return json(await saveCoaching(env.DB, (await req.json().catch(() => ({}))) as Record<string, unknown>));
      const rv = url.pathname.match(/^\/api\/radar\/(\d+)\/review$/);
      if (rv && req.method === 'POST') return json(await review(env.DB, Number(rv[1]), (await req.json().catch(() => ({}))) as Record<string, unknown>));
      const dr = url.pathname.match(/^\/api\/orgs\/(\d+)\/drafted$/);
      if (dr && req.method === 'POST') return json(await markDrafted(env.DB, Number(dr[1]), (await req.json().catch(() => ({}))) as Record<string, unknown>));
      if (url.pathname === '/api/templates' && req.method === 'GET') return json(await templates(env, url.searchParams.get('brand') ?? '', url.searchParams.get('segment') ?? ''));
      if (url.pathname === '/api/templates' && req.method === 'POST') return json(await saveTemplate(env, (await req.json().catch(() => ({}))) as Record<string, unknown>));
      if (url.pathname === '/api/affiliates' && req.method === 'GET') return json(await listAffiliates(env.DB));
      if (url.pathname === '/api/affiliates' && req.method === 'POST') return json(await saveAffiliate(env.DB, null, (await req.json().catch(() => ({}))) as Record<string, unknown>));
      const af = url.pathname.match(/^\/api\/affiliates\/([a-z0-9-]{1,60})$/);
      if (af && req.method === 'GET') return json(await affiliateDetail(env.DB, af[1]));
      if (af && req.method === 'POST') return json(await saveAffiliate(env.DB, af[1], (await req.json().catch(() => ({}))) as Record<string, unknown>));
      if (url.pathname === '/api/prospects/start' && req.method === 'POST') return json(await startOrg(env, (await req.json().catch(() => ({}))) as Record<string, unknown>));
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
    WHERE o.stage != 'dropped' AND NOT (o.found_by = 'radar' AND o.reviewed_at IS NULL)
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
  const messages = (await env.DB.prepare('SELECT id, brand, direction, mail_from, mail_to, subject, body, at FROM messages WHERE org_id = ? ORDER BY at DESC LIMIT 50').bind(id).all()).results;
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
    if (r.stage === 'dropped') continue; // dropped in Today: doesn't use up the target
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
      // Every target's page, so a Radar card for a target outside the top 40 still links to its own page
      // (e.g. the town page), not the site's home page.
      pages: Object.fromEntries(list.filter((t) => t.page).map((t) => [t.key, t.page])),
    };
  });
  return { generated: T.generated, brands };
}

// ---------- Replies feed ----------

async function replies(env: Env) {
  const { results } = await env.DB.prepare(`
    SELECT m.id, m.brand, m.mail_from, m.mail_to, m.subject, m.body, m.at, m.org_id, o.name AS org_name, o.stage
    FROM messages m LEFT JOIN orgs o ON o.id = m.org_id
    WHERE m.direction = 'in' ORDER BY m.at DESC LIMIT 40
  `).all();
  return { messages: results };
}

// ---------- Email templates (versioned per brand + segment) ----------

type TplRow = { id: number; brand: string; segment: string; version: number; subject: string; body: string; note: string | null; created_at: string };

async function templates(env: Env, brand: string, segment: string) {
  if (!T.brands[brand]) return { error: 'Unknown brand' };
  const saved = (await env.DB.prepare('SELECT * FROM templates WHERE brand = ? AND segment = ? ORDER BY version DESC').bind(brand, segment).all<TplRow>()).results;
  const builtIn = defaultTemplate(brand, segment);
  const versions = [
    ...saved.map((t) => ({ id: t.id, version: t.version, subject: t.subject, body: t.body, note: t.note, created_at: t.created_at })),
    { id: null, version: 0, subject: builtIn.subject, body: builtIn.body, note: 'Built-in starting version', created_at: null },
  ];
  // How each version has done so far (orgs that got it and reached sent / replied / linked).
  const perf = (await env.DB.prepare(`
    SELECT COALESCE(o.template_id, 0) AS tid,
      SUM(CASE WHEN o.stage IN ('sent','replied','linked','won','no') THEN 1 ELSE 0 END) AS sent,
      SUM(CASE WHEN o.stage IN ('replied','linked','won') OR (o.stage = 'no' AND EXISTS (SELECT 1 FROM messages m WHERE m.org_id = o.id AND m.direction = 'in')) THEN 1 ELSE 0 END) AS replied,
      SUM(CASE WHEN o.stage IN ('linked','won') THEN 1 ELSE 0 END) AS linked
    FROM orgs o WHERE o.brand = ? AND o.target LIKE ? GROUP BY tid
  `).bind(brand, segment + ':%').all<{ tid: number; sent: number; replied: number; linked: number }>()).results;
  return {
    brand: { key: brand, name: T.brands[brand].name, from: T.brands[brand].from ?? null, site: T.brands[brand].site ?? null },
    versions: versions.map((v) => ({ ...v, perf: perf.find((p) => p.tid === (v.id ?? 0)) ?? { sent: 0, replied: 0, linked: 0 } })),
  };
}

async function saveTemplate(env: Env, b: Record<string, unknown>) {
  const brand = String(b.brand ?? '');
  const segment = String(b.segment ?? '');
  const subject = str(b.subject);
  const body = typeof b.body === 'string' ? b.body.trim().slice(0, 8000) : '';
  if (!T.brands[brand] || !segment) return { error: 'Unknown brand or segment' };
  if (!subject || !body) return { error: 'Add a subject and a body before saving' };
  if (!/no thanks/i.test(body)) return { error: 'Keep the opt-out line ("Reply \'no thanks\' and I won\'t contact you again")' };
  const last = await env.DB.prepare('SELECT MAX(version) AS v FROM templates WHERE brand = ? AND segment = ?').bind(brand, segment).first<{ v: number | null }>();
  const version = (last?.v ?? 0) + 1;
  const r = await env.DB.prepare('INSERT INTO templates (brand, segment, version, subject, body, note) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(brand, segment, version, subject, body, str(b.note)).run();
  return { ok: true, id: r.meta.last_row_id, version };
}

// ---------- Start an organisation from a prospect target ----------

async function startOrg(env: Env, b: Record<string, unknown>) {
  const brand = String(b.brand ?? '');
  const targetKey = String(b.target ?? '');
  const t = T.targets.find((x) => x.brand === brand && x.key === targetKey);
  if (!t) return { error: 'Unknown target' };
  const name = str(b.organisation);
  const email = (str(b.email) ?? '').toLowerCase();
  if (!name) return { error: 'Add the organisation name' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Add the email address they publish' };

  const opted = await env.DB.prepare('SELECT 1 FROM contacts WHERE lower(email) = ? AND opted_out_at IS NOT NULL LIMIT 1').bind(email).first();
  if (opted) return { error: `${email} has opted out. No brand contacts them again.` };
  const dupe = await env.DB.prepare('SELECT o.id, o.name, o.stage FROM orgs o JOIN contacts c ON c.org_id = o.id WHERE o.brand = ? AND lower(c.email) = ? LIMIT 1')
    .bind(brand, email).first<{ id: number; name: string; stage: string }>();
  if (dupe) return { error: `Already on the board: ${dupe.name} (${dupe.stage}).`, orgId: dupe.id };

  const templateId = typeof b.template_id === 'number' ? b.template_id : null;
  const subject = str(b.subject);
  const org = await env.DB.prepare(`INSERT INTO orgs (brand, name, type, website, evidence_url, region, target, template_id, stage, next_step)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'drafted', ?) RETURNING id`)
    .bind(brand, name, t.segmentLabel, str(b.website), str(b.evidence_url), t.regionLabel, t.key, templateId, 'Send the draft from Outlook')
    .first<{ id: number }>();
  if (!org) return { error: 'Could not add the organisation' };
  await env.DB.batch([
    env.DB.prepare('INSERT INTO contacts (org_id, name, role, email, source_url) VALUES (?, ?, ?, ?, ?)')
      .bind(org.id, str(b.contact_name), str(b.contact_role), email, str(b.source_url) ?? str(b.evidence_url)),
    env.DB.prepare(`INSERT INTO touches (org_id, brand, stage, channel, note) VALUES (?, ?, 'found', 'board', ?)`)
      .bind(org.id, brand, `Found via ${t.segmentLabel} · ${t.regionLabel}`),
    env.DB.prepare(`INSERT INTO touches (org_id, brand, stage, channel, subject, note) VALUES (?, ?, 'drafted', 'email', ?, ?)`)
      .bind(org.id, brand, subject, templateId ? 'Draft from a saved template' : 'Draft from the built-in template'),
  ]);
  return { ok: true, orgId: org.id };
}

// Daily: hand the research task its shortlist (top open targets per brand whose mail is ready).
async function radarTargets(env: Env) {
  const p = await prospects(env);
  const out = p.brands
    .filter((b) => b.active && T.brands[b.key]?.mailReady)
    .map((b) => ({
      brand: b.key,
      name: b.name,
      site: T.brands[b.key]?.site ?? null,
      from: T.brands[b.key]?.from ?? null,
      leftThisWeek: b.leftThisWeek,
      targets: b.top.filter((t) => t.score > 0).slice(0, 12).map((t) => ({
        key: t.key, segment: t.segmentLabel, region: t.regionLabel, score: t.score, why: t.why, offer: t.offer, evidence: t.evidence, search: t.search, page: t.page,
      })),
    }));
  await kvSet(env.DB, 'radar_targets', { generated: new Date().toISOString(), brands: out });
}
