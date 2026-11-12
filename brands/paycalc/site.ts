/**
 * Every page of the Australian pay calculator (working name MyPayCalc). Earns from display ads once launched,
 * so the job is traffic: one calculator, one page per common salary ("85000 after tax"), and the rate guides.
 * Rates: data/paycalc/rates.json (sourced, dated). Copy: data/paycalc/pages.json.
 */
import { getSingleton } from '../../src/lib/data';
import type { Route } from '../../src/lib/routes';
import { calculate, aud } from '../../src/lib/pay-tax';
import { monthlyRepayment } from '../../src/lib/mortgage';
import type { Pages, RateFile } from './model';
import brandConfig from './brand.config';

const SITE = `https://${brandConfig.domain}`;
const SUFFIX = brandConfig.seo.titleSuffix;

/** Salaries that get their own page: every $5k to $200k, every $10k to $300k, then $350k–$500k.
 *  (6 Nov 2026: the $160k–$300k pages already rank 6–10 for "tax on 300k"-style searches, so the long tail is widened.) */
export const SALARIES = [
  ...Array.from({ length: 37 }, (_, i) => 20000 + i * 5000),
  ...Array.from({ length: 10 }, (_, i) => 210000 + i * 10000),
  350000, 400000, 450000, 500000,
];
export const salaryPath = (n: number) => `salary/${n}-after-tax`;
/** Loan sizes that get their own page ("500k mortgage repayments": 1,300 searches a month in AU, 3 Nov 2026). */
export const LOANS = [...Array.from({ length: 17 }, (_, i) => 200000 + i * 50000), 1200000, 1500000];
export const loanPath = (n: number) => `mortgage-repayments/${n}`;

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
  const loanName = (n: number) => (n >= 1_000_000 ? `$${n / 1_000_000}m` : `$${n / 1000}k`);

  out.push({
    path: '',
    template: 'pcCalc',
    seo: { title: pages.home.seoTitle, rawTitle: true, description: pages.home.description },
    schema: [org, { '@context': 'https://schema.org', '@type': 'WebSite', name: brandConfig.name, url: SITE }, app(`Pay calculator ${Y}`, ''), faqSchema(pages.home.faq)],
    props: { page: pages.home, rates, popular },
  });

  out.push({
    path: 'mortgage-repayment-calculator',
    template: 'pcMortgage',
    seo: { title: pages.mortgage.seoTitle, rawTitle: true, description: pages.mortgage.description },
    schema: [
      app('Mortgage repayment calculator', 'mortgage-repayment-calculator'),
      faqSchema(pages.mortgage.faq),
      crumbs([{ name: 'Pay calculator', path: '' }, { name: 'Mortgage repayment calculator', path: 'mortgage-repayment-calculator' }]),
    ],
    props: { page: pages.mortgage, rates, loans: LOANS.map((n) => ({ href: `/${loanPath(n)}`, label: `${loanName(n)} repayments` })) },
  });

  for (const n of LOANS) {
    const m = monthlyRepayment({ balance: n, rate: 6, years: 30, type: 'pi' });
    out.push({
      path: loanPath(n),
      template: 'pcLoan',
      seo: {
        title: `${loanName(n)} Mortgage Repayments: ${aud(m)} a Month at 6%`,
        rawTitle: true,
        description: `Repayments on a ${aud(n)} home loan: ${aud(m)} a month over 30 years at 6%, weekly and fortnightly too, at rates from 5.5% to 7.5%, and what a 0.25% rise adds.`,
      },
      schema: [crumbs([{ name: 'Mortgage repayment calculator', path: 'mortgage-repayment-calculator' }, { name: `${loanName(n)} repayments`, path: loanPath(n) }])],
      props: {
        amount: n, rates,
        nearby: LOANS.filter((x) => x !== n).map((x) => ({ n: x, href: `/${loanPath(x)}` })),
        salaries: [80000, 100000, 120000, 150000, 200000].map((x) => ({ n: x, href: `/${salaryPath(x)}` })),
      },
    });
  }

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
        // People search "tax on 300k" as much as "300k after tax": the title answers both (opportunity engine, 12 Nov 2026).
        title: `${aud(n)} After Tax Australia ${Y}: ${aud(r.net)} Take-Home, ${aud(r.incomeTax + r.medicare)} Tax`,
        rawTitle: true,
        description: `Tax on ${aud(n)} (${k}) in ${Y} is ${aud(r.incomeTax + r.medicare)} including Medicare, so you take home ${aud(r.net)} a year: ${aud(r.net / 12)} a month, ${aud(r.net / 26)} a fortnight or ${aud(r.net / 52)} a week.`,
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

  for (const slug of ['how-we-calculate', 'about', 'contact', 'how-we-make-money', 'privacy-policy', 'affiliate-disclosure'] as const) {
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
