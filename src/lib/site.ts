import { sites } from '../../brands/sites';
import { brand } from './brand';
import type { Route } from './routes';

let cache: Route[] | null = null;

/** All pages for the current brand, validated for duplicate paths. */
export function getRoutes(): Route[] {
  if (cache) return cache;
  const build = sites[brand.slug];
  if (!build) throw new Error(`Brand "${brand.slug}" has no site module in brands/sites.ts`);
  const routes = build();
  const seen = new Set<string>();
  for (const r of routes) {
    if (seen.has(r.path)) throw new Error(`Two pages share the path "/${r.path}"`);
    if (r.path.startsWith('/') || r.path.endsWith('/')) throw new Error(`Path "${r.path}" must not start or end with a slash`);
    seen.add(r.path);
  }
  cache = routes;
  return routes;
}
