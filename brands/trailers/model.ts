/** Content model for the trailers brand. Mirrors data/trailers/*.json. */

export interface Movie {
  id: string;
  slug: string;
  name: string;
  year: string | null;
  genres: string[];
  director: string | null;
  cast: string[];
  runtimeMinutes: number | null;
  rating: string | null;
  imdbRating: number | null;
  boxOffice: string | null;
  synopsis: string | null;
  tagline: string | null;
  summary: string | null;
  youtubeId: string;
  trailerTitle: string | null;
  rentBuyUrl: string | null;
  airtableId: string | null;
  created: string;
  updated: string;
}

/**
 * A rule-based ("smart") collection fills itself: every movie matching ALL the given fields joins it,
 * so new movies appear in the right collections at the next build. Within a field, any value matches.
 */
export interface CollectionRule {
  decades?: number[]; // e.g. [1980] = 1980–1989
  genres?: string[]; // OMDb genres, e.g. ["Horror"]
  directors?: string[];
  actors?: string[];
}

export interface MovieCollection {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  introHtml: string | null;
  metaDescription: string | null;
  featured: boolean;
  /** Hand-picked movies, shown first in this order. */
  movieSlugs: string[];
  /** Optional rule; matching movies are added after the hand-picked ones, oldest first. */
  rule?: CollectionRule | null;
  /** Created by the pipeline's collections job. */
  auto?: boolean;
  created: string;
  updated: string;
}

export type PageBlock =
  | { type: 'p'; text?: string; html?: string }
  | { type: 'h2'; text: string }
  | { type: 'links'; links: { label: string; href: string }[] };

export interface StaticPage {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  blocks: PageBlock[];
}

const has = (list: string[] | undefined, value: string) => !list?.length || list.some((v) => v.toLowerCase() === value.toLowerCase());
const hasAny = (list: string[] | undefined, values: string[]) => !list?.length || values.some((v) => has(list, v));

export function matchesRule(m: Movie, r: CollectionRule): boolean {
  const year = Number(m.year);
  if (r.decades?.length && !(year && r.decades.includes(Math.floor(year / 10) * 10))) return false;
  if (!hasAny(r.genres, m.genres)) return false;
  if (!hasAny(r.directors, (m.director ?? '').split(',').map((s) => s.trim()).filter(Boolean))) return false;
  if (!hasAny(r.actors, m.cast)) return false;
  return true;
}

/** YouTube thumbnail. hqdefault always exists; it is 4:3 with letterbox bars, so display it cropped to 16:9. */
export const thumb = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
