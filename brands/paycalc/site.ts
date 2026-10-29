/**
 * Every page of the Australian pay calculator (working name MyPayCalc). Earns from display ads once launched,
 * so the job is traffic: one calculator, one page per common salary ("85000 after tax"), and the rate guides.
 * Rates: data/paycalc/rates.json (sourced, dated). Copy: data/paycalc/pages.json.
 */
import { getSingleton } from '../../src/lib/data';
import type { Route } from '../../src/lib/routes';
import { calculate, aud } from '../../src/lib/pay-tax';
import type { Pages, RateFile } from './model';
import brandConfig from './brand.config';

const SITE = `https://${brandConfig.domain}`;
const SUFFIX = brandConfig.seo.titleSuffix;

/** Salaries that get their own page: every $5k to $150k, then every $10k to $300k. */
export const SALARIES = [
  ...Array.from({ length: 27 }, (_, i) => 20000 + i * 5000),
  ...Array.from({ length: 15 }, (_, i) => 160000 + i * 10000),
];
export const salaryPath = (n: number) => `salary/${n}-after-tax`;

export function routes(): Route[] {
  const pages = getSingleton<Pages>('pages');
  const rates = getSingleton<RateFile>('rates');
  const Y = rates.yearLabel;
  const org = {
    '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE}/#org`, name: brandConfig.name, url: SITE,
    parentOrganization: { '@type': 'Organization', name: 'Independent Media Network Pty Ltd' }, areaServed: { '@type': 'Country', name: 'Australia' },
  };
  const crumbs = (items: { name: string; path: string }[]) => ({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE}/${it.path}`.replace(/\/$/, '') })),
  });
  const faqSchema = (list: { q: string; a: string }[]) => ({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: list.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  });
  const app = (name: string, path: string) => ({
    '@context': 'https://schema.org', '@type': 'WebApplication', name, url: `${SITE}/${path}`.replace(/\/$/, ''),
    applicationCategory: 'FinanceApplication', operatingSystem: 'Any (runs in your web browser)', isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' }, publisher: { '@id': `${SITE}/#org` },
  });
  const popular = [50000, 60000, 70000, 80000, 90000, 100000, 120000, 150000].map((n) => ({ href: `/${salaryPath(n)}`, label: `${aud(n)} after tax` }));
  const out: Route[] = [];

  out.push({
    path: '',
    template: 'pcCalc',
    seo: { title: pages.home.seoTitle, rawTitle: true, description: pages.home.description },
    schema: [org, { '@context': 'https://schema.org', '@type': 'WebSite', name: brandConfig.name, url: SITE }, app(`Pay calculator ${Y}`, ''), faqSchema(pages.home.faq)],
    props: { page: pages.home, rates, popular },
  });

  out.push({
    path: 'salary',
    template: 'pcSalaries',
    seo: { title: pages.salary.seoTitle, rawTitle: true, description: pages.salary.description },
    schema: [crumbs([{ name: 'Pay calculator', path: '' }, { name: 'Salaries', path: 'salary' }])],
    props: { page: pages.salary, rates, salaries: SALARIES.map((n) => ({ n, href: `/${salaryPath(n)}`, r: calculate({ amount: n, period: 'year' }, rates) })) },
  });

  SALARIES.forEach((n, i) => {
    const r = calculate({ amount: n, period: 'year' }, rates);
    const k = n >= 1000 ? `$${n / 1000}k` : aud(n);
    out.push({
      path: salaryPath(n),
      template: 'pcSalary',
      seo: {
        title: `${aud(n)} After Tax in Australia ${Y}: ${aud(r.net)} a Year`,
        rawTitle: true,
        description: `On ${aud(n)} (${k}) a year you take home ${aud(r.net)} in ${Y}: ${aud(r.net / 12)} a month, ${aud(r.net / 26)} a fortnight or ${aud(r.net / 52)} a week, after tax and Medicare.`,
      },
      schema: [
        crumbs([{ name: 'Pay calculator', path: '' }, { name: 'Salaries', path: 'salary' }, { name: `${aud(n)} after tax`, path: salaryPath(n) }]),
      ],
      props: {
        salary: n, rates,
        prev: i > 0 ? { n: SALARIES[i - 1], href: `/${salaryPath(SALARIES[i - 1])}` } : null,
        next: i + 1 < SALARIES.length ? { n: SALARIES[i + 1], href: `/${salaryPath(SALARIES[i + 1])}` } : null,
        nearby: SALARIES.filter((s) => s !== n && Math.abs(s - n) <= 30000).map((s) => ({ n: s, href: `/${salaryPath(s)}` })),
      },
    });
  });

  for (const slug of ['tax-brackets', 'hecs-help-repayments'] as const) {
    const p = pages[slug];
    out.push({
      path: slug,
      template: 'pcGuide',
      seo: { title: p.seoTitle, rawTitle: true, description: p.description },
      schema: [
        { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.description, dateModified: rates.checked, author: { '@type': 'Person', name: 'Simon Farrugia' }, publisher: { '@id': `${SITE}/#org` }, url: `${SITE}/${slug}` },
        faqSchema(p.faq),
        crumbs([{ name: 'Pay calculator', path: '' }, { name: p.title, path: slug }]),
      ],
      props: { kind: slug === 'tax-brackets' ? 'brackets' : 'help', page: p, rates, popular },
    });
  }

  for (const slug of ['how-we-calculate', 'about', 'contact', 'how-we-make-money', 'privacy-policy'] as const) {
    const p = pages[slug];
    out.push({
      path: slug,
      template: 'pcPage',
      seo: { title: p.title + SUFFIX, rawTitle: true, description: p.description },
      schema: [crumbs([{ name: 'Pay calculator', path: '' }, { name: p.title, path: slug }])],
      props: { title: p.title, paragraphs: p.paragraphs, sources: slug === 'how-we-calculate' ? rates.sources : null, checked: rates.checked },
    });
  }
  return out;
}
