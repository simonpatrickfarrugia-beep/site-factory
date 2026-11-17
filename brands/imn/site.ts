/**
 * Every page on imnetwork.com.au: Independent Media Network's website subscription for small businesses
 * ($99 + GST a month, no setup fee, no lock-in: build, hosting, daily checks, a confidence dashboard and 2 change rounds a month).
 * Leads: the "Get started" form (form "start") and the contact form (form "enquiry") → D1 via /api/submit/<form>.
 * Content lives in data/imn/*.json (edited by chat). The example dashboard reads one of our own sites' stats at build time.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getSingleton } from '../../src/lib/data';
import type { Route } from '../../src/lib/routes';
import type { DemoStats, Glance, Guides, Light, Pages, SiteInfo } from './model';

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


/** Confidence at a glance for Vic Tours (one of our own sites): site check card + confidence engine. Never invented: null if the files are missing. */
function glance(): Glance | null {
  const cardFile = join(process.cwd(), 'hq', 'sitecheck', 'vic.json');
  const confFile = join(process.cwd(), 'hq', 'confidence.json');
  if (!existsSync(cardFile) || !existsSync(confFile)) return null;
  const card = JSON.parse(readFileSync(cardFile, 'utf8'));
  const conf = JSON.parse(readFileSync(confFile, 'utf8'));
  const c = (conf.macro?.sites ?? []).find((x: { id: string }) => x.id === 'vic');
  if (!c || typeof card.score !== 'number') return null;
  const n = (v: number) => Number(v ?? 0).toLocaleString('en-AU');
  const gradeLight = (g: string): Light => (g === 'A' || g === 'B' ? 'green' : g === 'C' ? 'amber' : 'red');
  const health = gradeLight(card.grade);
  const google: Light = c.trend === 'down' ? 'amber' : 'green';
  const track: Light = c.status === 'red' ? 'red' : c.status === 'amber' ? 'amber' : 'green';
  const all = [health, google, track];
  const overall: Light = all.includes('red') ? 'red' : all.includes('amber') ? 'amber' : 'green';
  const words = {
    green: ['All good', 'Nothing needs you. We keep watching.'],
    amber: ["Mostly good. We're on it", "Nothing needs you right now. Here's what we're watching."],
    red: ['Needs a chat', "Something needs a decision from you. We'll be in touch with a plan."],
  } as const;
  const pct = (v: number) => `${v > 0 ? 'up' : 'down'} ${Math.abs(Math.round(v * 100))}%`;
  const imprGrowth = typeof c.growth?.impressions === 'number' ? c.growth.impressions : null;
  const hist = (card.history ?? []) as { at: string; score: number }[];
  const area = (card.areas ?? {}) as Record<string, { grade: string | null; label: string }>;
  return {
    site: 'Vic Tours',
    url: card.url,
    asOf: String(card.scannedAt ?? '').slice(0, 10),
    overall,
    headline: words[overall][0],
    sub: words[overall][1],
    lights: [
      { label: 'Site health', status: health, value: `${card.grade} · ${card.score}/100`, note: `${n(card.pages)} pages checked for broken links, speed and Google basics` },
      { label: 'Found on Google', status: google, value: `${n(c.impr28)} times`, note: `shown in Google in the last 28 days${imprGrowth !== null ? `, ${c.trend === 'down' ? 'down' : 'up'} on the 2 weeks before` : ''}` },
      { label: 'On track for its goal', status: track, value: `${Math.round((c.pace ?? 0) * 100)}% of pace`, note: `${n(c.views28)} visits in 28 days, on day ${c.age} of a 90-day plan` },
    ],
    checks: Object.values(area).filter((a) => a.grade).map((a) => ({ label: a.label, grade: String(a.grade) })),
    fixed: (card.change?.fixed ?? []).slice(0, 4).map((f: string) => f.replace(/^(\d+) title outside 30–65 characters$/, '$1 page titles tidied for Google').replace(/^(\d+) description outside 70–160 characters$/, '$1 Google descriptions rewritten')),
    scoreFrom: hist.length > 1 ? hist[0].score : null,
    scoreTo: card.score,
    since: hist.length > 1 ? String(hist[0].at).slice(0, 10) : '',
    nextCheck: String(card.nextDue ?? ''),
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
  const glanceData = glance();
  const out: Route[] = [];

  out.push({
    path: '',
    template: 'imnHome',
    seo: { title: 'Small Business Websites, Under Control | IMN', rawTitle: true, description: 'Your website built, checked every day and looked after for $99 + GST a month. No setup fee, no lock-in. See how it\'s going at a glance on your dashboard.' },
    schema: [org, service, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Independent Media Network', url: SITE }],
    props: { ...common, glance: glanceData },
  });

  out.push({
    path: 'pricing',
    template: 'imnPricing',
    seo: { title: 'Pricing: $99 a Month + GST' + SUFFIX, rawTitle: true, description: 'One plan: $99 + GST a month. Your site built, hosted, checked every day and looked after, with a dashboard and 2 change rounds. No setup fee, no lock-in.' },
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
    seo: { title: 'Example Client Dashboard' + SUFFIX, rawTitle: true, description: 'See the dashboard every client gets: one confidence light, site health, Google and visits in plain English. Real numbers from one of our own sites.' },
    schema: [crumbs([{ name: 'Home', path: '' }, { name: 'Example dashboard', path: 'example-dashboard' }])],
    props: { ...common, stats: demoStats(), glance: glanceData },
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

  const tm = pages.terms;
  out.push({
    path: 'terms',
    template: 'imnTerms',
    seo: { title: tm.title + SUFFIX, rawTitle: true, description: tm.description },
    schema: [crumbs([{ name: 'Home', path: '' }, { name: tm.title, path: 'terms' }])],
    props: { page: tm },
  });

  // After Stripe checkout (payment link redirect). Kept out of Google.
  out.push({
    path: 'welcome',
    template: 'imnWelcome',
    noindex: true,
    seo: { title: pages.welcome.title + SUFFIX, rawTitle: true, description: pages.welcome.description },
    props: { ...common, page: pages.welcome },
  });

  // SEO guides: tradie hub, trade pages and the price guide (data/imn/guides.json).
  const { guides } = getSingleton<Guides>('guides');
  const hub = guides.find((x) => x.slug === 'websites-for-tradies');
  for (const g of guides) {
    const trail = [{ name: 'Home', path: '' }];
    if (hub && g.slug !== hub.slug && g.slug.endsWith('-websites')) trail.push({ name: 'Websites for tradies', path: hub.slug });
    trail.push({ name: g.kicker.split(' · ')[0], path: g.slug });
    out.push({
      path: g.slug,
      template: 'imnGuide',
      seo: { title: g.seoTitle, rawTitle: true, description: g.description },
      schema: [
        crumbs(trail),
        { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
        ...(g.slug.endsWith('-websites') || g.slug === 'websites-for-tradies' ? [{ ...service, name: g.title, serviceType: `Website design and care: ${g.kicker}` }] : []),
      ],
      props: { ...common, guide: g },
    });
  }

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
