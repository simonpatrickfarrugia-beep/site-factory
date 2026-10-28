/**
 * Every page on tradeadmin.com.au: free quote and invoice builders for Australian tradies (the traffic and links),
 * plus price comparisons of job management apps from each vendor's own pricing page (the referral income).
 * Content lives in data/trade-admin/*.json (edited by chat).
 */
import { getSingleton } from '../../src/lib/data';
import type { Route } from '../../src/lib/routes';
import type { Apps, Pages, Trades } from './model';

const SITE = 'https://tradeadmin.com.au';
const SUFFIX = ' | Trade Admin';

export function routes(): Route[] {
  const pages = getSingleton<Pages>('pages');
  const apps = getSingleton<Apps>('apps');
  const trades = getSingleton<Trades>('trades').trades;
  const tradeLinks = (mode: 'quote' | 'invoice') => trades.filter((t) => t.mode === mode).map((t) => ({ href: `/${t.slug}`, label: t.trade }));
  const org = {
    '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE}/#org`, name: 'Trade Admin', url: SITE,
    email: 'hello@tradeadmin.com.au', parentOrganization: { '@type': 'Organization', name: 'Independent Media Network Pty Ltd' },
    areaServed: { '@type': 'Country', name: 'Australia' },
  };
  const crumbs = (items: { name: string; path: string }[]) => ({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE}/${it.path}`.replace(/\/$/, '') })),
  });
  const faqSchema = (list: { q: string; a: string }[]) => ({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: list.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  });
  const compares = [
    { slug: 'job-management-software', name: 'Job apps compared', focus: null },
    { slug: 'tradify-vs-servicem8', name: 'Tradify vs ServiceM8', focus: ['tradify', 'servicem8'] },
    { slug: 'servicem8-pricing', name: 'ServiceM8 pricing', focus: ['servicem8'] },
    { slug: 'tradify-pricing', name: 'Tradify pricing', focus: ['tradify'] },
    { slug: 'fergus-pricing', name: 'Fergus pricing', focus: ['fergus'] },
  ] as const;
  const compareLinks = compares.map((c) => ({ href: `/${c.slug}`, label: c.name }));
  const out: Route[] = [];

  out.push({
    path: '',
    template: 'taHome',
    seo: { title: 'Trade Admin: Free Quote & Invoice Builders for Tradies', rawTitle: true, description: 'Free quote and invoice builders for Australian tradies: GST done for you, works on your phone, save as PDF. Plus job management apps compared on real prices.' },
    schema: [org, { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Trade Admin', url: SITE }],
    props: { page: pages.home, compareLinks, checked: apps.checked, tradeLinks: trades.map((t) => ({ href: `/${t.slug}`, label: `${t.trade} ${t.mode}` })) },
  });

  for (const mode of ['quote', 'invoice'] as const) {
    const slug = `${mode}-builder` as const;
    const p = pages[slug];
    out.push({
      path: slug,
      template: 'taBuilder',
      seo: { title: p.seoTitle + SUFFIX, rawTitle: true, description: p.description },
      schema: [
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: p.title, url: `${SITE}/${slug}`, applicationCategory: 'BusinessApplication', operatingSystem: 'Any (runs in your web browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' }, publisher: { '@id': `${SITE}/#org` } },
        faqSchema(p.faq),
        crumbs([{ name: 'Home', path: '' }, { name: p.title, path: slug }]),
      ],
      props: { mode, page: p, tradeLinks: tradeLinks(mode) },
    });
  }

  // Trade-specific templates (growth audit, 29 Oct 2026): "electrician invoice template", "builder quote template"…
  // Same builder, started with the trade's usual lines and its own guidance. Prices are left for the tradie.
  for (const t of trades) {
    const base = `${t.mode}-builder`;
    out.push({
      path: t.slug,
      template: 'taBuilder',
      seo: { title: t.seoTitle + SUFFIX, rawTitle: true, description: t.description },
      schema: [
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: t.title, url: `${SITE}/${t.slug}`, applicationCategory: 'BusinessApplication', operatingSystem: 'Any (runs in your web browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' }, publisher: { '@id': `${SITE}/#org` } },
        faqSchema(t.faq),
        crumbs([{ name: 'Home', path: '' }, { name: pages[base].title, path: base }, { name: t.title, path: t.slug }]),
      ],
      props: {
        mode: t.mode,
        page: { title: t.title, seoTitle: t.seoTitle, description: t.description, lede: t.lede, faq: t.faq },
        trade: { name: t.trade, licence: t.licence, items: t.items, notes: t.notes, tips: t.tips, base: `/${base}` },
        tradeLinks: tradeLinks(t.mode).filter((l) => l.href !== `/${t.slug}`),
        otherMode: trades.filter((o) => o.trade === t.trade && o.mode !== t.mode).map((o) => ({ href: `/${o.slug}`, label: o.title.replace(/^Free /, '') }))[0] ?? null,
      },
    });
  }

  for (const c of compares) {
    const p = pages[c.slug];
    out.push({
      path: c.slug,
      template: 'taCompare',
      seo: { title: p.seoTitle + SUFFIX, rawTitle: true, description: p.description },
      schema: [
        { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.description, dateModified: apps.checked, author: { '@type': 'Person', name: 'Simon Farrugia' }, publisher: { '@id': `${SITE}/#org` }, url: `${SITE}/${c.slug}` },
        crumbs([{ name: 'Home', path: '' }, ...(c.slug === 'job-management-software' ? [] : [{ name: 'Job apps compared', path: 'job-management-software' }]), { name: p.title, path: c.slug }]),
      ],
      props: { page: p, apps, focus: c.focus, slug: c.slug, others: compareLinks.filter((l) => l.href !== `/${c.slug}`) },
    });
  }

  {
    const p = pages['which-job-app'];
    out.push({
      path: 'which-job-app',
      template: 'taQuiz',
      seo: { title: p.seoTitle + SUFFIX, rawTitle: true, description: p.description },
      schema: [
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: p.title, url: `${SITE}/which-job-app`, applicationCategory: 'BusinessApplication', operatingSystem: 'Any (runs in your web browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' }, publisher: { '@id': `${SITE}/#org` } },
        faqSchema(p.faq),
        crumbs([{ name: 'Home', path: '' }, { name: 'Job apps compared', path: 'job-management-software' }, { name: p.title, path: 'which-job-app' }]),
      ],
      props: { page: p, apps },
    });
  }

  {
    const p = pages['admin-help'];
    out.push({
      path: 'admin-help',
      template: 'taHelp',
      seo: { title: p.seoTitle + SUFFIX, rawTitle: true, description: p.description },
      schema: [faqSchema(p.faq), crumbs([{ name: 'Home', path: '' }, { name: 'Admin help', path: 'admin-help' }])],
      props: { page: p },
    });
  }

  for (const slug of ['about', 'contact', 'how-we-make-money', 'privacy-policy'] as const) {
    const p = pages[slug];
    out.push({
      path: slug,
      template: 'taPage',
      seo: { title: p.title + SUFFIX, rawTitle: true, description: p.description },
      schema: [crumbs([{ name: 'Home', path: '' }, { name: p.title, path: slug }])],
      props: { title: p.title, paragraphs: p.paragraphs },
    });
  }
  return out;
}
