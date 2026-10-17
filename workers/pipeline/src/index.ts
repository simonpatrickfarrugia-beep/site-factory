/**
 * Trailer pipeline Worker for movietrailer.channel (replaces the Make scenarios).
 *
 * Runs on Cron Triggers (see wrangler.jsonc). Each run reads the site's data
 * files from GitHub, does its job, and commits the result as one commit.
 * A commit that changes movies.json rebuilds and deploys the site.
 *
 * Manual run (handy for testing from a phone):
 *   https://trailer-pipeline.<account>.workers.dev/run/intake?key=RUN_KEY&dry=1
 *   jobs: intake | enrich | recheck ;  dry=1 shows what would change without committing.
 */
import { enrich, intake, recheck, type QueueItem, type Movie, type Result, type State } from './jobs';
import { commitFiles, readFiles, StaleError, type Repo } from './github';
import { channelFeed, omdbLookup, writeCopy } from './sources';

export interface Env {
  /** Fine-grained GitHub token: Contents read & write on the site-factory repo only. */
  GITHUB_TOKEN: string;
  OMDB_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  /** Any long random string; needed for the manual /run URL. */
  RUN_KEY?: string;
  REPO: string; // "owner/name"
  BRANCH: string;
  CHANNELS: string; // JSON array of YouTube channel IDs
  ANTHROPIC_MODEL: string;
  ENRICH_LIMIT: string;
  RECHECK_LIMIT: string;
}

type Job = 'intake' | 'enrich' | 'recheck';

/** Must match the crons in wrangler.jsonc. */
const CRON_JOBS: Record<string, Job> = {
  '0 */12 * * *': 'intake',
  '0 19 * * *': 'enrich', // 06:00 Melbourne (AEDT)
  '0 18 1 * *': 'recheck', // 2nd of the month, 05:00 Melbourne (AEDT)
};

const MOVIES = 'data/trailers/movies.json';
const QUEUE = 'data/trailers/queue.json';

/** Workers free plan allows 50 outgoing calls per run; GitHub reads/commit use 7. */
const CALL_BUDGET = 50 - 8;

export default {
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const job = CRON_JOBS[event.cron];
    if (!job) throw new Error(`No job for cron "${event.cron}"`);
    ctx.waitUntil(run(job, env, false).then((out) => console.log(JSON.stringify(out))));
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/run\/(intake|enrich|recheck)$/);
    if (!m) return new Response('Trailer pipeline. Runs on a schedule.\n', { status: url.pathname === '/' ? 200 : 404 });
    if (!env.RUN_KEY || url.searchParams.get('key') !== env.RUN_KEY) return new Response('Forbidden\n', { status: 403 });
    try {
      const out = await run(m[1] as Job, env, url.searchParams.get('dry') === '1');
      return Response.json(out, { headers: { 'cache-control': 'no-store' } });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 500 });
    }
  },
};

export async function run(job: Job, env: Env, dryRun: boolean) {
  for (const k of ['GITHUB_TOKEN', 'OMDB_API_KEY', 'ANTHROPIC_API_KEY'] as const) {
    if (!env[k] && !(job === 'intake' && k !== 'GITHUB_TOKEN')) throw new Error(`Secret ${k} is not set`);
  }
  const [owner, name] = env.REPO.split('/');
  const repo: Repo = { token: env.GITHUB_TOKEN, owner, name, branch: env.BRANCH };

  const snap = await readFiles(repo, [MOVIES, QUEUE]);
  const state: State = {
    movies: JSON.parse(snap.files[MOVIES]) as Movie[],
    queue: snap.files[QUEUE] ? (JSON.parse(snap.files[QUEUE]) as QueueItem[]) : [],
  };

  const svc = {
    feed: channelFeed,
    omdb: (t: string, y: number | null) => omdbLookup(env.OMDB_API_KEY, t, y),
    copy: (m: Parameters<typeof writeCopy>[2]) => writeCopy(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL, m),
    budget: { left: CALL_BUDGET },
    now: new Date(),
  };

  let result: Result;
  if (job === 'intake') result = await intake(state, JSON.parse(env.CHANNELS) as string[], svc);
  else if (job === 'enrich') result = await enrich(state, svc, Number(env.ENRICH_LIMIT) || 15);
  else result = await recheck(state, svc, Number(env.RECHECK_LIMIT) || 20);

  const changes: Record<string, string> = {};
  if (result.moviesChanged) changes[MOVIES] = JSON.stringify(state.movies, null, 1) + '\n';
  if (result.queueChanged) changes[QUEUE] = JSON.stringify(state.queue, null, 1) + '\n';

  let commit: string | null = null;
  if (Object.keys(changes).length && !dryRun) {
    const message = commitMessage(job, result);
    try {
      commit = await commitFiles(repo, snap.sha, changes, message);
    } catch (e) {
      // Nothing is lost: the queue is unchanged in the repo, so the next run redoes this work.
      if (e instanceof StaleError) result.log.push('Not saved: the repo changed during the run. The next run will redo it.');
      else throw e;
    }
  }
  return { job, dryRun, commit, ...result, callsLeft: svc.budget.left };
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
