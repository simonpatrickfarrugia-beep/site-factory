/**
 * Trailer pipeline Worker for movietrailer.channel (replaces the Make scenarios).
 *
 * Runs on Cron Triggers (see wrangler.jsonc). Each run reads the site's data
 * files from GitHub, does its job, and commits the result as one commit.
 * A commit that changes movies.json rebuilds and deploys the site.
 *
 * Manual run (handy for testing from a phone):
 *   https://trailer-pipeline.<account>.workers.dev/run/intake?key=RUN_KEY&dry=1
 *   jobs: intake | enrich | recheck | demand ;  dry=1 shows what would change without committing.
 */
import { enrich, intake, recheck, type QueueItem, type Movie, type Result, type State } from './jobs';
import { commitFiles, readFiles, StaleError, type Repo } from './github';
import { channelFeed, omdbLookup, writeCopy } from './sources';
import { googleAccessToken, searchAnalytics, youtubeSearch } from './google';
import { buildDemandReport } from './demand';
import { pickTrailer } from './titles';

export interface Env {
  /** Fine-grained GitHub token: Contents read & write on the site-factory repo only. */
  GITHUB_TOKEN: string;
  OMDB_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  /** Google Cloud API key with YouTube Data API v3 enabled (finds trailers for back-catalogue films). */
  YOUTUBE_API_KEY?: string;
  /** Google service account JSON key; the account is added as a user on the Search Console property. */
  GSC_SERVICE_ACCOUNT?: string;
  /** Any long random string; needed for the manual /run URL. */
  RUN_KEY?: string;
  REPO: string; // "owner/name"
  BRANCH: string;
  CHANNELS: string; // JSON array of YouTube channel IDs
  ANTHROPIC_MODEL: string;
  ENRICH_LIMIT: string;
  RECHECK_LIMIT: string;
  GSC_SITE: string; // Search Console property, e.g. https://www.movietrailer.channel/
}

type Job = 'intake' | 'enrich' | 'recheck' | 'demand';

/** Must match the crons in wrangler.jsonc. */
const CRON_JOBS: Record<string, Job> = {
  '0 */12 * * *': 'intake',
  '0 19 * * *': 'enrich', // 06:00 Melbourne (AEDT)
  '0 18 1 * *': 'recheck', // 2nd of the month, 05:00 Melbourne (AEDT)
  '0 21 2 * *': 'demand', // 3rd of the month, 08:00 Melbourne (AEDT)
};

const MOVIES = 'data/trailers/movies.json';
const QUEUE = 'data/trailers/queue.json';
const COLLECTIONS = 'data/trailers/collections.json';

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
    const m = url.pathname.match(/^\/run\/(intake|enrich|recheck|demand)$/);
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
};

export async function run(job: Job, env: Env, dryRun: boolean) {
  for (const k of NEEDS[job]) if (!env[k]) throw new Error(`Secret ${k} is not set`);
  const [owner, name] = env.REPO.split('/');
  const repo: Repo = { token: env.GITHUB_TOKEN, owner, name, branch: env.BRANCH };

  const snap = await readFiles(repo, job === 'demand' ? [MOVIES, COLLECTIONS] : [MOVIES, QUEUE]);
  const now = new Date();

  if (job === 'demand') return demand(env, repo, snap, now, dryRun);

  const state: State = {
    movies: JSON.parse(snap.files[MOVIES]) as Movie[],
    queue: snap.files[QUEUE] ? (JSON.parse(snap.files[QUEUE]) as QueueItem[]) : [],
  };

  const svc = {
    feed: channelFeed,
    omdb: (t: string, y: number | null) => omdbLookup(env.OMDB_API_KEY, t, y),
    copy: (m: Parameters<typeof writeCopy>[2]) => writeCopy(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL, m),
    trailer: async (title: string, year: string | null) => {
      if (!env.YOUTUBE_API_KEY) throw new Error('Secret YOUTUBE_API_KEY is not set');
      const hit = pickTrailer(await youtubeSearch(env.YOUTUBE_API_KEY, `${title} ${year ?? ''} official trailer`), title);
      return hit ? { youtubeId: hit.youtubeId, title: hit.title } : null;
    },
    budget: { left: CALL_BUDGET },
    now,
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

async function demand(env: Env, repo: Repo, snap: { sha: string; files: Record<string, string> }, now: Date, dryRun: boolean) {
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
  });
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
