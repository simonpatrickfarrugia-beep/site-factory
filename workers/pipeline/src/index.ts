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
import { channelFeed, omdbLookup, omdbYearsForTitle, judgeNiche, setAnthropicWorkspace, suggestCandidates, writeCollectionCopy, writeCopy } from './sources';
import { buildCollections, type Idea, type MovieCollection } from './collections';
import { ga4Report, googleAccessToken, indexNow, searchAnalytics, youtubeSearch } from './google';
import { buildStats } from './stats';
import { nicheReport, scoreNiche, type Niche } from './niches';
import { buildDemandReport } from './demand';
import { pickTrailer } from './titles';
import { buildCatalogue, type Candidate } from './catalogue';
import { keywordDifficulty, keywordIdeas, searchVolumes } from './dataforseo';

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
  ANTHROPIC_WORKSPACE_ID?: string; // only needed when the API key isn't scoped to a workspace
  ENRICH_LIMIT: string;
  RECHECK_LIMIT: string;
  GSC_SITE: string; // Search Console property: sc-domain:movietrailer.channel (Domain property) or a URL-prefix property
  NICHES_PER_RUN?: string; // ideas scored per niche-finder run
  GA4_PROPERTY?: string; // GA4 property ID (number) for the dashboard stats
  INDEXNOW_KEY?: string; // public key; brands/<slug>/public/<key>.txt holds the same value
  SITE_HOST?: string; // e.g. www.movietrailer.channel
  MIN_AGE_YEARS: string; // only films at least this old are added ("0" = no cutoff)
  AVAILABLE_AFTER_DAYS?: string; // publish only films out at least this many days (rentable/streamable)
  CATALOGUE_REFILL_BELOW?: string; // top up candidates when fewer than this are waiting
  CATALOGUE_REFILL_COUNT?: string; // films Claude suggests per top-up
  CATALOGUE_PER_RUN: string; // candidates queued per weekly run
  CATALOGUE_MIN_VOLUME: string; // ignore candidates with fewer monthly searches
  DATAFORSEO_LOCATION: string; // Google Ads location code, e.g. 2036 = Australia
  DATAFORSEO_LOCATION_NAME: string;
  COLLECTIONS_PER_RUN: string; // new collection pages per monthly run
  COLLECTION_MIN_FILMS: string;
  COLLECTION_MIN_VOLUME: string;
}

type Job = 'intake' | 'enrich' | 'recheck' | 'demand' | 'catalogue' | 'collections' | 'stats' | 'niches';

/**
 * Workers Free allows 5 cron schedules per ACCOUNT, so the pipeline uses two (see wrangler.jsonc)
 * and picks the job from the UTC hour and day. One job per run keeps each run inside the 50-call budget.
 */
const INTAKE_CRON = '0 */12 * * *';
const DAILY_CRON = '0 18-21 * * *'; // fires 18:00, 19:00, 20:00, 21:00 UTC (05:00–08:00 Melbourne, AEDT)
const CATALOGUE_DAYS = [1, 8, 15, 22, 29]; // ~weekly

function jobFor(cron: string, at: Date): Job | null {
  if (cron === INTAKE_CRON) return 'intake';
  if (cron !== DAILY_CRON) throw new Error(`Unknown cron "${cron}"`);
  const hour = at.getUTCHours();
  const day = at.getUTCDate();
  if (hour === 18) return day === 1 ? 'recheck' : null; // 2nd of the month, 05:00 Melbourne
  if (hour === 19) return 'enrich'; // daily, 06:00 Melbourne
  if (hour === 20) return CATALOGUE_DAYS.includes(day) ? 'catalogue' : null; // 07:00 Melbourne
  if (hour === 21) return day === 2 ? 'demand' : day === 3 ? 'collections' : 'stats'; // 08:00 Melbourne: 3rd / 4th, else dashboard stats
  return null;
}

