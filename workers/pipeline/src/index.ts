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
import { channelFeed, omdbLookup, omdbYearsForTitle, judgeNiche, pickCategories, setAnthropicWorkspace, suggestCandidates, writeCollectionCopy, writeCopy } from './sources';
import { buildCollections, type Idea, type MovieCollection } from './collections';
import { ga4Report, googleAccessToken, searchAnalytics, youtubeSearch } from './google';
import { buildStats } from './stats';
import { estimateMoney, moneyReport, nicheReport, scoreNiche, type AffiliateCatalog, type Niche } from './niches';
import { buildDemandReport } from './demand';
import { pickTrailer } from './titles';
import { buildCatalogue, type Candidate } from './catalogue';
import { cleanKeyword, domainTraffic, keywordDifficulty, keywordIdeas, searchVolumes, serpTop10, type SerpResult } from './dataforseo';
import { COMPETITION_VERSION, competitionReport, pickKeywords, rootDomain, scoreCompetition, type Competition } from './competition';

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
  COMPETITION_PER_RUN?: string; // niches per competition-check run
  STATS_SITES?: string; // JSON list of { name, path, ga4, gsc } for the dashboards
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
  /** KV namespace holding the last runs of each job (read by the daily health check via /status). */
  STATUS?: KVNamespace;
}

type Job = 'intake' | 'enrich' | 'recheck' | 'demand' | 'catalogue' | 'collections' | 'stats' | 'niches' | 'towns' | 'keywords' | 'competition';

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
const VIC_TOWNS = 'data/vic/towns.json';
const KEYWORDS = 'hq/keywords.json';
const KEYWORDS_REPORT = 'hq/reports/keywords.md';
const VIC_TOWNS_REPORT = 'reports/vic/towns.md';
const NICHES_REPORT = 'hq/reports/niches.md';
const COMPETITION_REPORT = 'hq/reports/competition.md';
const AFFILIATES = 'hq/affiliate-programs.json';

/** Workers free plan allows 50 outgoing calls per run; GitHub reads/commit use up to 8. */
const CALL_BUDGET = 50 - 9;

export default {
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const job = jobFor(event.cron, new Date(event.scheduledTime));
    if (!job) return; // nothing scheduled in this slot today
    ctx.waitUntil(tracked(job, env, false, 'schedule').then((out) => console.log(JSON.stringify({ ...out, report: undefined }))).catch((e) => console.error(e)));
  },

  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/run\/(intake|enrich|recheck|demand|catalogue|collections|stats|niches|competition|towns|keywords)$/);
    if (url.pathname === '/status') {
      if (!env.RUN_KEY || url.searchParams.get('key') !== env.RUN_KEY) return new Response('Forbidden\n', { status: 403 });
      const status = (await env.STATUS?.get('runs', 'json')) ?? {};
      return Response.json(status, { headers: { 'cache-control': 'no-store' } });
    }
    if (!m) return new Response('Trailer pipeline. Runs on a schedule.\n', { status: url.pathname === '/' ? 200 : 404 });
    if (!env.RUN_KEY || url.searchParams.get('key') !== env.RUN_KEY) return new Response('Forbidden\n', { status: 403 });
    try {
      const out = await tracked(m[1] as Job, env, url.searchParams.get('dry') === '1', 'manual');
      // The demand report reads better as text than inside JSON.
      if (out.report && url.searchParams.get('format') !== 'json')
        return new Response(out.report, { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' } });
      return Response.json(out, { headers: { 'cache-control': 'no-store' } });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 500 });
    }
  },
};

/** One stored line per run: when, how it was started, ok or not, and a short summary. */
interface RunRecord { at: string; via: 'schedule' | 'manual'; ok: boolean; summary: string }
async function record(env: Env, job: Job, rec: RunRecord) {
  if (!env.STATUS) return;
  try {
    const all = ((await env.STATUS.get('runs', 'json')) ?? {}) as Record<string, RunRecord[]>;
    all[job] = [rec, ...(all[job] ?? [])].slice(0, 5);
    await env.STATUS.put('runs', JSON.stringify(all));
  } catch (e) {
    console.error('status write failed', e);
  }
}
async function tracked(job: Job, env: Env, dryRun: boolean, via: 'schedule' | 'manual') {
  const at = new Date().toISOString();
  try {
    const out = await run(job, env, dryRun);
    if (!dryRun) await record(env, job, { at, via, ok: true, summary: (out.log ?? []).join(' | ').slice(0, 300) });
    return out;
  } catch (e) {
    if (!dryRun) await record(env, job, { at, via, ok: false, summary: (e as Error).message.slice(0, 300) });
    throw e;
  }
}

