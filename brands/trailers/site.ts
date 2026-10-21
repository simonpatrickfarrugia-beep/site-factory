/**
 * Every page on movietrailer.channel. URLs and SEO titles match the Webflow
 * site exactly so the migration is invisible to Google.
 */
import { getCollection, getSingleton } from '../../src/lib/data';
import { hqProps } from '../../src/lib/hq';
import type { Route } from '../../src/lib/routes';
import { matchesRule, thumb, type Movie, type MovieCollection, type StaticPage } from './model';

const SITE = 'https://www.movietrailer.channel'; // www is canonical (matches Webflow + Search Console)
const SUFFIX = ' | MovieTrailer.Channel';
/** Amazon Associates tracking ID, carried over from the Webflow site's custom code. */
const AMAZON_TAG = 'movietrailerc-20';

const byNewest = (a: { created: string }, b: { created: string }) => b.created.localeCompare(a.created);
const people = (names: string | string[] | null) =>
  (Array.isArray(names) ? names : (names ?? '').split(','))
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name) => ({ '@type': 'Person', name }));

function movieSchema(m: Movie) {
  const url = `${SITE}/movies/${m.slug}`;
  const movie: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: m.name,
    url,
    image: thumb(m.youtubeId),
    trailer: {
      '@type': 'VideoObject',
      name: m.trailerTitle ?? `${m.name} official trailer`,
      description: m.synopsis ?? `Official trailer for ${m.name}.`,
      thumbnailUrl: [thumb(m.youtubeId)],
      uploadDate: m.created,
      embedUrl: `https://www.youtube.com/embed/${m.youtubeId}`,
    },
  };
  if (m.year) movie.dateCreated = m.year;
  if (m.synopsis) movie.description = m.synopsis;
  if (m.genres.length) movie.genre = m.genres;
  if (m.director) movie.director = people(m.director);
  if (m.cast.length) movie.actor = people(m.cast);
  if (m.runtimeMinutes) movie.duration = `PT${m.runtimeMinutes}M`;
  if (m.rating && m.rating !== 'Not Rated') movie.contentRating = m.rating;
  return movie;
}

function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE}/${it.path}`.replace(/\/$/, ''),
    })),
  };
}

function itemList(movies: Movie[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: movies.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE}/movies/${m.slug}`,
      name: m.name,
    })),
  };
}

