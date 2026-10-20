/**
 * Niche finder: scores website ideas with real data so new sites are picked by numbers, not vibes.
 *
 *   hq/niches.json            ideas (added by chat): { idea, seeds[], notes }
 *   on-demand job "niches":   for each unscored idea (or all, when rescoring)
 *     1. related Google searches with volume + CPC (DataForSEO, Google Ads data, USA)
 *     2. SEO difficulty of the biggest searches (DataForSEO Labs)
 *     3. Claude judges fit for the Site Factory: a free data source, automation, monetisation, risks
 *   -> scores 0–100 and hq/reports/niches.md (ranked)
 *
 * Score = 30% demand + 25% money + 25% ease + 20% fit.
 */
import type { KeywordIdea } from './dataforseo';

export interface FitJudgement {
  fit: number; // 0–100
  verdict: string;
  angle: string; // the site to build
  dataSources: string[];
  monetisation: string[];
  pageTypes: string[];
  risks: string[];
}

export interface NicheScore {
  overall: number;
  demand: number;
  money: number;
  ease: number;
  fit: number;
  totalVolume: number; // monthly US searches across the related keywords found
  keywords: number; // related keywords with 100+ searches/mo
  medianCpc: number | null; // USD, top 50 searches by volume
  avgDifficulty: number | null; // 0–100, top 50 searches by volume
  easyWins: { keyword: string; volume: number; kd: number; cpc: number | null }[]; // big searches with low difficulty
  topKeywords: { keyword: string; volume: number; kd: number | null; cpc: number | null }[];
  judgement: FitJudgement | null;
  costUsd: number;
}

export interface Niche {
  idea: string;
  seeds: string[];
  notes?: string | null;
  /** Market to measure, e.g. { code: 2036, name: 'Australia' }. Default: the pipeline's market (USA). */
  market?: { code: number; name: string } | null;
  addedAt: string;
  status: 'new' | 'scored' | 'failed';
  scoredAt?: string | null;
  location?: string | null;
  score?: NicheScore | null;
  error?: string | null;
  money?: MoneyEstimate | null;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Pure scoring from the fetched data. */
export function scoreNiche(items: KeywordIdea[], kd: Map<string, number>, judgement: FitJudgement | null, costUsd: number): NicheScore {
  const sorted = [...items].sort((a, b) => b.volume - a.volume);
  const top = sorted.slice(0, 300);
  const totalVolume = top.reduce((s, k) => s + k.volume, 0);
  const top50 = sorted.slice(0, 50);
  const medianCpc = median(top50.map((k) => k.cpc).filter((c): c is number => c != null && c > 0));
  const kds = top50.map((k) => kd.get(k.keyword)).filter((v): v is number => v != null);
  const avgDifficulty = kds.length ? Math.round(kds.reduce((a, b) => a + b, 0) / kds.length) : null;

  // 10k searches/mo -> 0, 10M -> 100 (log scale).
  const demand = totalVolume > 0 ? clamp(((Math.log10(totalVolume) - 4) / 3) * 100) : 0;
  // $0.10 CPC -> 0, $5 -> 100 (log scale). Advertisers pay for clicks where money changes hands.
  const money = medianCpc ? clamp((Math.log10(medianCpc / 0.1) / Math.log10(50)) * 100) : 0;
  const ease = avgDifficulty == null ? 50 : clamp(100 - avgDifficulty);
  const fit = judgement ? clamp(judgement.fit) : 50;
  const overall = clamp(0.3 * demand + 0.25 * money + 0.25 * ease + 0.2 * fit);

  const easyWins = sorted
    .filter((k) => k.volume >= 500 && (kd.get(k.keyword) ?? 100) <= 30)
    .slice(0, 12)
    .map((k) => ({ keyword: k.keyword, volume: k.volume, kd: kd.get(k.keyword)!, cpc: k.cpc }));

  return {
    overall,
    demand,
    money,
    ease,
    fit,
    totalVolume,
    keywords: sorted.filter((k) => k.volume >= 100).length,
    medianCpc: medianCpc == null ? null : Math.round(medianCpc * 100) / 100,
    avgDifficulty,
    easyWins,
    topKeywords: sorted.slice(0, 15).map((k) => ({ keyword: k.keyword, volume: k.volume, kd: kd.get(k.keyword) ?? null, cpc: k.cpc })),
    judgement,
    costUsd: Math.round(costUsd * 1000) / 1000,
  };
}

export function nicheReport(niches: Niche[], now: Date, location: string): string {
  const scored = niches.filter((n) => n.status === 'scored' && n.score).sort((a, b) => b.score!.overall - a.score!.overall);
  const money = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`);
  const L: string[] = [
    '# Niche finder',
    '',
    `Updated ${now.toISOString().slice(0, 10)}. Google searches in the ${location} unless an idea says otherwise (Market column). Score = 30% demand + 25% money (CPC) + 25% ease (SEO difficulty) + 20% fit (Claude: data source, automation, monetisation, risk).`,
    '',
    'Add ideas by chat: "score these niches: …". Rules: launch at most one new site a month, only while the last one is on track.',
    '',
    '## Ranking',
    '',
    '| # | Idea | Market | Score | Demand | Money | Ease | Fit | Searches/mo | Median CPC | Avg difficulty |',
    '|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];
  scored.forEach((n, i) => {
    const s = n.score!;
    L.push(`| ${i + 1} | ${n.idea} | ${n.location ?? location} | **${s.overall}** | ${s.demand} | ${s.money} | ${s.ease} | ${s.fit} | ${s.totalVolume.toLocaleString()} | ${money(s.medianCpc)} | ${s.avgDifficulty ?? '—'} |`);
  });
  const waiting = niches.filter((n) => n.status !== 'scored');
  if (waiting.length) L.push('', `Not scored yet: ${waiting.map((n) => `${n.idea}${n.error ? ` (failed: ${n.error})` : ''}`).join('; ')}.`);

  for (const n of scored) {
    const s = n.score!;
    const j = s.judgement;
    L.push('', `## ${n.idea}: ${s.overall}/100`, '');
    if (j) {
      L.push(`**Verdict:** ${j.verdict}`, '', `**Site angle:** ${j.angle}`, '');
      if (j.dataSources.length) L.push(`**Data sources:** ${j.dataSources.join('; ')}`, '');
      if (j.monetisation.length) L.push(`**Money:** ${j.monetisation.join('; ')}`, '');
      if (j.pageTypes.length) L.push(`**Page types:** ${j.pageTypes.join('; ')}`, '');
      if (j.risks.length) L.push(`**Risks:** ${j.risks.join('; ')}`, '');
    }
    if (s.easyWins.length) {
      L.push('**Easy wins** (500+ searches, difficulty ≤ 30):', '', '| Search | /mo | Difficulty | CPC |', '|---|---:|---:|---:|');
      for (const k of s.easyWins) L.push(`| ${k.keyword} | ${k.volume.toLocaleString()} | ${k.kd} | ${money(k.cpc)} |`);
      L.push('');
    }
    L.push('**Biggest searches:**', '', '| Search | /mo | Difficulty | CPC |', '|---|---:|---:|---:|');
    for (const k of s.topKeywords) L.push(`| ${k.keyword} | ${k.volume.toLocaleString()} | ${k.kd ?? '—'} | ${money(k.cpc)} |`);
    L.push('', `_Seeds: ${n.seeds.join(', ')}. Data cost: US$${s.costUsd}._`);
  }
  L.push('');
  return L.join('\n');
}