const NEEDS: Record<Job, (keyof Env)[]> = {
  intake: ['GITHUB_TOKEN'],
  enrich: ['GITHUB_TOKEN', 'OMDB_API_KEY', 'ANTHROPIC_API_KEY'],
  recheck: ['GITHUB_TOKEN', 'OMDB_API_KEY', 'ANTHROPIC_API_KEY'],
  demand: ['GITHUB_TOKEN', 'GSC_SERVICE_ACCOUNT'],
  catalogue: ['GITHUB_TOKEN'],
  collections: ['GITHUB_TOKEN', 'ANTHROPIC_API_KEY'],
  stats: ['GITHUB_TOKEN', 'GSC_SERVICE_ACCOUNT'],
  niches: ['GITHUB_TOKEN', 'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD', 'ANTHROPIC_API_KEY'],
  towns: ['GITHUB_TOKEN', 'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD'],
  keywords: ['GITHUB_TOKEN', 'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD'],
  competition: ['GITHUB_TOKEN', 'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD'],
};

export async function run(job: Job, env: Env, dryRun: boolean) {
  for (const k of NEEDS[job]) if (!env[k]) throw new Error(`Secret ${k} is not set`);
  setAnthropicWorkspace(env.ANTHROPIC_WORKSPACE_ID);
  const [owner, name] = env.REPO.split('/');
  const repo: Repo = { token: env.GITHUB_TOKEN, owner, name, branch: env.BRANCH };

  const files =
    job === 'keywords'
      ? [KEYWORDS]
      : job === 'towns'
      ? [VIC_TOWNS]
      : job === 'niches' || job === 'competition'
      ? [NICHES, AFFILIATES]
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
  if (job === 'competition') return competitionJob(env, repo, snap, now, dryRun);
  if (job === 'towns') return townsJob(env, repo, snap, now, dryRun);
  if (job === 'keywords') return keywordsJob(env, repo, snap, now, dryRun);
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

/** Sites whose dashboards the daily `stats` job refreshes (STATS_SITES in wrangler.jsonc). */
interface StatsSite {
  name: string;
  path: string; // e.g. data/vic/stats.json
  ga4?: string; // GA4 property ID (number); the service account must be a Viewer
  gsc?: string; // Search Console property, e.g. sc-domain:victours.com.au
}
const statsSites = (env: Env): StatsSite[] => {
  try {
    const list = JSON.parse(env.STATS_SITES ?? '') as StatsSite[];
    if (Array.isArray(list) && list.length) return list;
  } catch {
    /* fall back to the trailer site */
  }
  return [{ name: 'trailers', path: STATS, ga4: env.GA4_PROPERTY, gsc: env.GSC_SITE }];
};

async function statsJob(env: Env, repo: Repo, snap: Snap, now: Date, dryRun: boolean) {
  const day = (n: number) => new Date(now.getTime() - n * 86400000).toISOString().slice(0, 10);
  const period = { start: day(28), end: day(1) };
  const gscPeriod = { start: day(30), end: day(3) }; // Search Console lags ~3 days
  const log: string[] = [];
  const changes: Record<string, string> = {};
  let email = 'the service account';
  try {
    email = (JSON.parse(env.GSC_SERVICE_ACCOUNT!) as { client_email: string }).client_email;
  } catch {
    /* keep the generic name */
  }
  const gaToken = await googleAccessToken(env.GSC_SERVICE_ACCOUNT!, 'https://www.googleapis.com/auth/analytics.readonly').catch(() => null);
  const gscToken = await googleAccessToken(env.GSC_SERVICE_ACCOUNT!, 'https://www.googleapis.com/auth/webmasters.readonly').catch(() => null);

  for (const site of statsSites(env)) {
    const notes: string[] = [];
    let ga4: Parameters<typeof buildStats>[0]['ga4'] = null;
    const property = (site.ga4 ?? '').trim();
    if (property && gaToken) {
      try {
        const cur = [{ startDate: period.start, endDate: period.end }];
        const [pages, prevPages, events, daily, dailyEvents] = await Promise.all([
          ga4Report(gaToken, property, { dateRanges: cur, dimensions: ['pagePath'], metrics: ['screenPageViews', 'activeUsers'] }),
          ga4Report(gaToken, property, { dateRanges: [{ startDate: day(56), endDate: day(29) }], dimensions: ['pagePath'], metrics: ['screenPageViews'] }),
          ga4Report(gaToken, property, { dateRanges: cur, dimensions: ['pagePath', 'eventName'], metrics: ['eventCount'], eventPrefix: 'cta_' }),
          ga4Report(gaToken, property, { dateRanges: cur, dimensions: ['date'], metrics: ['screenPageViews'] }),
          ga4Report(gaToken, property, { dateRanges: cur, dimensions: ['date', 'eventName'], metrics: ['eventCount'], eventPrefix: 'cta_' }),
        ]);
        ga4 = { pages, prevPages, events, daily, dailyEvents };
        log.push(`${site.name} GA4: ${pages.length} page(s), ${events.reduce((t, r) => t + r.mets[0], 0)} CTA click(s).`);
      } catch (e) {
        notes.push(`GA4 not read: ${(e as Error).message}. Is ${email} a Viewer on property ${property}?`);
        log.push(`${site.name} GA4 failed: ${(e as Error).message}`);
      }
    } else {
      notes.push(`GA4 not connected yet: add ${email} as a Viewer on the GA4 property, then set its ID in STATS_SITES.`);
    }

    let gsc: Parameters<typeof buildStats>[0]['gsc'] = null;
    if (site.gsc && gscToken) {
      try {
        gsc = { pageQueries: await searchAnalytics(gscToken, site.gsc, gscPeriod.start, gscPeriod.end, ['page', 'query'], 25000) };
        log.push(`${site.name} Search Console: ${gsc.pageQueries.length} row(s).`);
      } catch (e) {
        notes.push(`Search Console not read: ${(e as Error).message}. Is ${email} a user on ${site.gsc}?`);
        log.push(`${site.name} Search Console failed: ${(e as Error).message}`);
      }
    }
    const stats = buildStats({ now, period: ga4 ? period : null, gscPeriod: gsc ? gscPeriod : null, notes, ga4, gsc });
    changes[site.path] = JSON.stringify(stats, null, 1) + '\n';
    log.unshift(`${site.name}: ${stats.totals.views} views, ${Object.values(stats.totals.cta).reduce((x, y) => x + y, 0)} CTA clicks, ${stats.totals.gscClicks} Google clicks.`);
  }
  const commit = await save(repo, snap.sha, changes, `Pipeline: refresh dashboard stats\n\n${log.join('\n')}`, dryRun, log);
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
      const mCode = n.market?.code ?? code;
      const ideas = await keywordIdeas(login, password, n.seeds.length ? n.seeds : [n.idea], mCode);
      const top = [...ideas.items].sort((a, b) => b.volume - a.volume).slice(0, 100);
      // SEO difficulty is a nice-to-have: without it, "ease" defaults to 50 and the report says so.
      let diff: { kd: Map<string, number>; cost: number } = { kd: new Map(), cost: 0 };
      try {
        diff = await keywordDifficulty(login, password, top.map((k) => k.keyword), mCode);
      } catch (e) {
        log.push(`${n.idea}: no difficulty data (${(e as Error).message.slice(0, 120)}).`);
      }
      const judgement = await judgeNiche(
        env.ANTHROPIC_API_KEY,
        env.ANTHROPIC_MODEL,
        n.idea,
        n.notes,
        n.market?.name ?? location,
        top.map((k) => ({ keyword: k.keyword, volume: k.volume, cpc: k.cpc, kd: diff.kd.get(k.keyword) ?? null })),
      );
      n.score = scoreNiche(ideas.items, diff.kd, judgement, ideas.cost + diff.cost);
      n.status = 'scored';
      n.scoredAt = now.toISOString();
      n.location = n.market?.name ?? location;
      n.error = null;
      log.push(`${n.idea}: ${n.score.overall}/100 (demand ${n.score.demand}, money ${n.score.money}, ease ${n.score.ease}, fit ${n.score.fit}).`);
    } catch (e) {
      n.status = 'failed';
      n.error = (e as Error).message.slice(0, 200);
      log.push(`${n.idea}: failed: ${n.error}`);
    }
  }
  // Money overlay: match each scored idea to affiliate programmes and estimate revenue at maturity.
  // Categories are picked once by Claude (cheap); estimates are recomputed every run from the catalogue.
  const cat = snap.files[AFFILIATES] ? (JSON.parse(snap.files[AFFILIATES]) as AffiliateCatalog) : null;
  if (cat) {
    for (const n of niches as (Niche & { categories?: string[] })[]) {
      if (n.status !== 'scored' || !n.score) continue;
      try {
        if (!n.categories?.length) n.categories = await pickCategories(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL, n.idea, n.notes, cat.categories);
        n.money = estimateMoney(cat, n.score.totalVolume, n.categories, n.location ?? location, n.score.medianCpc);
      } catch (e) {
        log.push(`${n.idea}: money estimate failed: ${(e as Error).message.slice(0, 120)}`);
      }
    }
  }
  const left = niches.filter((n) => n.status === 'new').length;
  log.unshift(`Niches: scored ${todo.filter((n) => n.status === 'scored').length} of ${todo.length}${left ? `; ${left} still waiting (run again)` : ''}.`);
  const report = nicheReport(niches, now, location) + (cat ? moneyReport(niches, cat) : '');
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