const MOVIES = 'data/trailers/movies.json';
const QUEUE = 'data/trailers/queue.json';
const COLLECTIONS = 'data/trailers/collections.json';
const CANDIDATES = 'data/trailers/candidates.json';
const CATALOGUE_REPORT = 'reports/trailers/catalogue.md';
const IDEAS = 'data/trailers/collection-ideas.json';
const COLLECTIONS_REPORT = 'reports/trailers/collections.md';
const STATS = 'data/trailers/stats.json';
const NICHES = 'hq/niches.json';
const NICHES_REPORT = 'hq/reports/niches.md';

/** Workers free plan allows 50 outgoing calls per run; GitHub reads/commit use up to 8. */
const CALL_BUDGET = 50 - 9;

export default {
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const job = jobFor(event.cron, new Date(event.scheduledTime));
    if (!job) return; // nothing scheduled in this slot today
    ctx.waitUntil(run(job, env, false).then((out) => console.log(JSON.stringify({ ...out, report: undefined }))));
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/run\/(intake|enrich|recheck|demand|catalogue|collections|stats|niches)$/);
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
  stats: ['GITHUB_TOKEN', 'GSC_SERVICE_ACCOUNT'],
  niches: ['GITHUB_TOKEN', 'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD', 'ANTHROPIC_API_KEY'],
};

export async function run(job: Job, env: Env, dryRun: boolean) {
  for (const k of NEEDS[job]) if (!env[k]) throw new Error(`Secret ${k} is not set`);
  setAnthropicWorkspace(env.ANTHROPIC_WORKSPACE_ID);
  const [owner, name] = env.REPO.split('/');
  const repo: Repo = { token: env.GITHUB_TOKEN, owner, name, branch: env.BRANCH };

  const files =
    job === 'niches'
      ? [NICHES]
      : job === 'stats'
      ? [STATS, MOVIES, COLLECTIONS]
      :
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
  if (job === 'stats') return statsJob(env, repo, snap, now, dryRun);
  if (job === 'niches') return nichesJob(env, repo, snap, now, dryRun);
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
      const hit = pickTrailer(await youtubeSearch(env.YOUTUBE_API_KEY, `${title} ${year ?? ''} official trailer`), title, year);
      return hit ? { youtubeId: hit.youtubeId, title: hit.title } : null;
    },
    budget: { left: CALL_BUDGET },
    now,
    minAgeYears,
    availableAfterDays: Number(env.AVAILABLE_AFTER_DAYS ?? '90') || 0,
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
      location: env.DATAFORSEO_LOCATION_NAME || 'United States',
      volumes: login && password ? (kw) => searchVolumes(login, password, kw, Number(env.DATAFORSEO_LOCATION) || 2840) : null,
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
      location: env.DATAFORSEO_LOCATION_NAME || 'United States',
      volumes:
        login && password ? (kw) => searchVolumes(login, password, kw, Number(env.DATAFORSEO_LOCATION) || 2840) : null,
      suggest: env.ANTHROPIC_API_KEY
        ? (themes, known, count) => suggestCandidates(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL, themes, known, count)
        : null,
      refillBelow: Number(env.CATALOGUE_REFILL_BELOW ?? '50') || 0,
      refillCount: Number(env.CATALOGUE_REFILL_COUNT ?? '60') || 60,
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

