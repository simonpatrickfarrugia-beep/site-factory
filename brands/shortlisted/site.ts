/**
 * Every page on shortlisted.com.au: free help for Australian SMEs choosing providers, starting with business travel.
 * Lead generation: the "Get a shortlist" form (forms Worker, form name "shortlist") with an email fallback.
 * Content lives in data/shortlisted/*.json (edited by chat).
 */
import { getSingleton } from '../../src/lib/data';
import type { Route } from '../../src/lib/routes';
import type { Pages, SiteInfo } from './model';

const SITE = 'https://shortlisted.com.au';
const SUFFIX = ' | Shortlisted';

export function routes(): Route[] {
  const site = getSingleton<SiteInfo>('site');
  const pages = getSingleton<Pages>('pages');
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE}/#org`,
    name: 'Shortlisted',
    url: SITE,
    email: site.email,
    parentOrganization: { '@type': 'Organization', name: 'Independent Media Network Pty Ltd' },
    areaServed: { '@type': 'Country', name: 'Australia' },
  };
  const crumbs = (items: { name: string; path: string }[]) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE}/${it.path}`.replace(/\/$/, '') })),
  });
  const faqSchema = (list: { q: string; a: string }[]) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  });
  const common = { email: site.email };
  const out: Route[] = [];

  out.push({
    path: '',
    template: 'slHome',
    seo: { title: 'Shortlisted: The Right Provider for Your Business, Free', rawTitle: true, description: 'Free help for Australian small and mid-sized businesses choosing a provider, starting with business travel. Get a short, honest shortlist.' },
    schema: [org, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Shortlisted', url: SITE }],
    props: { ...common, hero: site.hero, steps: site.steps, categories: site.categories },
  });

  const bt = pages['business-travel'];
  out.push({
    path: 'business-travel',
    template: 'slGuide',
    seo: { title: bt.seoTitle + SUFFIX, rawTitle: true, description: bt.description },
    schema: [
      { '@context': 'https://schema.org', '@type': 'Article', headline: bt.title, description: bt.description, author: { '@type': 'Person', name: 'Simon Farrugia' }, publisher: { '@id': `${SITE}/#org` }, url: `${SITE}/business-travel` },
      crumbs([{ name: 'Home', path: '' }, { name: 'Business travel', path: 'business-travel' }]),
    ],
    props: { ...common, page: bt },
  });

  const tp = pages['travel-policy-template'];
  out.push({
    path: 'business-travel/travel-policy-template',
    template: 'slPolicy',
    seo: { title: tp.seoTitle + SUFFIX, rawTitle: true, description: tp.description },
    schema: [
      { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Business travel policy generator', url: `${SITE}/business-travel/travel-policy-template`, applicationCategory: 'BusinessApplication', operatingSystem: 'Any (runs in your web browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' }, publisher: { '@id': `${SITE}/#org` } },
      faqSchema(tp.faq),
      crumbs([{ name: 'Home', path: '' }, { name: 'Business travel', path: 'business-travel' }, { name: 'Travel policy template', path: 'business-travel/travel-policy-template' }]),
    ],
    props: { ...common, page: tp },
  });

  const gs = pages['get-a-shortlist'];
  out.push({
    path: 'get-a-shortlist',
    template: 'slEnquiry',
    seo: { title: gs.title + SUFFIX, rawTitle: true, description: gs.description },
    schema: [crumbs([{ name: 'Home', path: '' }, { name: gs.title, path: 'get-a-shortlist' }])],
    props: { ...common, page: gs, endpoint: site.formsEndpoint, categories: site.categories },
  });

  for (const slug of ['about', 'how-we-make-money', 'privacy-policy'] as const) {
    const p = pages[slug];
    out.push({
      path: slug,
      template: 'slPage',
      seo: { title: p.title + SUFFIX, rawTitle: true, description: p.description },
      schema: [crumbs([{ name: 'Home', path: '' }, { name: p.title, path: slug }])],
      props: { ...common, title: p.title, paragraphs: p.paragraphs, showCta: slug !== 'privacy-policy' },
    });
  }
  return out;
}
