/**
 * Every page of Backyard Wild: a Melbourne bird bath on camera.
 * Data: data/backyard-wild/*.json (see model.ts). Species get their own page only once the camera has caught them.
 */
import { getCollection, getSingleton } from '../../src/lib/data';
import type { Route } from '../../src/lib/routes';
import type { BuildStep, Content, Species, Visit } from './model';
import { sortVisits, tally } from './model';
import brandConfig from './brand.config';

const SITE = `https://${brandConfig.domain}`;

export function routes(): Route[] {
  const c = getSingleton<Content>('content');
  const species = getCollection<Species>('species');
  const visits = sortVisits(getCollection<Visit>('visits'));
  const build = getCollection<BuildStep>('build');
  const counts = Object.fromEntries(tally(visits));
  const names = Object.fromEntries(species.map((s) => [s.slug, s.name]));
  const lastmod = visits[0]?.at.slice(0, 10) ?? build.find((b) => b.date)?.date ?? undefined;

  const org = {
    '@context': 'https://schema.org', '@type': 'Organization', '@id': `${SITE}/#org`, name: brandConfig.name, url: SITE,
    founder: { '@type': 'Person', name: 'Simon Farrugia' },
    parentOrganization: { '@type': 'Organization', name: 'Independent Media Network Pty Ltd' },
  };
  const crumbs = (items: { name: string; path: string }[]) => ({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE}/${it.path}`.replace(/\/$/, '') })),
  });

  const out: Route[] = [];
  out.push({
    path: '',
    template: 'bwHome',
    seo: { title: c.home.seoTitle, rawTitle: true, description: c.home.description },
    schema: [org, { '@context': 'https://schema.org', '@type': 'WebSite', name: brandConfig.name, url: SITE }],
    lastmod,
    props: { content: c, species, counts, names, recent: visits.slice(0, 8), build: build.filter((b) => b.done).slice(-1)[0] ?? null },
  });
  out.push({
    path: 'visitors',
    template: 'bwVisitors',
    seo: { title: 'Visitors: Every Bird the Camera Has Caught', rawTitle: true, description: 'The full log of birds at the Backyard Wild bath in Melbourne: what came, when, and what it did. Updated automatically from the camera.' },
    schema: [crumbs([{ name: 'Watch', path: '' }, { name: 'Visitors', path: 'visitors' }])],
    lastmod,
    props: { visits, names, species, counts },
  });
  out.push({
    path: 'the-build',
    template: 'bwBuild',
    seo: { title: 'The Build: How the Garden Is Growing', rawTitle: true, description: 'How the Backyard Wild garden is coming together, one upgrade at a time: the bird bath, the camera, and the fish pond to come.' },
    schema: [crumbs([{ name: 'Watch', path: '' }, { name: 'The build', path: 'the-build' }])],
    props: { steps: build },
  });
  for (const s of species) {
    const mine = visits.filter((v) => v.species === s.slug);
    if (mine.length === 0) continue; // no page until the camera has actually caught this bird
    out.push({
      path: `birds/${s.slug}`,
      template: 'bwSpecies',
      seo: { title: `${s.name} at a Melbourne Bird Bath`, rawTitle: true, description: `Every ${s.name.toLowerCase()} visit to the Backyard Wild bath in Melbourne: when they come, how many, and what they get up to.`.slice(0, 165) },
      schema: [crumbs([{ name: 'Visitors', path: 'visitors' }, { name: s.name, path: `birds/${s.slug}` }])],
      lastmod: mine[0].at.slice(0, 10),
      props: { species: s, visits: mine },
    });
  }
  for (const [slug, p] of Object.entries(c.pages)) {
    out.push({ path: slug, template: 'bwPage', seo: { title: p.seoTitle, description: p.description }, schema: slug === 'about' ? [org] : [], props: { page: p } });
  }
  return out;
}
