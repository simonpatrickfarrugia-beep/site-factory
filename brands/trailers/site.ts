/**
 * Every page on movietrailer.channel. URLs match the Webflow site exactly. Film and collection titles were
 * reworded around "where to watch" on 22 Oct 2026 (see movieSeo).
 */
import { getCollection, getSingleton } from '../../src/lib/data';
import { hqAnswersProps, hqProps, trafficProps } from '../../src/lib/hq';
import type { Route } from '../../src/lib/routes';
import { matchesRule, thumb, type Movie, type MovieCollection, type StaticPage } from './model';
import { archiveEmbed, archiveThumb, freeFilmsToPublish, sameTitle, upcomingFreeFilms, type FreeFilm } from './public-domain';

const SITE = 'https://www.movietrailer.channel'; // www is canonical (matches Webflow + Search Console)
const SUFFIX = ' | MovieTrailer.Channel';
/** Amazon Associates tracking ID, carried over from the Webflow site's custom code. */
const AMAZON_TAG = 'movietrailerc-20';

const splitNames = (s: string | null | undefined) => (s ?? '').split(',').map((n) => n.trim()).filter((n) => n && n !== 'N/A');
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

/** Google shows about 60 characters of a title and 155-160 of a description; longer gets cut mid-word. */
const TITLE_MAX = 60;
const DESC_MAX = 158;
const fitTitle = (...options: string[]) => options.find((t) => t.length <= TITLE_MAX) ?? options[options.length - 1];
const clip = (text: string, max = DESC_MAX) => {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\-–— ]+$/, '') + '…';
};
/**
 * Film pages lead with "where to watch": in a 25-film US sample (22 Oct 2026) "where to watch X" had ~5x the
 * searches of "X trailer" (102,770 vs 20,010 a month), and it's the search that ends in a rental.
 */
