/**
 * IMN HQ page data, read straight from the repo at build time (works from any brand's build).
 * Sources: hq/portfolio.json, hq/finance.json, hq/niches.json, each site's stats.json and pipeline data.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
      .sort((a: any, b: any) => ['approved', 'applying', 'not applied', 'declined'].indexOf(a.status) - ['approved', 'applying', 'not applied', 'declined'].indexOf(b.status)),
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
    funnel: funnelProps(),
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
  { id: 'simon-says-travel', name: 'Simon Says Travel', url: 'https://simonsaystravel.com.au', stats: 'data/simon-says-travel/stats.json', money: ['book_stay', 'book_tour'] as string[], moneyNote: 'hotel and tour clicks' },
  { id: 'vic', name: 'Vic Tours', url: 'https://victours.com.au', stats: 'data/vic/stats.json', money: ['book_stay', 'book_tour', 'book_car'] },
  { id: 'trade-admin', name: 'Trade Admin', url: 'https://tradeadmin.com.au', stats: 'data/trade-admin/stats.json', money: ['quiz_trial_servicem8', 'quiz_trial_tradify', 'quiz_trial_fergus', 'partner_fergus', 'app_site'] },
  { id: 'chc', name: 'Community Help Co', url: 'https://communityhelp.com.au', stats: 'data/community-help-co/stats.json', money: [] as string[], moneyNote: 'enquiries by email' },
  { id: 'trailers', name: 'Movie Trailer Channel', url: 'https://www.movietrailer.channel', stats: 'data/trailers/stats.json', money: ['prime', 'disc'] },
];

/** Metric names for lab targets (data/imn/labs.json → target.metric). */
const LAB_METRIC: Record<string, string> = { gsc_impressions: 'Google impressions', gsc_clicks: 'Google clicks', visits: 'visits', money_clicks: 'money clicks' };

/**
 * IMN Labs as their own rows: GA4 + Search Console from data/imn/stats.json, filtered to /labs/<slug>/ (28 days),
 * against each lab's 90-day target. Live, graduating and (until removed) graduated labs; closed labs are left out.
 */
export function labRows() {
  const reg = read<any>('data/imn/labs.json', { labs: [] });
  const s = read<any>('data/imn/stats.json', null);
  const pages: any[] = s?.pages ?? [];
  const queries: any[] = s?.queries ?? [];
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  return (reg.labs ?? [])
    .filter((l: any) => l.status !== 'closed')
    .map((l: any) => {
      const base = `/labs/${l.slug}`;
      const mine = (path: string) => path === base || path.startsWith(base + '/');
      const ps = pages.filter((p) => mine(String(p.path ?? '')));
      const qs = queries.filter((q) => mine(String(q.page ?? ''))).sort((a, b) => b.impressions - a.impressions);
      const money = sum(ps.map((p) => sum((l.moneyKeys ?? []).map((k: string) => p.cta?.[k] ?? 0))));
      const nums = {
        visits: sum(ps.map((p) => p.views || 0)),
        prevVisits: sum(ps.map((p) => p.prevViews || 0)),
        d7: sum(ps.map((p) => p.d7 || 0)),
        gsc_clicks: sum(ps.map((p) => p.gscClicks || 0)),
        gsc_impressions: sum(ps.map((p) => p.gscImpressions || 0)),
        money_clicks: money,
      };
      const day = l.launched ? Math.max(0, Math.floor((Date.now() - Date.parse(l.launched + 'T00:00:00+11:00')) / 86400000)) : null;
      const have = (nums as Record<string, number>)[l.target?.metric] ?? 0;
      const goal = Number(l.target?.number) || 0;
      return {
        slug: l.slug as string,
        name: l.name as string,
        status: l.status as string,
        url: `https://imnetwork.com.au${base}`,
        domain: (l.domain || '') as string,
        day,
        pages: ps.length,
        ...nums,
        target: goal ? { metric: LAB_METRIC[l.target.metric] ?? l.target.metric, have, goal, pct: Math.min(100, Math.round((have / goal) * 100)) } : null,
        queries: qs.slice(0, 3).map((q) => ({ query: q.query as string, impressions: q.impressions as number, clicks: q.clicks as number, position: q.position as number | null })),
      };
    });
}
export type LabRow = ReturnType<typeof labRows>[number];

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
    const ctaByDay = new Map<string, number>((s?.daily ?? []).map((d: any) => [d.date, d.cta]));
    const ctaSeries = days.map((d) => ctaByDay.get(d) ?? 0);
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
      ctaSeries,
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
      money28: sum(cfg.money.map((k) => cta[k] ?? 0)),
      // All time (since GA4 started for the site). Missing until the first stats run after 6 Nov 2026.
      all: s?.allTime
        ? {
            start: s.allTime.start as string | null,
            views: s.allTime.views as number,
            actions: sum(Object.values(s.allTime.cta ?? {}) as number[]),
            money: sum(cfg.money.map((k) => s.allTime.cta?.[k] ?? 0)),
            daily: (s.allTime.daily ?? []).map((d: any) => ({ date: d.date as string, views: d.views as number })),
          }
        : null,
      // Page review: every page with a visit, with each period's figures (7 days needs the 6 Nov stats run or later).
      pageRows: pages
        .filter((p) => p.views || p.prevViews || p.allViews || p.d7)
        .map((p) => {
          const moneyOf = (c: Record<string, number> | undefined) => sum(cfg.money.map((k) => c?.[k] ?? 0));
          const btnOf = (c: Record<string, number> | undefined) => sum(Object.values(c ?? {}) as number[]);
          return {
            path: p.path as string,
            d7: (p.d7 ?? null) as number | null,
            p7: (p.prev7 ?? null) as number | null,
            d28: p.views as number,
            p28: p.prevViews as number,
            all: (p.allViews ?? null) as number | null,
            m28: cfg.money.length ? moneyOf(p.cta) : btnOf(p.cta),
            mAll: p.allCta ? (cfg.money.length ? moneyOf(p.allCta) : btnOf(p.allCta)) : null,
            impr: (p.gscImpressions || 0) as number,
            pos: (p.gscPosition ?? null) as number | null,
            q: (p.topQuery ?? null) as string | null,
          };
        }),
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
    labs: labRows(),
    progress: progressProps(sites),
    allQueries,
    topPages,
    total,
    totalDays,
    updated: gens[gens.length - 1] ?? null,
    builtAt: new Date().toISOString(),
  };
}

