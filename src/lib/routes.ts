import type { templates } from '../templates';

/**
 * One generated page. Each brand's site module returns the full list of pages,
 * and the catch-all route renders them. The sitemap is built from the same list,
 * so every page is always in the sitemap.
 */
export interface Route {
  /** Path without leading or trailing slash. '' is the home page. */
  path: string;
  template: keyof typeof templates;
  seo: {
    title: string;
    /** true = use title exactly as given, no brand suffix. */
    rawTitle?: boolean;
    description: string;
    image?: string;
  };
  /** JSON-LD objects for this page. */
  schema?: Record<string, unknown>[];
  /** ISO date for the sitemap. */
  lastmod?: string;
  /** Leave out of the sitemap (e.g. thin or duplicate pages). */
  noSitemap?: boolean;
  /** Private page: noindex, no analytics, never in the sitemap (e.g. /hq/stats). */
  private?: boolean;
  props: Record<string, unknown>;
}
