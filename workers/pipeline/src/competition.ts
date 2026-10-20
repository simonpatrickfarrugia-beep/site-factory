/**
 * Competition check: who owns Google's top 10 for a niche's best keywords, and how many of those
 * slots a new site could realistically take. A slot is "beatable" when it's held by a forum / user
 * content page (Reddit, Quora, Fandom...) or by a small site (estimated organic traffic below SMALL_SITE).
 * Openness 0-100 weights the top 3 positions x3, 4-6 x2, 7-10 x1.
 */
import type { SerpResult } from './dataforseo';

export const SMALL_SITE = 30_000; // est. monthly organic visits in the market
const FORUMS = [/(^|\.)reddit\.com$/, /(^|\.)quora\.com$/, /(^|\.)fandom\.com$/, /(^|\.)pinterest\./, /(^|\.)medium\.com$/, /(^|\.)facebook\.com$/, /(^|\.)stackexchange\.com$/, /(^|\.)tiktok\.com$/];
export const isForum = (d: string) => FORUMS.some((r) => r.test(d));

export interface KeywordCompetition {
  keyword: string;
  volume: number;
  openness: number;
  beatable: { rank: number; domain: string; why: 'forum' | 'small site' }[];
  top3: string[];
}
export interface Competition {
  checkedAt: string;
  market: number;
  openness: number; // 0-100, volume-weighted across checked keywords
  keywords: KeywordCompetition[];
  giants: { domain: string; slots: number; etv: number }[];
  costUsd: number;
}

const weight = (rank: number) => (rank <= 3 ? 3 : rank <= 6 ? 2 : 1);
const MAX = 3 * 3 + 2 * 3 + 1 * 4; // 19

/** Pick up to n keywords that are likely different results pages (skip near-duplicate wordings). */
export function pickKeywords(cands: { keyword: string; volume: number }[], n: number) {
  const stop = new Set(['where', 'can', 'i', 'you', 'to', 'the', 'a', 'in', 'of', 'what', 'how', 'is', 'for', 'and', 'best', 'watch', 'order', 'series', 'books']);
  const toks = (k: string) => new Set(k.toLowerCase().split(/\s+/).filter((w) => !stop.has(w)));
  const out: { keyword: string; volume: number }[] = [];
  for (const c of [...cands].sort((a, b) => b.volume - a.volume)) {
    const t = toks(c.keyword);
    const dup = out.some((o) => {
      const u = toks(o.keyword);
      const inter = [...t].filter((w) => u.has(w)).length;
      return inter / Math.max(1, Math.min(t.size, u.size)) >= 0.99 || (t.size === 0 && u.size === 0);
    });
    if (!dup) out.push(c);
    if (out.length >= n) break;
  }
  return out;
}

export function scoreCompetition(
  serps: { keyword: string; volume: number; items: SerpResult[] }[],
  etv: Map<string, number>,
  market: number,
  now: Date,
  costUsd: number,
): Competition {
  const keywords: KeywordCompetition[] = serps.map((s) => {
    const beatable = s.items
      .map((i) => ({ rank: i.rank, domain: i.domain, why: isForum(i.domain) ? ('forum' as const) : (etv.get(i.domain) ?? 0) < SMALL_SITE ? ('small site' as const) : null }))
      .filter((b): b is KeywordCompetition['beatable'][number] => b.why !== null);
    const score = beatable.reduce((a, b) => a + weight(b.rank), 0);
    return { keyword: s.keyword, volume: s.volume, openness: Math.round((score / MAX) * 100), beatable, top3: s.items.slice(0, 3).map((i) => i.domain) };
  });
  const vol = keywords.reduce((a, k) => a + Math.max(1, k.volume), 0);
  const openness = keywords.length ? Math.round(keywords.reduce((a, k) => a + k.openness * Math.max(1, k.volume), 0) / vol) : 0;
  const slots = new Map<string, number>();
  for (const s of serps) for (const i of s.items) slots.set(i.domain, (slots.get(i.domain) ?? 0) + 1);
  const giants = [...slots.entries()]
    .map(([domain, n]) => ({ domain, slots: n, etv: etv.get(domain) ?? 0 }))
    .filter((g) => !isForum(g.domain) && g.etv >= SMALL_SITE)
    .sort((a, b) => b.slots - a.slots || b.etv - a.etv)
    .slice(0, 8);
  return { checkedAt: now.toISOString(), market, openness, keywords, giants, costUsd: Math.round(costUsd * 1000) / 1000 };
}

const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));

export function competitionReport(niches: { idea: string; competition?: Competition | null }[], now: Date): string {
  const done = niches.filter((n) => n.competition).sort((a, b) => b.competition!.openness - a.competition!.openness);
  const L = [
    '# Competition check',
    '',
    `Updated ${now.toISOString().slice(0, 10)}. Google top 10 for each niche's best keywords. A slot is **beatable** when a forum (Reddit, Quora, Fandom...) or a small site (under ${k(SMALL_SITE)} est. search visits/month) holds it. **Openness** 0-100 weights the top 3 positions most. Rough guide: 40+ open, 20-40 possible with a strong angle, under 20 owned by big brands.`,
    '',
    '| Idea | Openness | Keywords checked | Biggest players |',
    '|---|---:|---:|---|',
    ...done.map((n) => `| ${n.idea} | **${n.competition!.openness}** | ${n.competition!.keywords.length} | ${n.competition!.giants.slice(0, 4).map((g) => `${g.domain} (${k(g.etv)})`).join(', ') || '—'} |`),
    '',
  ];
  for (const n of done) {
    L.push(`## ${n.idea} (openness ${n.competition!.openness})`, '', '| Keyword | /mo | Openness | Beatable slots | Top 3 |', '|---|---:|---:|---|---|');
    for (const kw of n.competition!.keywords)
      L.push(`| ${kw.keyword} | ${kw.volume.toLocaleString()} | ${kw.openness} | ${kw.beatable.map((b) => `#${b.rank} ${b.domain}${b.why === 'forum' ? ' (forum)' : ''}`).join(', ') || '—'} | ${kw.top3.join(', ')} |`);
    L.push('');
  }
  return L.join('\n');
}
