// Site check tab: the latest report card per site (scripts/sitecheck/run.py writes hq/sitecheck/*.json daily).
// Read live from the repo (it's public) so a new card shows without redeploying HQ. Cached 10 minutes at the edge.
// Client-site cards will live in the private repo; this reads only IMN's own cards.

const HQ_RAW = 'https://raw.githubusercontent.com/simonpatrickfarrugia-beep/site-factory/main/hq/';
const RAW = HQ_RAW + 'sitecheck/';

async function raw(file: string, base = RAW): Promise<unknown> {
  const url = base + file;
  const cache = caches.default;
  const key = new Request(url);
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const res = await fetch(url, { headers: { 'user-agent': 'imn-hq' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Site check data: HTTP ${res.status}`);
  const body = await res.text();
  await cache.put(key, new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=600' } }));
  return JSON.parse(body);
}

export async function siteCheckIndex() {
  return (await raw('index.json')) ?? { sites: {} };
}

export async function siteCheckCard(id: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(id)) throw new Error('Bad site id');
  return (await raw(`${id}.json`)) ?? { error: 'No card yet' };
}

// Value tab: what each site (and IMN Labs lab) could sell for. scripts/hq/value.py writes hq/value.json daily (brief workflow).
export async function siteValue() {
  return (await raw('value.json', HQ_RAW)) ?? { sites: [], note: 'No value data yet: it is written each morning by the brief workflow.' };
}
