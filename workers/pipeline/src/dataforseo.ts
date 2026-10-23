/**
 * DataForSEO: Google Ads (Keyword Planner) monthly search volumes.
 * US$0.09 per live task of up to 1,000 keywords, from prepaid credit.
 * Docs: https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/
 */

/** Google Ads rejects most symbols in keywords; keep letters, digits, spaces, & ' - . */
export const cleanKeyword = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9&'.\- ]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 10)
    .join(' ')
    .slice(0, 80);

/** Returns keyword -> average monthly searches (null when Google has no data). */
export async function searchVolumes(
  login: string,
  password: string,
  keywords: string[],
  locationCode: number,
  languageCode = 'en',
): Promise<Map<string, number | null>> {
  const unique = [...new Set(keywords.map(cleanKeyword).filter(Boolean))].slice(0, 1000);
  const out = new Map<string, number | null>();
  if (!unique.length) return out;
  const res = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${login}:${password}`)}`, 'content-type': 'application/json' },
    body: JSON.stringify([{ keywords: unique, location_code: locationCode, language_code: languageCode }]),
  });
  if (!res.ok) throw new Error(`DataForSEO: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as {
    status_code: number;
    status_message: string;
    tasks?: { status_code: number; status_message: string; result?: { keyword: string; search_volume: number | null }[] | null }[];
  };
  const task = body.tasks?.[0];
  if (body.status_code !== 20000 || !task || task.status_code !== 20000)
    throw new Error(`DataForSEO: ${task?.status_message ?? body.status_message}`);
  for (const r of task.result ?? []) out.set(cleanKeyword(r.keyword), r.search_volume ?? null);
  for (const k of unique) if (!out.has(k)) out.set(k, null);
  return out;
}

const auth = (login: string, password: string) => `Basic ${btoa(`${login}:${password}`)}`;

async function dfsTask<T>(login: string, password: string, path: string, task: Record<string, unknown>): Promise<{ result: T; cost: number }> {
  const res = await fetch(`https://api.dataforseo.com/v3/${path}`, {
    method: 'POST',
    headers: { authorization: auth(login, password), 'content-type': 'application/json' },
    body: JSON.stringify([task]),
  });
  if (!res.ok) {
    const text = await res.text();
    let why = text.slice(0, 200);
    try {
      why = (JSON.parse(text) as { tasks?: { status_message?: string }[] }).tasks?.[0]?.status_message ?? why;
    } catch {
      /* not JSON */
    }
    throw new Error(`DataForSEO ${path}: HTTP ${res.status} ${why}`);
  }
  const body = (await res.json()) as { status_code: number; status_message: string; tasks?: { status_code: number; status_message: string; cost?: number; result?: T }[] };
  const t = body.tasks?.[0];
  if (body.status_code !== 20000 || !t || t.status_code !== 20000) throw new Error(`DataForSEO ${path}: ${t?.status_message ?? body.status_message}`);
  return { result: t.result as T, cost: t.cost ?? 0 };
}

export interface KeywordIdea {
  keyword: string;
  volume: number;
  cpc: number | null;
  competition: number | null; // Google Ads competition index 0–100 (paid ads, a money signal)
}

/** Google Ads "keywords for keywords": related searches with volume and CPC. Up to 20 seeds. ~US$0.075 per call. */
export async function keywordIdeas(login: string, password: string, seeds: string[], locationCode: number): Promise<{ items: KeywordIdea[]; cost: number }> {
  const keywords = [...new Set(seeds.map(cleanKeyword).filter(Boolean))].slice(0, 20);
  const { result, cost } = await dfsTask<{ keyword: string; search_volume: number | null; cpc: number | null; competition_index: number | null }[]>(
    login,
    password,
    'keywords_data/google_ads/keywords_for_keywords/live',
    { keywords, location_code: locationCode, language_code: 'en', sort_by: 'search_volume' },
  );
  return {
    items: (result ?? [])
      .filter((r) => (r.search_volume ?? 0) > 0)
      .map((r) => ({ keyword: r.keyword, volume: r.search_volume ?? 0, cpc: r.cpc ?? null, competition: r.competition_index ?? null })),
    cost,
  };
}

/** SEO keyword difficulty 0–100 (DataForSEO Labs). Up to 1,000 keywords per call. */
export async function keywordDifficulty(login: string, password: string, keywords: string[], locationCode: number): Promise<{ kd: Map<string, number>; cost: number }> {
  const list = [...new Set(keywords.map(cleanKeyword).filter(Boolean))].slice(0, 1000);
  const kd = new Map<string, number>();
  if (!list.length) return { kd, cost: 0 };
  const { result, cost } = await dfsTask<{ items?: { keyword: string; keyword_difficulty: number | null }[] }[]>(
    login,
    password,
    'dataforseo_labs/google/bulk_keyword_difficulty/live',
    { keywords: list, location_code: locationCode, language_code: 'en' },
  );
  for (const i of result?.[0]?.items ?? []) if (i.keyword_difficulty != null) kd.set(cleanKeyword(i.keyword), i.keyword_difficulty);
  return { kd, cost };
}

