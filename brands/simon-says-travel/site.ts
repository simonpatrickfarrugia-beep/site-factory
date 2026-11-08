/**
 * Every page of Simon Says Travel (simonsaystravel.com.au): the monthly "Aussie Travel Pulse".
 * Numbers: data/simon-says-travel/trends.json (pipeline `travel` job, monthly) and archive.json (one frozen line per month).
 * Copy: data/simon-says-travel/content.json.
 */
import { getSingleton } from '../../src/lib/data';
import type { Route } from '../../src/lib/routes';
import type { ArchiveMonth, Content, Trends } from './model';
import { byMonth, dayLabel, headlines, indexer, monthLabel, pct, places } from './model';
import brandConfig from './brand.config';

const SITE = `https://${brandConfig.domain}`;

export function routes(): Route[] {
  const d = getSingleton<Trends>('trends');
  const archive = getSingleton<ArchiveMonth[]>('archive');
  const c = getSingleton<Content>('content');
  const idx = indexer(d.terms);
  const month = d.updated.slice(0, 7);
  const ok = places(d.terms);
  const lines = headlines(d);
  const org = {
    '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE}/#org`, name: brandConfig.name, url: SITE,
    founder: { '@type': 'Person', name: 'Simon Farrugia' },
    parentOrganization: { '@type': 'Organization', name: 'Independent Media Network Pty Ltd' }, areaServed: { '@type': 'Country', name: 'Australia' },
  };
  const crumbs = (items: { name: string; path: string }[]) => ({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE}/${it.path}`.replace(/\/$/, '') })),
  });
  const dataset = (name: string, path: string, description: string) => ({
    '@context': 'https://schema.org', '@type': 'Dataset', name, description, url: `${SITE}/${path}`.replace(/\/$/, ''),
    creator: { '@id': `${SITE}/#org` }, spatialCoverage: 'Australia', dateModified: d.updated,
    temporalCoverage: `${d.weeks[0]}/${d.weeks[d.weeks.length - 1]}`, isBasedOn: 'https://trends.google.com',
    license: 'https://creativecommons.org/licenses/by/4.0/',
  });
  const out: Route[] = [];
  const latest = archive.find((a) => a.month === month) ?? archive[0];

  out.push({
    path: '',
    template: 'sstHome',
    seo: { title: c.home.seoTitle, rawTitle: true, description: c.home.description },
    schema: [org, { '@context': 'https://schema.org', '@type': 'WebSite', name: brandConfig.name, url: SITE }, dataset(`Aussie Travel Pulse: ${monthLabel(month)}`, '', c.home.description)],
    lastmod: d.updated,
    props: { trends: d, content: c, headlines: lines, month, note: c.notes[month] ?? null },
  });

  // Monthly reports: one page per month, frozen from the archive (the latest also has the full 12-month charts on the home page).
  out.push({
    path: 'reports',
    template: 'sstReports',
    seo: { title: 'Past Reports: The Aussie Travel Pulse, Month by Month', rawTitle: true, description: 'Every monthly Aussie Travel Pulse: where Australians were searching to travel, what was rising and what was cooling, month by month.' },
    schema: [crumbs([{ name: 'This month', path: '' }, { name: 'Past reports', path: 'reports' }])],
    props: { archive, notes: c.notes },
  });
  for (const a of archive) {
    const prev = archive.find((x) => x.month < a.month) ?? null;
    out.push({
      path: `reports/${a.month}`,
      template: 'sstReport',
      seo: {
        title: `Where Australians Wanted to Travel in ${monthLabel(a.month)}`,
        rawTitle: true,
        description: `The Aussie Travel Pulse for ${monthLabel(a.month)}: ${a.terms.filter((t) => t.kind === 'overseas' && !t.lowSignal).slice(0, 3).map((t) => t.label).join(', ')} lead overseas. Rankings, risers and fallers from Google search data.`.slice(0, 165),
      },
      schema: [dataset(`Aussie Travel Pulse: ${monthLabel(a.month)}`, `reports/${a.month}`, `Search interest index for ${a.terms.length} travel searches in Australia, ${monthLabel(a.month)}.`), crumbs([{ name: 'Past reports', path: 'reports' }, { name: monthLabel(a.month), path: `reports/${a.month}` }])],
      lastmod: a.updated,
      props: { report: a, prev, note: c.notes[a.month] ?? null, isLatest: a.month === month, headlines: a.month === month ? lines : null },
    });
  }

  // Destinations: one page per place with enough searches to call.
  const dests = ok.map((t) => ({ slug: t.slug, label: t.label, kind: t.kind, idx: idx(t), yoy: t.yoy, series: t.series }));
  out.push({
    path: 'destinations',
    template: 'sstDestinations',
    seo: { title: 'Destinations: When Australians Search for Each One', rawTitle: true, description: `${dests.length} destinations Australians fly to, ranked by search interest, with each one's busiest and quietest months for flight searches.` },
    schema: [crumbs([{ name: 'This month', path: '' }, { name: 'Destinations', path: 'destinations' }])],
    lastmod: d.updated,
    props: { dests, weeks: d.weeks, updated: d.updated },
  });
  for (const t of ok) {
    const months = byMonth(t, d.weeks);
    const busiest = [...months].sort((a, b) => b.avg - a.avg)[0];
    const quietest = [...months].sort((a, b) => a.avg - b.avg)[0];
    const sameKind = ok.filter((x) => x.kind === t.kind);
    const rank = sameKind.findIndex((x) => x.slug === t.slug) + 1;
    const near = sameKind.filter((x) => x.slug !== t.slug).sort((a, b) => Math.abs(idx(a) - idx(t)) - Math.abs(idx(b) - idx(t))).slice(0, 4);
    const where = t.kind === 'domestic' ? `${t.label}, Australia` : t.label;
    out.push({
      path: `destinations/${t.slug}`,
      template: 'sstDestination',
      seo: {
        title: `Flights to ${t.label}: When Australians Search (${monthLabel(month)})`,
        rawTitle: true,
        description: `Australian search interest in flights to ${t.label} over 12 months: busiest in ${monthLabel(busiest.month).split(' ')[0]}, quietest in ${monthLabel(quietest.month).split(' ')[0]}, ${pct(t.yoy)} on last year.`.slice(0, 165),
      },
      schema: [crumbs([{ name: 'Destinations', path: 'destinations' }, { name: t.label, path: `destinations/${t.slug}` }])],
      lastmod: d.updated,
      props: {
        term: t, idx: idx(t), weeks: d.weeks, months, busiest, quietest, rank, rankOf: sameKind.length,
        near: near.map((x) => ({ slug: x.slug, label: x.label, idx: idx(x), yoy: x.yoy })),
        peakLabel: dayLabel(t.peakWeek), where, affiliates: c.affiliates, updated: d.updated,
        vic: t.slug === 'melbourne',
        bali: { now: d.terms.find((x) => x.slug === 'bali')?.now ?? 1, series: d.terms.find((x) => x.slug === 'bali')?.series ?? [] },
      },
    });
  }

  for (const [slug, p] of Object.entries(c.pages)) {
    out.push({
      path: slug,
      template: slug === 'contact' ? 'sstContact' : 'sstPage',
      noindex: slug === 'contact', // a form page with nothing to rank for (quality gate: thin)
      seo: { title: p.seoTitle, description: p.description },
      schema: slug === 'about' ? [org] : [],
      props: { page: p },
    });
  }
  return out;
}
