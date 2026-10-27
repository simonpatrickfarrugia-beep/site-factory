/**
 * Bundle engine (any brand). Items with attributes → a recipe (slots with filters, scores and "near"
 * rules) → a bundle: the picks for each slot, alternates, and a day-by-day plan.
 *
 * Pure TypeScript with no Astro imports, so the pipeline Worker can reuse it later (e.g. social posts).
 * Brand recipes live with the brand (brands/vic/bundles.ts). Recipes are chosen by search demand, not
 * published blindly: a bundle must answer something people actually search for.
 */

export interface Item {
  id: string;
  name: string;
  /** Pool-specific kind, e.g. hotel, restaurant, playground. */
  kind: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  /** Baseline quality from the data (how complete/notable the listing is). Higher is better. */
  base: number;
}

export interface Slot<C> {
  key: string;
  label: string;
  /** Which pool to draw from (the brand decides what pools exist). */
  pool: string | string[];
  count?: number;
  /** Must the slot be filled for the bundle to exist? */
  required?: boolean;
  filter?: (i: Item, ctx: C) => boolean;
  /** Extra score on top of the item's base quality (recipe fit). */
  score?: (i: Item, ctx: C) => number;
  /** Keep picks within maxKm of an earlier slot's first pick (or of a fixed anchor from the context). */
  near?: { slot?: string; anchor?: (ctx: C) => { lat: number; lon: number } | null; maxKm: number; weight?: number };
  /** How many runner-up options to keep for "swap it" lists. */
  alternates?: number;
  /**
   * When the plan visits this slot, in minutes after midnight ([from, to]). Places whose opening hours are known and never
   * cover that window on any day are skipped. Places with unknown hours stay in. If the rule would empty the slot, it's ignored.
   */
  window?: [number, number];
}

export interface Recipe<C> {
  id: string;
  audience: string;
  slots: Slot<C>[];
}

export interface Pick {
  item: Item;
  /** Distance (km) to the slot's "near" reference, when it has one. */
  km: number | null;
}

export interface BundleResult {
  recipe: string;
  audience: string;
  picks: Record<string, Pick[]>;
  alternates: Record<string, Pick[]>;
  /** Overall fit: sum of chosen picks' scores. Used to rank towns for an audience. */
  fit: number;
  missing: string[];
}

const R = 6371;
export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Walking minutes for a straight-line distance (streets add ~30%; 4.8 km/h). */
export const walkMins = (d: number) => Math.max(1, Math.round(((d * 1.3) / 4.8) * 60));

// ---------------------------------------------------------------- opening hours (OpenStreetMap "opening_hours")
const DAY = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
export type WeekHours = [number, number][][]; // per day (Mo..Su): open ranges in minutes after midnight

/** Parses the common OSM forms ("Mo-Fr 08:00-17:00; Sa 09:00-12:00", "Tu-Su 10:00-16:00; Mo off", "24/7", "11:00-17:00"). Null when unsure. */
export function parseHours(oh: string | undefined): WeekHours | null {
  if (!oh) return null;
  const s = oh.trim();
  if (s === '24/7') return DAY.map(() => [[0, 1440]]);
  const week: WeekHours = DAY.map(() => []);
  const set = DAY.map(() => false);
  for (const raw of s.split(';')) {
    const rule = raw.trim();
    if (!rule) continue;
    const m = rule.match(/^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)(?:\s*-\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))?\s*,?\s*)+)?(.*)$/);
    if (!m) return null;
    const daySpec = (m[1] ?? '').trim();
    const rest = m[2].trim();
    let days: number[] = [];
    if (!daySpec) days = DAY.map((_, i) => i);
    else {
      for (const part of daySpec.split(',').map((x) => x.trim()).filter(Boolean)) {
        if (part === 'PH') continue;
        const [a, b] = part.split('-').map((x) => DAY.indexOf(x.trim()));
        if (a < 0 || (b !== undefined && b < 0)) return null;
        if (b === undefined) days.push(a);
        else for (let d = a; ; d = (d + 1) % 7) { days.push(d); if (d === b) break; }
      }
      if (!days.length) continue; // public-holiday-only rule
    }
    if (/^(off|closed)$/i.test(rest)) { for (const d of days) { week[d] = []; set[d] = true; } continue; }
    const ranges = [...rest.matchAll(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g)].map((r) => {
      const a = +r[1] * 60 + +r[2];
      let b = +r[3] * 60 + +r[4];
      if (b <= a) b += 1440;
      return [a, b] as [number, number];
    });
    if (!ranges.length || rest.replace(/[\d:\s,+-]/g, '') !== '') return null; // anything fancier: don't guess
    for (const d of days) { week[d] = ranges; set[d] = true; }
  }
  return set.some(Boolean) ? week : null;
}

