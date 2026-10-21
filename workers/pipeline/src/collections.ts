/**
 * Collections builder: new SEO collection pages from searches people already make.
 *
 * Collection pages ("80s horror movies", "John Carpenter movies") rank for broad searches that
 * single movie pages never will, and they link to many movie pages at once.
 *
 * Monthly job:
 *   1. Find every theme the catalogue can fill: decade + genre, director, lead actor.
 *   2. Look up Google search volumes for each theme (DataForSEO), cached in
 *      data/trailers/collection-ideas.json so each idea is only looked up every 6 months.
 *   3. Create the most-searched themes that have enough films and no existing collection,
 *      as rule-based ("smart") collections: new movies join them automatically at each build.
 *      Claude writes the tagline, intro and meta description.
 *   4. Report: reports/trailers/collections.md, including popular themes that need more films
 *      (add catalogue candidates for those).
 */
import type { Movie } from './jobs';
import { cleanKeyword } from './dataforseo';

export interface CollectionRule {
  decades?: number[];
  genres?: string[];
  directors?: string[];
  actors?: string[];
}

/** Same shape as brands/trailers/model.ts MovieCollection. */
export interface MovieCollection {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  introHtml: string | null;
  metaDescription: string | null;
  featured: boolean;
  movieSlugs: string[];
  rule?: CollectionRule | null;
  auto?: boolean;
  created: string;
  updated: string;
}

export interface Idea {
  slug: string;
  name: string;
  kind: 'decade-genre' | 'director' | 'actor';
  rule: CollectionRule;
  keywords: string[];
  films: number;
  volume: number | null;
  volumeCheckedAt: string | null;
  /** Market the volume is for; a different market means it's looked up again. */
  volumeLocation?: string | null;
  /** existing = a collection already covers it; created = made by this job; open = not made yet. */
  status: 'open' | 'created' | 'existing';
  existingSlug?: string | null;
  /** Who owns Google's top 10 for the main keyword (collcheck job). openness 0-100: higher = more beatable slots. */
  competition?: { openness: number; giants: string[]; checkedAt: string } | null;
}

/**
 * A page of an actor's or director's films only competes if it covers a real share of their work;
 * 3 of Tom Hanks's 60+ films loses to IMDb's complete list. Decade/genre "best of" lists don't need completeness.
 */
export const PERSON_MIN_FILMS = 12;
export const MIN_OPENNESS = 25;
export const minFilmsFor = (i: Pick<Idea, 'kind'>, base: number) => (i.kind === 'decade-genre' ? base : Math.max(base, PERSON_MIN_FILMS));
export const winnable = (i: Pick<Idea, 'volume' | 'competition'>) => (i.volume ?? 0) * ((i.competition?.openness ?? 0) / 100);

export interface CollectionCopy {
  tagline: string;
  intro: string[]; // paragraphs
  metaDescription: string;
}

export interface CollectionsOptions {
  now: Date;
  perRun: number;
  minFilms: number; // to create
  minFilmsForIdea: number; // to look up / report
  minVolume: number;
  volumes: ((keywords: string[]) => Promise<Map<string, number | null>>) | null;
  copy: (name: string, films: Movie[]) => Promise<CollectionCopy>;
  location: string;
  budget: { left: number };
  /** Newest release year in the catalogue (age cutoff), or null. */
  maxYear: number | null;
}

// ---------------------------------------------------------------- matching (mirror of model.ts)

const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const hasAny = (list: string[] | undefined, values: string[]) => !list?.length || values.some((v) => list.some((l) => eq(l, v)));
const directorsOf = (m: Movie) => (m.director ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export function matchesRule(m: Movie, r: CollectionRule): boolean {
  const year = Number(m.year);
  if (r.decades?.length && !(year && r.decades.includes(Math.floor(year / 10) * 10))) return false;
  if (!hasAny(r.genres, m.genres)) return false;
  if (!hasAny(r.directors, directorsOf(m))) return false;
  if (!hasAny(r.actors, m.cast)) return false;
  return true;
}

// ---------------------------------------------------------------- naming

const decadeLabel = (d: number) => (d >= 1970 && d < 2000 ? `${String(d).slice(2)}s` : `${d}s`);
const GENRE_NAMES: Record<string, string> = {
  Action: 'Action Movies',
  Adventure: 'Adventure Movies',
  Animation: 'Animated Movies',
  Comedy: 'Comedy Movies',
  Crime: 'Crime Movies',
  Drama: 'Drama Movies',
  Family: 'Family Movies',
  Fantasy: 'Fantasy Movies',
  Horror: 'Horror Movies',
  Musical: 'Musicals',
  Mystery: 'Mystery Movies',
  Romance: 'Romance Movies',
  'Sci-Fi': 'Sci-Fi Movies',
  Sport: 'Sports Movies',
  Thriller: 'Thrillers',
  War: 'War Movies',
  Western: 'Westerns',
};
const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Significant words, with "1980s"/"80s" made equal, for spotting collections that already cover an idea. */
const tokens = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/\b(19|20)(\d)0s\b/g, (_, c, d) => (c === '19' && Number(d) >= 7 ? `${d}0s` : `${c}${d}0s`))
      .replace(/\bsci[- ]fi\b/g, 'scifi')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !['the', 'of', 'and', 'movies', 'films', 'feature', 'best', 'classics', 'classic', 'collection', 'every', 'movie', 'film', 'in', 'order'].includes(w))
      .map((w) => w.replace(/s$/, '')),
  );

