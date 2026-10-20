import type { APIRoute } from 'astro';
import { getRoutes } from '../lib/site';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = ({ site }) => {
  const urls = getRoutes()
    .filter((r) => !r.noSitemap && !r.private && !r.noindex)
    .map((r) => {
      const loc = new URL(r.path ? `/${r.path}` : '/', site).toString();
      const lastmod = r.lastmod ? `<lastmod>${r.lastmod.slice(0, 10)}</lastmod>` : '';
      return `<url><loc>${escape(loc)}</loc>${lastmod}</url>`;
    })
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
