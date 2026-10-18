/**
 * Turning a YouTube video title into a film title (and year) we can look up.
 *
 *   "Marvel Studios' Avengers: Endgame - Official Trailer"   -> "Avengers: Endgame"
 *   "AIR FORCE ONE [1997] - Official Trailer (HD)"           -> "Air Force One", 1997
 *   "Aliens (1986) Trailer #1 | Movieclips Classic Trailers" -> "Aliens", 1986
 *   "ANIMOL Official Trailer (2026) Stephen Graham"          -> "Animol", 2026
 */

/** Studio prefixes that come before the film name. Kept as an explicit list so "Ocean's Eleven" stays intact. */
const STUDIO_PREFIXES = [
  "marvel studios'", "marvel studios’", "marvel's", "marvel’s",
  "disney and pixar's", "disney and pixar’s", "disney pixar's", "disney•pixar's", "disney·pixar's", "pixar's", "pixar’s",
  "disney's", "disney’s", "dreamworks animation's", "dreamworks'", "dreamworks’", "lucasfilm's", "illumination's",
  "universal pictures'", "warner bros.'", "netflix's", "a24's", "neon's", "sony pictures'", "paramount's",
];

/** The first of these words marks where the film name ends. */
const CUT_WORDS =
  /\b(official|trailer|teaser|red ?band|tv spot|final trailer|first look|sneak peek|exclusive|clip|original|domestic|international|(?:3d )?re-?release|\d+(?:st|nd|rd|th) anniversary)\b/i;

/** True if a video looks like a trailer worth considering (same rule as the old Make scenario, plus no Shorts). */
export function isTrailer(videoTitle: string): boolean {
  const t = videoTitle.toLowerCase();
  return t.length > 4 && t.includes('trailer') && !t.includes('#shorts') && !/\breaction\b|\bbreakdown\b|\breview\b/.test(t);
}

export function extractYear(videoTitle: string): number | null {
  const m = videoTitle.match(/[([]\s*((?:19|20)\d{2})\s*[)\]]/) ?? videoTitle.match(/\b((?:19|20)\d{2})\b/);
  return m ? Number(m[1]) : null;
}

export function cleanTitle(videoTitle: string): string {
  let t = videoTitle.replace(/[“”"]/g, '').trim();

  const lower = t.toLowerCase();
  for (const p of STUDIO_PREFIXES) {
    if (lower.startsWith(p + ' ')) {
      t = t.slice(p.length).trim();
      break;
    }
  }

  // Cut at the first separator ( | - – — ) or keyword, whichever comes first.
  const sep = t.search(/\s[|\-–—]\s|\s\|/);
  const kw = t.search(CUT_WORDS);
  const cuts = [sep, kw].filter((i) => i > 0);
  if (cuts.length) t = t.slice(0, Math.min(...cuts));

  t = t
    .replace(/[([]\s*(?:19|20)\d{2}\s*[)\]]/g, '') // (1986) [1997]
    .replace(/[([](?:hd|4k|uhd)[)\]]/gi, '')
    .replace(/[\s|:\-–—,#]+$/g, '')
    .replace(/\s+(movie|film)$/i, '') // "Selma Movie"
    .replace(/\s{2,}/g, ' ')
    .trim();

  // SHOUTED TITLES -> Title Case (OMDb's own title replaces this when we get a match).
  if (t === t.toUpperCase() && /[A-Z]{2}/.test(t)) {
    t = t.toLowerCase().replace(/(^|[\s:(-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
  }
  return t;
}

/** Comparison key: lower case, letters and digits only, no leading "the", "&" = "and", no "Episode VII". */
export function titleKey(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\bepisode [ivxlc]+\b/g, '')
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Pick the official trailer from YouTube search results: a trailer whose title names the film.
 * Prefers results that don't look like fan-made, reaction or "concept" videos.
 */
export function pickTrailer<T extends { title: string; channelTitle: string }>(results: T[], name: string): T | null {
  const want = titleKey(name);
  const ok = results.filter(
    (r) => isTrailer(r.title) && titleKey(r.title).includes(want) && !/concept|fan[- ]made|fanmade|parody|recut|\bai\b/i.test(r.title),
  );
  return ok.find((r) => /official/i.test(r.title)) ?? ok[0] ?? null;
}

export function slugify(name: string, year: string | null): string {
  const base = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return year ? `${base}-${year}` : base;
}
