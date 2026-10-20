/**
 * IMN HQ page data, read straight from the repo at build time (works from any brand's build).
 * Sources: hq/portfolio.json, hq/finance.json, hq/niches.json, each site's stats.json and pipeline data.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = <T>(path: string, fallback: T): T => {
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
  const money: Record<string, string[]> = { trailers: ['prime', 'disc'], vic: ['website', 'call', 'book_stay', 'book_tour'] };
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
      };
    });
  const movies = read<any[]>('data/trailers/movies.json', []);
  const queue = read<any[]>('data/trailers/queue.json', []);
  const cands = read<any[]>('data/trailers/candidates.json', []);
  const towns = read<any[]>('data/vic/towns.json', []);
  const places = read<any[]>('data/vic/places.json', []);
  const content = read<any>('data/vic/content.json', { loops: [] });
  const niches = read<any[]>('hq/niches.json', []);
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
    builtAt: new Date().toISOString(),
  };
}
