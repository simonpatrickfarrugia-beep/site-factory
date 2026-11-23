import type { APIRoute } from 'astro';
import { getRoutes } from '../lib/site';

/**
 * Data for the swipe feed when it opens on a film (/watch?film=<slug>) or a collection (/watch?c=<slug>):
 * every film's card, its "more like this" list, and the swipeable collections. Built from the /watch route
 * (brands/trailers/site.ts). Brands without a swipe feed get an empty object.
 */
export const GET: APIRoute = () => {
  const watch = getRoutes().find((r) => r.path === 'watch');
  const catalog = (watch?.props as { catalog?: unknown } | undefined)?.catalog ?? {};
  return new Response(JSON.stringify(catalog), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
