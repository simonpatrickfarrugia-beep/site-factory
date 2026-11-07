/**
 * Backyard Wild data shapes. Everything is a snapshot in data/backyard-wild/:
 *   visits.json  - one row per visit the camera caught (written by the clip script once the camera is up)
 *   species.json - the watch list: birds we expect, with a one-line field note
 *   build.json   - the garden's upgrade log
 *   content.json - page copy and the stream status
 */
export type Doing = 'drinking' | 'bathing' | 'perching' | 'visiting';

export interface Visit {
  id: string;
  /** ISO timestamp with offset, e.g. 2026-11-20T07:42:00+11:00 */
  at: string;
  species: string;
  count: number;
  doing: Doing;
  /** Optional: a clip and a still, once storage is set up. */
  clip?: string;
  thumb?: string;
}

export interface Species { slug: string; name: string; note: string }

export interface BuildStep { date: string | null; title: string; done: boolean; body: string[] }

export interface Content {
  home: { seoTitle: string; description: string; h1: string; lede: string };
  stream: { status: 'soon' | 'replay' | 'live'; youtubeId: string | null; channelId?: string; soon: string; replay: string; live: string };
  watchList: { h2: string; intro: string };
  pages: Record<string, { seoTitle: string; description: string; h1: string; paragraphs: string[] }>;
}

const TZ = 'Australia/Melbourne';
export const dayKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
export const dayLabel = (iso: string) => new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
export const timeLabel = (iso: string) => new Intl.DateTimeFormat('en-AU', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso)).replace(/\s/g, '').toLowerCase();
export const dateLabel = (d: string) => new Intl.DateTimeFormat('en-AU', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${d}T12:00:00+11:00`));

export const doingLabel: Record<Doing, string> = { drinking: 'drinking', bathing: 'bathing', perching: 'perched on the edge', visiting: 'dropped in' };

/** Newest first. */
export const sortVisits = (v: Visit[]) => [...v].sort((a, b) => b.at.localeCompare(a.at));

/** Visits per species, most-seen first. */
export function tally(visits: Visit[]): Map<string, { visits: number; birds: number; last: string }> {
  const m = new Map<string, { visits: number; birds: number; last: string }>();
  for (const v of visits) {
    const t = m.get(v.species) ?? { visits: 0, birds: 0, last: v.at };
    t.visits += 1;
    t.birds += v.count;
    if (v.at > t.last) t.last = v.at;
    m.set(v.species, t);
  }
  return m;
}

/** Group visits by Melbourne day, newest day first. */
export function byDay(visits: Visit[]): { day: string; label: string; visits: Visit[] }[] {
  const out: { day: string; label: string; visits: Visit[] }[] = [];
  for (const v of sortVisits(visits)) {
    const day = dayKey(v.at);
    const last = out[out.length - 1];
    if (last && last.day === day) last.visits.push(v);
    else out.push({ day, label: dayLabel(v.at), visits: [v] });
  }
  return out;
}