/**
 * Vic Tours: Australian search demand per town ("things to do in X", "X accommodation", "restaurants X").
 * Ranks data/vic/towns.json so the most-searched places get built first. Re-checks volumes older than 180 days.
 */
interface VicTown {
  name: string;
  slug: string;
  kind: string;
  volume: number | null;
  volumes: { do: number | null; stay: number | null; eat: number | null } | null;
  volumeCheckedAt: string | null;
  probe: unknown;
}
async function townsJob(env: Env, repo: Repo, snap: Snap, now: Date, dryRun: boolean) {
  const towns = JSON.parse(snap.files[VIC_TOWNS] || '[]') as VicTown[];
  const kw = (t: VicTown) => {
    const n = t.name.toLowerCase();
    return { do: `things to do in ${n}`, stay: `${n} accommodation`, eat: `restaurants ${n}` };
  };
  const stale = (t: VicTown) => !t.volumeCheckedAt || now.getTime() - Date.parse(t.volumeCheckedAt) > 180 * 86400000;
  const todo = towns.filter(stale).slice(0, 330); // 3 keywords each, one 1,000-keyword task
  const log: string[] = [];
  if (todo.length) {
    const vols = await searchVolumes(env.DATAFORSEO_LOGIN!, env.DATAFORSEO_PASSWORD!, todo.flatMap((t) => Object.values(kw(t))), 2036);
    for (const t of todo) {
      const k = kw(t);
      const v = { do: vols.get(cleanKeyword(k.do)) ?? null, stay: vols.get(cleanKeyword(k.stay)) ?? null, eat: vols.get(cleanKeyword(k.eat)) ?? null };
      t.volumes = v;
      t.volume = (v.do ?? 0) + (v.stay ?? 0) + (v.eat ?? 0);
      t.volumeCheckedAt = now.toISOString();
    }
    log.push(`Looked up Australian searches for ${todo.length} place(s).`);
  }
  towns.sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));
  const L = [
    '# Vic Tours: places by search demand',
    '',
    `Updated ${now.toISOString().slice(0, 10)}. Monthly Google searches in Australia for "things to do in X", "X accommodation" and "restaurants X". Build order = this order.`,
    '',
    '| # | Place | Kind | Total | Do | Stay | Eat | Data probe |',
    '|---:|---|---|---:|---:|---:|---:|---|',
    ...towns.map((t, i) => {
      const p = t.probe as { counts?: Record<string, number> } | null;
      const probe = p?.counts ? Object.entries(p.counts).map(([k, v]) => `${k} ${v}`).join(', ') : '—';
      const f = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString());
      return `| ${i + 1} | ${t.name} | ${t.kind} | **${f(t.volume)}** | ${f(t.volumes?.do)} | ${f(t.volumes?.stay)} | ${f(t.volumes?.eat)} | ${probe} |`;
    }),
    '',
  ];
  log.unshift(`Towns: top 5 by searches: ${towns.slice(0, 5).map((t) => `${t.name} ${t.volume?.toLocaleString() ?? '?'}`).join(', ')}.`);
  const commit = await save(
    repo,
    snap.sha,
    { [VIC_TOWNS]: JSON.stringify(towns, null, 1) + '\n', [VIC_TOWNS_REPORT]: L.join('\n') },
    `Vic Tours: town search demand [skip ci]\n\n${log.join('\n')}`,
    dryRun,
    log,
  );
  return { job: 'towns' as const, dryRun, commit, log, added: [] as string[], queued: [] as string[], moviesChanged: false, queueChanged: false, callsLeft: null, report: undefined as string | undefined };
}

