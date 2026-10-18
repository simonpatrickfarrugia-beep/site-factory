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