function movieSeo(m: Movie) {
  const ny = `${m.name}${m.year ? ` (${m.year})` : ''}`;
  const title = fitTitle(`Where to Watch ${ny}: Stream, Rent & Trailer`, `Where to Watch ${ny} + Trailer`, `Where to Watch ${ny}`, `${m.name}: Where to Watch`);
  const lead = `Where to watch ${ny}: stream, rent or buy it in the US, plus the official trailer.`;
  const description = m.synopsis ? clip(`${lead} ${m.synopsis}`) : clip(lead);
  return { title, description };
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

  // Free classic movies (public domain in the US). The film plays on its normal /movies page; films we have no
  // trailer page for get one. Rules: ./public-domain.ts (a broken rule fails the build). Weekly outside checks:
  // .github/workflows/public-domain.yml. "Held" films show as "free from 1 January" and switch on by themselves.
  const allFree = getCollection<FreeFilm>('public-domain');
  const free = freeFilmsToPublish(allFree);
  const upcoming = upcomingFreeFilms(allFree);
  const trailerFor = (f: FreeFilm) => movies.find((m) => m.slug === f.moviesSlug || (sameTitle(m.name, f.name) && m.year === f.year));
  const asMovie = (f: FreeFilm): Movie => ({
    id: f.slug, slug: f.slug, name: f.name, year: f.year, genres: f.genres, director: f.director, cast: f.cast,
    runtimeMinutes: f.runtimeMinutes, rating: null, imdbRating: null, boxOffice: null, synopsis: null, tagline: null,
    summary: f.about, youtubeId: '', trailerTitle: null, rentBuyUrl: null, airtableId: null,
    created: f.audit.checkedOn, updated: f.audit.checkedOn,
  });
  const freeByMovie = new Map<string, FreeFilm>();
  const upcomingByMovie = new Map<string, (typeof upcoming)[number]>();
  const freeOnly: FreeFilm[] = []; // free films with no trailer page yet
  const upcomingOnly: (typeof upcoming)[number][] = [];
  for (const f of free) { const t = trailerFor(f); if (t) freeByMovie.set(t.slug, f); else freeOnly.push(f); }
  for (const f of upcoming) { const t = trailerFor(f); if (t) upcomingByMovie.set(t.slug, f); else upcomingOnly.push(f); }
  const freeSlug = (f: FreeFilm) => trailerFor(f)?.slug ?? f.slug;
  const freeCard = (f: FreeFilm) => ({ slug: freeSlug(f), name: f.name, year: f.year, image: archiveThumb(f.archiveId) });
  const moreFreeFor = (f: FreeFilm) => {
    const others = free.filter((o) => o !== f);
    const same = others.filter((o) => o.genres[0] === f.genres[0]);
    return [...same, ...others.filter((o) => !same.includes(o))].slice(0, 6).map(freeCard);
  };
  /** The free version of this film in another year (remake → original). */
  const originalFor = (m: Movie) => {
    const f = free.find((x) => sameTitle(x.name, m.name) && x.year !== m.year);
    if (f) return { slug: freeSlug(f), name: f.name, year: f.year, freeOn: null };
    const u = upcoming.find((x) => sameTitle(x.name, m.name) && x.year !== m.year);
    return u ? { slug: freeSlug(u), name: u.name, year: u.year, freeOn: u.freeOn } : null;
  };
  const fullFilmVideo = (f: FreeFilm, url: string) => ({
    '@type': 'VideoObject',
    name: `${f.name} (${f.year}): full movie`,
    description: f.about,
    thumbnailUrl: [archiveThumb(f.archiveId)],
    uploadDate: f.audit.checkedOn,
    duration: `PT${f.runtimeMinutes}M`,
    ...(f.media ? { contentUrl: `${SITE}/media/${f.media.file}` } : { embedUrl: archiveEmbed(f.archiveId) }),
    regionsAllowed: 'US',
    isAccessibleForFree: true,
    url,
  });
  function freeSeo(m: Movie, f: FreeFilm) {
    const ny = `${m.name}${m.year ? ` (${m.year})` : ''}`;
    const title = fitTitle(`Watch ${ny} Free: Full Movie & Trailer`, `Watch ${ny} Free: Full Movie`, `${ny}: Watch Free`, `Watch ${m.name} Free`);
    return { title, description: clip(`Watch ${ny} free: the full film, public domain in the US and legal to stream. ${f.about}`) };
  }
  function upcomingSeo(m: Movie, u: { freeOn: string }) {
    const ny = `${m.name}${m.year ? ` (${m.year})` : ''}`;
    const title = fitTitle(`${ny}: Where to Watch & Free from ${u.freeOn.replace('1 January ', 'Jan ')}`, `${ny}: Where to Watch`, ny);
    return { title, description: clip(`${ny} enters the US public domain on ${u.freeOn}: watch the full film free here from that day. Until then: where to rent, buy or stream it.`) };
  }

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
        'Classic movie trailers and where to watch each film tonight: rent, buy or stream. Browse by decade, genre and director, or play the free 24/7 trailer channel.',
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

  // Movie pages: /movies/{slug}. Trailer pages, plus pages for free films we have no trailer for. A free film plays
  // in full on its page; an upcoming one says when it will.
  type MoviePage = { m: Movie; free: FreeFilm | null; upcoming: (typeof upcoming)[number] | null; synthetic: boolean };
  const moviePages: MoviePage[] = [
    ...movies.map((m) => ({ m, free: freeByMovie.get(m.slug) ?? null, upcoming: upcomingByMovie.get(m.slug) ?? null, synthetic: false })),
    ...freeOnly.map((f) => ({ m: asMovie(f), free: f, upcoming: null, synthetic: true })),
    ...upcomingOnly.map((u) => ({ m: asMovie(u), free: null, upcoming: u, synthetic: true })),
  ];
  for (const { m, free: f, upcoming: u, synthetic } of moviePages) {
    const url = `${SITE}/movies/${m.slug}`;
    const inCollections = synthetic ? [] : collections.filter((c) => moviesIn(c).includes(m)).map(collectionCard);
    const firstGenre = m.genres[0];
    const directors = splitNames(m.director);
    const byDirector = directors.length
      ? movies.filter((o) => o.slug !== m.slug && splitNames(o.director).some((d) => directors.includes(d))).sort(byYear).slice(0, 6).map(card)
      : [];
    const related = firstGenre
      ? movies.filter((o) => o.slug !== m.slug && o.genres.includes(firstGenre)).sort(byNewest).slice(0, 10).map(card)
      : [];
    // Images: the trailer thumbnail, or a still from a free film. Never a still from a film that isn't free yet.
    const image = m.youtubeId ? thumb(m.youtubeId) : f ? archiveThumb(f.archiveId) : undefined;
    const schema: Record<string, unknown> = m.youtubeId
      ? movieSchema(m)
      : { '@context': 'https://schema.org', '@type': 'Movie', name: m.name, url, dateCreated: m.year, genre: m.genres, director: people(m.director), actor: people(m.cast), duration: `PT${m.runtimeMinutes}M`, description: m.summary };
    if (f) { schema.video = fullFilmVideo(f, url); schema.image = image; }
    out.push({
      path: `movies/${m.slug}`,
      template: 'movie',
      seo: { ...(f ? freeSeo(m, f) : u ? upcomingSeo(m, u) : movieSeo(m)), rawTitle: true, image },
      schema: [
        schema,
        breadcrumbs([
          { name: 'Home', path: '' },
          f || u ? { name: 'Free classic movies', path: 'free-classic-movies' } : { name: 'Browse', path: 'browse' },
          { name: m.name, path: `movies/${m.slug}` },
        ]),
      ],
      lastmod: f ? [m.updated, f.audit.checkedOn].sort().pop() : m.updated,
      props: {
        movie: m, inCollections, related, byDirector, genre: firstGenre ?? null, amazonTag: AMAZON_TAG,
        free: f, upcoming: u ? { freeOn: u.freeOn } : null, original: f || u ? null : originalFor(m),
        moreFree: f ? moreFreeFor(f) : u ? free.slice(0, 6).map(freeCard) : [],
      },
    });
  }

  // Free classic movies hub (targets "public domain films", "free classic movies").
  if (free.length) {
    out.push({
      path: 'free-classic-movies',
      template: 'freeFilms',
      seo: {
        title: fitTitle('Free Classic Movies: Public Domain Films to Watch' + SUFFIX, 'Free Classic Movies: Public Domain Films to Watch'),
        rawTitle: true,
        description: clip(`Watch ${free.length} classic films free and legally: public domain movies like ${free.slice(0, 3).map((f) => f.name).join(', ')}. Every film checked, every week.`),
        image: archiveThumb(free[0].archiveId),
      },
      schema: [
        { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: free.map((f, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/movies/${freeSlug(f)}`, name: f.name })) },
        breadcrumbs([{ name: 'Home', path: '' }, { name: 'Free classic movies', path: 'free-classic-movies' }]),
      ],
      props: {
        films: free.map((f) => ({ ...freeCard(f), genres: f.genres, runtimeMinutes: f.runtimeMinutes })),
        coming: upcoming.map((u) => ({ slug: freeSlug(u), name: u.name, year: u.year, freeOn: u.freeOn })),
      },
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
        title: fitTitle(`${c.name}: Where to Watch Each One` + SUFFIX, `${c.name}: Where to Watch Each One`, `${c.name}: Where to Watch`, c.name),
        rawTitle: true,
        description: clip(
          c.metaDescription ??
            `${c.name}: where to stream, rent or buy each of ${list.length} films in the US, with the trailer for every one and a direct Prime Video link.`,
        ),
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
  const decades = [...new Set([...movies, ...freeOnly].map((m) => (m.year ? `${m.year.slice(0, 3)}0s` : null)).filter(Boolean))].sort() as string[];
  const genres = [...new Set([...movies, ...freeOnly].flatMap((m) => m.genres))].sort();
  out.push({
    path: 'browse',
    template: 'browse',
    seo: {
      title: 'Browse All Movie Trailers' + SUFFIX,
      rawTitle: true,
      description: 'Browse every movie trailer in our catalog — search by title, filter by genre and year, or jump to a letter.',
    },
    props: {
      movies: [...movies.map((m) => ({ ...card(m), image: null as string | null, badge: freeByMovie.has(m.slug) ? 'Watch free' : null, genres: m.genres })), ...freeOnly.map((f) => ({ ...freeCard(f), youtubeId: '', badge: 'Watch free', genres: f.genres }))],
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

  // Original films: a share of what the site earns goes into producing original films (31 Oct 2026).
  // No affiliate links on this page (CI-checked), and never tie the fund to affiliate clicks or purchases.
  out.push({
    path: 'original-films',
    template: 'originalFilms',
    seo: {
      title: 'Original Films: What This Site Earns Helps Make New Films' + SUFFIX,
      rawTitle: true,
      description: 'MovieTrailer.Channel puts a share of what it earns into producing original films, with writers and directors in creative control. Filmmakers can pitch us.',
    },
    props: {
      faqs: [
        { q: 'Does it cost me anything?', a: 'No. Using the site is free, and we will never ask you for money for the films.' },
        { q: 'Where does the money come from?', a: 'From what the site earns as a business, such as ads. It is not a donation or a crowdfunding campaign, and we are not raising money from the public.' },
        { q: 'Who decides what gets made?', a: 'The filmmakers. We choose which projects to back; the writer and director keep creative control of the film.' },
        { q: 'Who runs this?', a: 'MovieTrailer.Channel is published by Independent Media Network Pty Ltd in Melbourne, Australia. Questions: hello@movietrailer.channel.' },
      ],
    },
  });

  // Private dashboard (noindex, no analytics, not in the sitemap). Data: data/trailers/stats.json, refreshed daily.
  const titles: Record<string, string> = { '/': 'Home page', '/browse': 'Browse all', '/discover': 'Discover (collections)' };
  for (const m of movies) titles[`/movies/${m.slug}`] = `${m.name}${m.year ? ` (${m.year})` : ''}`;
  for (const c of collections) titles[`/discover/${c.slug}`] = `Collection: ${c.name}`;
  for (const f of [...freeOnly, ...upcomingOnly]) titles[`/movies/${f.slug}`] = `${f.name} (${f.year}) (free film)`;
  titles['/free-classic-movies'] = 'Free classic movies';
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
  // Morning traffic: every site's visits and Google searches on one page (private).
  out.push({ path: 'hq/traffic', template: 'hqTraffic', private: true, seo: { title: 'Morning traffic', rawTitle: true, description: 'Visits and Google searches across every IMN site.' }, props: trafficProps() });
  // Tap-to-copy affiliate signup answers (private).
  out.push({ path: 'hq/signup', template: 'hqAnswers', private: true, seo: { title: 'Signup answers', rawTitle: true, description: 'Copy-paste answers for affiliate signups.' }, props: hqAnswersProps() });

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
