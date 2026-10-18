/**
 * Trailer pipeline Worker for movietrailer.channel (replaces the Make scenarios).
 *
 * Runs on Cron Triggers (see wrangler.jsonc). Each run reads the site's data
 * files from GitHub, does its job, and commits the result as one commit.
 * A commit that changes movies.json rebuilds and deploys the site.
 *
 * Manual run (handy for testing from a phone):
 *   https://trailer-pipeline.<account>.workers.dev/run/intake?key=RUN_KEY&dry=1
 *   jobs: intake | enrich | recheck | demand | catalogue | collections ;  dry=1 shows what would change without committing.
 */
import { enrich, intake, maxYear, recheck, type QueueItem, type Movie, type Result, type State } from './jobs';
import { commitFiles, readFiles, StaleError, type Repo } from './github';
import { channelFeed, omdbLookup, omdbYearsForTitle, writeCollectionCopy, writeCopy } from './sources';
import { buildCollections, type Idea, type MovieCollection } from './collections';
import { googleAccessToken, searchAnalytics, youtubeSearch } from './google';
import { buildDemandReport } from './demand';
import { pickTrailer } from './titles';
import { buildCatalogue, type Candidate } from './catalogue';
import { searchVolumes } from './dataforseo';

export interface Env {
  /** Fine-grained GitHub token: Contents read & write on the site-factory repo only. */
  GITHUB_TOKEN: string;
  OMDB_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  /** Google Cloud API key with YouTube Data API v3 enabled (finds trailers for back-catalogue films). */
  YOUTUBE_API_KEY?: string;
  /** Google service account JSON key; the account is added as a user on the Search Console property. */
  GSC_SERVICE_ACCOUNT?: string;
  /** DataForSEO API login and password (Dashboard → API Access). Search volumes for catalogue candidates. */
  DATAFORSEO_LOGIN?: string;
  DATAFORSEO_PASSWORD?: string;
  /** Any long random string; needed for the manual /run URL. */
  RUN_KEY?: string;
  REPO: string; // "owner/name"
  BRANCH: string;
  CHANNELS: string; // JSON array of YouTube channel IDs
  ANTHROPIC_MODEL: string;
  ENRICH_LIMIT: string;
  RECHECK_LIMIT: string;
  GSC_SITE: string; // Search Console property, e.g. https://www.movietrailer.channel/
  MIN_AGE_YEARS: string; // only films at least this old are added ("0" = no cutoff)
  CATALOGUE_PER_RUN: string; // candidates queued per weekly run
  CATALOGUE_MIN_VOLUME: string; // ignore candidates with fewer monthly searches
  DATAFORSEO_LOCATION: string; // Google Ads location code, e.g. 2036 = Australia
  DATAFORSEO_LOCATION_NAME: string;
  COLLECTIONS_PER_RUN: string; // new collection pages per monthly run
  COLLECTION_MIN_FILMS: string;
  COLLECTION_MIN_VOLUME: string;
}

type Job = 'intake' | 'enrich' | 'recheck' | 'demand' | 'catalogue' | 'collections';

/** Must match the crons in wrangler.jsonc. */
const CRON_JOBS: Record<string, Job> = {
  '0 */12 * * *': 'intake',
  '0 19 * * *': 'enrich', // 06:00 Melbourne (AEDT)
  '0 18 1 * *': 'recheck', // 2nd of the month, 05:00 Melbourne (AEDT)
  '0 21 2 * *': 'demand', // 3rd of the month, 08:00 Melbourne (AEDT)
  '0 20 1,8,15,22,29 * *': 'catalogue', // ~weekly, 07:00 Melbourne (AEDT); no weekday field — Cloudflare's weekday parsing is unreliable
  '0 21 3 * *': 'collections', // 4th of the month, 08:00 Melbourne (AEDT)
};

