/**
 * Free full films on /watch: only films in the PUBLIC DOMAIN IN THE UNITED STATES (1 Nov 2026).
 *
 * The rules live here, in code, so a film that breaks one fails the build instead of going live.
 * Data: data/trailers/public-domain.json. Outside checks (Wikidata, Wikipedia's US public domain films list, the
 * Internet Archive copy) run weekly in .github/workflows/public-domain.yml and open a "rights" issue if anything moves.
 *
 * The rules:
 *  1. Two ways in, nothing else:
 *     - "term-expired": first published in the US 96+ years ago (US term for 1928–1977 works is 95 years from
 *       publication, ending 31 December). Worked out from today's date in Hawaii, the last US state to reach
 *       1 January, so a film is never released early. A film published after the cutoff stays "held" and goes live
 *       on its own at the first build of the year it's free.
 *     - "no-notice" / "not-renewed": a US film (1931–1977) that lost copyright through a missing notice or an
 *       unrenewed registration. US-made only: foreign films' US copyrights were restored in 1996 (URAA).
 *       Needs evidence links, and every work it's based on (novel, play, story) must be original or itself
 *       public domain. A film whose underlying story or music is still owned (It's a Wonderful Life) is blocked.
 *  2. The plain original only: no restorations, new scores, narration, colourised or re-edited versions
 *     (those can carry new copyright). Silent films play silent or with their own period accompaniment.
 *  3. Played only to US visitors (/api/geo). Elsewhere the page explains why and points to the Internet Archive.
 *  4. Plain titles. No studio franchise branding or character trademarks (e.g. "Universal Monsters").
 *  5. Anyone can ask us to take a film down (hello@movietrailer.channel); status "removed" takes it off at once.
 */

export type FreeBasis = 'term-expired' | 'no-notice' | 'not-renewed' | 'lapsed';

export interface FreeFilm {
  slug: string; // "<name>-<year>". Plays on /movies/<slug>, or on the trailer page for the same film and year
  name: string;
  year: string; // first publication (release) year in the US for lapsed films; first publication anywhere for term-expired
  country: string; // ISO code of the country of origin ("US", "DE", "FR"…)
  basis: FreeBasis;
  /** Plain-English reason, shown on the page. */
  basisNote: string;
  /** Sources a reader can check. At least one; lapsed films need two. */
  evidence: { label: string; url: string }[];
  /** Works the film is based on. "original" = written for the film. Lapsed films must list at least one. */
  underlying: { work: string; year?: number; status: 'original' | 'public-domain'; note?: string }[];
  /** "silent" (no soundtrack or period accompaniment) or "original" (the film's own release soundtrack). */
  audio: 'silent' | 'original';
  archiveId: string; // Internet Archive identifier of the copy we embed
  wikidata: string; // Q-number of the film
  runtimeMinutes: number;
  director: string;
  cast: string[];
  genres: string[];
  /** Our own words about the film (80+ words). */
  about: string;
  /** Who should watch it, in our words. */
  watchIf?: string;
  /** Existing trailer page for the same film, if any. */
  moviesSlug?: string;
  /** checkedOn: a person checked the entry. audioCheckedOn: silent films only, a person played the Archive copy and
   *  confirmed no modern score, narration or re-edit (a newly recorded score can carry its own copyright). */
  audit: { checkedOn: string; audioCheckedOn?: string; note?: string; acceptedFlags?: string[] };
  /** live = on the site · held = waiting for its year to be free (goes live by itself) · pending = waiting for a
   *  person's check (pendingReason) · removed = taken down. */
  status: 'live' | 'held' | 'pending' | 'removed';
  pendingReason?: string;
}

/** Films that look public domain but aren't safe to show (underlying story, music or later version still owned). */
const BLOCKED: Record<string, string> = {
  'its-a-wonderful-life': 'the film lapsed in 1974, but the story and the music are still owned',
  'the-gold-rush-1942': 'the 1942 re-release has new narration and music (copyrighted); only the 1925 silent cut is free',
  'witchcraft-through-the-ages': 'the 1968 version adds narration and a score (copyrighted); only the 1922 silent Häxan is free',
  'charade': 'title song and score handled separately; not verified',
  'a-star-is-born-1937': 'later rights claims on the story; not verified',
};
/** Studio franchise names and character trademarks we never use in our copy. */
const TRADEMARK_WORDS = ['universal monsters', 'universal classic monsters', 'hammer horror', 'mickey mouse', 'disney'];

/** The latest first-publication year that is out of copyright in the US by age, today (Hawaii time). */
export function usCutoffYear(now = new Date()): number {
  return new Date(now.getTime() - 10 * 3600 * 1000).getUTCFullYear() - 96;
}

const ARCHIVE_ID = /^[A-Za-z0-9._-]{3,100}$/;
const QID = /^Q\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Checks every film against the rules and returns the ones to publish today. Any rule broken → throws, so the build
 * fails with a readable reason and nothing goes live. "held" films are skipped until their year is free.
 */
