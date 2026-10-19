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
  addedAt: string;
  status: 'new' | 'scored' | 'failed';
  scoredAt?: string | null;
  location?: string | null;
  score?: NicheScore | null;
  error?: string | null;
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
    `Updated ${now.toISOString().slice(0, 10)}. Google searches in the ${location}. Score = 30% demand + 25% money (CPC) + 25% ease (SEO difficulty) + 20% fit (Claude: data source, automation, monetisation, risk).`,
    '',
    'Add ideas by chat: "score these niches: …". Rules: launch at most one new site a month, only while the last one is on track.',
    '',
    '## Ranking',
    '',
    '| # | Idea | Score | Demand | Money | Ease | Fit | Searches/mo | Median CPC | Avg difficulty |',
    '|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];
  scored.forEach((n, i) => {
    const s = n.score!;
    L.push(`| ${i + 1} | ${n.idea} | **${s.overall}** | ${s.demand} | ${s.money} | ${s.ease} | ${s.fit} | ${s.totalVolume.toLocaleString()} | ${money(s.medianCpc)} | ${s.avgDifficulty ?? '—'} |`);
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
