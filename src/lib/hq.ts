/**
 * IMN HQ page data, read straight from the repo at build time (works from any brand's build).
 * Sources: hq/portfolio.json, hq/finance.json, hq/niches.json, each site's stats.json and pipeline data.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = <T>(path: string | undefined, fallback: T): T => {
  if (!path) return fallback; // e.g. a site with no stats file yet
  const f = join(process.cwd(), path);
  if (!existsSync(f)) return fallback;
  try {
    return JSON.parse(readFileSync(f, 'utf8')) as T;
  } catch {
    return fallback;
  }
};

interface Stats { generatedAt: string | null; totals: { views: number; prevViews: number; users: number; cta: Record<string, number>; gscClicks: number; gscImpressions: number } }

export function hqProps() {
  const portfolio = read<any>('hq/portfolio.json', { owner: 'IMN', groups: [], nodes: [], actions: [] });
  const finance = read<any>('hq/finance.json', { revenue: [], costs: [], monthlyRunning: [] });
  const money: Record<string, string[]> = { trailers: ['prime', 'disc'], vic: ['book_stay', 'book_tour'] };
  const sites = portfolio.nodes
    .filter((nd: any) => nd.stats)
    .map((nd: any) => {
      const s = read<Stats | null>(nd.stats, null);
      const t = s?.totals ?? { views: 0, prevViews: 0, users: 0, cta: {}, gscClicks: 0, gscImpressions: 0 };
      return {
        name: nd.name,
        url: nd.url,
        views: t.views,
        prevViews: t.prevViews,
        users: t.users,
        gscClicks: t.gscClicks,
        gscImpressions: t.gscImpressions,
        cta: Object.values(t.cta).reduce((a: number, b: number) => a + b, 0),
        money: (money[nd.id] ?? []).reduce((a, k) => a + (t.cta[k] ?? 0), 0),
        updated: s?.generatedAt ?? null,
        dashboard: `${nd.url}/hq/stats`,
        station: nd.station ?? null,
        launched: nd.launched ?? null,
        day: nd.launched ? Math.floor((Date.now() - Date.parse(nd.launched)) / 86400000) : null,
        target: nd.target90 ?? null,
        targetSet: nd.targetSet ?? null,
      };
    });
  const movies = read<any[]>('data/trailers/movies.json', []);
  const queue = read<any[]>('data/trailers/queue.json', []);
  const cands = read<any[]>('data/trailers/candidates.json', []);
  const towns = read<any[]>('data/vic/towns.json', []);
  const places = read<any[]>('data/vic/places.json', []);
  const content = read<any>('data/vic/content.json', { loops: [] });
  const niches = read<any[]>('hq/niches.json', []);
  const catalog = read<any>('hq/affiliate-programs.json', { programs: [] });
  const count = (xs: any[], f: (x: any) => boolean) => xs.filter(f).length;
  const newest = movies.map((m) => m.created).sort().pop();
  const engines = [
    {
      name: 'Trailer pipeline',
      lines: [
        `${movies.length} movies live${newest ? `, newest added ${new Date(newest).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}` : ''}`,
        `${count(cands, (c) => c.status === 'candidate')} candidates waiting, ${count(queue, (q) => q.status === 'new')} queued`,
        `${count(queue, (q) => q.status === 'review')} need review, ${count(queue, (q) => q.status === 'pending')} waiting for release`,
      ],
    },
    {
      name: 'Vic Tours data',
      lines: [
        `${count(towns, (t) => t.published)} towns live of ${towns.length} on the list`,
        `${places.length.toLocaleString('en-AU')} places from OpenStreetMap`,
        `${(content.loops ?? []).filter((l: any) => !l.draft).length} road trips published`,
      ],
    },
  ];
  return {
    owner: portfolio.owner,
    groups: portfolio.groups,
    nodes: portfolio.nodes,
    actions: portfolio.actions,
    sites,
    engines,
    finance,
    niches: niches
      .filter((x: any) => x.status === 'scored' && x.score)
      .map((x: any) => ({ idea: x.idea, score: x.score.overall, market: x.location ?? 'United States' }))
      .sort((a: any, b: any) => b.score - a.score),
    moneyMap: niches
      .filter((x: any) => x.status === 'scored' && x.money)
      .map((x: any) => ({ idea: x.idea, market: x.location ?? 'United States', low: x.money.revenueUsd[0], mid: x.money.revenueUsd[1], high: x.money.revenueUsd[2], perSale: x.money.bestPerSaleUsd }))
      .sort((a: any, b: any) => b.mid - a.mid),
    programs: (catalog.programs ?? [])
      .map((pr: any) => ({ name: pr.name, commission: pr.commission, approval: pr.approval, requirements: pr.requirements, status: pr.status, verified: !!pr.verified, markets: pr.markets.join(', ') }))
      .sort((a: any, b: any) => ['approved', 'applying', 'not applied'].indexOf(a.status) - ['approved', 'applying', 'not applied'].indexOf(b.status)),
    todo: portfolio.todo ?? [],
    notes: portfolio.notes ?? [],
    goal: (() => {
      const g = portfolio.goal;
      if (!g) return null;
      const all = (finance.revenue ?? []).reduce((a: number, r: any) => a + (r.amount ?? 0), 0);
      const month = new Date().toISOString().slice(0, 7);
      const thisMonth = (finance.revenue ?? []).filter((r: any) => r.month === month).reduce((a: number, r: any) => a + (r.amount ?? 0), 0);
      const reached = g.levels.filter((l: any) => (l.monthly ? thisMonth : all) >= l.target);
      const next = g.levels.find((l: any) => !reached.includes(l)) ?? null;
      const daysLeft = g.sprint ? Math.ceil((Date.parse(g.sprint.deadline + 'T23:59:59+11:00') - Date.now()) / 86400000) : null;
      return { level: reached.length, next, total: all, thisMonth, sprint: g.sprint ?? null, daysLeft, levels: g.levels };
    })(),
    builtAt: new Date().toISOString(),
  };
}

/** Tap-to-copy signup answers (hq/affiliate-answers.json), with each site's latest 28-day visits filled in. */
export function hqAnswersProps() {
  const a = read<any>('hq/affiliate-answers.json', { common: {}, sites: [] });
  const fields = (o: Record<string, string>) => Object.entries(o).map(([label, value]) => ({ label, value }));
  return {
    common: fields(a.common),
    sites: a.sites.map((s: any) => {
      const st = read<any>(s.stats, null);
      const v = st?.totals?.views ?? 0;
      const traffic = `New site, launched October 2026, growing organic traffic${v ? ` (${v.toLocaleString('en-AU')} page views in the last 28 days)` : ''}.`;
      return { name: s.name, url: s.url, traffic, fields: fields(s.fields) };
    }),
  };
}