/** Progress tab on /hq/traffic: each project's 90-day target as bars, plus the company level. */
function progressProps(sites: { id: string; name: string; url: string; d28: number; money28: number; moneyKeys: string[]; all: { views: number } | null }[]) {
  const portfolio = read<any>('hq/portfolio.json', { nodes: [], goal: null, todo: [] });
  const finance = read<any>('hq/finance.json', { revenue: [] });
  const idOf: Record<string, string> = { chc: 'chc' };
  const day = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso + 'T00:00:00+11:00')) / 86400000));
  const projects = sites.map((s) => {
    const nd = (portfolio.nodes ?? []).find((x: any) => x.id === (idOf[s.id] ?? s.id)) ?? null;
    const launched: string | null = nd?.launched ?? null;
    const target = nd?.target90 ?? null;
    return {
      id: s.id,
      name: s.name,
      url: s.url,
      launched,
      day: launched ? day(launched) : null,
      visits: s.d28,
      visitsAll: s.all?.views ?? null,
      money: s.money28,
      tracksMoney: s.moneyKeys.length > 0,
      target: target ? { views: Number(target.views) || 0, moneyClicks: Number(target.moneyClicks) || 0 } : null,
    };
  });
  const revenue = (finance.revenue ?? []).reduce((t: number, r: any) => t + (Number(r.amount) || 0), 0);
  const levels: { level: number; name: string; target: number; monthly?: boolean }[] = portfolio.goal?.levels ?? [];
  // Monthly levels compare against the best month so far; level 1 against all revenue to date.
  const byMonth = new Map<string, number>();
  for (const r of finance.revenue ?? []) byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + (Number(r.amount) || 0));
  const bestMonth = Math.max(0, ...byMonth.values());
  const next = levels.find((l) => (l.monthly ? bestMonth : revenue) < l.target) ?? null;
  const todo: any[] = portfolio.todo ?? [];
  return {
    projects,
    level: next ? { level: next.level, name: next.name, target: next.target, have: next.monthly ? bestMonth : revenue, monthly: !!next.monthly, done: next.level - 1 } : null,
    revenue,
    todo: { open: todo.filter((t) => !t.done).length, done: todo.filter((t) => t.done).length },
  };
}

/**
 * Sales-funnel view for IMN HQ: the whole portfolio as one funnel (outreach → partners, Google → visits → money),
 * brand email connections, a per-brand pipeline board and auto-detected bottlenecks.
 * Sources: data/<brand>/stats.json, hq/outreach.json (D1 snapshot), hq/mail.json, hq/prospect-targets.json, hq/finance.json, hq/portfolio.json.
 */