/** Days (0 = Monday) the place is open across [from, to]. Null when hours are unknown. */
export function openDays(item: Item, from: number, to: number): number[] | null {
  const w = parseHours(item.tags.opening_hours);
  if (!w) return null;
  return w.map((r, d) => (r.some(([a, b]) => a <= from && b >= to) ? d : -1)).filter((d) => d >= 0);
}

const DAY_NAME = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** "Fri–Sun", "Wed–Sun", "Mon, Wed–Fri". */
export function dayList(days: number[]): string {
  const ds = [...new Set(days)].sort((a, b) => a - b);
  const runs: string[] = [];
  for (let i = 0; i < ds.length; ) {
    let j = i;
    while (j + 1 < ds.length && ds[j + 1] === ds[j] + 1) j++;
    runs.push(j - i >= 2 ? `${DAY_NAME[ds[i]]}–${DAY_NAME[ds[j]]}` : ds.slice(i, j + 1).map((d) => DAY_NAME[d]).join(', '));
    i = j + 1;
  }
  return runs.join(', ');
}

export function buildBundle<C>(recipe: Recipe<C>, pools: Record<string, Item[]>, ctx: C): BundleResult {
  const picks: Record<string, Pick[]> = {};
  const alternates: Record<string, Pick[]> = {};
  const used = new Set<string>();
  const missing: string[] = [];
  let fit = 0;

  for (const slot of recipe.slots) {
    const poolNames = Array.isArray(slot.pool) ? slot.pool : [slot.pool];
    const ref =
      slot.near?.slot && picks[slot.near.slot]?.[0]
        ? picks[slot.near.slot][0].item
        : slot.near?.anchor
          ? slot.near.anchor(ctx)
          : null;
    const scored: { pick: Pick; s: number }[] = [];
    for (const name of poolNames) {
      for (const item of pools[name] ?? []) {
        if (used.has(item.id)) continue;
        if (slot.filter && !slot.filter(item, ctx)) continue;
        const d = ref ? km(ref, item) : null;
        if (slot.near && d !== null && d > slot.near.maxKm) continue;
        if (slot.near && ref === null && slot.near.slot) continue; // the slot it must be near wasn't filled
        const closeness = d !== null ? (slot.near?.weight ?? 2) * (1 - d / slot.near!.maxKm) : 0;
        scored.push({ pick: { item, km: d }, s: item.base + (slot.score?.(item, ctx) ?? 0) + closeness });
      }
    }
    scored.sort((a, b) => b.s - a.s || a.pick.item.name.localeCompare(b.pick.item.name));
    if (slot.window) {
      const [from, to] = slot.window;
      const open = scored.filter((c) => openDays(c.pick.item, from, to)?.length !== 0);
      if (open.length) scored.splice(0, scored.length, ...open);
    }
    const n = slot.count ?? 1;
    const chosen = scored.slice(0, n);
    chosen.forEach((c) => used.add(c.pick.item.id));
    picks[slot.key] = chosen.map((c) => c.pick);
    alternates[slot.key] = scored.slice(n, n + (slot.alternates ?? 2)).map((c) => c.pick);
    fit += chosen.reduce((t, c) => t + c.s, 0);
    if (slot.required && chosen.length < n) missing.push(slot.key);
  }
  return { recipe: recipe.id, audience: recipe.audience, picks, alternates, fit: Math.round(fit * 10) / 10, missing };
}
