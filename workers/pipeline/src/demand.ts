/**
 * Monthly demand report from Search Console: what people search for, and what to build next.
 *
 * Sections:
 *   1. Headline numbers and top searches
 *   2. Quick wins: pages ranking 4–20 for searches with real volume (improve the page)
 *   3. Low click-through: ranking top 5 but rarely clicked (rewrite title/description)
 *   4. Films people search for that the site doesn't have (candidates for the queue)
 *   5. Collection ideas from "best / movies like / 90s / director movies" searches
 *
 * Pure function: no network. The Worker fetches the rows and commits the report.
 */
import type { GscRow } from './google';
import { titleKey } from './titles';

interface MovieLite {
  slug: string;
  name: string;
  year: string | null;
}
interface CollectionLite {
  slug: string;
  name: string;
}

export interface DemandInput {
  site: string; // https://www.movietrailer.channel
  start: string;
  end: string;
  queries: GscRow[]; // dimensions: [query]
  pageQueries: GscRow[]; // dimensions: [query, page]
  movies: MovieLite[];
  collections: CollectionLite[];
}

export interface FilmIdea {
  title: string;
  year: number | null;
  impressions: number;
  clicks: number;
  queries: string[];
}
export interface ThemeIdea {
  theme: string;
  impressions: number;
  clicks: number;
  queries: string[];
  existing: string | null; // collection slug if we already have one
}

export interface DemandReport {
  markdown: string;
  films: FilmIdea[];
  themes: ThemeIdea[];
}

/** Words around a film name in a search: "dune part two trailer 2024 cast" -> "dune part two". */
const FILLER =
  /\b(official|trailers?|teasers?|full|hd|4k|cast|where to watch|watch|streaming|stream|online|free|release date|review|reviews|ending explained|explained|imdb|rating|netflix|prime video|prime|disney plus|disney\+|hbo max|max|hulu|plot|soundtrack|song|music|runtime|box office|budget|rotten tomatoes|parents guide|age rating|tv spot|clip|scene|scenes|the movie|movie|film)\b/g;

/** Searches about a group of films rather than one film. */
const THEME =
  /\b(best|top|greatest|movies like|films like|movies about|movies with|in order|order|collection|list|ranked|ranking|every|all)\b|\b(movies|films|trailers)\b|\b(19|20)?\d0s\b|\b(christmas|halloween|horror|comedies|oscar|oscars|academy award)\b/;

const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'to', 'for', 'movies', 'movie', 'films', 'film', 'best', 'top', 'all', 'every', 'list']);

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));

