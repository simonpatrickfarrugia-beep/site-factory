/**
 * IMN Labs: test a new idea at imnetwork.com.au/labs/<slug> before buying a domain (DECISIONS.md, 21 Nov 2026).
 *
 * The registry is data/imn/labs.json; each lab's pages are data/imn/lab-<slug>.json (LabContent).
 * labRoutes() is brand-agnostic: IMN calls it with base "labs/<slug>" (lab header, "IMN Labs" label),
 * and a graduated brand calls it with base "" on its own domain (scripts/imn/lab.mjs graduate).
 * Paths inside lab content are written relative to the lab ("" = the lab's home, "beds" = /labs/<slug>/beds).
 *
 * Rules (checked in CI by scripts/imn/labs-check.mjs): at most `maxLive` live labs; every live lab has a 90-day target;
 * graduated labs have a domain; closed labs build no pages (the IMN Worker answers 410 Gone for them).
 */
import type { Route } from './routes';

export type LabStatus = 'live' | 'graduating' | 'graduated' | 'closed';
export type LabMetric = 'gsc_impressions' | 'gsc_clicks' | 'visits' | 'money_clicks';

export interface Lab {
  slug: string;
  name: string;
  /** live = pages at /labs/<slug>; graduating = new domain being set up (pages still here); graduated = 301 to domain; closed = 410. */
  status: LabStatus;
  /** One line for the /labs index. */
  summary: string;
  /** YYYY-MM-DD the lab went live (starts its 90 days). */
  launched: string;
  /** The 90-day graduation number, set before launch: per 28 days at day 90. */
  target: { metric: LabMetric; number: number; note?: string };
  /** Domain it graduates to; empty until bought. */
  domain: string;
  /** GA4 CTA keys that count as money clicks for this lab (e.g. affiliate buttons). */
  moneyKeys?: string[];
  graduatedOn?: string;
  closedOn?: string;
}

export interface LabRegistry {
  _note?: string;
  maxLive: number;
  labs: Lab[];
}

export interface LabSection {
  h: string;
  p?: string[];
  list?: string[];
  table?: { caption: string; head: string[]; rows: string[][]; note?: string };
}

export interface LabPage {
  /** Relative to the lab: "" is its home page. */
  path: string;
  seoTitle: string;
  description: string;
  kicker?: string;
  title: string;
  lede: string;
  /** YYYY-MM-DD the facts on this page were last checked. */
  updated?: string;
  sections: LabSection[];
  links?: { path: string; t: string; d: string }[];
  faq?: { q: string; a: string }[];
  sources?: { t: string; url: string; checked: string }[];
}

export interface LabContent {
  /** Lab menu (paths relative to the lab). */
  nav?: { label: string; path: string }[];
  pages: LabPage[];
}

/** Header override for lab pages: the lab's own name and menu, plus the "IMN Labs" label. */
export interface Chrome {
  label: string;
  labelHref: string;
  name: string;
  home: string;
  nav: { label: string; href: string }[];
}

const join = (base: string, rel: string) => [base, rel].map((s) => s.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/');

/**
 * All pages for one lab.
 * @param base  "labs/<slug>" on imnetwork.com.au, "" on a graduated brand's own domain.
 * @param site  canonical origin (for breadcrumbs), e.g. https://imnetwork.com.au
 * @param inLab true adds the IMN Labs header and label.
 */
export function labRoutes(lab: Lab, content: LabContent, opts: { base: string; site: string; inLab: boolean }): Route[] {
  const { base, site, inLab } = opts;
  const href = (rel: string) => '/' + join(base, rel);
  const chrome: Chrome | undefined = inLab
    ? {
        label: 'IMN Labs',
        labelHref: '/labs',
        name: lab.name,
        home: href(''),
        nav: (content.nav ?? []).map((n) => ({ label: n.label, href: href(n.path) })),
      }
    : undefined;
  return content.pages.map((p) => {
    const path = join(base, p.path);
    const trail = [
      ...(inLab ? [{ name: 'IMN Labs', path: 'labs' }] : [{ name: 'Home', path: '' }]),
      ...(inLab || p.path ? [{ name: lab.name, path: join(base, '') }] : []),
      ...(p.path ? [{ name: p.title, path }] : []),
    ];
    const schema: Record<string, unknown>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: `${site}/${t.path}`.replace(/\/$/, '') })),
      },
    ];
    if (p.faq?.length) schema.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
    return {
      path,
      template: 'labPage',
      seo: { title: p.seoTitle, rawTitle: true, description: p.description },
      schema,
      lastmod: p.updated,
      chrome,
      props: {
        page: { ...p, links: (p.links ?? []).map((l) => ({ ...l, path: href(l.path) })) },
        lab: { name: lab.name, slug: lab.slug },
        inLab,
      },
    } satisfies Route;
  });
}

/** Days since a YYYY-MM-DD date (Melbourne). */
export function daysSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - Date.parse(iso + 'T00:00:00+11:00')) / 86400000));
}