const MOVIES = 'data/trailers/movies.json';
const QUEUE = 'data/trailers/queue.json';
const COLLECTIONS = 'data/trailers/collections.json';
const CANDIDATES = 'data/trailers/candidates.json';
const CATALOGUE_REPORT = 'reports/trailers/catalogue.md';
const IDEAS = 'data/trailers/collection-ideas.json';
const COLLECTIONS_REPORT = 'reports/trailers/collections.md';

/** Workers free plan allows 50 outgoing calls per run; GitHub reads/commit use up to 8. */
const CALL_BUDGET = 50 - 9;

export default {
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const job = CRON_JOBS[event.cron];
    if (!job) throw new Error(`No job for cron "${event.cron}"`);
    ctx.waitUntil(run(job, env, false).then((out) => console.log(JSON.stringify({ ...out, report: undefined }))));
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/run\/(intake|enrich|recheck|demand|catalogue|collections)$/);
    if (!m) return new Response('Trailer pipeline. Runs on a schedule.\n', { status: url.pathname === '/' ? 200 : 404 });
    if (!env.RUN_KEY || url.searchParams.get('key') !== env.RUN_KEY) return new Response('Forbidden\n', { status: 403 });
    try {
      const out = await run(m[1] as Job, env, url.searchParams.get('dry') === '1');
      // The demand report reads better as text than inside JSON.
      if (out.report && url.searchParams.get('format') !== 'json')
        return new Response(out.report, { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' } });
      return Response.json(out, { headers: { 'cache-control': 'no-store' } });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 500 });
    }
  },
};

const NEEDS: Record<Job, (keyof Env)[]> = {
  intake: ['GITHUB_TOKEN'],
  enrich: ['GITHUB_TOKEN', 'OMDB_API_KEY', 'ANTHROPIC_API_KEY'],
  recheck: ['GITHUB_TOKEN', 'OMDB_API_KEY', 'ANTHROPIC_API_KEY'],
  demand: ['GITHUB_TOKEN', 'GSC_SERVICE_ACCOUNT'],
  catalogue: ['GITHUB_TOKEN'],
  collections: ['GITHUB_TOKEN', 'ANTHROPIC_API_KEY'],
};

export async function run(job: Job, env: Env, dryRun: boolean) {
  for (const k of NEEDS[job]) if (!env[k]) throw new Error(`Secret ${k} is not set`);
  const [owner, name] = env.REPO.split('/');
  const repo: Repo = { token: env.GITHUB_TOKEN, owner, name, branch: env.BRANCH };

  const files =
    job === 'demand' || job === 'collections'
      ? [MOVIES, COLLECTIONS, ...(job === 'collections' ? [IDEAS] : [])]
      : job === 'catalogue'
        ? [MOVIES, QUEUE, CANDIDATES]
        : [MOVIES, QUEUE];
  const snap = await readFiles(repo, files);
  const now = new Date();
  const minAgeYears = Number(env.MIN_AGE_YEARS ?? '10') || 0;

  if (job === 'demand') return demand(env, repo, snap, now, dryRun, maxYear({ now, minAgeYears }));
  if (job === 'catalogue') return catalogue(env, repo, snap, now, dryRun, maxYear({ now, minAgeYears }));
  if (job === 'collections') return collectionsJob(env, repo, snap, now, dryRun, maxYear({ now, minAgeYears }));

  const state: State = {
    movies: JSON.parse(snap.files[MOVIES]) as Movie[],
    queue: snap.files[QUEUE] ? (JSON.parse(snap.files[QUEUE]) as QueueItem[]) : [],
  };

  const svc = {
    feed: channelFeed,
    omdb: (t: string, y: number | null) => omdbLookup(env.OMDB_API_KEY, t, y),
    sameTitle: (t: string) => omdbYearsForTitle(env.OMDB_API_KEY, t),
    copy: (m: Parameters<typeof writeCopy>[2]) => writeCopy(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL, m),
    trailer: async (title: string, year: string | null) => {
      if (!env.YOUTUBE_API_KEY) throw new Error('Secret YOUTUBE_API_KEY is not set');
      const hit = pickTrailer(await youtubeSearch(env.YOUTUBE_API_KEY, `${title} ${year ?? ''} official trailer`), title);
      return hit ? { youtubeId: hit.youtubeId, title: hit.title } : null;
    },
    budget: { left: CALL_BUDGET },
    now,
    minAgeYears,
  };

  let result: Result;
  if (job === 'intake') result = await intake(state, JSON.parse(env.CHANNELS) as string[], svc);
  else if (job === 'enrich') result = await enrich(state, svc, Number(env.ENRICH_LIMIT) || 15);
  else result = await recheck(state, svc, Number(env.RECHECK_LIMIT) || 20);

  const changes: Record<string, string> = {};
  if (result.moviesChanged) changes[MOVIES] = JSON.stringify(state.movies, null, 1) + '\n';
  if (result.queueChanged) changes[QUEUE] = JSON.stringify(state.queue, null, 1) + '\n';

  const commit = await save(repo, snap.sha, changes, commitMessage(job, result), dryRun, result.log);
  return { job, dryRun, commit, ...result, callsLeft: svc.budget.left, report: undefined as string | undefined };
}

