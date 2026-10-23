import type { APIRoute } from 'astro';
import { getRoutes } from '../lib/site';

/**
 * Machine-readable list of this brand's bundles (ready-made plans), for the social-posting engine and other tools:
 * every route whose props carry a `bundle` summary. Empty list for brands without bundles.
 */
export const GET: APIRoute = ({ site }) => {
  const items = getRoutes()
    .filter((r) => r.props && (r.props as Record<string, unknown>).bundle && !r.private)
    .map((r) => ({
      url: new URL(`/${r.path}`, site).toString(),
      title: (r.props as { title?: string }).title ?? r.seo.title,
      seoTitle: r.seo.title,
      description: r.seo.description,
      image: r.seo.image ?? null,
      ...((r.props as { bundle: Record<string, unknown> }).bundle),
    }));
  return new Response(JSON.stringify({ count: items.length, bundles: items }, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