const HQ_CRM = 'https://imn-hq.simonpatrickfarrugia.workers.dev';
// Money CTA keys per brand (CLAUDE.md "Money clicks" plus the quiz trial buttons).
const MONEY_KEYS: Record<string, string[]> = {
  trailers: ['prime', 'disc'],
  vic: ['book_stay', 'book_tour', 'book_car'],
  'simon-says-travel': ['book_stay', 'book_tour'],
  'trade-admin': ['tradify_offer_sent', 'partner_fergus', 'quiz_trial_fergus', 'quiz_trial_tradify', 'quiz_trial_servicem8', 'app_site'],
};
const NODE_ID: Record<string, string> = { 'community-help-co': 'chc' };

type Sev = 3 | 2 | 1;
export interface Bottleneck { sev: Sev; rank?: number; brand: string | null; title: string; detail: string; fix: string; who: 'Simon' | 'Claude'; link?: string; linkLabel?: string; stage: string }

export function funnelProps() {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const outreach = read<any>('hq/outreach.json', { asOf: null, brands: {} });
  const mail = read<any>('hq/mail.json', { steps: [], brands: [] });
  const targets = read<any>('hq/prospect-targets.json', { brands: {} });
  const finance = read<any>('hq/finance.json', { revenue: [] });
  const portfolio = read<any>('hq/portfolio.json', { nodes: [], todo: [] });
  const todo: any[] = portfolio.todo ?? [];
  const now = Date.now();
  const daysSince = (iso: string | null) => (iso ? Math.floor((now - Date.parse(iso)) / 86400000) : null);

  const ORDER = ['trade-admin', 'community-help-co', 'vic', 'trailers', 'paycalc', 'simon-says-travel'];
  const brands = [...TRAFFIC_SITES].sort((a, b) => ORDER.indexOf(a.id === 'chc' ? 'community-help-co' : a.id) - ORDER.indexOf(b.id === 'chc' ? 'community-help-co' : b.id)).map((cfg) => {
    const slug = cfg.id === 'chc' ? 'community-help-co' : cfg.id;
    const s = read<any>(cfg.stats, null);
    const t = s?.totals ?? { views: 0, users: 0, cta: {}, gscClicks: 0, gscImpressions: 0 };
    const cta: Record<string, number> = t.cta ?? {};
    const keys = MONEY_KEYS[slug] ?? [];
    const pages: any[] = s?.pages ?? [];
    const imp = sum(pages.map((p) => p.gscImpressions || 0));
    const position = imp ? Math.round(sum(pages.map((p) => (p.gscPosition ?? 0) * (p.gscImpressions || 0))) / imp) : null;
    const node = (portfolio.nodes ?? []).find((n: any) => n.id === (NODE_ID[slug] ?? slug)) ?? null;
    const o = outreach.brands?.[slug] ?? null;
    const m = (mail.brands ?? []).find((b: any) => b.brand === slug) ?? null;
    const stepsDone = m ? Object.values(m.steps ?? {}).filter(Boolean).length : 0;
    const stepsAll = (mail.steps ?? []).length || 4;
    const tcfg = targets.brands?.[slug] ?? null;
    return {
      slug,
      name: cfg.name,
      url: cfg.url,
      ga4ok: !!s?.sources?.ga4,
      statsAt: s?.generatedAt ?? null,
      seen: t.gscImpressions ?? 0,
      googleClicks: t.gscClicks ?? 0,
      position,
      visits: t.views ?? 0,
      actions: sum(Object.values(cta)),
      money: sum(keys.map((k) => cta[k] ?? 0)),
      tracksMoney: keys.length > 0,
      moneyNote: cfg.moneyNote ?? null,
      target: node?.target90 ?? null,
      day: node?.launched ? Math.floor((now - Date.parse(node.launched + 'T00:00:00+11:00')) / 86400000) : null,
      outreach: o,
      inOutreach: !!tcfg,
      mailReady: !!tcfg?.mailReady,
      mail: m ? { address: m.address, steps: m.steps, note: m.note, todo: m.todo ?? null, done: stepsDone, all: stepsAll, state: stepsDone === stepsAll ? 'on' : stepsDone > 0 ? 'part' : 'off' } : null,
    };
  });

  const revenue = sum((finance.revenue ?? []).map((r: any) => Number(r.amount) || 0));
  const tot = (f: (b: (typeof brands)[number]) => number) => sum(brands.map(f));
  const stage = (key: string, label: string, value: number, sub: string) => ({ key, label, value, sub });
  const outreachFunnel = [
    stage('found', 'Prospects found', tot((b) => b.outreach?.found ?? 0), 'organisations that could share a link'),
    stage('sent', 'Emails sent', tot((b) => b.outreach?.sent ?? 0), 'first emails out the door'),
    stage('replied', 'Replies', tot((b) => b.outreach?.replied ?? 0), 'conversations started'),
    stage('linked', 'Links won', tot((b) => b.outreach?.linked ?? 0), 'partners now sending visitors'),
  ];
  const trafficFunnel = [
    stage('seen', 'Seen on Google', tot((b) => b.seen), 'times a page showed in search'),
    stage('visits', 'Visits', tot((b) => b.visits), 'page views, all sites'),
    stage('actions', 'Button clicks', tot((b) => b.actions), 'tools, maps, quizzes, partner links'),
    stage('money', 'Money clicks', tot((b) => b.money), 'affiliate and trial clicks'),
    stage('revenue', 'Revenue', revenue, 'A$ paid out'),
  ];
  // Biggest leak: the step with the lowest pass-through rate where the step before has volume.
  const leakOf = (f: { value: number }[]) => {
    let at = -1, worst = Infinity;
    for (let i = 1; i < f.length; i++) {
      if (f[i - 1].value < 3) continue;
      const r = f[i].value / f[i - 1].value;
      if (r < worst) { worst = r; at = i; }
    }
    return at;
  };

  // Bottlenecks, worst first. Each one names the stage it blocks, the fix and who does it.
  const out: Bottleneck[] = [];
  const todoLink = (id: string) => todo.find((x) => x.id === id && !x.done) ?? null;
  for (const b of brands) {
    const o = b.outreach;
    if (o?.waiting > 0) {
      const age = daysSince(o.oldestWaiting);
      out.push({ sev: 3, rank: 0, brand: b.name, stage: 'Emails sent', title: `${o.waiting} ${b.name} emails drafted, not sent`, detail: `Ready in IMN HQ${age !== null ? ` for up to ${age} days` : ''}. Every one is a warm prospect going cold.`, fix: 'Open the outreach board and send the best 5 today (about 10 min).', who: 'Simon', link: HQ_CRM, linkLabel: 'Outreach board' });
    }
    if (b.inOutreach && !b.mailReady) {
      const t = b.mail?.todo ? todoLink(b.mail.todo) : null;
      const hands = b.slug === 'trade-admin';
      out.push({ sev: hands ? 3 : 1, brand: b.name, stage: 'Prospects found', title: `${b.name} email not connected`, detail: hands ? 'Outreach can’t start, so the 30-day Trade Admin push has no visitors coming in.' : 'No outreach possible yet. Fine while it’s on autopilot.', fix: `Do the mail hub setup with Claude in the Site Factory chat (${t?.mins ?? 15} min). Then Radar starts queuing ${b.name} prospects.`, who: 'Simon', link: t?.link ?? 'https://admin.microsoft.com', linkLabel: t?.linkLabel ?? 'M365 admin' });
    }
    if (b.mail && b.mail.state === 'part' && !b.mail.steps?.track && b.mailReady) {
      out.push({ sev: 1, brand: b.name, stage: 'Replies', title: `${b.name} replies aren’t tracked`, detail: 'Its mailbox isn’t on the mail hub, so replies don’t show in IMN HQ.', fix: 'Mark replies by hand on the board for now; Claude can move it onto the hub later.', who: 'Claude' });
    }
    if (b.seen >= 150 && b.googleClicks / b.seen < 0.005) {
      out.push({ sev: 2, brand: b.name, stage: 'Visits', title: `${b.name}: Google shows it, nobody clicks`, detail: `${b.seen.toLocaleString('en-AU')} search views, ${b.googleClicks} clicks${b.position ? `, average position ${b.position}` : ''}. Page 1 starts at 10.`, fix: 'Opportunity engine: sharpen the most-seen pages and deepen the one closest to page 1.', who: 'Claude' });
    }
    if (b.tracksMoney && b.ga4ok && b.visits >= 20 && b.money === 0) {
      out.push({ sev: 2, brand: b.name, stage: 'Money clicks', title: `${b.name}: ${b.visits} visits, 0 money clicks`, detail: 'Visitors arrive but nobody reaches a partner link.', fix: 'Move the partner offer higher on the most-visited pages and add a clearer next step.', who: 'Claude' });
    }
  }
  const stale = brands.filter((b) => !b.ga4ok && b.statsAt);
  if (stale.length) {
    out.push({ sev: 1, brand: null, stage: 'Visits', title: `Visits didn’t refresh for ${stale.length} site${stale.length > 1 ? 's' : ''}`, detail: `Google Analytics didn’t answer this morning for ${stale.map((b) => b.name).join(', ')}, so their visits show as – here.`, fix: 'Claude re-runs the stats job; the morning job now retries on its own.', who: 'Claude' });
  }
  const mailBrands = brands.filter((b) => b.mailReady);
  const sent7 = tot((b) => b.outreach?.sent7 ?? 0);
  const goal7 = mailBrands.length * 25;
  if (mailBrands.length && sent7 < goal7 / 2) {
    out.push({ sev: 3, brand: null, stage: 'Emails sent', title: `Only ${sent7} outreach emails sent this week`, detail: `Target is 5 a day per connected brand (${goal7} a week across ${mailBrands.length}). Outreach is the only lever that works this early: Google takes months.`, fix: 'Block 15 minutes each morning to send what Radar has queued.', who: 'Simon', link: HQ_CRM, linkLabel: 'Outreach board' });
  }
  out.sort((a, b) => b.sev - a.sev || (a.rank ?? 1) - (b.rank ?? 1));

  const lanes = [
    { key: 'on', label: 'Connected', hint: 'Can send, sign and track' },
    { key: 'part', label: 'Partly connected', hint: 'Works, with gaps' },
    { key: 'off', label: 'Not connected', hint: 'Can’t do outreach yet' },
  ];
  return {
    outreachFunnel,
    trafficFunnel,
    outreachLeak: leakOf(outreachFunnel),
    trafficLeak: leakOf(trafficFunnel.slice(0, 4)),
    sent7,
    goal7,
    bottlenecks: out,
    mailSteps: mail.steps ?? [],
    mailUpdated: mail.updated ?? null,
    lanes: lanes.map((l) => ({ ...l, brands: brands.filter((b) => b.mail?.state === l.key) })),
    brands,
    crm: HQ_CRM,
    outreachAsOf: outreach.asOf ?? null,
  };
}