// ---------------------------------------------------------------- ideas

export function findIdeas(movies: Movie[], minFilms: number, maxYear: number | null = null): Omit<Idea, 'volume' | 'volumeCheckedAt' | 'status'>[] {
  const ideas: Omit<Idea, 'volume' | 'volumeCheckedAt' | 'status'>[] = [];
  const count = (rule: CollectionRule) => movies.filter((m) => matchesRule(m, rule)).length;

  // Decade collections only for decades the older-films catalogue covers (e.g. up to the 2010s when the cutoff is 2015).
  const decades = [...new Set(movies.map((m) => Math.floor(Number(m.year) / 10) * 10).filter((d) => d >= 1920 && (maxYear === null || d <= maxYear)))];
  for (const d of decades)
    for (const g of Object.keys(GENRE_NAMES)) {
      const rule = { decades: [d], genres: [g] };
      const films = count(rule);
      if (films < minFilms) continue;
      const name = `${decadeLabel(d)} ${GENRE_NAMES[g]}`;
      ideas.push({ slug: slugify(name), name, kind: 'decade-genre', rule, films, keywords: [name, `best ${name}`].map(cleanKeyword) });
    }

  const tally = (pick: (m: Movie) => string[]) => {
    const t = new Map<string, number>();
    for (const m of movies) for (const p of new Set(pick(m))) t.set(p, (t.get(p) ?? 0) + 1);
    return t;
  };
  for (const [person, films] of tally(directorsOf)) {
    if (films < minFilms) continue;
    const name = `${person} Movies`;
    ideas.push({ slug: slugify(name), name, kind: 'director', rule: { directors: [person] }, films, keywords: [`${person} movies`, `best ${person} movies`].map(cleanKeyword) });
  }
  for (const [person, films] of tally((m) => m.cast)) {
    if (films < minFilms) continue;
    const name = `${person} Movies`;
    if (ideas.some((i) => i.slug === slugify(name))) continue; // actor-directors
    ideas.push({ slug: slugify(name), name, kind: 'actor', rule: { actors: [person] }, films, keywords: [`${person} movies`, `best ${person} movies`].map(cleanKeyword) });
  }
  return ideas;
}

/** The existing collection that already covers an idea, if any. */
export function coveredBy(idea: Pick<Idea, 'slug' | 'name'>, collections: MovieCollection[]): string | null {
  const want = tokens(idea.name);
  for (const c of collections) {
    if (c.slug === idea.slug) return c.slug;
    const have = tokens(`${c.name} ${c.slug.replace(/-/g, ' ')}`);
    if ([...want].every((w) => have.has(w))) return c.slug;
  }
  return null;
}

