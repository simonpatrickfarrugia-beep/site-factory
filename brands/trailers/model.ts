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

export interface MovieCollection {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  introHtml: string | null;
  metaDescription: string | null;
  featured: boolean;
  movieSlugs: string[];
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

/** YouTube thumbnail. hqdefault always exists; it is 4:3 with letterbox bars, so display it cropped to 16:9. */
export const thumb = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
