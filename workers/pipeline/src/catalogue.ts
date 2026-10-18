/**
 * Catalogue builder: grows the site with OLDER films people actually search for
 * (the future business rents older movies).
 *
 *   data/trailers/candidates.json   films we might add (seeded by chat, by theme)
 *   weekly job:
 *     1. look up Google search volumes for candidates that have none yet (DataForSEO)
 *     2. queue the top N by volume (they flow through enrich: OMDb, trailer search, Claude, publish)
 *     3. write reports/trailers/catalogue.md, a ranked list for planning
 *
 * Pure logic; the Worker supplies the volume lookup.
 */
import type { Movie, QueueItem } from './jobs';
import { cleanKeyword } from './dataforseo';
import { titleKey } from './titles';

export interface Candidate {
  title: string;
  year: number | null;
  /** Theme it was added for, e.g. "80s action", "Criterion classics". Helps plan collections. */
  theme: string | null;
  /** Monthly Google searches for "<title> movie" + "<title> trailer" (null = not looked up / no data). */
  volume: number | null;
  volumeCheckedAt: string | null;
  /** candidate = waiting; queued = sent to the pipeline; have = already on the site; skipped = too new or rejected. */
  status: 'candidate' | 'queued' | 'have' | 'skipped';
  note?: string | null;
}

export interface CatalogueOptions {
  maxYear: number | null; // newest release year allowed
  perRun: number; // how many to queue each run
  minVolume: number; // ignore candidates with fewer monthly searches
  now: Date;
  /** Look up volumes; null when DataForSEO isn't set up (then ranking uses volumes already stored). */
  volumes: ((keywords: string[]) => Promise<Map<string, number | null>>) | null;
  location: string; // shown in the report, e.g. "Australia"
}

export const keywordsFor = (c: Pick<Candidate, 'title'>) => [cleanKeyword(`${c.title} movie`), cleanKeyword(`${c.title} trailer`)];

/** Volumes are refreshed after this long (search interest in old films moves slowly). */
const STALE_DAYS = 180;

export async function buildCatalogue(
  candidates: Candidate[],
  movies: Movie[],
  queue: QueueItem[],
  opt: CatalogueOptions,
): Promise<{ candidates: Candidate[]; queue: QueueItem[]; queued: string[]; log: string[]; report: string; changed: boolean }> {
  const log: string[] = [];
  const nowIso = opt.now.toISOString();
  const have = new Set(movies.map((m) => titleKey(m.name)));
  const inQueue = new Set(queue.map((q) => titleKey(q.title)));
  let changed = false;

  // Tidy statuses.
  for (const c of candidates) {
    if (c.status === 'candidate' && have.has(titleKey(c.title))) {
      c.status = 'have';
      changed = true;
    }
    if (c.status === 'candidate' && opt.maxYear && c.year && c.year > opt.maxYear) {
      c.status = 'skipped';
      c.note = `newer than ${opt.maxYear}`;
      changed = true;
    }
  }

  // 1. Volumes for up to 500 candidates (2 keywords each = one 1,000-keyword task).
  const stale = (c: Candidate) =>
    !c.volumeCheckedAt || opt.now.getTime() - Date.parse(c.volumeCheckedAt) > STALE_DAYS * 86400000;
  const toCheck = candidates.filter((c) => c.status === 'candidate' && stale(c)).slice(0, 500);
  if (toCheck.length && opt.volumes) {
    try {
      const vols = await opt.volumes(toCheck.flatMap(keywordsFor));
      for (const c of toCheck) {
        const v = keywordsFor(c).map((k) => vols.get(k));
        c.volume = v.every((x) => x == null) ? null : v.reduce<number>((s, x) => s + (x ?? 0), 0);
        c.volumeCheckedAt = nowIso;
      }
      changed = true;
      log.push(`Looked up search volumes for ${toCheck.length} film(s).`);
    } catch (e) {
      log.push(`Volume lookup failed: ${(e as Error).message}. Ranking uses volumes already stored.`);
    }
  } else if (toCheck.length) {
    log.push(`${toCheck.length} film(s) have no search volume yet (DataForSEO not set up).`);
  }

  // 2. Queue the most-searched candidates.
  const ranked = candidates
    .filter((c) => c.status === 'candidate' && (c.volume ?? 0) >= opt.minVolume && !inQueue.has(titleKey(c.title)))
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
  const picked = ranked.slice(0, opt.perRun);
  const outQueue = [...queue];
  for (const c of picked) {
    outQueue.push({
      title: c.title,
      year: c.year,
      youtubeId: null,
      videoTitle: null,
      channelId: null,
      publishedAt: null,
      source: 'catalogue',
      status: 'new',
      note: c.theme ? `theme: ${c.theme}` : null,
      foundAt: nowIso,
      lastChecked: null,
    });
    c.status = 'queued';
    changed = true;
  }
  const queued = picked.map((c) => `${c.title}${c.year ? ` (${c.year})` : ''}: ${c.volume}/mo`);
  log.unshift(`Catalogue: queued ${picked.length} film(s)${picked.length ? ': ' + queued.join(', ') : ''}.`);

  return { candidates, queue: outQueue, queued, log, report: report(candidates, opt), changed };
}

function report(candidates: Candidate[], opt: CatalogueOptions): string {
  const count = (s: Candidate['status']) => candidates.filter((c) => c.status === s).length;
  const L: string[] = [
    '# Trailer channel catalogue candidates',
    '',
    `Updated ${opt.now.toISOString().slice(0, 10)}. Monthly Google searches in ${opt.location} for "<film> movie" + "<film> trailer". ` +
      `Films after ${opt.maxYear ?? 'any year'} are left out.`,
    '',
    `${count('candidate')} waiting · ${count('queued')} sent to the pipeline · ${count('have')} already on the site · ${count('skipped')} skipped.`,
    '',
    'Add films by chat: "add candidates: <theme or list>". The weekly run queues the most-searched ones.',
    '',
  ];

  // By theme: helps decide which collections to build.
  const themes = new Map<string, { volume: number; films: number }>();
  for (const c of candidates) {
    if (!c.theme || c.status === 'skipped') continue;
    const t = themes.get(c.theme) ?? { volume: 0, films: 0 };
    t.volume += c.volume ?? 0;
    t.films++;
    themes.set(c.theme, t);
  }
  if (themes.size) {
    L.push('## Themes by search demand', '', '| Theme | Films | Searches/mo |', '|---|---:|---:|');
    for (const [t, v] of [...themes].sort((a, b) => b[1].volume - a[1].volume)) L.push(`| ${t} | ${v.films} | ${v.volume.toLocaleString()} |`);
    L.push('');
  }

  L.push('## Next up (waiting, most searched first)', '', '| Film | Searches/mo | Theme |', '|---|---:|---|');
  const waiting = candidates.filter((c) => c.status === 'candidate').sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));
  for (const c of waiting.slice(0, 60))
    L.push(`| ${c.title}${c.year ? ` (${c.year})` : ''} | ${c.volume == null ? '—' : c.volume.toLocaleString()} | ${c.theme ?? ''} |`);
  if (!waiting.length) L.push('| _none_ | | |');
  L.push('');
  return L.join('\n');
}
