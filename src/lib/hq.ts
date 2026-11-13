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