export interface SerpResult {
  rank: number;
  domain: string;
  url: string;
  title: string;
}

/** Google top-10 organic results for one keyword (SERP API, live/regular, ~US$0.002 per keyword). */
export async function serpTop10(login: string, password: string, keyword: string, locationCode: number): Promise<{ items: SerpResult[]; cost: number }> {
  const { result, cost } = await dfsTask<{ items?: { type: string; rank_group: number; domain?: string; url?: string; title?: string }[] }[]>(
    login,
    password,
    'serp/google/organic/live/regular',
    { keyword: cleanKeyword(keyword), location_code: locationCode, language_code: 'en', depth: 10 },
  );
  const items = (result?.[0]?.items ?? [])
    .filter((i) => i.type === 'organic' && i.domain)
    .slice(0, 10)
    .map((i) => ({ rank: i.rank_group, domain: i.domain!.replace(/^www\./, ''), url: i.url ?? '', title: (i.title ?? '').slice(0, 90) }));
  return { items, cost };
}

/** Estimated monthly organic search visits per domain (DataForSEO Labs bulk traffic, ~US$0.01 + US$0.0001 per domain). */
export async function domainTraffic(login: string, password: string, domains: string[], locationCode: number): Promise<{ etv: Map<string, number>; cost: number }> {
  const list = [...new Set(domains)].slice(0, 1000);
  const etv = new Map<string, number>();
  if (!list.length) return { etv, cost: 0 };
  const { result, cost } = await dfsTask<{ items?: { target: string; metrics?: { organic?: { etv?: number } } }[] }[]>(
    login,
    password,
    'dataforseo_labs/google/bulk_traffic_estimation/live',
    { targets: list, location_code: locationCode, language_code: 'en', item_types: ['organic'] },
  );
  for (const i of result?.[0]?.items ?? []) etv.set(i.target.replace(/^www\./, ''), Math.round(i.metrics?.organic?.etv ?? 0));
  return { etv, cost };
}

export interface EasyKeywords {
  /** How many related searches pass the filter in total (the breadth of the opportunity). */
  total: number;
  /** The biggest of them (up to `limit`). */
  items: { keyword: string; volume: number; kd: number; cpc: number | null }[];
}

/**
 * Bulk screen for "lots of searches, little competition": related keywords (DataForSEO Labs keyword ideas)
 * with at least `minVolume` searches a month and SEO difficulty at most `maxKd`, biggest first.
 * About US$0.01 per call + US$0.0001 per keyword returned (~US$0.02 at limit 100).
 */
export async function easyKeywords(
  login: string,
  password: string,
  seeds: string[],
  locationCode: number,
  opts: { minVolume?: number; maxKd?: number; limit?: number; mustMatch?: string[] } = {},
): Promise<EasyKeywords & { cost: number }> {
  // Keyword ideas drift far from the topic ("tornado history" → "how many weeks in a year"), so only
  // searches containing one of the topic's own words count. Server-side, so total_count stays honest.
  const terms = (opts.mustMatch ?? []).map((t) => cleanKeyword(t).replace(/[^a-z0-9 ]/g, '')).filter((t) => t.length >= 3).slice(0, 6);
  const filters: unknown[] = [['keyword_info.search_volume', '>=', opts.minVolume ?? 100], 'and', ['keyword_properties.keyword_difficulty', '<=', opts.maxKd ?? 25]];
  if (terms.length) filters.push('and', ['keyword', 'regex', `(${terms.join('|')})`]);
  const keywords = [...new Set(seeds.map(cleanKeyword).filter(Boolean))].slice(0, 20);
  const { result, cost } = await dfsTask<
    { total_count?: number; items?: { keyword: string; keyword_info?: { search_volume?: number | null; cpc?: number | null }; keyword_properties?: { keyword_difficulty?: number | null } }[] }[]
  >(login, password, 'dataforseo_labs/google/keyword_ideas/live', {
    keywords,
    location_code: locationCode,
    language_code: 'en',
    include_serp_info: false,
    filters,
    order_by: ['keyword_info.search_volume,desc'],
    limit: opts.limit ?? 100,
  });
  const r = result?.[0];
  return {
    total: r?.total_count ?? 0,
    items: (r?.items ?? [])
      .filter((i) => i.keyword_properties?.keyword_difficulty != null)
      .map((i) => ({ keyword: i.keyword, volume: i.keyword_info?.search_volume ?? 0, kd: i.keyword_properties!.keyword_difficulty!, cpc: i.keyword_info?.cpc ?? null })),
    cost,
  };
}
