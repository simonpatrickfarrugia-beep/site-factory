import type { APIRoute } from 'astro';
import { brand } from '../lib/brand';
import { loaderJs } from '../widgets/loader';
import { widgetSets } from '../../brands/widgets';

/** The widget loader (src/widgets/loader.ts). Only built for brands that have widgets. */
export const prerender = true;
export const GET: APIRoute = ({ site }) => {
  if (!widgetSets[brand.slug]) return new Response('/* no widgets for this site */', { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
  const origin = (site?.origin ?? `https://${brand.domain}`).replace(/\/$/, '');
  return new Response(loaderJs(brand.slug, brand.name, origin), { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
};
