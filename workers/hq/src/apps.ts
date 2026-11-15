// Home screen: every site is a client "app" with notifications (IMN HQ → Home).
// Client registry = hq/sitecheck.json sites (owner "imn" for IMN's own sites, "client" for client studio sites).
// Live parts: Simon's to-do list and open GitHub issues (read from the public repo, cached), new form posts (D1).
// Site check cards come from /api/sitecheck; outreach notifications are computed in the page from the data it already loads.

import CONFIG from '../../../hq/sitecheck.json';

const REPO = 'simonpatrickfarrugia-beep/site-factory';

async function cached(url: string, ttl: number, init?: RequestInit): Promise<unknown> {
  const cache = caches.default;
  const key = new Request(url);
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const res = await fetch(url, { ...init, headers: { 'user-agent': 'imn-hq', accept: 'application/vnd.github+json', ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.text();
  await cache.put(key, new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${ttl}` } }));
  return JSON.parse(body);
}

type Site = { id: string; name: string; label?: string; url: string; owner?: string; icon?: string; carePlan?: string };
type Todo = { id: string; kind: string; what: string; why?: string; link?: string; linkLabel?: string; mins?: number; done?: boolean; brand?: string; ready?: unknown };
type Issue = { number: number; title: string; html_url: string; labels: { name: string }[]; created_at: string; pull_request?: unknown };

export async function apps(db: D1Database) {
  const clients = (CONFIG as unknown as { sites: Site[] }).sites.map((s) => ({ id: s.id, name: s.name, label: s.label ?? s.name, url: s.url, owner: s.owner ?? 'imn', icon: s.icon ?? '🌐', carePlan: s.carePlan ?? null }));
  const [todo, issues, forms] = await Promise.all([
    cached(`https://raw.githubusercontent.com/${REPO}/main/hq/portfolio.json`, 300)
      .then((p) => ((p as { todo?: Todo[] }).todo ?? []).filter((t) => !t.done))
      .catch(() => null),
    cached(`https://api.github.com/repos/${REPO}/issues?state=open&per_page=50`, 600)
      .then((xs) => (xs as Issue[]).filter((i) => !i.pull_request).map((i) => ({ number: i.number, title: i.title, url: i.html_url, labels: i.labels.map((l) => l.name), at: i.created_at })))
      .catch(() => null),
    db.prepare(`SELECT brand, form, COUNT(*) AS n, MAX(created_at) AS at FROM submissions WHERE created_at > ? AND form != 'plan-email' GROUP BY brand, form`)
      .bind(new Date(Date.now() - 48 * 3600 * 1000).toISOString())
      .all<{ brand: string; form: string; n: number; at: string }>()
      .then((r) => r.results)
      .catch(() => []),
  ]);
  return { clients, todo, issues, forms, repo: REPO };
}