type Snap = { sha: string; files: Record<string, string> };

async function collectionsJob(env: Env, repo: Repo, snap: Snap, now: Date, dryRun: boolean, newest: number | null) {
  const login = env.DATAFORSEO_LOGIN;
  const password = env.DATAFORSEO_PASSWORD;
  const out = await buildCollections(
    JSON.parse(snap.files[MOVIES]) as Movie[],
    JSON.parse(snap.files[COLLECTIONS]) as MovieCollection[],
    snap.files[IDEAS] ? (JSON.parse(snap.files[IDEAS]) as Idea[]) : [],
    {
      now,
      perRun: Number(env.COLLECTIONS_PER_RUN) || 3,
      minFilms: Number(env.COLLECTION_MIN_FILMS) || 6,
      minFilmsForIdea: 3,
      minVolume: Number(env.COLLECTION_MIN_VOLUME) || 100,
      location: env.DATAFORSEO_LOCATION_NAME || 'Australia',
      volumes: login && password ? (kw) => searchVolumes(login, password, kw, Number(env.DATAFORSEO_LOCATION) || 2036) : null,
      copy: (name, films) => writeCollectionCopy(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL, name, films),
      budget: { left: CALL_BUDGET },
      maxYear: newest,
    },
  );
  const changes: Record<string, string> = { [COLLECTIONS_REPORT]: out.report };
  if (out.changed) changes[IDEAS] = JSON.stringify(out.ideas, null, 1) + '\n';
  if (out.created.length) changes[COLLECTIONS] = JSON.stringify(out.collections, null, 1) + '\n';
  // New collection pages change the site, so those commits run CI; report-only commits skip it.
  const title = out.created.length ? `Pipeline: add ${out.created.length} collection page(s)` : `Pipeline (collections): update ideas [skip ci]`;
  const commit = await save(repo, snap.sha, changes, `${title}\n\n${out.log.join('\n')}`, dryRun, out.log);
  return {
    job: 'collections' as const,
    dryRun,
    commit,
    log: out.log,
    added: out.created,
    queued: [] as string[],
    moviesChanged: false,
    queueChanged: false,
    callsLeft: null,
    report: out.report,
  };
}