export function routes(): Route[] {
  const movies = getCollection<Movie>('movies');
  const collections = getCollection<MovieCollection>('collections');
  const pages = getCollection<StaticPage>('pages');

  const movieBySlug = new Map(movies.map((m) => [m.slug, m]));
  const byYear = (a: Movie, b: Movie) => (a.year ?? '9999').localeCompare(b.year ?? '9999') || a.name.localeCompare(b.name);
  // Hand-picked movies first, then (for smart collections) every other movie matching the rule, oldest first.
  const membership = new Map<string, Movie[]>(
    collections.map((c) => {
      const picked = c.movieSlugs.map((s) => movieBySlug.get(s)).filter((m): m is Movie => !!m);
      const pickedSet = new Set(picked);
      const rule = c.rule;
      const matched = rule ? movies.filter((m) => !pickedSet.has(m) && matchesRule(m, rule)).sort(byYear) : [];
      return [c.slug, [...picked, ...matched]];
    }),
  );
  const moviesIn = (c: MovieCollection) => membership.get(c.slug) ?? [];
  // Collections merged into another page: their old URLs 301 there (brands/trailers/public/_redirects).
  const MERGED: Record<string, string> = { 'studio-ghibli-collection': '/studio-ghibli-where-to-watch', 'studio-ghibli-where-to-watch': '/studio-ghibli-where-to-watch' };
  // Collections with fewer films than this stay live (old links work) but are kept out of Google until they grow.
  const MIN_INDEXED_FILMS = 4;
  /** Every Ghibli film from both Ghibli collections, without repeats. */
  const ghibliFilms = () => [...new Set(collections.filter((c) => c.slug.startsWith('studio-ghibli')).flatMap((c) => moviesIn(c)))];
  const collectionCard = (c: MovieCollection) => {
    const list = c.slug.startsWith('studio-ghibli') ? ghibliFilms() : moviesIn(c);
    return { slug: c.slug, name: c.name, tagline: c.tagline, count: list.length, youtubeId: list[0]?.youtubeId ?? null, href: MERGED[c.slug] };
  };
  const card = (m: Movie) => ({ slug: m.slug, name: m.name, year: m.year, youtubeId: m.youtubeId });

  const newest = [...movies].sort(byNewest);
  const featured = collections.filter((c) => c.featured);
  const out: Route[] = [];

  // Home
  out.push({
    path: '',
    template: 'home',
    seo: {
      title: 'Movie Trailers & Where to Watch' + SUFFIX,
      rawTitle: true,
      description:
        'Watch trailers for new releases, award winners, indie films, and hidden gems. Free 24/7 trailer stream, plus where to rent, buy, or stream each movie.',
      image: thumb(newest[0].youtubeId),
    },
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'MovieTrailer.Channel',
        url: SITE,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE}/browse?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
    props: {
      stream: movies.map((m) => ({ slug: m.slug, name: m.name, youtubeId: m.youtubeId })),
      latest: newest.slice(0, 10).map(card),
      featured: featured.map(collectionCard),
      totals: { movies: movies.length, collections: collections.length },
      allSlugs: movies.map((m) => m.slug),
    },
  });

  // Movie pages: /movies/{slug}
  for (const m of movies) {
    const inCollections = collections.filter((c) => moviesIn(c).includes(m)).map(collectionCard);
    const firstGenre = m.genres[0];
    const related = firstGenre
      ? movies.filter((o) => o.slug !== m.slug && o.genres.includes(firstGenre)).sort(byNewest).slice(0, 10).map(card)
      : [];
    out.push({
      path: `movies/${m.slug}`,
      template: 'movie',
      seo: {
        title: `${m.name}${m.year ? ` (${m.year})` : ''} Official Trailer & Where to Watch`,
        rawTitle: true,
        description: m.synopsis ? `Watch the trailer for ${m.name}: ${m.synopsis}` : `Watch the official trailer for ${m.name}.`,
        image: thumb(m.youtubeId),
      },
      schema: [
        movieSchema(m),
        breadcrumbs([
          { name: 'Home', path: '' },
          { name: 'Browse', path: 'browse' },
          { name: m.name, path: `movies/${m.slug}` },
        ]),
      ],
      lastmod: m.updated,
      props: { movie: m, inCollections, related, genre: firstGenre ?? null, amazonTag: AMAZON_TAG },
    });
  }

  // Collection pages: /discover/{slug}
  for (const c of collections) {
    if (MERGED[c.slug]) continue;
    const list = moviesIn(c);
    out.push({
      noindex: list.length < MIN_INDEXED_FILMS,
      path: `discover/${c.slug}`,
      template: 'collection',
      seo: {
        title: `${c.name}: Trailers & Where to Stream or Rent Each One` + SUFFIX,
        rawTitle: true,
        description:
          c.metaDescription ??
          `${c.name}: watch the trailer for each of ${list.length} films, then see where to stream, rent or buy it in the US, with a direct Prime Video link.`,
        image: list[0] ? thumb(list[0].youtubeId) : undefined,
      },
      schema: [
        itemList(list),
        breadcrumbs([
          { name: 'Home', path: '' },
          { name: 'Discover', path: 'discover' },
          { name: c.name, path: `discover/${c.slug}` },
        ]),
      ],
      lastmod: c.updated,
      props: { heading: c.name, tagline: c.tagline, introHtml: c.introHtml, movies: list, backTo: { href: '/discover', label: 'All collections' }, amazonTag: AMAZON_TAG },
    });
  }

  // Discover index
  out.push({
    path: 'discover',
    template: 'discover',
    seo: {
      title: 'Discover Movie Collections' + SUFFIX,
      rawTitle: true,
      description: 'Browse curated collections of movie trailers — award winners, box office highlights, hidden gems, and more.',
    },
    props: {
      featured: featured.map(collectionCard),
      others: collections.filter((c) => !c.featured).map(collectionCard),
    },
  });

  // Browse all
  const decades = [...new Set(movies.map((m) => (m.year ? `${m.year.slice(0, 3)}0s` : null)).filter(Boolean))].sort() as string[];
  const genres = [...new Set(movies.flatMap((m) => m.genres))].sort();
  out.push({
    path: 'browse',
    template: 'browse',
    seo: {
      title: 'Browse All Movie Trailers' + SUFFIX,
      rawTitle: true,
      description: 'Browse every movie trailer in our catalog — search by title, filter by genre and year, or jump to a letter.',
    },
    props: {
      movies: movies.map((m) => ({ ...card(m), genres: m.genres })),
      genres,
      decades,
    },
  });

  // Studio Ghibli article (a Webflow static page backed by the Ghibli collection)
  const ghibli = collections.find((c) => c.slug === 'studio-ghibli-where-to-watch');
  if (ghibli) {
    const list = ghibliFilms();
    out.push({
      path: 'studio-ghibli-where-to-watch',
      template: 'collection',
      seo: {
        title: 'Studio Ghibli Movies: Where to Watch Every Film' + SUFFIX,
        rawTitle: true,
        description:
          'Where to stream, rent, or buy every Studio Ghibli movie — Spirited Away, My Neighbor Totoro, Princess Mononoke, and more, all in one place.',
        image: list[0] ? thumb(list[0].youtubeId) : undefined,
      },
      schema: [itemList(list)],
      lastmod: ghibli.updated,
      props: {
        heading: 'Studio Ghibli: Where to Watch Every Movie',
        tagline:
          "Every Ghibli film in our catalog, with a direct link to rent, buy, or find where it's streaming — no digging through five different apps.",
        introHtml: null,
        movies: list,
        backTo: { href: '/discover', label: 'All collections' },
        amazonTag: AMAZON_TAG,
      },
    });
  }

  // Private dashboard (noindex, no analytics, not in the sitemap). Data: data/trailers/stats.json, refreshed daily.
  const titles: Record<string, string> = { '/': 'Home page', '/browse': 'Browse all', '/discover': 'Discover (collections)' };
  for (const m of movies) titles[`/movies/${m.slug}`] = `${m.name}${m.year ? ` (${m.year})` : ''}`;
  for (const c of collections) titles[`/discover/${c.slug}`] = `Collection: ${c.name}`;
  for (const p of pages) titles[`/${p.slug}`] = p.title;
  if (ghibli) titles['/studio-ghibli-where-to-watch'] = 'Studio Ghibli: where to watch';
  out.push({
    path: 'hq/stats',
    template: 'dashboard',
    private: true,
    seo: { title: 'Dashboard' + SUFFIX, rawTitle: true, description: 'Private site stats: visits, Amazon clicks and Google searches per page.' },
    props: {
      stats: getSingleton('stats'),
      titles,
      moneyCtas: ['prime', 'disc'],
      ctaLabels: { prime: 'Prime Video', disc: 'DVD/Blu-ray', justwatch: 'JustWatch' },
    },
  });

  // IMN HQ: the whole portfolio on one private page.
  out.push({
    path: 'hq',
    template: 'hq',
    private: true,
    seo: { title: 'IMN HQ', rawTitle: true, description: 'Independent Media Network portfolio: sites, engines, money and next actions.' },
    props: hqProps(),
  });

  // Static pages
  for (const p of pages) {
    out.push({
      path: p.slug,
      template: 'page',
      seo: { title: p.seoTitle, rawTitle: true, description: p.description },
      props: { title: p.title, blocks: p.blocks },
    });
  }

  return out;
}
