import type { APIRoute } from 'astro';
import { brand } from '../lib/brand';

/** Blocks crawlers entirely until the brand is launched. */
export const GET: APIRoute = ({ site }) => {
  const body = brand.launched
    ? `User-agent: *\nAllow: /\nDisallow: /hq/\n\nSitemap: ${new URL('/sitemap.xml', site)}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
