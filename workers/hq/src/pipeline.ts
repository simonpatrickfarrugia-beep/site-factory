// Pipeline: the funnel per brand, template performance, links won with the linked page's
// performance, plus the daily job (link check + page metrics snapshot).

import VIC from '../../../data/vic/stats.json';
import TRAILERS from '../../../data/trailers/stats.json';
import CHC from '../../../data/community-help-co/stats.json';
import TA from '../../../data/trade-admin/stats.json';
import PAYCALC from '../../../data/paycalc/stats.json';

type PageStat = { path: string; views?: number; gscImpressions?: number; gscClicks?: number; gscPosition?: number | null };
type Stats = { generatedAt?: string; pages?: PageStat[] };
const STATS: Record<string, Stats> = {
  vic: VIC as Stats,
  trailers: TRAILERS as Stats,
  'community-help-co': CHC as Stats,
  'trade-admin': TA as Stats,
  paycalc: PAYCALC as Stats,
};

export type BrandInfo = { name: string; site?: string | null; segments?: Record<string, string> };

const RANK: Record<string, number> = { found: 0, drafted: 1, sent: 2, replied: 3, linked: 4, won: 5 };
export const FUNNEL = ['found', 'drafted', 'sent', 'replied', 'linked'] as const;

export function hostsFor(site?: string | null): string[] {
  if (!site) return [];
  const h = new URL(site).hostname.replace(/^www\./, '');
  return [h, 'www.' + h];
}

function pathOf(url: string): string {
  try {
    const p = new URL(url).pathname.replace(/\/+$/, '');
    return p || '/';
  } catch {
    return '/';
  }
}

export function pageNow(brand: string, url: string) {
  const s = STATS[brand];
  const path = pathOf(url);
  const p = s?.pages?.find((x) => (x.path.replace(/\/+$/, '') || '/') === path);
  return {
    asOf: s?.generatedAt ?? null,
    views: p?.views ?? 0,
    impressions: p?.gscImpressions ?? 0,
    clicks: p?.gscClicks ?? 0,
    position: p?.gscPosition ?? null,
  };
}

export async function pipeline(db: D1Database, brands: Record<string, BrandInfo>) {
  const orgs = (await db.prepare('SELECT id, brand, name, stage, target, template_id, created_at FROM orgs').all<{
    id: number; brand: string; name: string; stage: string; target: string | null; template_id: number | null; created_at: string;
  }>()).results;
  const touches = (await db.prepare('SELECT org_id, stage FROM touches').all<{ org_id: number; stage: string }>()).results;
  const best = new Map<number, number>();
  for (const o of orgs) best.set(o.id, RANK[o.stage] ?? 0);
  for (const t of touches) {
    const r = RANK[t.stage];
    if (r !== undefined && r > (best.get(t.org_id) ?? -1)) best.set(t.org_id, r);
  }
  const reached = (o: { id: number }, stage: string) => (best.get(o.id) ?? 0) >= RANK[stage];

  const funnel = Object.entries(brands).map(([key, b]) => {
    const list = orgs.filter((o) => o.brand === key);
    const steps = FUNNEL.map((st) => ({ stage: st, count: list.filter((o) => reached(o, st)).length }));
    return { key, name: b.name, total: list.length, no: list.filter((o) => o.stage === 'no').length, won: list.filter((o) => o.stage === 'won').length, steps };
  });

  // Template performance: per brand + segment + template version.
  const tpl = (await db.prepare('SELECT id, brand, segment, version, subject, note, created_at FROM templates').all<{
    id: number; brand: string; segment: string; version: number; subject: string; note: string | null; created_at: string;
  }>()).results;
  const groups = new Map<string, { brand: string; segment: string; version: number; subject: string | null; note: string | null; orgs: number; sent: number; replied: number; linked: number }>();
  for (const o of orgs) {
    const seg = o.target?.split(':')[0] ?? '(no target)';
    const t = o.template_id ? tpl.find((x) => x.id === o.template_id) : null;
    const k = `${o.brand}|${seg}|${t ? t.version : 0}`;
    const g = groups.get(k) ?? { brand: o.brand, segment: seg, version: t ? t.version : 0, subject: t ? t.subject : null, note: t?.note ?? null, orgs: 0, sent: 0, replied: 0, linked: 0 };
    g.orgs++;
    if (reached(o, 'sent')) g.sent++;
    if (reached(o, 'replied')) g.replied++;
    if (reached(o, 'linked')) g.linked++;
    groups.set(k, g);
  }
  const templates = [...groups.values()]
    .map((g) => ({ ...g, segmentLabel: brands[g.brand]?.segments?.[g.segment] ?? g.segment, replyRate: g.sent ? Math.round((100 * g.replied) / g.sent) : null, linkRate: g.sent ? Math.round((100 * g.linked) / g.sent) : null }))
    .sort((a, z) => a.brand.localeCompare(z.brand) || a.segment.localeCompare(z.segment) || z.version - a.version);

  // Links won, each with the linked page's performance now and at the first snapshot after the link.
  const links = (await db.prepare(`SELECT l.*, o.name AS org_name, o.stage FROM links_won l JOIN orgs o ON o.id = l.org_id ORDER BY l.first_seen DESC`).all<{
    id: number; org_id: number; brand: string; page_url: string; our_url: string | null; first_seen: string; last_seen: string; org_name: string; stage: string;
  }>()).results;
  const out = [];
  for (const l of links) {
    const ours = l.our_url ?? brands[l.brand]?.site ?? '';
    const base = await db.prepare('SELECT day, views, impressions, clicks, position FROM page_metrics WHERE url = ? AND day >= ? ORDER BY day LIMIT 1')
      .bind(ours, l.first_seen.slice(0, 10)).first<{ day: string; views: number; impressions: number; clicks: number; position: number | null }>();
    const series = (await db.prepare('SELECT day, views, impressions, clicks FROM page_metrics WHERE url = ? ORDER BY day DESC LIMIT 60').bind(ours).all<{ day: string; views: number; impressions: number; clicks: number }>()).results.reverse();
    out.push({ ...l, our_url: ours, now: pageNow(l.brand, ours), atLink: base ?? null, series });
  }
  return { funnel, templates, links: out };
}

