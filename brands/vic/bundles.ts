/**
 * Vic Tours bundles: ready-made weekend plans per town for four audiences (no car / budget / couples / families),
 * built by the shared engine (src/lib/bundles.ts) from free data: OpenStreetMap places, extras (playgrounds,
 * beaches, spas, cellar doors…) and train stations. Only bundles people search for get pages (data/vic/bundle-demand.json):
 *   train + budget: per town, when "train to X" / "cheap accommodation X" has 50+ searches a month;
 *   couples + family: searched state-wide ("romantic getaways victoria"), so the best-fitting towns get pages.
 * Nothing here invents facts: prices, travel times and ratings we don't have are never stated.
 */
import { buildBundle, km, walkMins, type BundleResult, type Item, type Recipe } from '../../src/lib/bundles';
import { TYPE_LABEL, type Content, type Place, type Town } from './model';

export type Audience = 'train' | 'budget' | 'couples' | 'family';
export interface Station { name: string; lat: number; lon: number; network: string; tourist: boolean }
export interface ExtraItem { id: string; name: string; named: boolean; lat: number; lon: number; tags: Record<string, string> }
export type TownExtras = Record<string, ExtraItem[]>;
interface Ctx { town: Town; centre: { lat: number; lon: number }; station: (Station & { km: number }) | null }

export const AUDIENCE: Record<Audience, { label: string; short: string; path: string; hubPath: string; hubTitle: string; hubKeyword: string }> = {
  train: { label: 'without a car', short: 'By train', path: 'by-train', hubPath: 'weekends/by-train', hubTitle: 'Weekends away from Melbourne by train', hubKeyword: 'weekend getaway from melbourne by train' },
  budget: { label: 'on a budget', short: 'Budget', path: 'on-a-budget', hubPath: 'weekends/budget', hubTitle: 'Cheap weekend getaways from Melbourne', hubKeyword: 'cheap weekend getaways from melbourne' },
  couples: { label: 'for couples', short: 'Couples', path: 'romantic-weekend', hubPath: 'weekends/romantic', hubTitle: 'Romantic weekend itineraries for couples', hubKeyword: 'romantic weekend getaways victoria' },
  family: { label: 'with kids', short: 'Families', path: 'family-weekend', hubPath: 'weekends/family', hubTitle: 'Family weekend itineraries from Melbourne', hubKeyword: 'family weekend getaways from melbourne' },
};
const MIN_DEMAND = 50; // monthly searches for a per-town train/budget page
const TOP_STATEWIDE = 8; // couples / family pages

// ---------------------------------------------------------------- items
const has = (t: Record<string, string>, k: string) => !!t[k] || !!t[`contact:${k}`];
const fromPlace = (p: Place): Item => ({ id: p.id, name: p.name, kind: p.type, lat: p.lat, lon: p.lon, tags: p.tags, base: p.score / 2 });
const fromExtra = (kind: string, e: ExtraItem): Item => ({
  id: e.id, name: e.name, kind, lat: e.lat, lon: e.lon, tags: e.tags,
  base: (e.named ? 2 : 0) + (has(e.tags, 'website') ? 1 : 0) + (e.tags.opening_hours ? 1 : 0),
});
const stars = (i: Item) => Number(i.tags.stars) || 0;
const notable = (i: Item) => (i.tags.wikidata || i.tags.wikipedia ? 2 : 0);
const free = (i: Item) => i.tags.fee === 'no' || ['park', 'nature_reserve', 'viewpoint', 'beach', 'playground', 'picnic'].includes(i.kind);