export function freeFilmsToPublish(films: FreeFilm[], now = new Date()): FreeFilm[] {
  const cutoff = usCutoffYear(now);
  const errors: string[] = [];
  const out: FreeFilm[] = [];
  const seen = new Set<string>();
  for (const f of films) {
    const at = `${f.name ?? '?'} (${f.year ?? '?'})`;
    const bad = (msg: string) => errors.push(`${at}: ${msg}`);
    if (f.status === 'removed') continue;
    const publishing = f.status === 'live' || f.status === 'held';
    const year = Number(f.year);
    if (!f.slug || !/^[a-z0-9-]+-\d{4}$/.test(f.slug) || !f.slug.endsWith(String(year))) bad('slug must be "<name>-<year>"');
    if (seen.has(f.slug)) bad('duplicate slug');
    seen.add(f.slug);
    for (const [key, why] of Object.entries(BLOCKED)) if (f.slug.startsWith(key)) bad(`blocked: ${why}`);
    if (!Number.isInteger(year) || year < 1880) bad('year missing');
    if (!f.basisNote?.trim()) bad('basisNote missing');
    if (!f.evidence?.length || f.evidence.some((e) => !/^https:\/\//.test(e.url) || !e.label)) bad('evidence needs https links with labels');
    if (!ARCHIVE_ID.test(f.archiveId ?? '')) bad('archiveId missing or malformed');
    if (!QID.test(f.wikidata ?? '')) bad('wikidata Q-number missing');
    if (!(f.runtimeMinutes > 0)) bad('runtimeMinutes missing');
    if (f.audio !== 'silent' && f.audio !== 'original') bad('audio must be "silent" or "original" (no added scores or narration)');
    if (!f.audit || !DATE.test(f.audit.checkedOn ?? '')) bad('audit.checkedOn (YYYY-MM-DD) missing: a person must have checked this film');
    if (publishing && f.audio === 'silent' && !DATE.test(f.audit?.audioCheckedOn ?? '')) bad('silent film: play the Archive copy and confirm no modern score or narration, then set audit.audioCheckedOn (or status "pending")');
    if (f.status === 'pending' && !f.pendingReason) bad('pending needs a pendingReason');
    if (words(f.about ?? '') < 80) bad(`about is ${words(f.about ?? '')} words; write 80+ of our own`);
    const text = `${f.name} ${f.about} ${f.watchIf ?? ''} ${f.basisNote}`.toLowerCase();
    for (const w of TRADEMARK_WORDS) if (text.includes(w)) bad(`uses the trademark "${w}"`);

    if (f.basis === 'term-expired') {
      if (year > cutoff && f.status !== 'held') bad(`published ${year}: still in US copyright until 1 January ${year + 96}. Set status "held".`);
      if (year > cutoff) continue; // held: goes live by itself when its year is free
    } else if (f.basis === 'no-notice' || f.basis === 'not-renewed' || f.basis === 'lapsed') {
      if (f.country !== 'US') bad('lapsed copyright only counts for US-made films (foreign films were restored in 1996)');
      if (year > 1977) bad('lapse rules only apply to films published before 1978');
      if ((f.evidence?.length ?? 0) < 2) bad('lapsed films need two evidence links');
      if (!f.underlying?.length) bad('list the works it is based on ("original" if written for the film)');
      for (const u of f.underlying ?? []) {
        if (u.status === 'public-domain' && !(u.year && u.year <= cutoff)) bad(`based on "${u.work}" (${u.year ?? 'no year'}): not public domain by age; can't show it`);
        if (u.status !== 'original' && u.status !== 'public-domain') bad(`underlying work "${u.work}" has no status`);
      }
    } else {
      bad('basis must be term-expired, no-notice, not-renewed or lapsed');
    }
    if (!['live', 'held', 'pending'].includes(f.status)) bad('status must be live, held, pending or removed');
    if (f.status === 'live' || (f.status === 'held' && f.basis === 'term-expired' && year <= cutoff)) out.push(f);
  }
  if (errors.length) throw new Error(`Free films rules broken (brands/trailers/public-domain.ts):\n- ${errors.join('\n- ')}`);
  return out.sort((a, b) => Number(a.year) - Number(b.year) || a.name.localeCompare(b.name));
}

export const archiveThumb = (id: string) => `https://archive.org/services/img/${id}`;
export const archiveEmbed = (id: string) => `https://archive.org/embed/${id}`;
export const archivePage = (id: string) => `https://archive.org/details/${id}`;

/** Plain-English "why is this free?" line for the page. */
export function basisLine(f: FreeFilm): string {
  if (f.basis === 'term-expired') return `Published in ${f.year}, it is out of copyright in the United States: US copyright on films of that era lasted 95 years.`;
  if (f.basis === 'no-notice') return `It entered the US public domain on release because it was published without a valid copyright notice, which US law required at the time.`;
  if (f.basis === 'not-renewed') return `Its US copyright was never renewed, which US law required at the time, so it entered the public domain.`;
  return `Its US copyright lapsed: US law at the time required a copyright notice on release and a renewal after 28 years, and the owners didn't keep it up, so it entered the public domain.`;
}

/** Films waiting for their year to be free (status "held", year after the cutoff): shown as "free from 1 January". */
export function upcomingFreeFilms(films: FreeFilm[], now = new Date()): (FreeFilm & { freeOn: string })[] {
  const cutoff = usCutoffYear(now);
  return films
    .filter((f) => f.status === 'held' && f.basis === 'term-expired' && Number(f.year) > cutoff)
    .map((f) => ({ ...f, freeOn: `1 January ${Number(f.year) + 96}` }));
}

/** Same film, any year: "Nosferatu" (2024) ↔ "Nosferatu" (1922). */
export const sameTitle = (a: string, b: string) => {
  const n = (s: string) => s.toLowerCase().replace(/^(the|a|an)\s+/, '').replace(/[^a-z0-9]/g, '');
  return n(a) === n(b);
};
