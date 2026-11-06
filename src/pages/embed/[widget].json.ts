import type { APIRoute, GetStaticPaths } from 'astro';
import { brand } from '../../lib/brand';
import { widgetSets } from '../../../brands/widgets';
import type { WidgetDef } from '../../widgets/types';

/** One file per widget: everything the loader needs, rebuilt with the site so it never goes stale. */
export const getStaticPaths: GetStaticPaths = () => {
  const build = widgetSets[brand.slug];
  return build ? build().map((w) => ({ params: { widget: w.id }, props: { w } })) : [];
};

export const GET: APIRoute = ({ props, site }) => {
  const w = (props as { w: WidgetDef }).w;
  const body = { v: 1, brand: { slug: brand.slug, name: brand.name, url: site?.toString() ?? `https://${brand.domain}/`, accent: brand.colors.accent }, widget: w };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
