/** Content model for Vic Tours. Mirrors data/vic/*.json. */

export type Group = 'stay' | 'eat' | 'do';

export interface Town {
  name: string;
  slug: string;
  kind: 'town' | 'suburb' | 'region' | string;
  published?: boolean;
  volume: number | null;
  volumes: { do: number | null; stay: number | null; eat: number | null } | null;
  centre?: [number, number];
  kmFromMelbourne?: number;
  counts?: Record<Group, number>;
}

export interface Place {
  id: string;
  name: string;
  group: Group;
  type: string;
  lat: number;
  lon: number;
  town: string;
  score: number;
  tags: Record<string, string>;
}

export interface TownContent {
  intro: string;
  region: string;
  highlights?: string[];
  tips?: string[]; // Simon's own local tips (shown as "Local tip")
  /** Optional short guide shown above a full list page (e.g. sections.do). */
  sections?: Partial<Record<Group, string[]>>;
}

export interface VicCollection {
  slug: string;
  name: string;
  intro: string;
  /** Longer guide paragraphs under the intro. */
  body?: string[];
  /** Why each town is in this collection (falls back to the town's intro). */
  notes?: Record<string, string>;
  towns: string[];
}

export interface LoopDay {
  title: string;
  stops: string[]; // town slugs visited that day
  overnight: string | null;
  text: string;
}

export interface Loop {
  slug: string;
  name: string;
  summary: string;
  intro: string;
  days: LoopDay[];
  draft?: boolean; // hidden until its towns are published
}

export interface Photo {
  url: string;
  width?: number;
  height?: number;
  file: string;
  page: string;
  artist: string;
  license: string;
}

export interface Content {
  towns: Record<string, TownContent>;
  collections: VicCollection[];
  loops?: Loop[];
  affiliates?: Record<'stay' | 'tours', { enabled: boolean; label: string; partner: string; template: string; target?: string }>;
  pages: { slug: string; title: string; description: string; paragraphs: string[] }[];
}

export const GROUP_LABEL: Record<Group, { title: (town: string) => string; short: string; noun: string }> = {
  stay: { title: (t) => `Where to stay in ${t}`, short: 'Stay', noun: 'places to stay' },
  eat: { title: (t) => `Where to eat in ${t}`, short: 'Eat', noun: 'places to eat and drink' },
  do: { title: (t) => `Things to do in ${t}`, short: 'Do', noun: 'things to do' },
};

export const TYPE_LABEL: Record<string, string> = {
  hotel: 'Hotel', motel: 'Motel', guest_house: 'Guest house / B&B', hostel: 'Hostel', apartment: 'Apartments',
  chalet: 'Cabins & chalets', camp_site: 'Campground', caravan_site: 'Caravan park', alpine_hut: 'Alpine hut',
  restaurant: 'Restaurant', cafe: 'Café', pub: 'Pub', bar: 'Bar', biergarten: 'Beer garden',
  attraction: 'Attraction', museum: 'Museum', gallery: 'Gallery', viewpoint: 'Lookout', zoo: 'Wildlife park',
  theme_park: 'Theme park', aquarium: 'Aquarium', winery: 'Winery', brewery: 'Brewery', distillery: 'Distillery',
  park: 'Park', nature_reserve: 'Nature reserve', beach_resort: 'Beach', golf_course: 'Golf course', water_park: 'Water park',
};

const DAYS: Record<string, string> = { Mo: 'Mon', Tu: 'Tue', We: 'Wed', Th: 'Thu', Fr: 'Fri', Sa: 'Sat', Su: 'Sun', PH: 'Public holidays' };
/** OpenStreetMap opening_hours made readable: "Mo-Fr 07:00-16:00; Sa 08:00-14:00" -> "Mon–Fri 7:00–16:00 · Sat 8:00–14:00". */
export function prettyHours(h: string | undefined): string | null {
  if (!h) return null;
  if (h.trim() === '24/7') return 'Open 24 hours';
  return h
    .split(';')
    .map((part) =>
      part
        .trim()
        .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => DAYS[d])
        .replace(/(\d{2}):(\d{2})/g, (_, hh, mm) => `${Number(hh)}:${mm}`)
        .replace(/-/g, '–')
        .replace(/,/g, ', ')
        .replace(/\boff\b/g, 'closed'),
    )
    .filter(Boolean)
    .join('; ');
}

export function cuisine(c: string | undefined): string | null {
  if (!c) return null;
  return c
    .split(/[;,]/)
    .map((x) => x.trim().replace(/_/g, ' '))
    .filter(Boolean)
    .map((x) => x[0].toUpperCase() + x.slice(1))
    .join(', ');
}

export function address(t: Record<string, string>): string | null {
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  const place = t['addr:suburb'] || t['addr:city'];
  return [street, place].filter(Boolean).join(', ') || null;
}

export const website = (t: Record<string, string>) => {
  const w = t.website || t['contact:website'];
  if (!w) return null;
  return /^https?:\/\//.test(w) ? w : `https://${w}`;
};
export const phone = (t: Record<string, string>) => t.phone || t['contact:phone'] || null;
export const mapUrl = (p: Place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.lat},${p.lon}`)}`;