/**
 * Morning traffic dashboard (/hq/traffic on the trailer site): every site's visits and Google searches on one page.
 * Built from each site's data/<brand>/stats.json, which the pipeline's stats job refreshes at 06:00 Melbourne.
 */
const TRAFFIC_SITES: { id: string; name: string; url: string; stats: string; money: string[]; moneyNote?: string }[] = [
  { id: 'paycalc', name: 'MyPayCalc', url: 'https://mypaycalc.com.au', stats: 'data/paycalc/stats.json', money: [] as string[], moneyNote: 'ads later' },
  { id: 'vic', name: 'Vic Tours', url: 'https://victours.com.au', stats: 'data/vic/stats.json', money: ['book_stay', 'book_tour', 'book_car'] },
  { id: 'trade-admin', name: 'Trade Admin', url: 'https://tradeadmin.com.au', stats: 'data/trade-admin/stats.json', money: ['quiz_trial_servicem8', 'quiz_trial_tradify', 'quiz_trial_fergus', 'app_site'] },
  { id: 'chc', name: 'Community Help Co', url: 'https://communityhelp.com.au', stats: 'data/community-help-co/stats.json', money: [] as string[], moneyNote: 'enquiries by email' },
  { id: 'trailers', name: 'Movie Trailer Channel', url: 'https://www.movietrailer.channel', stats: 'data/trailers/stats.json', money: ['prime', 'disc'] },
];