export function classify(query: string): { kind: 'brand' | 'theme' | 'film'; core: string; year: number | null } {
  const q = query.toLowerCase().trim();
  if (/movietrailer\.?channel/.test(q.replace(/\s+/g, ''))) return { kind: 'brand', core: q, year: null };
  const year = Number(q.match(/\b(19[2-9]\d|20[0-4]\d)\b/)?.[1]) || null;
  if (THEME.test(q)) return { kind: 'theme', core: q.replace(/\b(19|20)\d{2}\b/g, '').replace(/\s{2,}/g, ' ').trim(), year };
  const core = q
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(FILLER, ' ')
    .replace(/[^\p{L}\p{N}:'&\s-]/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { kind: 'film', core, year };
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const pos = (n: number) => n.toFixed(1);
const titleCase = (s: string) => s.replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

export function buildDemandReport(input: DemandInput, opts: { minImpressions?: number; maxYear?: number | null } = {}): DemandReport {
  const { queries, pageQueries, movies, collections } = input;
  const min = opts.minImpressions ?? 20;
  const movieKeys = new Map(movies.map((m) => [titleKey(m.name), m]));

  const totalClicks = queries.reduce((s, r) => s + r.clicks, 0);
  const totalImpr = queries.reduce((s, r) => s + r.impressions, 0);

  // 2. Quick wins: best query per page where we rank 4–20.
  const pages = new Map<string, { page: string; impressions: number; clicks: number; best: GscRow }>();
  for (const r of pageQueries) {
    const [, page] = r.keys;
    if (r.position < 4 || r.position > 20 || r.impressions < min) continue;
    const p = pages.get(page) ?? { page, impressions: 0, clicks: 0, best: r };
    p.impressions += r.impressions;
    p.clicks += r.clicks;
    if (r.impressions > p.best.impressions) p.best = r;
    pages.set(page, p);
  }
  const quickWins = [...pages.values()].sort((a, b) => b.impressions - a.impressions).slice(0, 15);

  // 3. Low click-through.
  const lowCtr = queries
    .filter((r) => r.position <= 5 && r.impressions >= Math.max(min, 50) && r.ctr < 0.02)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);

  // 4 + 5. Missing films and themes.
  const films = new Map<string, FilmIdea>();
  const themes = new Map<string, ThemeIdea>();
  for (const r of queries) {
    const c = classify(r.keys[0]);
    if (c.kind === 'brand') continue;
    // "studio ghibli where to watch" looks like a film search but names one of our collections.
    if (c.kind === 'film' && !movieKeys.has(titleKey(c.core)) && words(c.core).length && matchCollection(words(c.core), collections))
      c.kind = 'theme';
    if (c.kind === 'film') {
      const key = titleKey(c.core);
      if (key.length < 3 || movieKeys.has(key)) continue;
      const f = films.get(key) ?? { title: titleCase(c.core), year: c.year, impressions: 0, clicks: 0, queries: [] };
      f.impressions += r.impressions;
      f.clicks += r.clicks;
      f.year ??= c.year;
      if (f.queries.length < 5) f.queries.push(r.keys[0]);
      films.set(key, f);
    } else {
      const ws = words(c.core);
      if (!ws.length) continue;
      const key = [...ws].sort().join(' ');
      const t = themes.get(key) ?? { theme: c.core, impressions: 0, clicks: 0, queries: [], existing: matchCollection(ws, collections) };
      t.impressions += r.impressions;
      t.clicks += r.clicks;
      if (t.queries.length < 5) t.queries.push(r.keys[0]);
      themes.set(key, t);
    }
  }
  const filmIdeas = [...films.values()]
    .filter((f) => f.impressions >= min / 2 && !(opts.maxYear && f.year && f.year > opts.maxYear)).sort((a, b) => b.impressions - a.impressions).slice(0, 25);
  const themeIdeas = [...themes.values()].filter((t) => t.impressions >= min / 2).sort((a, b) => b.impressions - a.impressions).slice(0, 25);

  // Markdown.
  const L: string[] = [];
  const short = (u: string) => u.replace(/^https?:\/\/[^/]+/, '') || '/';
  L.push(`# Trailer channel demand report: ${input.start} to ${input.end}`, '');
  L.push(`Source: Google Search Console (${input.site}). ${totalClicks.toLocaleString()} clicks from ${totalImpr.toLocaleString()} impressions across ${queries.length.toLocaleString()} searches.`, '');
  L.push('Ask in the Trailers chat: "act on the demand report" to queue films, build collections or rewrite titles.', '');

  L.push('## Top searches', '', '| Search | Impressions | Clicks | Avg position |', '|---|---:|---:|---:|');
  for (const r of [...queries].sort((a, b) => b.impressions - a.impressions).slice(0, 15))
    L.push(`| ${r.keys[0]} | ${r.impressions} | ${r.clicks} | ${pos(r.position)} |`);

  L.push('', '## Quick wins: pages ranking 4–20', '', 'Improving these pages (more text, better title, internal links) can move them onto page 1.', '');
  if (!quickWins.length) L.push('_None yet._');
  else {
    L.push('| Page | Impressions | Main search | Position |', '|---|---:|---|---:|');
    for (const p of quickWins) L.push(`| ${short(p.page)} | ${p.impressions} | ${p.best.keys[0]} | ${pos(p.best.position)} |`);
  }

  L.push('', '## Low click-through: top 5 but rarely clicked', '', 'The title or description in Google is not tempting enough.', '');
  if (!lowCtr.length) L.push('_None yet._');
  else {
    L.push('| Search | Impressions | CTR | Position |', '|---|---:|---:|---:|');
    for (const r of lowCtr) L.push(`| ${r.keys[0]} | ${r.impressions} | ${pct(r.ctr)} | ${pos(r.position)} |`);
  }

  L.push('', '## Films people search for that we don\'t have', '', 'Google already shows the site for these. Films newer than the catalogue cutoff are left out. Approve the real films and they go into the pipeline queue.', '');
  if (!filmIdeas.length) L.push('_None yet._');
  else {
    L.push('| Film (guessed from searches) | Impressions | Example searches |', '|---|---:|---|');
    for (const f of filmIdeas) L.push(`| ${f.title}${f.year ? ` (${f.year})` : ''} | ${f.impressions} | ${f.queries.slice(0, 3).join('; ')} |`);
  }

  L.push('', '## Collection ideas', '', 'Searches about groups of films. "Have it" means an existing collection already covers the theme.', '');
  if (!themeIdeas.length) L.push('_None yet._');
  else {
    L.push('| Theme | Impressions | Have it? | Example searches |', '|---|---:|---|---|');
    for (const t of themeIdeas)
      L.push(`| ${t.theme} | ${t.impressions} | ${t.existing ? `/discover/${t.existing}` : '**new**'} | ${t.queries.slice(0, 3).join('; ')} |`);
  }
  L.push('');

  return { markdown: L.join('\n'), films: filmIdeas, themes: themeIdeas };
}

function matchCollection(ws: string[], collections: CollectionLite[]): string | null {
  let best: { slug: string; score: number } | null = null;
  for (const c of collections) {
    const cw = new Set(words(`${c.name} ${c.slug.replace(/-/g, ' ')}`));
    const hit = ws.filter((w) => cw.has(w)).length;
    const score = hit / ws.length;
    if (score >= 0.6 && (!best || score > best.score)) best = { slug: c.slug, score };
  }
  return best?.slug ?? null;
}