// ---------- Daily job ----------

export async function daily(db: D1Database, brands: Record<string, BrandInfo>) {
  const checked = await linkCheck(db, brands);
  const snap = await snapshot(db);
  console.log(`daily: checked ${checked.checked} pages, ${checked.found} new links; ${snap} page snapshots`);
}

async function linkCheck(db: D1Database, brands: Record<string, BrandInfo>) {
  // Free plan: 50 outbound requests per run, so check the 25 least recently checked.
  const rows = (await db.prepare(`
    SELECT id, brand, name, stage, website, evidence_url FROM orgs
    WHERE stage IN ('sent','replied','linked','won') AND COALESCE(evidence_url, website) IS NOT NULL
    ORDER BY checked_at IS NOT NULL, checked_at LIMIT 25
  `).all<{ id: number; brand: string; name: string; stage: string; website: string | null; evidence_url: string | null }>()).results;
  let found = 0;
  for (const o of rows) {
    const url = o.evidence_url ?? o.website!;
    const hosts = hostsFor(brands[o.brand]?.site);
    let ours: string | null = null;
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; IMN-HQ link check)' }, redirect: 'follow', signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const html = (await res.text()).slice(0, 2_000_000);
        for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
          try {
            const u = new URL(m[1], url);
            if (hosts.includes(u.hostname)) { ours = u.origin + u.pathname.replace(/\/+$/, ''); break; }
          } catch { /* skip */ }
        }
      }
    } catch (e) {
      console.log('link check failed', url, (e as Error).message);
    }
    const stmts = [db.prepare(`UPDATE orgs SET checked_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`).bind(o.id)];
    if (ours) {
      stmts.push(db.prepare(`
        INSERT INTO links_won (org_id, brand, page_url, our_url) VALUES (?, ?, ?, ?)
        ON CONFLICT (org_id, page_url) DO UPDATE SET last_seen = strftime('%Y-%m-%dT%H:%M:%SZ','now'), our_url = excluded.our_url
      `).bind(o.id, o.brand, url, ours));
      if (o.stage === 'sent' || o.stage === 'replied') {
        found++;
        stmts.push(db.prepare(`INSERT INTO touches (org_id, brand, stage, channel, note) VALUES (?, ?, 'linked', 'auto', ?)`).bind(o.id, o.brand, `Link found on ${url} → ${ours}`));
        stmts.push(db.prepare(`UPDATE orgs SET stage = 'linked', stage_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`).bind(o.id));
      }
    }
    await db.batch(stmts);
  }
  return { checked: rows.length, found };
}

async function snapshot(db: D1Database) {
  const urls = (await db.prepare('SELECT DISTINCT brand, our_url FROM links_won WHERE our_url IS NOT NULL').all<{ brand: string; our_url: string }>()).results;
  const day = new Date().toISOString().slice(0, 10);
  const stmts = urls.map((u) => {
    const n = pageNow(u.brand, u.our_url);
    return db.prepare('INSERT OR REPLACE INTO page_metrics (url, brand, day, views, impressions, clicks, position) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(u.our_url, u.brand, day, n.views, n.impressions, n.clicks, n.position);
  });
  if (stmts.length) await db.batch(stmts);
  return stmts.length;
}