// ---------------------------------------------------------------- affiliate money overlay

export interface AffiliateProgram {
  id: string;
  name: string;
  network: string;
  categories: string[];
  markets: string[];
  commission: string;
  estPerSaleUsd: number | null;
  cookie: string;
  approval: 'easy' | 'moderate' | 'hard';
  requirements: string;
  status: string;
  source: string | null;
  verified: string | null;
  note?: string;
}

export interface AffiliateCatalog {
  updated: string;
  categories: Record<string, string>;
  programs: AffiliateProgram[];
  adNetworks: { name: string; minMonthly: string; notes: string }[];
  model: { captureShare: number[]; clickRate: number[]; conversion: number[]; adRpmUsd: number[] };
}

export interface MoneyEstimate {
  categories: string[];
  visits: [number, number, number]; // monthly visits at maturity: low / mid / high
  revenueUsd: [number, number, number]; // monthly revenue at maturity: low / mid / high
  bestPerSaleUsd: number;
  programs: { id: string; name: string; commission: string; approval: string; requirements: string; status: string; verified: boolean }[];
}

/** Programmes that fit the niche's categories and market, best payout first. */
export function matchPrograms(cat: AffiliateCatalog, categories: string[], market: string): AffiliateProgram[] {
  const m = /australia/i.test(market) ? 'AU' : /united states|usa/i.test(market) ? 'US' : market;
  return cat.programs
    .filter((p) => p.categories.some((c) => categories.includes(c)))
    .filter((p) => p.markets.includes(m) || p.markets.includes('Global'))
    .sort((a, b) => (b.estPerSaleUsd ?? 0) - (a.estPerSaleUsd ?? 0));
}

/** What our own sites have measured so far (last 28 days of GA4 + reported affiliate sales). */
export interface Measured { views: number; clicks: number; sales: number; sites: string[] }
export interface Calibration { clickRate: number[]; conversion: number[]; note: string }

/**
 * Blend the assumed rates with our measured ones (Bayesian shrinkage): the assumption counts as
 * 2,000 page views (click rate) and 200 clicks (conversion) of evidence, so a little data nudges the
 * model and a lot of data takes it over. Low/mid/high keep their spread around the new mid.
 */