/**
 * Ad-hoc keyword research: hq/keywords.json = [{ "list": "name", "market": 2036, "keywords": [...] }].
 * Writes monthly search volumes per list to hq/reports/keywords.md (most searched first).
 */
async function keywordsJob(env: Env, repo: Repo, snap: Snap, now: Date, dryRun: boolean) {
  const lists = JSON.parse(snap.files[KEYWORDS] || '[]') as { list: string; market?: number; keywords: string[] }[];
  const L = ['# Keyword research', '', `Updated ${now.toISOString().slice(0, 10)}. Monthly Google searches (Google Ads data via DataForSEO).`, ''];
  const log: string[] = [];
  for (const l of lists.slice(0, 5)) {
    const market = l.market ?? 2840;
    const vols = await searchVolumes(env.DATAFORSEO_LOGIN!, env.DATAFORSEO_PASSWORD!, l.keywords, market);
    const rows = l.keywords.map((k) => ({ k, v: vols.get(cleanKeyword(k)) ?? null })).sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
    L.push(`## ${l.list} (${market === 2036 ? 'Australia' : market === 2840 ? 'USA' : market})`, '', '| Search | /mo |', '|---|---:|', ...rows.map((r) => `| ${r.k} | ${r.v == null ? '—' : r.v.toLocaleString()} |`), '');
    log.push(`${l.list}: ${rows.slice(0, 8).map((r) => `${r.k} ${r.v ?? '—'}`).join(', ')}`);
  }
  const commit = await save(repo, snap.sha, { [KEYWORDS_REPORT]: L.join('\n') }, `HQ: keyword research [skip ci]\n\n${log.join('\n')}`, dryRun, log);
  return { job: 'keywords' as const, dryRun, commit, log, added: [] as string[], queued: [] as string[], moviesChanged: false, queueChanged: false, callsLeft: null, report: undefined as string | undefined };
}