const STALE_DAYS = 180;
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function buildCollections(
  movies: Movie[],
  collections: MovieCollection[],
  cache: Idea[],
  opt: CollectionsOptions,
): Promise<{ collections: MovieCollection[]; ideas: Idea[]; created: string[]; log: string[]; report: string; changed: boolean }> {
  const log: string[] = [];
  const nowIso = opt.now.toISOString();
  const cached = new Map(cache.map((i) => [i.slug, i]));

  // Current ideas, keeping cached volumes.
  const ideas: Idea[] = findIdeas(movies, opt.minFilmsForIdea, opt.maxYear).map((i) => {
    const old = cached.get(i.slug);
    const existingSlug = coveredBy(i, collections);
    return {
      ...i,
      volume: old?.volume ?? null,
      competition: old?.competition ?? null,
      volumeCheckedAt: old?.volumeCheckedAt ?? null,
      volumeLocation: old?.volumeLocation ?? null,
      status: old?.status === 'created' ? 'created' : existingSlug ? 'existing' : 'open',
      existingSlug,
    };
  });

  // Volumes for open ideas that are new or stale (one task = up to 1,000 keywords).
  const stale = (i: Idea) =>
    !i.volumeCheckedAt || (i.volumeLocation ?? 'Australia') !== opt.location || opt.now.getTime() - Date.parse(i.volumeCheckedAt) > STALE_DAYS * 86400000;
  const toCheck = ideas.filter((i) => i.status === 'open' && stale(i)).slice(0, 500);
  if (toCheck.length && opt.volumes && opt.budget.left > 0) {
    opt.budget.left--;
    try {
      const vols = await opt.volumes(toCheck.flatMap((i) => i.keywords));
      for (const i of toCheck) {
        const v = i.keywords.map((k) => vols.get(k));
        i.volume = v.every((x) => x == null) ? null : v.reduce<number>((s, x) => s + (x ?? 0), 0);
        i.volumeCheckedAt = nowIso;
        i.volumeLocation = opt.location;
      }
      log.push(`Looked up search volumes for ${toCheck.length} collection idea(s).`);
    } catch (e) {
      log.push(`Volume lookup failed: ${(e as Error).message}.`);
    }
  }

  // Create the best open ideas. Without volumes, fall back to the ideas with the most films.
  const haveVolumes = ideas.some((i) => i.volume != null);
  const ranked = ideas
    .filter((i) => i.status === 'open' && i.films >= minFilmsFor(i, opt.minFilms) && (!haveVolumes || (i.volume ?? 0) >= opt.minVolume))
    // Only themes we can win: checked and open enough. Unchecked ideas wait for the collcheck job.
    .filter((i) => i.competition != null && i.competition.openness >= MIN_OPENNESS)
    // Winnable demand = searches x share of Google's top 10 that's beatable.
    .sort((a, b) => winnable(b) - winnable(a) || b.films - a.films);

  const created: string[] = [];
  const out = [...collections];
  for (const idea of ranked.slice(0, opt.perRun)) {
    if (opt.budget.left <= 0) break;
    const films = movies.filter((m) => matchesRule(m, idea.rule)).sort((a, b) => (a.year ?? '').localeCompare(b.year ?? ''));
    opt.budget.left--;
    let copy: CollectionCopy;
    try {
      copy = await opt.copy(idea.name, films);
    } catch (e) {
      log.push(`Claude failed for "${idea.name}": ${(e as Error).message} (will retry next run).`);
      continue;
    }
    out.push({
      id: randomId(),
      slug: idea.slug,
      name: idea.name,
      tagline: copy.tagline,
      introHtml: copy.intro.map((p) => `<p>${escapeHtml(p)}</p>`).join(''),
      metaDescription: copy.metaDescription,
      featured: false,
      movieSlugs: [],
      rule: idea.rule,
      auto: true,
      created: nowIso,
      updated: nowIso,
    });
    idea.status = 'created';
    created.push(`${idea.name} (${films.length} films${idea.volume != null ? `, ${idea.volume}/mo` : ''}) → /discover/${idea.slug}`);
  }
  log.unshift(`Collections: created ${created.length}${created.length ? ': ' + created.join('; ') : ''}.`);

  const changed = created.length > 0 || toCheck.some((i) => i.volumeCheckedAt === nowIso) || JSON.stringify(cache) !== JSON.stringify(ideas);
  return { collections: out, ideas, created, log, report: report(ideas, opt, haveVolumes), changed };
}

function report(ideas: Idea[], opt: CollectionsOptions, haveVolumes: boolean): string {
  const vol = (i: Idea) => (i.volume == null ? '—' : i.volume.toLocaleString());
  const byVol = (a: Idea, b: Idea) => (b.volume ?? -1) - (a.volume ?? -1) || b.films - a.films;
  const L = [
    '# Trailer channel collection ideas',
    '',
    `Updated ${opt.now.toISOString().slice(0, 10)}. Searches/mo = Google searches in ${opt.location} for "<theme>" + "best <theme>".` +
      (haveVolumes ? '' : ' (No search volumes yet: DataForSEO not set up.)'),
    '',
    `New collections need at least ${opt.minFilms} films and ${opt.minVolume} searches/mo. Up to ${opt.perRun} are created each month, as smart collections that keep filling themselves.`,
    '',
    '## Next to create',
    '',
    '| Collection | Films | Searches/mo |',
    '|---|---:|---:|',
  ];
  const next = ideas.filter((i) => i.status === 'open' && i.films >= opt.minFilms).sort(byVol).slice(0, 20);
  for (const i of next) L.push(`| ${i.name} | ${i.films} | ${vol(i)} |`);
  if (!next.length) L.push('| _none_ | | |');

  L.push('', '## Popular themes that need more films', '', 'Add catalogue candidates for these ("add candidates: 80s horror") and they become collections once there are enough.', '', '| Theme | Films now | Searches/mo |', '|---|---:|---:|');
  const grow = ideas.filter((i) => i.status === 'open' && i.films < opt.minFilms).sort(byVol).slice(0, 20);
  for (const i of grow) L.push(`| ${i.name} | ${i.films} | ${vol(i)} |`);
  if (!grow.length) L.push('| _none_ | | |');

  L.push('', '## Already covered', '', '| Theme | Films | Searches/mo | Collection |', '|---|---:|---:|---|');
  for (const i of ideas.filter((x) => x.status !== 'open').sort(byVol).slice(0, 30))
    L.push(`| ${i.name} | ${i.films} | ${vol(i)} | /discover/${i.status === 'created' ? i.slug : i.existingSlug} |`);
  L.push('');
  return L.join('\n');
}

function randomId(): string {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