function pools(places: Place[], extras: TownExtras | undefined): Record<string, Item[]> {
  const by = (pred: (p: Place) => boolean) => places.filter(pred).map(fromPlace);
  const ex = (k: string) => (extras?.[k] ?? []).map((e) => fromExtra(k, e));
  return {
    stay: by((p) => p.group === 'stay'),
    dinner: by((p) => p.group === 'eat' && ['restaurant', 'pub'].includes(p.type)),
    cafe: by((p) => p.type === 'cafe'),
    bar: by((p) => ['bar', 'pub', 'biergarten'].includes(p.type)),
    do: by((p) => p.group === 'do'),
    beach: ex('beach').filter((i) => i.tags && i.name !== 'Beach'),
    playground: ex('playground'),
    pool: ex('pool'),
    spa: ex('spa'),
    wine: [...ex('wine'), ...by((p) => ['winery', 'distillery', 'brewery'].includes(p.type))],
    icecream: ex('icecream'),
    picnic: ex('picnic').filter((i) => i.name !== 'Picnic spot' || i.base > 0),
    bike: ex('bike'),
  };
}

const CASUAL = /\b(pizza|burger|kebab|souvlaki|sushi|dumpling|noodle|hut|express|takeaway|take away|fried|chicken|sushi train|fish (and|&) chips|subway|domino|mcdonald|kfc|bakery)\b/i;
const CASUAL_CUISINE = /\b(pizza|burger|kebab|chicken|fish_and_chips|sandwich|fast_food|donut|ice_cream)\b/i;
const NICE_CUISINE = /\b(french|italian|modern|australian|regional|wine|fine_dining|mediterranean|steak|seafood|tapas|spanish|european)\b/i;
/** Date-night fit for a restaurant, from what the data says (cuisine, name, details). */
const dinnerFit = (i: Item) =>
  (CASUAL.test(i.name) || CASUAL_CUISINE.test(i.tags.cuisine ?? '') ? -4 : 0) + (NICE_CUISINE.test(i.tags.cuisine ?? '') ? 2 : 0) +
  (i.tags.outdoor_seating === 'yes' ? 0.5 : 0) + (i.tags.opening_hours ? 0.5 : 0);
const NOT_A_STOP = /\b(railway station|station|car park|toilets?|visitor information)\b/i;

// ---------------------------------------------------------------- recipes
const atStation = (c: Ctx) => (c.station ? { lat: c.station.lat, lon: c.station.lon } : null);
const atCentre = (c: Ctx) => c.centre;
const SIGHTS = new Set(['museum', 'gallery', 'attraction', 'viewpoint', 'zoo', 'aquarium', 'winery', 'brewery', 'distillery', 'nature_reserve', 'theme_park', 'water_park', 'park']);

