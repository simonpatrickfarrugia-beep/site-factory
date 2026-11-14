/**
 * Site check (report card engine) — the parts that need the Worker's secrets.
 * POST /sitecheck?key=… with {market, gscSite, keywords[], inspect[]}:
 *   - Google's top 10 for each search (DataForSEO SERP, ~US$0.002 each), so the card can show who outranks us;
 *   - Search Console URL Inspection for each page (free), so the card can show what isn't indexed.
 * Called by scripts/sitecheck/run.py (GitHub workflow sitecheck.yml). Commits nothing; the script writes the card.
 * Stays inside the free plan's 50 calls per run: at most 8 searches + 12 pages + 1 token.
 */
import { serpTop10, type SerpResult } from './dataforseo';
import { googleAccessToken, inspectUrl, type UrlInspection } from './google';

export interface SiteCheckRequest { market?: number; gscSite?: string | null; keywords?: string[]; inspect?: string[] }

export async function siteCheck(
  env: { DATAFORSEO_LOGIN?: string; DATAFORSEO_PASSWORD?: string; GSC_SERVICE_ACCOUNT?: string },
  body: SiteCheckRequest,
) {
  const market = body.market === 2840 ? 2840 : 2036;
  const keywords = [...new Set((body.keywords ?? []).map((k) => String(k).trim()).filter(Boolean))].slice(0, 8);
  const pages = [...new Set((body.inspect ?? []).map(String).filter((u) => /^https:\/\//.test(u)))].slice(0, 12);
  let costUsd = 0;
  const serps: { keyword: string; top?: SerpResult[]; error?: string }[] = [];
  if (keywords.length && env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD) {
    const res = await Promise.allSettled(keywords.map((k) => serpTop10(env.DATAFORSEO_LOGIN!, env.DATAFORSEO_PASSWORD!, k, market)));
    res.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        costUsd += r.value.cost;
        serps.push({ keyword: keywords[i], top: r.value.items });
      } else serps.push({ keyword: keywords[i], error: String((r.reason as Error)?.message ?? r.reason).slice(0, 160) });
    });
  }
  const index: (UrlInspection | { url: string; error: string })[] = [];
  if (pages.length && body.gscSite && env.GSC_SERVICE_ACCOUNT) {
    try {
      const token = await googleAccessToken(env.GSC_SERVICE_ACCOUNT, 'https://www.googleapis.com/auth/webmasters.readonly');
      for (let i = 0; i < pages.length; i += 6) {
        const batch = await Promise.allSettled(pages.slice(i, i + 6).map((u) => inspectUrl(token, body.gscSite!, u)));
        batch.forEach((b, j) => index.push(b.status === 'fulfilled' ? b.value : { url: pages[i + j], error: String((b.reason as Error)?.message ?? b.reason).slice(0, 160) }));
      }
    } catch (e) {
      index.push({ url: '', error: (e as Error).message.slice(0, 160) });
    }
  }
  return { market, serps, index, costUsd: Math.round(costUsd * 10000) / 10000 };
}
