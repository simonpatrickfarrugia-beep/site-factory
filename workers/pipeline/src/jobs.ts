/**
 * The three jobs that replace the Make scenarios.
 *
 *   intake   every 12h   new trailers from studio channels -> queue
 *   enrich   daily       queue -> OMDb + Claude -> published movie
 *   recheck  monthly     "pending" queue items (no OMDb match yet) -> try again
 *
 * Jobs work on plain data (movies + queue) and never touch the network directly,
 * so they can be tested with fake services.
 */
import { cleanTitle, extractYear, isTrailer, slugify, titleKey } from './titles';
import type { Copy, FeedVideo, OmdbMovie } from './sources';

/** Same shape as brands/trailers/model.ts (kept separate so the Worker has no Astro imports). */
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

/** A trailer waiting to become a movie page. Lives in data/trailers/queue.json (not published). */
export interface QueueItem {
  /** Film title worked out from the video title. */
  title: string;
  year: number | null;
  /** Null for films added from the demand report or by chat: enrich finds a trailer on YouTube. */
  youtubeId: string | null;
  videoTitle: string | null;
  channelId: string | null;
  publishedAt: string | null;
  /** Where it came from. Missing = studio feed (older items). */
  source?: 'feed' | 'demand' | 'chat';
  /** new = not looked up yet; pending = upcoming film not in OMDb yet (rechecked monthly); review = needs a person. */
  status: 'new' | 'pending' | 'review';
  /** Why it is waiting, e.g. "NEEDS REVIEW: ...". */
  note: string | null;
  foundAt: string;
  lastChecked: string | null;
}

export interface State {
  movies: Movie[];
  queue: QueueItem[];
}

export interface Services {
  feed(channelId: string): Promise<FeedVideo[]>;
  omdb(title: string, year: number | null): Promise<OmdbMovie | null>;
  copy(m: OmdbMovie): Promise<Copy>;
  /** YouTube search for a film's trailer (only for queue items without a video). */
  trailer(name: string, year: string | null): Promise<{ youtubeId: string; title: string } | null>;
  /** Network calls still allowed in this run (Workers free plan: 50 per run). */
  budget: { left: number };
  now: Date;
}

export interface Result {
  log: string[];
  added: string[];
  queued: string[];
  /** True if movies.json changed (the site needs a rebuild). */
  moviesChanged: boolean;
  queueChanged: boolean;
}

const newResult = (): Result => ({ log: [], added: [], queued: [], moviesChanged: false, queueChanged: false });

// ---------------------------------------------------------------- intake

export async function intake(state: State, channels: string[], svc: Services): Promise<Result> {
  const r = newResult();
  const known = new Set<string>([...state.movies.map((m) => titleKey(m.name)), ...state.queue.map((q) => titleKey(q.title))]);
  const knownVideos = new Set<string>([
    ...state.movies.map((m) => m.youtubeId),
    ...state.queue.flatMap((q) => (q.youtubeId ? [q.youtubeId] : [])),
  ]);

  for (const channelId of channels) {
    if (svc.budget.left <= 0) {
      r.log.push(`Stopped early: call budget used up (channels left unchecked).`);
      break;
    }
    svc.budget.left--;
    let videos: FeedVideo[];
    try {
      videos = await svc.feed(channelId);
    } catch (e) {
      r.log.push(`Feed ${channelId} failed: ${(e as Error).message}`);
      continue;
    }
    // Newest 5 per channel, as before.
    for (const v of videos.slice(0, 5)) {
      if (!isTrailer(v.title) || knownVideos.has(v.youtubeId)) continue;
      const title = cleanTitle(v.title);
      const key = titleKey(title);
      if (key.length < 2 || known.has(key)) continue;
      known.add(key);
      knownVideos.add(v.youtubeId);
      state.queue.push({
        title,
        year: extractYear(v.title),
        youtubeId: v.youtubeId,
        videoTitle: v.title,
        channelId,
        publishedAt: v.publishedAt,
        source: 'feed',
        status: 'new',
        note: null,
        foundAt: svc.now.toISOString(),
        lastChecked: null,
      });
      r.queued.push(title);
      r.queueChanged = true;
    }
  }
  r.log.unshift(`Intake: ${r.queued.length} new trailer(s) queued${r.queued.length ? ': ' + r.queued.join(', ') : ''}.`);
  return r;
}

// ---------------------------------------------------------------- enrich + recheck

export function enrich(state: State, svc: Services, limit: number): Promise<Result> {
  return process(state, svc, limit, 'new');
}

export function recheck(state: State, svc: Services, limit: number): Promise<Result> {
  return process(state, svc, limit, 'pending');
}

