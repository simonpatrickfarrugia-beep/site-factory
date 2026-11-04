/**
 * Simon Says Travel data shapes and the maths behind every sentence on the site.
 * Numbers come from data/simon-says-travel/trends.json (written monthly by the pipeline `travel` job).
 * Nothing here is typed in by hand: change the data, the words follow.
 */
export interface Term {
  q: string;
  label: string;
  slug: string;
  kind: 'overseas' | 'domestic' | 'style';
  series: number[];
  now: number;
  prev: number;
  lastYear: number;
  yoy: number | null;
  mom: number | null;
  peakWeek: string;
  lowSignal: boolean;
}
export interface Trends {
  updated: string;
  location: string;
  anchor: string;
  weeks: string[];
  terms: Term[];
  note: string;
}
export interface ArchiveTerm { slug: string; label: string; kind: Term['kind']; idx: number; yoy: number | null; mom: number | null; lowSignal: boolean }
export interface ArchiveMonth { month: string; updated: string; terms: ArchiveTerm[] }

export interface Content {
  home: { seoTitle: string; description: string; kicker: string; h1: string; lede: string };
  signup: { heading: string; text: string; button: string };
  /** Optional hand-written note per month ("2026-11"), shown above the numbers. */
  notes: Record<string, string>;
  affiliates: {
    stay: { label: string; partner: string; template: string; target: string };
    tours: { label: string; partner: string; template: string; alt: { label: string; partner: string; template: string } };
  };
  pages: Record<string, { seoTitle: string; description: string; h1: string; paragraphs: string[] }>;
}

/** Index where Bali's last 4 weeks = 100: "Japan 54" reads as "about half as much interest as Bali". */
export const indexer = (terms: Term[], anchorSlug = 'bali') => {
  const base = terms.find((t) => t.slug === anchorSlug)?.now || 1;
  return (t: { now: number }) => Math.round((t.now / base) * 100);
};

export const pct = (x: number | null) => (x == null ? '–' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(Math.round(x * 100))}%`);
export const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const shortDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Places only (no travel styles), with enough searches to call. */
export const places = (terms: Term[]) => terms.filter((t) => t.kind !== 'style' && !t.lowSignal);

/** Average interest per calendar month across the 12 months, e.g. { '2026-02': 14.2, … }. */
export function byMonth(t: Term, weeks: string[]) {
  const m = new Map<string, number[]>();
  weeks.forEach((w, i) => { const k = w.slice(0, 7); m.set(k, [...(m.get(k) ?? []), t.series[i] ?? 0]); });
  return [...m.entries()].map(([month, v]) => ({ month, avg: v.reduce((s, x) => s + x, 0) / v.length }));
}

export interface Headline { kind: 'top' | 'riser' | 'faller' | 'momentum' | 'peak'; text: string; slug?: string }

/** The month's story in plain sentences, worked out from the numbers. */
export function headlines(d: Trends): Headline[] {
  const idx = indexer(d.terms);
  const ok = places(d.terms);
  const overseas = ok.filter((t) => t.kind === 'overseas');
  const out: Headline[] = [];
  const top = overseas[0];
  if (top) out.push({ kind: 'top', slug: top.slug, text: `${top.label} is still the overseas trip Australians search for most, ${top.yoy != null && Math.abs(top.yoy) >= 0.05 ? `${top.yoy > 0 ? 'up' : 'down'} ${pct(Math.abs(top.yoy)).replace('+', '')} on this time last year` : 'about level with this time last year'}.` });
  const yoy = ok.filter((t) => t.yoy != null && t.slug !== top?.slug && idx(t) >= 15);
  const riser = [...yoy].sort((a, b) => b.yoy! - a.yoy!)[0];
  if (riser && riser.yoy! >= 0.05) out.push({ kind: 'riser', slug: riser.slug, text: `${riser.label} is the biggest climber: ${pct(riser.yoy)} on this time last year.` });
  const faller = [...yoy].sort((a, b) => a.yoy! - b.yoy!)[0];
  if (faller && faller.yoy! <= -0.05) out.push({ kind: 'faller', slug: faller.slug, text: `${faller.label} has cooled the most: ${pct(faller.yoy)} on this time last year.` });
  const mom = ok.filter((t) => t.mom != null && idx(t) >= 15 && t.slug !== riser?.slug).sort((a, b) => b.mom! - a.mom!)[0];
  if (mom && mom.mom! >= 0.08) out.push({ kind: 'momentum', slug: mom.slug, text: `Picking up right now: ${mom.label}, ${pct(mom.mom)} on the previous four weeks.` });
  const peaks = new Map<string, number>();
  for (const t of ok) peaks.set(t.peakWeek, (peaks.get(t.peakWeek) ?? 0) + 1);
  const [busiest, n] = [...peaks.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  if (busiest && n >= 3) out.push({ kind: 'peak', text: `The busiest week of the year for flight searches was the week of ${dayLabel(busiest)}: ${n} of ${ok.length} destinations peaked then.` });
  return out;
}

/** "Bali, Vietnam" style list. */
export const listOf = (a: string[]) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