const RECIPES: Record<Audience, Recipe<Ctx>> = {
  train: {
    id: 'vic-train', audience: 'train',
    slots: [
      { key: 'stay', label: 'Stay', pool: 'stay', required: true, alternates: 3, filter: (i) => ['hotel', 'motel', 'guest_house', 'apartment', 'hostel'].includes(i.kind),
        near: { anchor: atStation, maxKm: 1.6, weight: 5 }, score: (i) => stars(i) / 2 + notable(i) },
      { key: 'dinner', label: 'Dinner', pool: 'dinner', required: true, near: { slot: 'stay', maxKm: 1.2, weight: 3 }, score: (i) => dinnerFit(i) / 2 + (i.tags.cuisine ? 1 : 0) + notable(i) },
      { key: 'breakfast', label: 'Breakfast', pool: 'cafe', required: true, near: { slot: 'stay', maxKm: 1.2, weight: 3 } },
      { key: 'see', label: 'See and do', pool: ['do', 'beach', 'wine'], count: 2, required: true, alternates: 3,
        filter: (i) => (SIGHTS.has(i.kind) || i.kind === 'beach' || i.kind === 'wine') && !NOT_A_STOP.test(i.name), near: { anchor: atStation, maxKm: 2.5, weight: 3 },
        score: (i) => notable(i) + (['museum', 'gallery', 'attraction', 'viewpoint', 'beach'].includes(i.kind) ? 2 : 0) + (i.kind === 'park' ? -1 : 0) },
      { key: 'lunch', label: 'Lunch', pool: ['cafe', 'dinner'], near: { anchor: atStation, maxKm: 1, weight: 3 } },
    ],
  },
  budget: {
    id: 'vic-budget', audience: 'budget',
    slots: [
      { key: 'stay', label: 'Stay', pool: 'stay', required: true, alternates: 3, filter: (i) => ['hostel', 'caravan_site', 'camp_site', 'motel'].includes(i.kind),
        near: { anchor: atCentre, maxKm: 8, weight: 1 }, score: (i) => ({ hostel: 4, caravan_site: 3, camp_site: 2, motel: 1 } as Record<string, number>)[i.kind] ?? 0 },
      { key: 'free', label: 'Free things to do', pool: ['do', 'beach', 'picnic'], count: 3, required: true, alternates: 3, filter: free,
        near: { anchor: atCentre, maxKm: 8, weight: 1 },
        score: (i) => (({ viewpoint: 3, beach: 3, nature_reserve: 2, museum: 2, gallery: 2, picnic: 1 } as Record<string, number>)[i.kind] ?? 0) + notable(i) },
      { key: 'eat', label: 'Cheap eats', pool: ['dinner', 'cafe'], count: 2, required: true, near: { slot: 'stay', maxKm: 4, weight: 2 },
        filter: (i) => ['pub', 'cafe'].includes(i.kind), score: (i) => (i.kind === 'pub' ? 2 : 1) },
      { key: 'play', label: 'Playground', pool: 'playground', near: { anchor: atCentre, maxKm: 3 } },
    ],
  },
  couples: {
    id: 'vic-couples', audience: 'couples',
    slots: [
      { key: 'stay', label: 'Stay', pool: 'stay', required: true, alternates: 3, filter: (i) => ['guest_house', 'chalet', 'apartment', 'hotel'].includes(i.kind),
        near: { anchor: atCentre, maxKm: 10, weight: 1 },
        score: (i) => ({ guest_house: 4, chalet: 3, hotel: 2, apartment: 1 } as Record<string, number>)[i.kind]! + (stars(i) >= 4 ? 2 : 0) + notable(i) },
      { key: 'dinner', label: 'Dinner', pool: 'dinner', required: true, alternates: 3, filter: (i) => i.kind === 'restaurant' && !CASUAL.test(i.name),
        near: { slot: 'stay', maxKm: 5, weight: 1 }, score: (i) => dinnerFit(i) + (has(i.tags, 'website') ? 1 : 0) + notable(i) },
      { key: 'unwind', label: 'Unwind', pool: ['spa', 'wine', 'do', 'beach'], count: 2, required: true, alternates: 3,
        filter: (i) => ['spa', 'wine', 'winery', 'distillery', 'viewpoint', 'gallery', 'beach', 'nature_reserve', 'attraction'].includes(i.kind) && !NOT_A_STOP.test(i.name),
        near: { anchor: atCentre, maxKm: 12, weight: 1 },
        score: (i) => ({ spa: 5, wine: 4, winery: 4, distillery: 3, viewpoint: 3, beach: 3, gallery: 2, nature_reserve: 1, attraction: 1 } as Record<string, number>)[i.kind]! + notable(i) },
      { key: 'drinks', label: 'Drinks', pool: 'bar', near: { slot: 'stay', maxKm: 4, weight: 1 }, score: (i) => (i.kind === 'bar' ? 1 : 0) },
      { key: 'breakfast', label: 'Breakfast', pool: 'cafe', required: true, near: { slot: 'stay', maxKm: 4, weight: 2 } },
    ],
  },
  family: {
    id: 'vic-family', audience: 'family',
    slots: [
      { key: 'stay', label: 'Stay', pool: 'stay', required: true, alternates: 3, filter: (i) => ['caravan_site', 'apartment', 'chalet', 'motel', 'hotel'].includes(i.kind),
        near: { anchor: atCentre, maxKm: 8, weight: 1 }, score: (i) => ({ caravan_site: 4, apartment: 3, chalet: 3, motel: 1, hotel: 1 } as Record<string, number>)[i.kind]! },
      { key: 'big', label: 'Big day out', pool: ['do', 'beach', 'pool'], required: true, alternates: 3,
        filter: (i) => ['zoo', 'aquarium', 'theme_park', 'water_park', 'beach', 'pool', 'museum'].includes(i.kind) && !NOT_A_STOP.test(i.name), near: { anchor: atCentre, maxKm: 12, weight: 1 },
        score: (i) => ({ zoo: 6, aquarium: 6, theme_park: 6, water_park: 6, beach: 4, pool: 3, museum: 1 } as Record<string, number>)[i.kind]! + notable(i) },
      { key: 'play', label: 'Playground', pool: 'playground', required: true, near: { anchor: atCentre, maxKm: 4, weight: 2 } },
      { key: 'outdoors', label: 'Outdoors', pool: ['do', 'picnic', 'bike', 'beach'], alternates: 2,
        filter: (i) => ['park', 'nature_reserve', 'viewpoint', 'picnic', 'bike', 'beach'].includes(i.kind), near: { anchor: atCentre, maxKm: 10, weight: 1 },
        score: (i) => notable(i) + (i.kind === 'bike' ? 2 : 0) },
      { key: 'dinner', label: 'Dinner', pool: 'dinner', required: true, near: { slot: 'stay', maxKm: 5, weight: 2 }, score: (i) => (i.kind === 'pub' ? 2 : 1) },
      { key: 'treat', label: 'Treat', pool: 'icecream', near: { anchor: atCentre, maxKm: 4 } },
      { key: 'breakfast', label: 'Breakfast', pool: 'cafe', near: { slot: 'stay', maxKm: 4, weight: 2 } },
    ],
  },
};