/**
 * Live wallpaper (/hq/wallpaper on the trailer site): the whole of IMN on one 16:9 screen, drawn from the repo at build
 * time, so new sites, labs, workers and schedules appear by themselves. Rebuilt whenever data lands (stats every morning);
 * the page also reloads itself every 30 minutes and moves a "now" marker along the day's timeline.
 * Sources: hq/sitecheck.json + hq/sitecheck/index.json (sites + grades), data/<brand>/stats.json, hq/value.json,
 * hq/finance.json, hq/portfolio.json (goal + to-dos), data/imn/labs.json, docs/WORKERS.md + hq/runs.json (AI workers),
 * .github/workflows/*.yml crons + the pipeline Worker's slots (code jobs), hq/affiliate-programs.json (money).
 */
export function wallpaperProps() {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const cfg = read<any>('hq/sitecheck.json', { sites: [] });
  const idx = read<any>('hq/sitecheck/index.json', { sites: {} });
  const value = read<any>('hq/value.json', { sites: [], total: { low: 0, high: 0 } });
  const finance = read<any>('hq/finance.json', { revenue: [] });
  const portfolio = read<any>('hq/portfolio.json', { goal: null, todo: [] });
  const labsReg = read<any>('data/imn/labs.json', { labs: [] });
  const runs = read<any>('hq/runs.json', { workers: {} });
  const progs = read<any>('hq/affiliate-programs.json', { programs: [] });
  const MODE: Record<string, string> = { trailers: 'autopilot', paycalc: 'autopilot', vic: 'hands-on', 'community-help-co': 'hands-on', 'trade-admin': 'hands-on', imn: 'sales site', 'simon-says-travel': 'built' };

  const sites = (cfg.sites ?? []).filter((s: any) => (s.owner ?? 'imn') === 'imn').map((s: any) => {
    const st = read<any>(s.stats, null);
    const card = idx.sites?.[s.id] ?? null;
    const val = (value.sites ?? []).find((v: any) => v.id === s.id);
    return {
      id: s.id, name: s.label ?? s.name, domain: String(s.url ?? '').replace(/^https?:\/\/(www\.)?/, ''), icon: s.icon ?? '🌐',
      mode: MODE[s.brand ?? s.id] ?? 'live',
      grade: card?.grade ?? null, score: card?.score ?? null,
      visits: st?.totals?.views ?? 0, impressions: st?.totals?.gscImpressions ?? 0,
      daily: ((st?.daily ?? []) as any[]).slice(-14).map((d) => d.views ?? 0),
      value: val ? val.value : null,
    };
  });
  const clients = (cfg.sites ?? []).filter((s: any) => s.owner === 'client').length;
  const labs = (labsReg.labs ?? []).filter((l: any) => l.status === 'live' || l.status === 'graduating').map((l: any) => ({ name: l.name, slug: l.slug, launched: l.launched }));

  // AI workers: roster table in docs/WORKERS.md + last run in hq/runs.json.
  const roster: { name: string; skill: string; when: string }[] = [];
  const wf = join(process.cwd(), 'docs', 'WORKERS.md');
  if (existsSync(wf)) {
    for (const line of readFileSync(wf, 'utf8').split('\n')) {
      const m = line.match(/^\|\s*([^|]+?)\s*\|\s*`([a-z0-9-]+)`\s*\|\s*([^|]+?)\s*\|/);
      if (m) roster.push({ name: m[1], skill: m[2], when: m[3].replace(/\s*\(.*\)$/, '') });
    }
  }
  const now = Date.now();
  const workers = roster.map((w) => {
    const r = runs.workers?.[w.skill];
    const age = r?.at ? (now - Date.parse(r.at)) / 86400000 : null;
    const status = !r ? 'idle' : r.ok === false ? 'fail' : age !== null && age > 8 ? 'stale' : 'ok';
    return { ...w, status, last: r?.at ?? null, note: String(r?.note ?? '').slice(0, 90) };
  });

  // Code jobs: GitHub workflow crons (UTC → Melbourne) + the pipeline Worker's time slots (workers/pipeline/src/index.ts jobFor).
  const mel = (h: number, m: number) => {
    const d = new Date(Date.UTC(2026, 0, 15, h, m)); // a summer date: AEDT, matches the repo's schedule comments
    const [hh, mm] = d.toLocaleTimeString('en-AU', { timeZone: 'Australia/Melbourne', hour: '2-digit', minute: '2-digit', hour12: false }).split(':').map(Number);
    return (hh % 24) * 60 + mm;
  };
  const jobs: { name: string; min: number; kind: 'code' | 'ai'; often?: string }[] = [];
  const LABEL: Record<string, string> = { sitecheck: 'Site check', leads: 'Day-job leads', brief: 'Daily brief + value', health: 'Health check', enquiries: 'Enquiries', 'rates-check': 'ATO rates', 'agoda-check': 'Agoda towns', 'vic-viator': 'Viator tours', 'public-domain': 'Free films' };
  const wdir = join(process.cwd(), '.github', 'workflows');
  if (existsSync(wdir)) {
    for (const f of readdirSync(wdir).filter((x) => x.endsWith('.yml'))) {
      const id = f.replace(/\.yml$/, '');
      for (const [, cron] of readFileSync(join(wdir, f), 'utf8').matchAll(/cron:\s*'([^']+)'/g)) {
        const [mi, hr, dom, , dow] = cron.split(/\s+/);
        const often = dom !== '*' ? 'monthly' : dow !== '*' ? 'weekly' : '';
        for (const h of hr.split(',')) if (/^\d+$/.test(h) && /^\d+$/.test(mi)) jobs.push({ name: LABEL[id] ?? id, min: mel(Number(h), Number(mi)), kind: 'code', often });
      }
    }
  }
  for (const [name, h, m, often] of [['Trailer intake', 0, 0, ''], ['Trailer intake', 12, 0, ''], ['Niche finder', 18, 0, 'weekly'], ['Stats (GA4 + Google)', 19, 0, ''], ['Enrich trailers', 21, 0, '']] as [string, number, number, string][])
    jobs.push({ name, min: mel(h, m), kind: 'code', often });
  for (const w of workers) {
    const t = w.when.match(/(\d{1,2}):(\d{2})/);
    if (!t || /hourly|demand/i.test(w.when)) continue;
    jobs.push({ name: w.name, min: Number(t[1]) * 60 + Number(t[2]), kind: 'ai', often: /mon|tue|wed|thu|fri|sat|sun/i.test(w.when) && !/weekdays/i.test(w.when) ? 'weekly' : /decision/i.test(w.when) ? 'RBA days' : '' });
  }
  jobs.sort((a, b) => a.min - b.min);

  const approved = (progs.programs ?? []).filter((p: any) => p.status === 'approved');
  const partnerNames = [...new Set(approved.map((p: any) => String(p.name).replace(/ (Partner Program|Partners|Affiliate|partner programme|referral partner|Group Affiliate).*$/i, '').replace(/^Amazon Associates US.*$/, 'Amazon').replace(/ \/.*$/, '')))] as string[];
  const revenue = sum((finance.revenue ?? []).map((r: any) => Number(r.amount) || 0));
  const levels: any[] = portfolio.goal?.levels ?? [];
  const level = levels.find((l) => revenue < l.target) ?? levels[levels.length - 1] ?? null;
  const todo = (portfolio.todo ?? []).filter((t: any) => !t.done).length;

  // --- Wallpaper v2 (22 Nov 2026): first-client funnel, 90-day pace, one thing, affiliate status, health, value line, XP.
  const outreach = read<any>('hq/outreach.json', { brands: {} });
  const conf = read<any>('hq/confidence.json', { macro: { sites: [] } });
  const milestones = read<any>('hq/milestones.json', { hit: [] });
  const ob: Record<string, any> = outreach.brands ?? {};
  const imn = ob.imn ?? {};
  const pv = outreach.imnPreviews ?? null; // { made, sent, viewed, free, won } from D1 previews (morning-report refresh)
  const WEEK_GOAL = 25; // IMN: 5 emails a weekday (OUTREACH.md: 5–10 a day per brand)
  const funnel = {
    found: imn.found ?? 0, sent: imn.sent ?? 0, replied: imn.replied ?? 0,
    previews: pv ? (pv.made ?? 0) : null, viewed: pv ? (pv.viewed ?? 0) : null,
    paid: Math.max(clients, pv?.won ?? 0),
    sent7: imn.sent7 ?? 0, weekGoal: WEEK_GOAL, waiting: imn.waiting ?? 0,
    sent7All: sum(Object.values(ob).map((b: any) => b.sent7 ?? 0)),
    asOf: outreach.asOf ?? null,
  };

  // 90-day pace per site (hq/confidence.json, which applies the new-site ramp).
  const paceById: Record<string, any> = {};
  for (const m of conf.macro?.sites ?? []) if (m.target) paceById[m.id] = { age: m.age, views: m.views28, viewsTarget: m.target.views, pace: m.pace, money: m.money28 ?? 0, moneyTarget: m.target.moneyClicks, moneyPace: m.moneyPace };

  // Today's one thing: same rule as the morning report (first open item with `ready`, decide items first; else first open).
  const open = (portfolio.todo ?? []).filter((t: any) => !t.done);
  const byDecide = (xs: any[]) => [...xs.filter((t) => t.kind === 'decide'), ...xs.filter((t) => t.kind !== 'decide')];
  const pick = byDecide(open.filter((t: any) => t.ready))[0] ?? byDecide(open)[0] ?? null;
  const short = (t: string) => { const x = String(t).split(/:\s|\s\(| — /)[0].trim(); return x.length > 80 ? x.slice(0, 78) + '…' : x; };
  const oneThing = pick ? { what: short(pick.what), mins: pick.mins ?? null, ready: !!pick.ready } : null;
  // Biggest opportunity: the site Google shows most with the worst click-through (titles/descriptions to fix).
  const opp = sites.map((s: any) => {
    const st = read<any>((cfg.sites ?? []).find((c: any) => c.id === s.id)?.stats, null);
    const clicks = st?.totals?.gscClicks ?? 0;
    return { name: s.name, impressions: s.impressions, clicks, ctr: s.impressions ? clicks / s.impressions : 1 };
  }).filter((o: any) => o.impressions >= 300 && o.ctr < 0.01).sort((a: any, b: any) => b.impressions - a.impressions)[0] ?? null;

  // Money clicks by channel, last 28 days (keys from CLAUDE.md).
  const ctaOf = (b: string) => read<any>(`data/${b}/stats.json`, null)?.totals?.cta ?? {};
  const allCtaOf = (b: string) => read<any>(`data/${b}/stats.json`, null)?.allTime?.cta ?? {};
  const CH: [string, string, string[]][] = [['Amazon', 'trailers', ['prime', 'disc']], ['Stays', 'vic', ['book_stay']], ['Tours', 'vic', ['book_tour']], ['Cars', 'vic', ['book_car']], ['Tradify', 'trade-admin', ['tradify_offer_sent']], ['Fergus', 'trade-admin', ['partner_fergus', 'quiz_trial_fergus']]];
  const moneyClicks = CH.map(([name, b, keys]) => ({ name, n: sum(keys.map((k) => Number(ctaOf(b)[k]) || 0)) }));
  const moneyAllTime = sum(CH.map(([, b, keys]) => sum(keys.map((k) => Number(allCtaOf(b)[k]) || 0))));

  // Affiliates with status: approved bright, applying dim, declined struck through.
  const clean = (x: string) => String(x).replace(/ (Partner Program|Partners|Affiliate|partner programme|referral partner|Group Affiliate|Affiliate Partner).*$/i, '').replace(/^Amazon Associates US.*$/, 'Amazon').replace(/ \(.*$/, '').replace(/ \/.*$/, '');
  const ORDER: Record<string, number> = { approved: 0, applying: 1, declined: 2 };
  const pmap = new Map<string, string>();
  for (const pr of progs.programs ?? []) {
    if (!(pr.status in ORDER)) continue;
    const k = clean(pr.name); const cur = pmap.get(k);
    if (!cur || ORDER[pr.status] < ORDER[cur]) pmap.set(k, pr.status);
  }
  const affiliates = [...pmap.entries()].map(([name, status]) => ({ name, status })).sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  // Health: the daily brief's Health section (scripts/hq/brief.py) + its pipeline job ticks.
  let health = { ok: true, problems: [] as string[], jobsOk: 0, jobsBad: [] as string[] };
  const bf = join(process.cwd(), 'hq', 'brief.md');
  if (existsSync(bf)) {
    const b = readFileSync(bf, 'utf8');
    const sec = (h: string) => (b.split(`## ${h}`)[1] ?? '').split('\n## ')[0];
    const hs = sec('Health');
    const probs = hs.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2).replace(/\*\*/g, '').slice(0, 70));
    health.ok = /All checks passing/.test(hs) || (!probs.length && !/not run/.test(hs));
    health.problems = health.ok ? [] : probs.slice(0, 3);
    for (const l of sec('Pipeline jobs').split('\n')) {
      const m = l.match(/^- (\S+) `([^`]+)`/);
      if (!m) continue;
      if (m[1] === '✅') health.jobsOk++; else health.jobsBad.push(m[2]);
    }
  }

  // Value: honest pre-revenue line. The low estimate reaches the sell line at worthSelling / low multiple a month profit.
  const worth = value.worthSelling ?? 50000;
  const lowMult = value.multiple?.low ?? 25;
  const valueLine = { low: value.total?.low ?? 0, high: value.total?.high ?? 0, profitMonthly: value.total?.profitMonthly ?? 0, worth, profitNeeded: Math.round(worth / lowMult) };

  // XP: points for the things that move IMN (shown next to the money level, which only moves with real dollars).
  const done = (portfolio.todo ?? []).filter((t: any) => t.done).length;
  const xpParts = [
    { what: 'emails sent', n: sum(Object.values(ob).map((b: any) => b.sent ?? 0)), each: 10 },
    { what: 'replies', n: sum(Object.values(ob).map((b: any) => b.replied ?? 0)), each: 25 },
    { what: 'links / yeses', n: sum(Object.values(ob).map((b: any) => b.linked ?? 0)), each: 50 },
    { what: 'money clicks', n: moneyAllTime, each: 20 },
    { what: 'milestones', n: (milestones.hit ?? []).length, each: 50 },
    { what: 'to-dos done', n: done, each: 15 },
    { what: 'paying clients', n: funnel.paid, each: 500 },
  ];
  const xpTotal = sum(xpParts.map((p) => p.n * p.each));
  const RANKS: [number, string][] = [[0, 'Rookie'], [500, 'Hustler'], [1500, 'Operator'], [3000, 'Builder'], [5000, 'Dealmaker'], [8000, 'Mogul'], [12000, 'Media baron']];
  let ri = 0; for (let i = 0; i < RANKS.length; i++) if (xpTotal >= RANKS[i][0]) ri = i;
  const nextR = RANKS[ri + 1] ?? null;
  const xp = { total: xpTotal, rank: RANKS[ri][1], next: nextR ? nextR[1] : null, from: RANKS[ri][0], to: nextR ? nextR[0] : xpTotal, parts: xpParts };

  return {
    builtAt: new Date().toISOString(),
    kpis: {
      revenue, level: level ? `Level ${level.level}: ${level.name}` : '',
      visits: sum(sites.map((s: any) => s.visits)), impressions: sum(sites.map((s: any) => s.impressions)),
      value: value.total ?? { low: 0, high: 0 }, labs: labs.length, todo, sites: sites.length, clients,
      avgScore: sites.filter((s: any) => s.score !== null).length ? Math.round(sum(sites.filter((s: any) => s.score !== null).map((s: any) => s.score)) / sites.filter((s: any) => s.score !== null).length) : null,
    },
    sites: sites.map((x: any) => ({ ...x, pace: paceById[x.id] ?? null })), labs, workers, jobs, partners: partnerNames,
    funnel, oneThing, opp, moneyClicks, affiliates, health, valueLine, xp, todoOpen: open.length, todoReady: open.filter((t: any) => t.ready).length,
  };
}
