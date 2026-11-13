/**
 * Google APIs: Search Console (service account) and YouTube Data API (API key).
 * Both free. One Google Cloud project holds the service account and the key.
 */

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Signed JWT for the service account (RS256 via WebCrypto). Exported for tests. */
export async function serviceAccountJwt(sa: ServiceAccount, scope: string, nowSec: number): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: nowSec, exp: nowSec + 3600 }),
  );
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64url(sig)}`;
}

export async function googleAccessToken(serviceAccountJson: string, scope: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson) as ServiceAccount;
  const jwt = await serviceAccountJwt(sa, scope, Math.floor(Date.now() / 1000));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!res.ok) throw new Error(`Google sign-in: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/** Search Console performance data. `site` is the property URL, e.g. https://www.movietrailer.channel/ */
export async function searchAnalytics(
  token: string,
  site: string,
  startDate: string,
  endDate: string,
  dimensions: ('query' | 'page' | 'date')[],
  rowLimit = 5000,
): Promise<GscRow[]> {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit, type: 'web' }),
    },
  );
  if (!res.ok) throw new Error(`Search Console: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { rows?: GscRow[] }).rows ?? [];
}

export interface YtResult {
  youtubeId: string;
  title: string;
  channelTitle: string;
}

/** YouTube search (100 of the 10,000 free daily units per call). */
export async function youtubeSearch(apiKey: string, q: string): Promise<YtResult[]> {
  const params = new URLSearchParams({ part: 'snippet', type: 'video', maxResults: '5', q, key: apiKey });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!res.ok) throw new Error(`YouTube search: HTTP ${res.status}`);
  const body = (await res.json()) as { items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }[] };
  return (body.items ?? []).map((i) => ({
    youtubeId: i.id.videoId,
    title: decodeHtml(i.snippet.title),
    channelTitle: i.snippet.channelTitle,
  }));
}

const decodeHtml = (s: string) =>
  s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** GA4 Data API report (free). The service account needs Viewer access on the GA4 property. */
export interface Ga4Row {
  dims: string[];
  mets: number[];
}

type Ga4Body = {
  dateRanges: { startDate: string; endDate: string }[];
  dimensions: string[];
  metrics: string[];
  /** Only events whose name starts with this. */
  eventPrefix?: string;
  limit?: number;
};
const ga4Request = (body: Ga4Body) => ({
  dateRanges: body.dateRanges,
  dimensions: body.dimensions.map((name) => ({ name })),
  metrics: body.metrics.map((name) => ({ name })),
  limit: body.limit ?? 10000,
  ...(body.eventPrefix ? { dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { matchType: 'BEGINS_WITH', value: body.eventPrefix } } } } : {}),
});
type Ga4Raw = { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] };
const ga4Rows = (data: Ga4Raw): Ga4Row[] =>
  (data.rows ?? []).map((r) => ({ dims: r.dimensionValues.map((d) => d.value), mets: r.metricValues.map((m) => Number(m.value) || 0) }));

/**
 * Up to 5 GA4 reports in ONE request (batchRunReports). The Workers Free plan allows 50 outbound
 * requests per run, so the daily stats job batches its reports: 2 GA4 + 2 Search Console calls per site.
 * With more than one date range, GA4 adds a last dimension "date_range_0" / "date_range_1".
 */
export async function ga4Batch(token: string, propertyId: string, bodies: Ga4Body[]): Promise<Ga4Row[][]> {
  if (bodies.length > 5) throw new Error('GA4 batch: at most 5 reports');
  const call = () => fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ requests: bodies.map(ga4Request) }),
  });
  // GA4 sometimes answers 502/503 for a moment (14 Nov 2026: 3 sites zeroed). One retry after a short pause.
  let res = await call();
  if (res.status >= 500) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await call();
  }
  if (!res.ok) throw new Error(`GA4: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { reports?: Ga4Raw[] };
  return bodies.map((_, i) => ga4Rows(data.reports?.[i] ?? {}));
}

export async function ga4Report(
  token: string,
  propertyId: string,
  body: {
    dateRanges: { startDate: string; endDate: string }[];
    dimensions: string[];
    metrics: string[];
    /** Only events whose name starts with this. */
    eventPrefix?: string;
    limit?: number;
  },
): Promise<Ga4Row[]> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      dateRanges: body.dateRanges,
      dimensions: body.dimensions.map((name) => ({ name })),
      metrics: body.metrics.map((name) => ({ name })),
      limit: body.limit ?? 10000,
      ...(body.eventPrefix
        ? { dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { matchType: 'BEGINS_WITH', value: body.eventPrefix } } } }
        : {}),
    }),
  });
  if (!res.ok) throw new Error(`GA4: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] };
  return (data.rows ?? []).map((r) => ({ dims: r.dimensionValues.map((d) => d.value), mets: r.metricValues.map((m) => Number(m.value) || 0) }));
}

/**
 * IndexNow: tells Bing, Yandex, Seznam, Naver (and Bing-powered DuckDuckGo / ChatGPT search) about new or changed URLs.
 * The key file https://<host>/<key>.txt must contain the key. Returns the HTTP status (200/202 = accepted).
 */
export async function indexNow(host: string, key: string, urls: string[]): Promise<number> {
  if (!urls.length) return 200;
  const res = await fetch('https://www.bing.com/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls.slice(0, 10000) }),
  });
  return res.status;
}

export interface UrlInspection {
  url: string;
  verdict: string; // PASS | NEUTRAL | FAIL | VERDICT_UNSPECIFIED
  coverage: string; // e.g. "Submitted and indexed", "Crawled - currently not indexed", "Discovered - currently not indexed"
  lastCrawl: string | null;
  googleCanonical: string | null;
  robots: string | null;
  fetch: string | null;
}

/** Search Console URL Inspection: is this page in Google's index, and if not, why. Quota 2,000/day per property. */
export async function inspectUrl(token: string, site: string, url: string): Promise<UrlInspection> {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: site, languageCode: 'en-AU' }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`URL inspection ${url}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const r = ((await res.json()) as { inspectionResult?: { indexStatusResult?: Record<string, string> } }).inspectionResult?.indexStatusResult ?? {};
  return {
    url,
    verdict: r.verdict ?? 'VERDICT_UNSPECIFIED',
    coverage: r.coverageState ?? 'unknown',
    lastCrawl: r.lastCrawlTime ?? null,
    googleCanonical: r.googleCanonical ?? null,
    robots: r.robotsTxtState ?? null,
    fetch: r.pageFetchState ?? null,
  };
}