// ---------------------------------------------------------------- plans (day by day)
export interface Step { when: string; text: string; slot?: string; pick?: { item: Item; km: number | null } }
export interface Day { title: string; steps: Step[] }

const kindLabel = (i: Item) =>
  ({ beach: 'beach', playground: 'playground', pool: 'swimming pool', spa: 'day spa', wine: 'cellar door', icecream: 'ice cream', picnic: 'picnic spot', bike: 'bike hire' } as Record<string, string>)[i.kind] ??
  (TYPE_LABEL[i.kind] ?? i.kind).toLowerCase();
const walk = (d: number | null, from: string) => (d === null ? '' : d < 0.08 ? ` (right by ${from})` : ` (about ${walkMins(d)} min walk from ${from})`);
const near = (d: number | null, from: string) => (d === null ? '' : d <= 1.5 ? walk(d, from) : ` (${d.toFixed(1)} km from ${from})`);

function plan(aud: Audience, b: BundleResult, ctx: Ctx): Day[] {
  const p = (k: string, n = 0) => b.picks[k]?.[n];
  const step = (when: string, slot: string, n: number, text: (i: Item, d: number | null) => string): Step[] => {
    const pk = p(slot, n);
    return pk ? [{ when, slot, pick: pk, text: text(pk.item, pk.km) }] : [];
  };
  const t = ctx.town.name;
  if (aud === 'train') {
    const st = ctx.station!;
    const metro = /metro/i.test(st.network);
    return [
      { title: 'Saturday', steps: [
        { when: 'Morning', text: metro
          ? `Catch a Metro train to ${st.name} station. Check times and platforms on the PTV journey planner before you go.`
          : `Catch the V/Line train to ${st.name} station (most services leave from Southern Cross). Check times on the PTV journey planner and book a seat if the service needs it.` },
        ...step('Arrive', 'stay', 0, (i, d) => `Drop your bags at ${i.name}, a ${kindLabel(i)}${walk(d, 'the station')}.`),
        ...step('Lunch', 'lunch', 0, (i, d) => `${i.name}, a ${kindLabel(i)}${walk(d, 'the station')}.`),
        ...step('Afternoon', 'see', 0, (i, d) => `${i.name} (${kindLabel(i)})${near(d, 'the station')}.`),
        ...step('Dinner', 'dinner', 0, (i, d) => `${i.name}, a ${kindLabel(i)}${i.tags.cuisine ? ` (${i.tags.cuisine.split(/[;,]/)[0].replace(/_/g, ' ')})` : ''}${walk(d, 'your stay')}.`),
      ] },
      { title: 'Sunday', steps: [
        ...step('Breakfast', 'breakfast', 0, (i, d) => `${i.name}${walk(d, 'your stay')}.`),
        ...step('Morning', 'see', 1, (i, d) => `${i.name} (${kindLabel(i)})${near(d, 'the station')}.`),
        { when: 'Afternoon', text: `Train home from ${st.name}. No car, no parking, no driving tired.` },
      ] },
    ];
  }
  if (aud === 'budget') {
    return [
      { title: 'Saturday', steps: [
        ...step('Arrive', 'stay', 0, (i, d) => `Check in at ${i.name}, a ${kindLabel(i)}${near(d, `${t} centre`)}. Budget stays like this are usually the cheapest beds in town, but compare prices on the day.`),
        ...step('Afternoon', 'free', 0, (i, d) => `${i.name}: a free ${kindLabel(i)}${near(d, `${t} centre`)}.`),
        ...step('Dinner', 'eat', 0, (i, d) => `${i.name}${i.kind === 'pub' ? ', a pub (counter meals are usually the cheapest hot dinner in town)' : `, a ${kindLabel(i)}`}${near(d, 'your stay')}.`),
      ] },
      { title: 'Sunday', steps: [
        ...step('Breakfast', 'eat', 1, (i, d) => `${i.name}, a ${kindLabel(i)}${near(d, 'your stay')}. Or make your own if your stay has a kitchen.`),
        ...step('Morning', 'free', 1, (i, d) => `${i.name}: free ${kindLabel(i)}${near(d, `${t} centre`)}.`),
        ...step('Lunch', 'free', 2, (i, d) => `Pack a picnic and head to ${i.name} (free ${kindLabel(i)})${near(d, `${t} centre`)}.`),
        ...step('With kids?', 'play', 0, (i, d) => `There's a free playground${i.name !== 'Playground' ? ` at ${i.name}` : ''}${near(d, `${t} centre`)}.`),
      ] },
    ];
  }
  if (aud === 'couples') {
    return [
      { title: 'Saturday', steps: [
        ...step('Arrive', 'stay', 0, (i) => `Check in at ${i.name}, a ${kindLabel(i)}${stars(i) ? ` (${stars(i)}★)` : ''}.`),
        ...step('Afternoon', 'unwind', 0, (i, d) => `${i.name} (${kindLabel(i)})${near(d, `${t} centre`)}.`),
        ...step('Drinks', 'drinks', 0, (i, d) => `A drink at ${i.name}${near(d, 'your stay')}.`),
        ...step('Dinner', 'dinner', 0, (i, d) => `${i.name}${i.tags.cuisine ? ` (${i.tags.cuisine.split(/[;,]/)[0].replace(/_/g, ' ')})` : ''}${near(d, 'your stay')}. Book ahead for Saturday night.`),
      ] },
      { title: 'Sunday', steps: [
        ...step('Breakfast', 'breakfast', 0, (i, d) => `A slow breakfast at ${i.name}${near(d, 'your stay')}.`),
        ...step('Late morning', 'unwind', 1, (i, d) => `${i.name} (${kindLabel(i)})${near(d, `${t} centre`)}, then head home.`),
      ] },
    ];
  }
  return [
    { title: 'Saturday', steps: [
      ...step('Arrive', 'stay', 0, (i) => `Check in at ${i.name}, a ${kindLabel(i)}${i.kind === 'caravan_site' ? ' (holiday parks usually have cabins, space to run around and often a playground)' : ''}.`),
      ...step('Afternoon', 'play', 0, (i, d) => `Let them loose at ${i.name === 'Playground' ? 'the playground' : i.name}${near(d, `${t} centre`)}.`),
      ...step('Treat', 'treat', 0, (i, d) => `Ice cream at ${i.name}${near(d, `${t} centre`)}.`),
      ...step('Dinner', 'dinner', 0, (i, d) => `${i.name}${i.kind === 'pub' ? ', a pub (bistros usually have a kids menu)' : ''}${near(d, 'your stay')}.`),
    ] },
    { title: 'Sunday', steps: [
      ...step('Breakfast', 'breakfast', 0, (i, d) => `${i.name}${near(d, 'your stay')}.`),
      ...step('Big day out', 'big', 0, (i, d) => `${i.name} (${kindLabel(i)})${near(d, `${t} centre`)}.`),
      ...step('Before home', 'outdoors', 0, (i, d) => `${i.name} (${kindLabel(i)})${near(d, `${t} centre`)}.`),
    ] },
  ];
}

