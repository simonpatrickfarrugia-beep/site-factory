/**
 * Every page on imnetwork.com.au: Independent Media Network's website subscription for small businesses
 * ($1 a day + GST: build, hosting, Google upkeep, a dashboard and 2 changes a month).
 * Leads: the "Get started" form (form "start") and the contact form (form "enquiry") → D1 via /api/submit/<form>.
 * Content lives in data/imn/*.json (edited by chat). The example dashboard reads one of our own sites' stats at build time.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getSingleton } from '../../src/lib/data';
import type { Route } from '../../src/lib/routes';
import type { DemoStats, Pages, SiteInfo } from './model';

const SITE = 'https://imnetwork.com.au';
const SUFFIX = ' | Independent Media Network';

/** Real numbers from Vic Tours (one of our own sites) for the example dashboard. Never invented: if the file is missing, the page says so. */
function demoStats(): DemoStats | null {
  const file = join(process.cwd(), 'data', 'vic', 'stats.json');
  if (!existsSync(file)) return null;
  const s = JSON.parse(readFileSync(file, 'utf8'));
  const t = s.totals ?? {};
  return {
    site: 'Vic Tours',
    url: 'https://victours.com.au',
    start: s.period?.start ?? '',
    end: s.period?.end ?? '',
    asOf: String(s.generatedAt ?? '').slice(0, 10),
    views: t.views ?? 0,
    users: t.users ?? 0,
    gscClicks: t.gscClicks ?? 0,
    gscImpressions: t.gscImpressions ?? 0,
    daily: (s.daily ?? []).map((d: { date: string; views: number }) => ({ date: d.date, views: d.views ?? 0 })),
    pages: (s.pages ?? []).filter((p: { views: number }) => p.views > 0).slice(0, 5).map((p: { path: string; views: number }) => ({ path: p.path, views: p.views })),
    queries: [...(s.queries ?? [])].sort((a: { impressions: number }, b: { impressions: number }) => b.impressions - a.impressions).slice(0, 5)
      .map((q: { query: string; impressions: number }) => ({ query: q.query, impressions: q.impressions })),
  };
}

export function routes(): Route[] {
  const site = getSingleton<SiteInfo>('site');
  const pages = getSingleton<Pages>('pages');
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE}/#org`,
    name: 'Independent Media Network',
    legalName: 'Independent Media Network Pty Ltd',
    url: SITE,
    email: site.email,
    address: { '@type': 'PostalAddress', addressLocality: 'Melbourne', addressRegion: 'VIC', addressCountry: 'AU' },
    areaServed: { '@type': 'Country', name: 'Australia' },
  };
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Website subscription for small businesses',
    serviceType: 'Website design, hosting and maintenance',
    provider: { '@id': `${SITE}/#org` },
    areaServed: { '@type': 'Country', name: 'Australia' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'AUD',
      price: String(site.price.monthly),
      priceSpecification: { '@type': 'UnitPriceSpecification', price: site.price.monthly, priceCurrency: 'AUD', unitText: 'MONTH', valueAddedTaxIncluded: false },
    },
  };
  const crumbs = (items: { name: string; path: string }[]) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE}/${it.path}`.replace(/\/$/, '') })),
  });
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: site.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const common = { site };
  const out: Route[] = [];

  out.push({
    path: '',
    template: 'imnHome',
    seo: { title: 'Small Business Websites for $1 a Day | Independent Media Network', rawTitle: true, description: 'Your website built, hosted and looked after for $1 a day + GST. Google set up, a dashboard and 2 changes a month. Human run, AI powered. No lock-in.' },
    schema: [org, service, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Independent Media Network', url: SITE }],
    props: { ...common },
  });

  out.push({
    path: 'pricing',
    template: 'imnPricing',
    seo: { title: 'Pricing: $1 a Day + GST' + SUFFIX, rawTitle: true, description: 'One plan: $30 + GST a month. Build, hosting, Google upkeep, a dashboard and 2 changes a month. Extra changes $50 + GST. Setup free during our launch.' },
    schema: [service, faqSchema, crumbs([{ name: 'Home', path: '' }, { name: 'Pricing', path: 'pricing' }])],
    props: { ...common },
  });

  out.push({
    path: 'our-sites',
    template: 'imnSites',
    seo: { title: 'Sites We Build and Run' + SUFFIX, rawTitle: true, description: 'Travel guides, job tools, film pages and calculators: the websites we build and run on the same system your business gets.' },
    schema: [crumbs([{ name: 'Home', path: '' }, { name: 'Our sites', path: 'our-sites' }])],
    props: { ...common },
  });

  out.push({
    path: 'example-dashboard',
    template: 'imnDashboard',
    seo: { title: 'Example Client Dashboard' + SUFFIX, rawTitle: true, description: 'See the dashboard every client gets: visits, Google searches and top pages in plain English. Shown with real numbers from one of our own sites.' },
    schema: [crumbs([{ name: 'Home', path: '' }, { name: 'Example dashboard', path: 'example-dashboard' }])],
    props: { ...common, stats: demoStats() },
  });

  const gs = pages['get-started'];
  out.push({
    path: 'get-started',
    template: 'imnStart',
    seo: { title: gs.title + SUFFIX, rawTitle: true, description: gs.description },
    schema: [crumbs([{ name: 'Home', path: '' }, { name: gs.title, path: 'get-started' }])],
    props: { ...common, page: gs },
  });

  const ct = pages.contact;
  out.push({
    path: 'contact',
    template: 'imnContact',
    seo: { title: ct.title + SUFFIX, rawTitle: true, description: ct.description },
    schema: [org, crumbs([{ name: 'Home', path: '' }, { name: ct.title, path: 'contact' }])],
    props: { ...common, page: ct },
  });

  for (const slug of ['about', 'privacy-policy'] as const) {
    const p = pages[slug];
    out.push({
      path: slug,
      template: 'imnPage',
      seo: { title: p.title + SUFFIX, rawTitle: true, description: p.description },
      schema: [crumbs([{ name: 'Home', path: '' }, { name: p.title, path: slug }])],
      props: { ...common, title: p.title, paragraphs: p.paragraphs, showCta: slug !== 'privacy-policy' },
    });
  }
  return out;
}
