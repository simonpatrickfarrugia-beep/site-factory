/**
 * Site stats for the private dashboard (/hq/stats): visits per page (GA4), call-to-action clicks
 * per page (GA4 events cta_prime / cta_disc / cta_justwatch …) and Google search performance (Search Console).
 * Written daily to data/<brand>/stats.json; the site rebuild turns it into the dashboard page.
 *
 * Pure shaping logic; the Worker does the API calls.
 */
import type { Ga4Row, GscRow } from './google';

export interface PageStats {
  path: string;
  views: number;
  prevViews: number;
  users: number;
  /** CTA clicks by name, e.g. { prime: 3, disc: 1 }. */
  cta: Record<string, number>;
  gscClicks: number;
  gscImpressions: number;
  gscPosition: number | null;
  topQuery: string | null;
}

export interface SiteStats {
  generatedAt: string | null;
  period: { start: string; end: string } | null;
  gscPeriod: { start: string; end: string } | null;
  sources: { ga4: boolean; gsc: boolean; notes: string[] };
  totals: { views: number; prevViews: number; users: number; cta: Record<string, number>; gscClicks: number; gscImpressions: number };
  daily: { date: string; views: number; cta: number }[];
  pages: PageStats[];
}

const pathOf = (url: string) => {
  try {
    const p = new URL(url).pathname;
    return p.length > 1 ? p.replace(/\/$/, '') : '/';
  } catch {
    return url;
  }
};
const normPath = (p: string) => (p.length > 1 ? p.replace(/\/$/, '').replace(/\.html$/, '') : '/');
const isoDay = (yyyymmdd: string) => `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

export function buildStats(input: {
  now: Date;
  period: { start: string; end: string } | null;
  gscPeriod: { start: string; end: string } | null;
  notes: string[];
  ga4: null | { pages: Ga4Row[]; prevPages: Ga4Row[]; events: Ga4Row[]; daily: Ga4Row[]; dailyEvents: Ga4Row[] };
  gsc: null | { pageQueries: GscRow[] };
}): SiteStats {
  const pages = new Map<string, PageStats>();
  const page = (path: string) => {
    const key = normPath(path);
    let p = pages.get(key);
    if (!p) {
      p = { path: key, views: 0, prevViews: 0, users: 0, cta: {}, gscClicks: 0, gscImpressions: 0, gscPosition: null, topQuery: null };
      pages.set(key, p);
    }
    return p;
  };
  const skip = (path: string) => /^\/hq(\/|$)/.test(path);

  const totals: SiteStats['totals'] = { views: 0, prevViews: 0, users: 0, cta: {}, gscClicks: 0, gscImpressions: 0 };
  const daily = new Map<string, { date: string; views: number; cta: number }>();

  if (input.ga4) {
    for (const r of input.ga4.pages) {
      if (skip(r.dims[0])) continue;
      const p = page(r.dims[0]);
      p.views += r.mets[0];
      p.users += r.mets[1] ?? 0;
      totals.views += r.mets[0];
      totals.users += r.mets[1] ?? 0;
    }
    for (const r of input.ga4.prevPages) {
      if (skip(r.dims[0])) continue;
      page(r.dims[0]).prevViews += r.mets[0];
      totals.prevViews += r.mets[0];
    }
    for (const r of input.ga4.events) {
      if (skip(r.dims[0])) continue;
      const name = r.dims[1].replace(/^cta_/, '');
      const p = page(r.dims[0]);
      p.cta[name] = (p.cta[name] ?? 0) + r.mets[0];
      totals.cta[name] = (totals.cta[name] ?? 0) + r.mets[0];
    }
    for (const r of input.ga4.daily) {
      const d = isoDay(r.dims[0]);
      daily.set(d, { date: d, views: r.mets[0], cta: daily.get(d)?.cta ?? 0 });
    }
    for (const r of input.ga4.dailyEvents) {
      const d = isoDay(r.dims[0]);
      const row = daily.get(d) ?? { date: d, views: 0, cta: 0 };
      row.cta += r.mets[0];
      daily.set(d, row);
    }
  }

  if (input.gsc) {
    const best = new Map<string, number>();
    const weighted = new Map<string, number>();
    for (const r of input.gsc.pageQueries) {
      const path = pathOf(r.keys[0]);
      if (skip(path)) continue;
      const p = page(path);
      p.gscClicks += r.clicks;
      p.gscImpressions += r.impressions;
      weighted.set(p.path, (weighted.get(p.path) ?? 0) + r.position * r.impressions);
      if (r.impressions > (best.get(p.path) ?? -1)) {
        best.set(p.path, r.impressions);
        p.topQuery = r.keys[1];
      }
      totals.gscClicks += r.clicks;
      totals.gscImpressions += r.impressions;
    }
    for (const p of pages.values())
      if (p.gscImpressions) p.gscPosition = Math.round(((weighted.get(p.path) ?? 0) / p.gscImpressions) * 10) / 10;
  }

  return {
    generatedAt: input.now.toISOString(),
    period: input.period,
    gscPeriod: input.gscPeriod,
    sources: { ga4: !!input.ga4, gsc: !!input.gsc, notes: input.notes },
    totals,
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    pages: [...pages.values()].sort((a, b) => b.views - a.views || b.gscImpressions - a.gscImpressions),
  };
}