async function catalogue(env: Env, repo: Repo, snap: Snap, now: Date, dryRun: boolean, newest: number | null) {
  const login = env.DATAFORSEO_LOGIN;
  const password = env.DATAFORSEO_PASSWORD;
  const out = await buildCatalogue(
    snap.files[CANDIDATES] ? (JSON.parse(snap.files[CANDIDATES]) as Candidate[]) : [],
    JSON.parse(snap.files[MOVIES]) as Movie[],
    snap.files[QUEUE] ? (JSON.parse(snap.files[QUEUE]) as QueueItem[]) : [],
    {
      maxYear: newest,
      perRun: Number(env.CATALOGUE_PER_RUN) || 10,
      minVolume: Number(env.CATALOGUE_MIN_VOLUME) || 0,
      now,
      location: env.DATAFORSEO_LOCATION_NAME || 'Australia',
      volumes:
        login && password ? (kw) => searchVolumes(login, password, kw, Number(env.DATAFORSEO_LOCATION) || 2036) : null,
    },
  );
  const changes: Record<string, string> = { [CATALOGUE_REPORT]: out.report };
  if (out.changed) {
    changes[CANDIDATES] = JSON.stringify(out.candidates, null, 1) + '\n';
    changes[QUEUE] = JSON.stringify(out.queue, null, 1) + '\n';
  }
  const commit = await save(repo, snap.sha, changes, `Pipeline (catalogue): ${out.log[0]} [skip ci]\n\n${out.log.join('\n')}`, dryRun, out.log);
  return {
    job: 'catalogue' as const,
    dryRun,
    commit,
    log: out.log,
    added: [] as string[],
    queued: out.queued,
    moviesChanged: false,
    queueChanged: out.changed,
    callsLeft: null,
    report: out.report,
  };
}

async function demand(env: Env, repo: Repo, snap: Snap, now: Date, dryRun: boolean, newest: number | null) {
  // Search Console data lags about 2 days; use the last 28 complete days.
  const day = (offset: number) => new Date(now.getTime() - offset * 86400000).toISOString().slice(0, 10);
  const start = day(30);
  const end = day(3);
  const token = await googleAccessToken(env.GSC_SERVICE_ACCOUNT!, 'https://www.googleapis.com/auth/webmasters.readonly');
  const [queries, pageQueries] = await Promise.all([
    searchAnalytics(token, env.GSC_SITE, start, end, ['query']),
    searchAnalytics(token, env.GSC_SITE, start, end, ['query', 'page']),
  ]);
  const report = buildDemandReport({
    site: env.GSC_SITE.replace(/\/$/, ''),
    start,
    end,
    queries,
    pageQueries,
    movies: JSON.parse(snap.files[MOVIES]),
    collections: JSON.parse(snap.files[COLLECTIONS]),
  }, { maxYear: newest });
  const path = `reports/trailers/demand-${end.slice(0, 7)}.md`;
  const log = [
    `Demand: ${queries.length} searches analysed; ${report.films.length} film ideas, ${report.themes.filter((t) => !t.existing).length} new collection ideas. Saved to ${path}.`,
  ];
  const commit = await save(repo, snap.sha, { [path]: report.markdown }, `Pipeline: demand report ${start} to ${end} [skip ci]\n\n${log[0]}`, dryRun, log);
  return {
    job: 'demand' as const,
    dryRun,
    commit,
    log,
    added: [] as string[],
    queued: [] as string[],
    moviesChanged: false,
    queueChanged: false,
    callsLeft: null,
    report: report.markdown,
  };
}

async function save(repo: Repo, sha: string, changes: Record<string, string>, message: string, dryRun: boolean, log: string[]) {
  if (!Object.keys(changes).length || dryRun) return null;
  try {
    return await commitFiles(repo, sha, changes, message);
  } catch (e) {
    // Nothing is lost: the repo is unchanged, so the next run redoes this work.
    if (e instanceof StaleError) {
      log.push('Not saved: the repo changed during the run. The next run will redo it.');
      return null;
    }
    throw e;
  }
}

function commitMessage(job: Job, r: Result): string {
  const title =
    r.added.length > 0
      ? `Pipeline: add ${r.added.length} movie${r.added.length > 1 ? 's' : ''}`
      : `Pipeline (${job}): update trailer queue`;
  // Queue-only commits don't change the site, so skip the CI build for them.
  const skip = r.moviesChanged ? '' : ' [skip ci]';
  return `${title}${skip}\n\n${r.log.join('\n')}`;
}
