/**
 * Weekly niche discovery (bulk "high demand, low competition" screen).
 *
 *   1. Claude proposes ~15 new niche ideas that fit the factory (templated pages from free data), skipping everything tried.
 *   2. Each idea is screened in ONE cheap DataForSEO Labs call: related searches with 100+ searches a month
 *      AND SEO difficulty ≤ 25. How many pass (breadth) and how much volume they carry is the opportunity.
 *   3. The best 3 that clear the bar go into hq/niches.json as new ideas, where the full niche scoring
 *      (next day) and the competition check (the day after) take over.
 *
 *   hq/discover.json            every idea ever screened, with its numbers (so nothing is screened twice)
 *   hq/reports/discover.md      this week's screen + the all-time leaderboard
 *
 * Cost: ~US$0.02 per idea screened + one Claude call, ~US$0.35 a week at 15 ideas.
 */
import type { EasyKeywords } from './dataforseo';

export const MARKETS = { US: { code: 2840, name: 'United States' }, AU: { code: 2036, name: 'Australia' } } as const;
/** The bar to be promoted to full scoring: enough easy searches to build a site on. */
export const PROMOTE = { minBreadth: 25, minEasyVolume: { US: 30000, AU: 8000 }, perWeek: 3 };

export interface Discovered {
  week: string; // ISO date of the run
  idea: string;
  market: 'US' | 'AU';
  seeds: string[];
  /** topic words every counted search must contain */
  terms?: string[];
  why: string;
  /** related searches with 100+/mo and difficulty ≤ 25 */
  breadth: number;
  /** monthly searches across the biggest 100 of them */
  easyVolume: number;
  medianCpc: number | null;
  /** easyVolume weighted by money (CPC): the ranking number */
  opportunity: number;
  top: { keyword: string; volume: number; kd: number }[];
  promoted: boolean;
  error?: string;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function measure(e: EasyKeywords): Pick<Discovered, 'breadth' | 'easyVolume' | 'medianCpc' | 'opportunity' | 'top'> {
  const easyVolume = e.items.reduce((a, k) => a + k.volume, 0);
  const cpc = median(e.items.map((k) => k.cpc).filter((c): c is number => c != null && c > 0));
  // Money factor: $0 CPC counts half, $2.50+ counts 3x. Breadth matters too: a site needs many pages.
  const money = Math.min(3, Math.max(0.5, 0.5 + (cpc ?? 0)));
  const breadthFactor = Math.min(1, e.total / 100);
  return {
    breadth: e.total,
    easyVolume,
    medianCpc: cpc == null ? null : Math.round(cpc * 100) / 100,
    opportunity: Math.round(easyVolume * money * (0.5 + breadthFactor / 2)),
    top: e.items.slice(0, 8).map((k) => ({ keyword: k.keyword, volume: k.volume, kd: k.kd })),
  };
}

export const qualifies = (d: Discovered) =>
  !d.error && d.breadth >= PROMOTE.minBreadth && d.easyVolume >= PROMOTE.minEasyVolume[d.market];

const n = (x: number) => x.toLocaleString('en-US');

export function discoverReport(all: Discovered[], week: string, costUsd: number): string {
  const thisWeek = all.filter((d) => d.week === week).sort((a, b) => b.opportunity - a.opportunity);
  const board = all.filter((d) => !d.error).sort((a, b) => b.opportunity - a.opportunity).slice(0, 15);
  const row = (d: Discovered, i: number) =>
    `| ${i + 1} | ${d.promoted ? '⭐ ' : ''}${d.idea} | ${d.market} | **${n(d.opportunity)}** | ${n(d.breadth)} | ${n(d.easyVolume)} | ${d.medianCpc == null ? '—' : '$' + d.medianCpc.toFixed(2)} | ${d.error ? 'failed' : d.top.slice(0, 3).map((k) => `${k.keyword} (${n(k.volume)}, kd ${k.kd})`).join('; ')} |`;
  const head = '| # | Idea | Market | Opportunity | Easy searches | Easy volume/mo | Median CPC | Biggest easy searches |\n|---:|---|---|---:|---:|---:|---:|---|';
  return [
    '# Niche discovery (weekly)',
    '',
    `Updated ${week}. Every Sunday Claude proposes new site ideas and each is screened for **lots of searches with little competition**: related Google searches that contain the topic's own words, with 100+ a month **and** SEO difficulty 25 or less. ${thisWeek.length} ideas screened this week for about US$${costUsd.toFixed(2)}.`,
    '',
    `- **Easy searches**: how many related searches pass that bar (a site needs many pages, so breadth matters).`,
    `- **Opportunity**: easy volume, weighted by money (CPC) and breadth. Use it to rank, not as a forecast.`,
    `- ⭐ = cleared the bar (${PROMOTE.minBreadth}+ easy searches and ${n(PROMOTE.minEasyVolume.US)}+/mo in the US or ${n(PROMOTE.minEasyVolume.AU)}+/mo in Australia) and went into the full niche scoring (\`hq/reports/niches.md\`) and the competition check.`,
    '',
    '## This week',
    '',
    head,
    ...thisWeek.map(row),
    '',
    '## All-time leaderboard',
    '',
    head,
    ...board.map(row),
    '',
    'Ask Claude to "screen these niches" to add your own ideas, or "find more niches" to run discovery now.',
    '',
  ].join('\n');
}