async function process(state: State, svc: Services, limit: number, which: QueueItem['status']): Promise<Result> {
  const r = newResult();
  const items = state.queue
    .filter((q) => q.status === which)
    .sort((a, b) => (a.lastChecked ?? a.foundAt).localeCompare(b.lastChecked ?? b.foundAt))
    .slice(0, limit);

  const done = new Set<QueueItem>();
  const slugs = new Set(state.movies.map((m) => m.slug));
  const nowIso = svc.now.toISOString();
  const thisYear = svc.now.getUTCFullYear();

  for (const item of items) {
    // Each item needs up to 2 calls (OMDb, then Claude on a match), 3 if we must find its trailer.
    if (svc.budget.left < (item.youtubeId ? 2 : 3)) {
      r.log.push('Stopped early: call budget used up; the rest wait for the next run.');
      break;
    }
    svc.budget.left--;
    let found: OmdbMovie | null;
    try {
      found = await svc.omdb(item.title, item.year);
    } catch (e) {
      r.log.push(`OMDb failed for "${item.title}": ${(e as Error).message}`);
      if (/limit/i.test((e as Error).message)) break;
      continue;
    }

    const why = found ? mismatch(item, found) : 'no OMDb match';
    if (found && !why) {
      const slug = slugify(found.Title, yearOf(found));
      if (slugs.has(slug)) {
        r.log.push(`Skipped "${item.title}": already on the site as /movies/${slug}.`);
        done.add(item);
        r.queueChanged = true;
        continue;
      }
      if (!item.youtubeId) {
        svc.budget.left--;
        let t: { youtubeId: string; title: string } | null = null;
        try {
          t = await svc.trailer(found.Title, yearOf(found));
        } catch (e) {
          r.log.push(`YouTube search failed for "${found.Title}": ${(e as Error).message} (will retry next run).`);
          continue;
        }
        if (!t) {
          item.status = 'review';
          item.note = 'NEEDS REVIEW: no official trailer found on YouTube';
          item.lastChecked = nowIso;
          r.queued.push(`${item.title}: ${item.note}`);
          r.queueChanged = true;
          continue;
        }
        item.youtubeId = t.youtubeId;
        item.videoTitle = t.title;
        r.queueChanged = true;
      }
      svc.budget.left--;
      let copy: Copy;
      try {
        copy = await svc.copy(found);
      } catch (e) {
        r.log.push(`Claude failed for "${found.Title}": ${(e as Error).message} (will retry next run).`);
        continue;
      }
      state.movies.push(toMovie(item, found, copy, slug, nowIso));
      slugs.add(slug);
      done.add(item);
      r.added.push(`${found.Title} (${yearOf(found)}) → /movies/${slug}`);
      r.moviesChanged = r.queueChanged = true;
      continue;
    }

    // No usable match. A new film missing from OMDb just waits (rechecked monthly).
    // A wrong film, or an older film OMDb doesn't know, needs a person: it's left for review by chat.
    const expectedYear = item.year ?? (Number(item.publishedAt?.slice(0, 4)) || null);
    const upcoming = !found && expectedYear !== null && expectedYear >= thisYear;
    const status: QueueItem['status'] = upcoming ? 'pending' : 'review';
    const note = upcoming ? 'Waiting for OMDb to list it' : `NEEDS REVIEW: ${why}`;
    if (item.status !== status || item.note !== note) r.queued.push(`${item.title}: ${note}`);
    item.status = status;
    item.note = note;
    item.lastChecked = nowIso;
    r.queueChanged = true;
  }

  if (done.size) state.queue = state.queue.filter((q) => !done.has(q));
  const label = which === 'new' ? 'Enrich' : 'Recheck';
  const count = (s: QueueItem['status']) => state.queue.filter((q) => q.status === s).length;
  r.log.unshift(
    `${label}: looked at ${items.length}, published ${r.added.length}${r.added.length ? ' (' + r.added.join('; ') + ')' : ''}. ` +
      `Queue: ${count('pending')} waiting for OMDb, ${count('review')} need review.`,
  );
  return r;
}

const yearOf = (m: OmdbMovie) => m.Year.match(/\d{4}/)?.[0] ?? null;

/** Returns why an OMDb result is the wrong film, or null if it's right. */
export function mismatch(item: QueueItem, m: OmdbMovie): string | null {
  if (titleKey(m.Title) !== titleKey(item.title)) return `OMDb returned "${m.Title}"`;
  const y = Number(yearOf(m));
  if (!y) return 'OMDb has no year';
  if (item.year) {
    if (Math.abs(y - item.year) > 1) return `OMDb film is from ${y}, trailer says ${item.year}`;
  } else {
    // A brand-new trailer with no year is for a new film, not an old one with the same name.
    const posted = Number(item.publishedAt?.slice(0, 4));
    if (posted && y < posted - 2) return `OMDb film is from ${y}, trailer posted ${posted} (re-release or different film?)`;
  }
  return null;
}

const na = (v: string | undefined) => (!v || v === 'N/A' ? null : v);

function toMovie(item: QueueItem, m: OmdbMovie, copy: Copy, slug: string, nowIso: string): Movie {
  const rated = na(m.Rated);
  const imdb = Number(m.imdbRating);
  const runtime = parseInt(m.Runtime, 10);
  return {
    id: randomId(),
    slug,
    name: m.Title,
    year: yearOf(m),
    genres: (na(m.Genre) ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    director: na(m.Director),
    cast: (na(m.Actors) ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    runtimeMinutes: Number.isFinite(runtime) ? runtime : null,
    rating: !rated || /^(unrated|not rated)$/i.test(rated) ? 'Not Rated' : rated,
    imdbRating: Number.isFinite(imdb) && imdb > 0 ? imdb : null,
    boxOffice: na(m.BoxOffice),
    synopsis: na(m.Plot),
    tagline: copy.tagline,
    summary: copy.summary,
    youtubeId: item.youtubeId!, // set above (feed item, or found by trailer search)
    trailerTitle: item.videoTitle,
    rentBuyUrl: null,
    airtableId: null,
    created: nowIso,
    updated: nowIso,
  };
}

function randomId(): string {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
