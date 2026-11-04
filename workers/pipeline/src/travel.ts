/**
 * Simon Says Travel: monthly "what Australians are searching for" data (simonsaystravel.com.au).
 *
 * Google Trends compares at most 5 searches at once, each call scaled so its own top point = 100.
 * Every call includes the same anchor search ("flights to bali"), so each batch can be rescaled
 * onto the first batch's scale. The result is one comparable index for every search
 * (highest weekly point across all of them = 100). Relative interest only, never search counts.
 */
import { trendsExplore } from './dataforseo';

export interface TravelTerm {
  q: string; // the Google search, e.g. "flights to japan"
  label: string; // shown on the site, e.g. "Japan"
  slug: string;
  kind: 'overseas' | 'domestic' | 'style';
}
export interface TravelTerms {
  anchor: string;
  location: number; // Google location code, 2036 = Australia
  terms: TravelTerm[];
}
export interface TravelTermOut extends TravelTerm {
  series: number[]; // weekly index, aligned with `weeks`
  now: number; // average of the last 4 complete weeks
  prev: number; // the 4 weeks before that
  lastYear: number; // the same 4 weeks a year earlier (start of the 12-month window)
  yoy: number | null; // now vs lastYear, e.g. 0.25 = +25%
  mom: number | null; // now vs prev
  peakWeek: string; // week with the highest interest
  lowSignal: boolean; // too few searches for Google to report reliably
}
export interface TravelData {
  updated: string;
  location: string;
  anchor: string;
  weeks: string[];
  terms: TravelTermOut[];
  costUsd: number;
  note: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const change = (a: number, b: number) => (b >= 1 ? round1(((a - b) / b) * 100) / 100 : null);

export async function buildTravelData(login: string, password: string, cfg: TravelTerms, now: Date): Promise<{ data: TravelData; log: string[] }> {
  const log: string[] = [];
  const terms = cfg.terms.filter((t) => t.q.toLowerCase() !== cfg.anchor.toLowerCase());
  const anchorTerm = cfg.terms.find((t) => t.q.toLowerCase() === cfg.anchor.toLowerCase());
  const batches: TravelTerm[][] = [];
  for (let i = 0; i < terms.length; i += 4) batches.push(terms.slice(i, i + 4));
  if (batches.length > 12) throw new Error(`Too many searches (${terms.length}); max 48 per run`);

  let weeks: string[] = [];
  let ref: number[] = [];
  let cost = 0;
  const raw = new Map<string, number[]>();
  for (const [bi, batch] of batches.entries()) {
    const r = await trendsExplore(login, password, [cfg.anchor, ...batch.map((t) => t.q)], cfg.location);
    cost += r.cost;
    const dates = r.points.map((p) => p.from);
    const col = (i: number) => r.points.map((p) => p.values[i] ?? 0);
    if (bi === 0) {
      weeks = dates;
      ref = col(0);
      raw.set(cfg.anchor, ref);
    }
    // Align on dates (they match when the calls run together) and rescale onto batch 0's anchor.
    const idx = weeks.map((d) => dates.indexOf(d));
    const anc = idx.map((j) => (j >= 0 ? col(0)[j] : 0));
    const k = avg(anc) > 0 ? avg(ref) / avg(anc) : 1;
    batch.forEach((t, i) => raw.set(t.q, idx.map((j) => (j >= 0 ? col(i + 1)[j] * k : 0))));
  }

  // Drop the current, still-filling week.
  if (weeks.length && Date.parse(weeks[weeks.length - 1]) + 7 * 86400000 > now.getTime()) {
    weeks = weeks.slice(0, -1);
    for (const [q, s] of raw) raw.set(q, s.slice(0, weeks.length));
  }
  const top = Math.max(1, ...[...raw.values()].flat());

  const out: TravelTermOut[] = [];
  for (const t of [...(anchorTerm ? [anchorTerm] : []), ...terms]) {
    const s = (raw.get(t.q) ?? []).map((v) => round1((v / top) * 100));
    const n = s.length;
    const nowV = round1(avg(s.slice(n - 4)));
    const prev = round1(avg(s.slice(n - 8, n - 4)));
    const lastYear = round1(avg(s.slice(0, 4)));
    const peak = s.reduce((bi, v, i) => (v > s[bi] ? i : bi), 0);
    out.push({
      ...t,
      series: s,
      now: nowV,
      prev,
      lastYear,
      yoy: change(nowV, lastYear),
      mom: change(nowV, prev),
      peakWeek: weeks[peak] ?? '',
      lowSignal: avg(s) < 2 || s.filter((v) => v === 0).length > n / 4,
    });
  }
  out.sort((a, b) => b.now - a.now);
  log.push(`${out.length} searches, ${batches.length} calls, US$${round1(cost * 100) / 100}. Top now: ${out.slice(0, 5).map((t) => `${t.label} ${t.now}`).join(', ')}.`);
  return {
    data: {
      updated: now.toISOString().slice(0, 10),
      location: 'Australia',
      anchor: cfg.anchor,
      weeks,
      terms: out,
      costUsd: Math.round(cost * 1000) / 1000,
      note: 'Google Trends, Australia, weekly, past 12 months. Relative interest (highest week across all searches = 100), not search counts.',
    },
    log,
  };
}