export function calibrate(model: AffiliateCatalog['model'], m: Measured | null): Calibration {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  if (!m || m.views <= 0) return { clickRate: model.clickRate, conversion: model.conversion, note: 'No measured data yet: using assumed rates.' };
  const K_VIEWS = 2000, K_CLICKS = 200;
  const cr = (m.clicks + model.clickRate[1] * K_VIEWS) / (m.views + K_VIEWS);
  const cv = m.clicks > 0 || m.sales > 0 ? (m.sales + model.conversion[1] * K_CLICKS) / (m.clicks + K_CLICKS) : model.conversion[1];
  const scale = (arr: number[], mid: number) => arr.map((x) => (x * mid) / arr[1]);
  return {
    clickRate: scale(model.clickRate, cr),
    conversion: scale(model.conversion, cv),
    note: `Calibrated from ${m.views.toLocaleString('en-US')} page views, ${m.clicks} affiliate clicks and ${m.sales} reported sales (${m.sites.join(', ')}): click rate ${pct(cr)} (assumed ${pct(model.clickRate[1])}), conversion ${pct(cv)} (assumed ${pct(model.conversion[1])}). The assumption weighs as much as 2,000 views / 200 clicks, so real data takes over as it grows.`,
  };
}

export function estimateMoney(cat: AffiliateCatalog, totalVolume: number, categories: string[], market: string, medianCpc: number | null = null, cal: Calibration | null = null): MoneyEstimate {
  const progs = matchPrograms(cat, categories, market);
  // A page earns from its best few programmes, not just the single best: average the top 3 payouts.
  const payouts = progs.map((p) => p.estPerSaleUsd ?? 0).filter((x) => x > 0).slice(0, 3);
  const perSale = payouts.length ? payouts.reduce((a, b) => a + b, 0) / payouts.length : 0;
  const m = cat.model;
  const visits = [0, 1, 2].map((i) => Math.round(totalVolume * m.captureShare[i])) as [number, number, number];
  // Display ads earn more where advertisers pay more per click: scale the base RPM by the niche's CPC (0.5x to 3x).
  const rpmScale = Math.max(0.5, Math.min(3, (medianCpc ?? 1) / 1));
  const revenueUsd = [0, 1, 2].map((i) => Math.round(visits[i] * (cal ?? m).clickRate[i] * (cal ?? m).conversion[i] * perSale + (visits[i] / 1000) * m.adRpmUsd[i] * rpmScale)) as [number, number, number];
  return {
    categories,
    visits,
    revenueUsd,
    bestPerSaleUsd: Math.round(perSale * 100) / 100,
    programs: progs.slice(0, 8).map((p) => ({ id: p.id, name: p.name, commission: p.commission, approval: p.approval, requirements: p.requirements, status: p.status, verified: !!p.verified })),
  };
}

const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

/** Extra report sections: money ranking + programmes to consider per idea + programme catalogue. */
export function moneyReport(niches: (Niche & { money?: MoneyEstimate | null })[], cat: AffiliateCatalog, cal: Calibration | null = null): string {
  const withMoney = niches.filter((n) => n.status === 'scored' && n.money).sort((a, b) => b.money!.revenueUsd[1] - a.money!.revenueUsd[1]);
  const L: string[] = [
    '',
    '## Money map: estimated revenue at maturity',
    '',
    `Per month, once a site ranks (usually 6–18 months). Low / mid / high: visits × affiliate clicks × conversion × payout (average of the top 3 matching programmes), plus display ads. These numbers rank ideas against each other; they are not forecasts. They get replaced by our own measured rates as our sites earn.`,
    '',
    `**Model:** ${cal?.note ?? 'assumed rates.'}`,
    '',
    '| Idea | Market | Visits/mo (mid) | Est. revenue/mo (low · mid · high) | Avg payout per sale | Score |',
    '|---|---|---:|---|---:|---:|',
    ...withMoney.map((n) => {
      const m = n.money!;
      return `| ${n.idea} | ${n.location ?? ''} | ${m.visits[1].toLocaleString('en-US')} | ${usd(m.revenueUsd[0])} · **${usd(m.revenueUsd[1])}** · ${usd(m.revenueUsd[2])} | ${usd(m.bestPerSaleUsd)} | ${n.score?.overall ?? '—'} |`;
    }),
    '',
    '## Programmes to consider, by idea',
    '',
  ];
  for (const n of withMoney) {
    L.push(`### ${n.idea}`, '', '| Programme | Pays | Approval | To qualify | Status |', '|---|---|---|---|---|');
    for (const p of n.money!.programs) L.push(`| ${p.name}${p.verified ? '' : ' *(check)*'} | ${p.commission} | ${p.approval} | ${p.requirements} | ${p.status} |`);
    if (!n.money!.programs.length) L.push('| _No programme in the catalogue yet: research needed_ | | | | |');
    L.push('');
  }
  L.push('## Ad networks (when traffic qualifies)', '', '| Network | Minimum traffic | Notes |', '|---|---|---|', ...cat.adNetworks.map((a) => `| ${a.name} | ${a.minMonthly} | ${a.notes} |`), '');
  L.push(`_Catalogue: hq/affiliate-programs.json (${cat.programs.length} programmes, updated ${cat.updated}). "(check)" = terms not yet verified from a current source._`, '');
  return L.join('\n');
}