async function statsJob(env: Env, repo: Repo, snap: Snap, now: Date, dryRun: boolean) {
  const day = (n: number) => new Date(now.getTime() - n * 86400000).toISOString().slice(0, 10);
  const period = { start: day(28), end: day(1) };
  const gscPeriod = { start: day(30), end: day(3) }; // Search Console lags ~3 days
  const notes: string[] = [];
  const log: string[] = [];

  let ga4: Parameters<typeof buildStats>[0]['ga4'] = null;
  const property = (env.GA4_PROPERTY ?? '').trim();
  if (property) {
    try {
      const token = await googleAccessToken(env.GSC_SERVICE_ACCOUNT!, 'https://www.googleapis.com/auth/analytics.readonly');
      const cur = [{ startDate: period.start, endDate: period.end }];
      const [pages, prevPages, events, daily, dailyEvents] = await Promise.all([
        ga4Report(token, property, { dateRanges: cur, dimensions: ['pagePath'], metrics: ['screenPageViews', 'activeUsers'] }),
        ga4Report(token, property, { dateRanges: [{ startDate: day(56), endDate: day(29) }], dimensions: ['pagePath'], metrics: ['screenPageViews'] }),
        ga4Report(token, property, { dateRanges: cur, dimensions: ['pagePath', 'eventName'], metrics: ['eventCount'], eventPrefix: 'cta_' }),
        ga4Report(token, property, { dateRanges: cur, dimensions: ['date'], metrics: ['screenPageViews'] }),
        ga4Report(token, property, { dateRanges: cur, dimensions: ['date', 'eventName'], metrics: ['eventCount'], eventPrefix: 'cta_' }),
      ]);
      ga4 = { pages, prevPages, events, daily, dailyEvents };
      log.push(`GA4: ${pages.length} page(s), ${events.reduce((s, r) => s + r.mets[0], 0)} CTA click(s).`);
    } catch (e) {
      notes.push(`GA4 not read: ${(e as Error).message}`);
      log.push(`GA4 failed: ${(e as Error).message}`);
    }
  } else {
    let email = 'the service account';
    try {
      email = (JSON.parse(env.GSC_SERVICE_ACCOUNT!) as { client_email: string }).client_email;
    } catch {
      /* keep the generic name */
    }
    notes.push(`GA4 not connected yet: add ${email} as a Viewer on the GA4 property, then set GA4_PROPERTY.`);
    log.push(`Robot account: ${email}`);
  }

  let gsc: Parameters<typeof buildStats>[0]['gsc'] = null;
  try {
    const token = await googleAccessToken(env.GSC_SERVICE_ACCOUNT!, 'https://www.googleapis.com/auth/webmasters.readonly');
    gsc = { pageQueries: await searchAnalytics(token, env.GSC_SITE, gscPeriod.start, gscPeriod.end, ['page', 'query'], 25000) };
    log.push(`Search Console: ${gsc.pageQueries.length} page/search row(s).`);
  } catch (e) {
    notes.push(`Search Console not read: ${(e as Error).message}`);
    log.push(`Search Console failed: ${(e as Error).message}`);
  }

  const stats = buildStats({ now, period: ga4 ? period : null, gscPeriod: gsc ? gscPeriod : null, notes, ga4, gsc });

  // IndexNow: first run submits every page; after that, pages created or updated since the last submission.
  let prev: { indexNowAt?: string | null } = {};
  try {
    prev = JSON.parse(snap.files[STATS] || '{}');
  } catch {
    /* first run */
  }
  stats.indexNowAt = prev.indexNowAt ?? null;
  if (env.INDEXNOW_KEY && env.SITE_HOST) {
    const since = prev.indexNowAt ?? null;
    const fresh = (x: { created?: string; updated?: string }) => !since || (x.updated ?? x.created ?? '') > since || (x.created ?? '') > since;
    const base = `https://${env.SITE_HOST}`;
    const movies = JSON.parse(snap.files[MOVIES] || '[]') as { slug: string; created?: string; updated?: string }[];
    const cols = JSON.parse(snap.files[COLLECTIONS] || '[]') as { slug: string; created?: string; updated?: string }[];
    const urls = [
      ...(since ? [] : [base, `${base}/browse`, `${base}/discover`]),
      ...movies.filter(fresh).map((m) => `${base}/movies/${m.slug}`),
      ...cols.filter(fresh).map((c) => `${base}/discover/${c.slug}`),
    ];
    if (urls.length) {
      try {
        const status = dryRun ? 0 : await indexNow(env.SITE_HOST, env.INDEXNOW_KEY, urls);
        if (status === 200 || status === 202) stats.indexNowAt = now.toISOString();
        log.push(`IndexNow: ${dryRun ? 'would submit' : 'submitted'} ${urls.length} URL(s)${dryRun ? '' : ` (HTTP ${status})`}.`);
      } catch (e) {
        log.push(`IndexNow failed: ${(e as Error).message}`);
      }
    } else {
      stats.indexNowAt = now.toISOString();
    }
  }
  log.unshift(`Stats: ${stats.totals.views} views, ${Object.values(stats.totals.cta).reduce((a, b) => a + b, 0)} CTA clicks, ${stats.totals.gscClicks} Google clicks.`);
  const commit = await save(repo, snap.sha, { [STATS]: JSON.stringify(stats, null, 1) + '\n' }, `Pipeline: refresh dashboard stats\n\n${log.join('\n')}`, dryRun, log);
  return { job: 'stats' as const, dryRun, commit, log, added: [] as string[], queued: [] as string[], moviesChanged: false, queueChanged: false, callsLeft: null, report: undefined as string | undefined };
}