/**
 * Competition check (on demand): for scored niches never checked (or checked 90+ days ago), pull Google's
 * top 10 for up to 6 distinct best keywords and the estimated traffic of every ranking domain.
 * ~7 DataForSEO calls (about US$0.03) per niche; COMPETITION_PER_RUN niches per run (default 4).
 */
async function competitionJob(env: Env, repo: Repo, snap: Snap, now: Date, dryRun: boolean) {
  const niches = JSON.parse(snap.files[NICHES] || '[]') as (Niche & { competition?: Competition | null })[];
  const login = env.DATAFORSEO_LOGIN!, password = env.DATAFORSEO_PASSWORD!;
  const code = Number(env.DATAFORSEO_LOCATION) || 2840;
  const stale = (n: (typeof niches)[number]) => !n.competition || n.competition.v !== COMPETITION_VERSION || !n.competition.keywords.length || now.getTime() - Date.parse(n.competition.checkedAt) > 90 * 86400000;
  const todo = niches.filter((n) => n.status === 'scored' && n.score && stale(n)).slice(0, Number(env.COMPETITION_PER_RUN) || 4);
  const log: string[] = [];
  for (const n of todo) {
    try {
      const market = n.market?.code ?? code;
      const sc = n.score as unknown as { easyWins?: { keyword: string; volume: number }[]; topKeywords?: { keyword: string; volume: number }[] };
      // Easy wins first; top up from the main keywords when easy wins are few (or all location-based).
      const first = pickKeywords(sc.easyWins ?? [], 6);
      const kws = first.length >= 4 ? first : pickKeywords([...first, ...(sc.topKeywords ?? [])], 6);
      let cost = 0;
      const serps: { keyword: string; volume: number; items: SerpResult[] }[] = [];
      for (const kw of kws) {
        const r = await serpTop10(login, password, kw.keyword, market);
        cost += r.cost;
        serps.push({ ...kw, items: r.items });
      }
      const t = await domainTraffic(login, password, serps.flatMap((s) => s.items.map((i) => rootDomain(i.domain))), market);
      cost += t.cost;
      n.competition = scoreCompetition(serps, t.etv, market, now, cost);
      log.push(`${n.idea}: openness ${n.competition.openness}/100; big players ${n.competition.giants.slice(0, 3).map((g) => g.domain).join(', ') || 'none'} (US$${n.competition.costUsd}).`);
    } catch (e) {
      log.push(`${n.idea}: competition check failed: ${(e as Error).message.slice(0, 160)}`);
    }
  }
  const left = niches.filter((n) => n.status === 'scored' && stale(n)).length;
  log.unshift(`Competition: checked ${todo.length}${left ? `; ${left} still to check (run again)` : ''}.`);
  const commit = await save(
    repo,
    snap.sha,
    { [NICHES]: JSON.stringify(niches, null, 1) + '\n', [COMPETITION_REPORT]: competitionReport(niches, now) },
    `HQ: competition check [skip ci]\n\n${log.join('\n')}`,
    dryRun,
    log,
  );
  return { job: 'competition' as const, dryRun, commit, log, added: [] as string[], queued: [] as string[], moviesChanged: false, queueChanged: false, callsLeft: null, report: undefined as string | undefined };
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
