/**
 * Widget engine (7 Nov 2026): free widgets other websites embed with one line of code.
 *
 * Each brand declares its widgets in brands/<slug>/widgets.ts and registers them in brands/widgets.ts.
 * The build then gives every brand that has widgets:
 *   /embed.js                 one loader for all of that brand's widgets (src/pages/embed.js.ts)
 *   /embed/<widget>.json      the widget's data, refreshed on every build (src/pages/embed/[widget].json.ts)
 *   /widgets                  the builder: pick options, see it live, copy the code. Prefilled from the URL,
 *                             so a personalised preview link can go in an outreach email (src/pages/[w]/index.html.ts)
 *   POST /api/embed           usage counts per embed (views, plays, clicks) into D1 embed_events (src/worker/site.ts)
 *
 * Money path: every item links back to OUR page (with utm tags), where the affiliate buttons and ads live.
 * Affiliate links are never placed on other people's sites (Amazon and most programmes only allow them on
 * sites registered to the account). The "by <Brand>" credit is a plain brand-name link, never keyword text.
 */

/** One card in a widget. `href` is a path on our site (e.g. /movies/alien-1979); the loader adds the origin and utm tags. */
export interface WidgetItem {
  id: string;
  title: string;
  sub?: string;
  image?: string;
  /** Plays inline (youtube-nocookie) when the card is tapped. */
  youtube?: string;
  href: string;
  /** Label for the link back to our page, e.g. "Where to watch". */
  cta?: string;
}

/** A ready-made set of items the host can pick (e.g. a collection). */
export interface WidgetGroup {
  id: string;
  name: string;
  items: string[];
}

export interface WidgetDef {
  /** URL-safe id, e.g. "trailer-reel". */
  id: string;
  /** Shown in the builder, e.g. "Trailer reel". */
  name: string;
  /** One line for the builder and outreach: what the host gets. */
  pitch: string;
  /** How the loader draws it. 'reel' = a grid of cards with optional inline video. */
  kind: 'reel';
  items: WidgetItem[];
  groups?: WidgetGroup[];
  defaults: { title: string; group?: string; max: number };
  /** Credit line before the brand link, e.g. "Trailers by". */
  credit: string;
  /** Who it's for, shown in the builder ("Cinemas, film societies, festivals"). */
  audience: string;
}