async function nichesJob(env: Env, repo: Repo, snap: Snap, now: Date, dryRun: boolean) {
  const niches = snap.files[NICHES] ? (JSON.parse(snap.files[NICHES]) as Niche[]) : [];
  const location = env.DATAFORSEO_LOCATION_NAME || 'United States';
  const code = Number(env.DATAFORSEO_LOCATION) || 2840;
  const login = env.DATAFORSEO_LOGIN!;
  const password = env.DATAFORSEO_PASSWORD!;
  const log: string[] = [];
  // 3 calls per idea (keywords, difficulty, Claude); Google Ads data allows 12 calls a minute.
  const todo = niches.filter((n) => n.status !== 'scored').slice(0, Number(env.NICHES_PER_RUN) || 6);
  for (const n of todo) {
    try {
      const ideas = await keywordIdeas(login, password, n.seeds.length ? n.seeds : [n.idea], code);
      const top = [...ideas.items].sort((a, b) => b.volume - a.volume).slice(0, 100);
      // SEO difficulty is a nice-to-have: without it, "ease" defaults to 50 and the report says so.
      let diff: { kd: Map<string, number>; cost: number } = { kd: new Map(), cost: 0 };
      try {
        diff = await keywordDifficulty(login, password, top.map((k) => k.keyword), code);
      } catch (e) {
        log.push(`${n.idea}: no difficulty data (${(e as Error).message.slice(0, 120)}).`);
      }
      const judgement = await judgeNiche(
        env.ANTHROPIC_API_KEY,
        env.ANTHROPIC_MODEL,
        n.idea,
        n.notes,
        top.map((k) => ({ keyword: k.keyword, volume: k.volume, cpc: k.cpc, kd: diff.kd.get(k.keyword) ?? null })),
      );
      n.score = scoreNiche(ideas.items, diff.kd, judgement, ideas.cost + diff.cost);
      n.status = 'scored';
      n.scoredAt = now.toISOString();
      n.location = location;
      n.error = null;
      log.push(`${n.idea}: ${n.score.overall}/100 (demand ${n.score.demand}, money ${n.score.money}, ease ${n.score.ease}, fit ${n.score.fit}).`);
    } catch (e) {
      n.status = 'failed';
      n.error = (e as Error).message.slice(0, 200);
      log.push(`${n.idea}: failed: ${n.error}`);
    }
  }
  const left = niches.filter((n) => n.status === 'new').length;
  log.unshift(`Niches: scored ${todo.filter((n) => n.status === 'scored').length} of ${todo.length}${left ? `; ${left} still waiting (run again)` : ''}.`);
  const report = nicheReport(niches, now, location);
  const commit = await save(
    repo,
    snap.sha,
    { [NICHES]: JSON.stringify(niches, null, 1) + '\n', [NICHES_REPORT]: report },
    `HQ: niche finder [skip ci]\n\n${log.join('\n')}`,
    dryRun,
    log,
  );
  return { job: 'niches' as const, dryRun, commit, log, added: [] as string[], queued: [] as string[], moviesChanged: false, queueChanged: false, callsLeft: null, report };
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