// ---------------------------------------------------------------- pick bundles worth publishing
export interface VicBundle {
  slug: string; path: string; audience: Audience; town: Town; result: BundleResult; days: Day[];
  demand: { keyword: string; volume: number } | null; station: (Station & { km: number }) | null; rank: number;
}

export function vicBundles(towns: Town[], content: Content, byTown: Map<string, Place[]>, stations: Station[], extras: Record<string, TownExtras>, volumes: Record<string, number>): VicBundle[] {
  const out: VicBundle[] = [];
  const statewide: Record<'couples' | 'family', VicBundle[]> = { couples: [], family: [] };
  for (const town of towns) {
    if (!town.centre) continue;
    const centre = { lat: town.centre[0], lon: town.centre[1] };
    const near = stations.filter((s) => !s.tourist).map((s) => ({ ...s, km: km(centre, s) })).sort((a, b) => a.km - b.km)[0];
    const ctx: Ctx = { town, centre, station: near && near.km <= 2.5 ? near : null };
    const pl = pools(byTown.get(town.slug) ?? [], extras[town.slug]);
    const n = town.name.toLowerCase().replace(' cbd', '');
    const vol = (...k: string[]) => k.map((kw) => ({ keyword: kw, volume: volumes[kw] ?? 0 })).sort((a, b) => b.volume - a.volume)[0];
    for (const aud of Object.keys(RECIPES) as Audience[]) {
      if (aud === 'train' && (!ctx.station || town.kind === 'suburb' || (town.kmFromMelbourne ?? 0) < 15)) continue;
      const result = buildBundle(RECIPES[aud], pl, ctx);
      if (result.missing.length) continue;
      const demand = aud === 'train' ? vol(`train to ${n}`, `${n} by train`) : aud === 'budget' ? vol(`cheap accommodation ${n}`) : aud === 'couples' ? vol(`romantic getaway ${n}`, `${n} romantic weekend`) : vol(`family holiday ${n}`, `${n} with kids`);
      const b: VicBundle = { slug: `${town.slug}-${AUDIENCE[aud].path}`, path: `weekends/${town.slug}-${AUDIENCE[aud].path}`, audience: aud, town, result, days: plan(aud, result, ctx),
        demand: demand.volume ? demand : null, station: ctx.station, rank: result.fit + Math.log10((town.volume ?? 10) + 10) * 3 + Math.log10(demand.volume + 1) * 4 };
      if (aud === 'train' || aud === 'budget') { if (demand.volume >= MIN_DEMAND) out.push(b); }
      else if (town.kind !== 'suburb' && (town.kmFromMelbourne ?? 0) <= 300) statewide[aud].push(b); // a weekend, not a road trip
    }
  }
  for (const aud of ['couples', 'family'] as const) out.push(...statewide[aud].sort((a, b) => b.rank - a.rank).slice(0, TOP_STATEWIDE));
  return out.sort((a, b) => b.rank - a.rank);
}
