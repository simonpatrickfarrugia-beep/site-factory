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
  /\b(official|trailer|teaser|red ?band|tv spot|final trailer|first look|sneak peek|exclusive|clip|original|domestic|international|(?:3d )?re-?release|\d+(?:st|nd|rd|th) anniversary|4k|uhd|ultra hd|blu-?ray|restoration|restored|remastered|limited edition|collector'?s edition|special edition)\b/i;

/** True if a video looks like a trailer worth considering (same rule as the old Make scenario, plus no Shorts). */
export function isTrailer(videoTitle: string): boolean {
  const t = videoTitle.toLowerCase();
  return t.length > 4 && t.includes('trailer') && !t.includes('#shorts') && !/\breaction\b|\bbreakdown\b|\breview\b/.test(t);
}

export function extractYear(videoTitle: string): number | null {
  const m = videoTitle.match(/[([]\s*((?:19|20)\d{2})\s*[)\]]/) ?? videoTitle.match(/\b((?:19|20)\d{2})\b/);
  return m ? Number(m[1]) : null;
}

/** Only a year in brackets, e.g. "(1983)". Used on video descriptions, where bare years are often release dates. */
export function extractBracketYear(text: string): number | null {
  const m = text.match(/[([]\s*((?:19|20)\d{2})\s*[)\]]/);
  return m ? Number(m[1]) : null;
}

export function cleanTitle(videoTitle: string): string {
  let t = videoTitle
    .replace(/[“”"]/g, '')
    // "(4K UHD)", "[Restored]", "(Blu-ray)": format notes in brackets go first, so they don't cut the title mid-bracket.
    .replace(/[([][^)\]]*\b(4k|uhd|hd|ultra hd|blu-?ray|restor\w*|remaster\w*)\b[^)\]]*[)\]]/gi, ' ')
    .trim();

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
    .replace(/[\s|:\-–—,#([]+$/g, '')
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
 * Skips fan-made, concept and parody videos. For older films it guards against remakes and re-releases
 * that share the title (e.g. Aladdin 1992 vs 2019): a result naming a different year, or with
 * "in theaters" release wording for a film that's years old, is rejected. Prefers titles with the film's
 * year, then classic-trailer channels, then "official".
 */
export function pickTrailer<T extends { title: string; channelTitle: string }>(results: T[], name: string, year?: string | number | null): T | null {
  const want = titleKey(name);
  const y = Number(year) || null;
  const thisYear = new Date().getUTCFullYear();
  const ok = results.filter((r) => {
    if (!isTrailer(r.title) || !titleKey(r.title).includes(want)) return false;
    if (/concept|fan[- ]made|fanmade|parody|recut|\bai\b|live[- ]action/i.test(r.title)) return false;
    if (y) {
      const years = [...r.title.matchAll(/\b(19[2-9]\d|20[0-4]\d)\b/g)].map((m) => Number(m[1]));
      if (years.length && !years.some((x) => Math.abs(x - y) <= 1)) return false;
      if (thisYear - y > 3 && /in theat(?:re|er)s|coming soon|now playing/i.test(r.title)) return false;
    }
    return true;
  });
  const score = (r: T) =>
    (y && new RegExp(`\\b${y}\\b`).test(r.title) ? 4 : 0) +
    (/classic trailers/i.test(`${r.title} ${r.channelTitle}`) ? 2 : 0) +
    (/official/i.test(r.title) ? 1 : 0);
  return [...ok].sort((a, b) => score(b) - score(a))[0] ?? null;
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