export function trafficProps() {
  const dayList = (start: string, end: string) => {
    const out: string[] = [];
    for (let t = Date.parse(start + 'T00:00:00Z'); t <= Date.parse(end + 'T00:00:00Z'); t += 86400000) out.push(new Date(t).toISOString().slice(0, 10));
    return out;
  };
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const sites = TRAFFIC_SITES.map((cfg) => {
    const s = read<any>(cfg.stats, null);
    const period = s?.period ?? null;
    const byDay = new Map<string, number>((s?.daily ?? []).map((d: any) => [d.date, d.views]));
    const days = period ? dayList(period.start, period.end) : [];
    const series = days.map((d) => byDay.get(d) ?? 0);
    const n = series.length;
    const gscDays = s?.gscPeriod ? dayList(s.gscPeriod.start, s.gscPeriod.end) : [];
    const gscBy = new Map<string, { clicks: number; impressions: number }>((s?.gscDaily ?? []).map((d: any) => [d.date, d]));
    const impr = gscDays.map((d) => gscBy.get(d)?.impressions ?? 0);
    const pages: any[] = s?.pages ?? [];
    const imprTotal = sum(pages.map((p) => p.gscImpressions || 0));
    const pos = imprTotal ? Math.round((sum(pages.map((p) => (p.gscPosition ?? 0) * (p.gscImpressions || 0))) / imprTotal) * 10) / 10 : null;
    const cta = s?.totals?.cta ?? {};
    const queries: any[] = s?.queries ?? pages.filter((p) => p.topQuery).map((p) => ({ query: p.topQuery, clicks: p.gscClicks, impressions: p.gscImpressions, position: p.gscPosition, page: p.path }));
    return {
      ...cfg,
      connected: !!(s?.sources?.ga4 || s?.sources?.gsc),
      generatedAt: s?.generatedAt ?? null,
      lastDay: period?.end ?? null,
      gscLastDay: s?.gscPeriod?.end ?? null,
      series,
      days,
      yesterday: n ? series[n - 1] : 0,
      weekAgo: n >= 8 ? series[n - 8] : null,
      d7: sum(series.slice(-7)),
      prev7: n >= 14 ? sum(series.slice(-14, -7)) : null,
      d28: s?.totals?.views ?? 0,
      prev28: s?.totals?.prevViews ?? 0,
      clicks: s?.totals?.gscClicks ?? 0,
      impressions: s?.totals?.gscImpressions ?? 0,
      imprSeries: impr,
      position: pos,
      actions: sum(Object.values(cta) as number[]),
      money: sum(cfg.money.map((k) => cta[k] ?? 0)),
      moneyKeys: cfg.money,
      queries: [...queries].sort((a, b) => b.impressions - a.impressions).slice(0, 8),
      allQueries: queries,
      topPages: pages.filter((p) => p.views > 0).slice(0, 5).map((p) => ({ path: p.path, views: p.views })),
      notes: (s?.sources?.notes ?? []) as string[],
    };
  });
  const allQueries = sites
    .flatMap((s) => s.allQueries.map((q: any) => ({ ...q, site: s.name, url: s.url })))
    .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
    .slice(0, 30);
  const topPages = sites
    .flatMap((s) => s.topPages.map((p) => ({ ...p, site: s.name, url: s.url })))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
  // Portfolio daily total, aligned on the most common end date.
  const ends = sites.map((s) => s.lastDay).filter(Boolean).sort();
  const end = ends[ends.length - 1] ?? null;
  const totalDays = end ? dayList(new Date(Date.parse(end) - 27 * 86400000).toISOString().slice(0, 10), end) : [];
  const total = totalDays.map((d) => sum(sites.map((s) => { const i = s.days.indexOf(d); return i >= 0 ? s.series[i] : 0; })));
  const gens = sites.map((s) => s.generatedAt).filter(Boolean).sort();
  return {
    sites: sites.map(({ allQueries: _q, ...rest }) => rest),
    allQueries,
    topPages,
    total,
    totalDays,
    updated: gens[gens.length - 1] ?? null,
    builtAt: new Date().toISOString(),
  };
}
