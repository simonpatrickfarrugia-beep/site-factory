/**
 * MovieTrailer.Channel widgets (see src/widgets/types.ts).
 * Trailer reel: a grid of classic film trailers that play inline, each linking back to our film page
 * (where-to-watch buttons live there). For independent cinemas, film societies, festivals and distributors.
 */
import { getCollection } from '../../src/lib/data';
import type { WidgetDef } from '../../src/widgets/types';
import { thumb, type Movie, type MovieCollection } from './model';

export function widgets(): WidgetDef[] {
  const movies = getCollection<Movie>('movies').filter((m) => m.youtubeId);
  const have = new Set(movies.map((m) => m.slug));
  const collections = getCollection<MovieCollection>('collections')
    .map((c) => ({ id: c.slug, name: c.name, items: (c.movieSlugs ?? []).filter((s) => have.has(s)) }))
    .filter((c) => c.items.length >= 3)
    .sort((a, b) => a.name.localeCompare(b.name));
  const firstGroup = collections.find((c) => /classic|1980s/i.test(c.name)) ?? collections[0];
  return [
    {
      id: 'trailer-reel',
      name: 'Trailer reel',
      pitch: 'Classic film trailers that play right on your page, updated for you, free.',
      audience: 'Cinemas, film societies, festivals and distributors',
      kind: 'reel',
      credit: 'Trailers by',
      defaults: { title: 'Trailers', group: firstGroup?.id, max: 6 },
      groups: collections,
      items: movies
        .map((m) => ({
          id: m.slug,
          title: m.name,
          sub: [m.year, (m.genres ?? []).slice(0, 2).join(', ')].filter(Boolean).join(' · '),
          image: thumb(m.youtubeId!),
          youtube: m.youtubeId!,
          href: `/movies/${m.slug}`,
          cta: 'Where to watch',
        }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    },
  ];
}
