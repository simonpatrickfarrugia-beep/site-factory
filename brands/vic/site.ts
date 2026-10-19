/**
 * Every page on victours.com.au. Towns come from data/vic/towns.json (published: true),
 * places from data/vic/places.json (OpenStreetMap, built by scripts/vic/build_data.py),
 * write-ups and trip ideas from data/vic/content.json.
 */
import { getCollection, getSingleton } from '../../src/lib/data';
import type { Route } from '../../src/lib/routes';
import { GROUP_LABEL, TYPE_LABEL, address, website, type Content, type Group, type Place, type Town } from './model';

const SITE = 'https://victours.com.au';
const SUFFIX = ' | Vic Tours';
const GROUPS: Group[] = ['stay', 'eat', 'do'];
const ON_HUB = 6; // places shown per section on a town page

const SCHEMA_TYPE: Record<string, string> = {
  hotel: 'Hotel', motel: 'Motel', guest_house: 'BedAndBreakfast', hostel: 'Hostel', apartment: 'LodgingBusiness', chalet: 'LodgingBusiness',
  camp_site: 'Campground', caravan_site: 'Campground', alpine_hut: 'LodgingBusiness',
  restaurant: 'Restaurant', cafe: 'CafeOrCoffeeShop', pub: 'BarOrPub', bar: 'BarOrPub', biergarten: 'BarOrPub',
  museum: 'Museum', gallery: 'ArtGallery', zoo: 'Zoo', aquarium: 'Aquarium', theme_park: 'AmusementPark', winery: 'Winery', brewery: 'Brewery',
  distillery: 'Distillery', park: 'Park', nature_reserve: 'Park', beach_resort: 'Beach', golf_course: 'GolfCourse', water_park: 'AmusementPark',
};

function placeSchema(p: Place) {
  const o: Record<string, unknown> = {
    '@type': SCHEMA_TYPE[p.type] ?? 'TouristAttraction',
    name: p.name,
    geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lon },
  };
  const a = address(p.tags);
  if (a) o.address = { '@type': 'PostalAddress', streetAddress: a, addressRegion: 'VIC', addressCountry: 'AU' };
  const w = website(p.tags);
  if (w) o.url = w;
  if (p.tags.cuisine) o.servesCuisine = p.tags.cuisine.split(/[;,]/).map((c) => c.trim());
  return o;
}

const crumbs = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE}/${it.path}`.replace(/\/$/, '') })),
});

export function routes(): Route[] {
  const content = getSingleton<Content>('content');
  const towns = getCollection<Town>('towns').filter((t) => t.published && t.centre && content.towns[t.slug]);
  const places = getCollection<Place>('places');
  const byTown = new Map<string, Place[]>();
  for (const p of places) (byTown.get(p.town) ?? byTown.set(p.town, []).get(p.town)!).push(p);
  const inGroup = (slug: string, g: Group) => (byTown.get(slug) ?? []).filter((p) => p.group === g); // already best-first
  const info = (t: Town) => ({ slug: t.slug, name: t.name, km: t.kmFromMelbourne ?? 0, region: content.towns[t.slug].region });
  const byKm = [...towns].sort((a, b) => (a.kmFromMelbourne ?? 0) - (b.kmFromMelbourne ?? 0));
  const isNeighbourhood = (t: Town) => t.kind === 'suburb';
  const out: Route[] = [];

  // Home
  out.push({
    path: '',
    template: 'vicHome',
    seo: {
      title: 'Vic Tours: where to stay, eat and play in Victoria',
      rawTitle: true,
      description: 'A town-by-town guide to Victoria: where to stay, where to eat and things to do in each town and Melbourne neighbourhood.',
    },
    schema: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Vic Tours', url: SITE }],
    props: {
      towns: byKm.filter((t) => !isNeighbourhood(t)).map(info),
      neighbourhoods: byKm.filter(isNeighbourhood).map(info),
      collections: content.collections,
    },
  });

  // All towns, grouped by region
  const regions = new Map<string, ReturnType<typeof info>[]>();
  for (const t of byKm) (regions.get(info(t).region) ?? regions.set(info(t).region, []).get(info(t).region)!).push(info(t));
  out.push({
    path: 'towns',
    template: 'vicTowns',
    seo: { title: 'All towns and neighbourhoods' + SUFFIX, rawTitle: true, description: 'Every Victorian town and Melbourne neighbourhood in the Vic Tours guide, grouped by region.' },
    props: {
      groups: [...regions].map(([region, list]) => ({ region, towns: list })),
      comingSoon: getCollection<Town>('towns').filter((t) => !t.published).length,
    },
  });

  // Town hubs + section pages
  for (const t of towns) {
    const c = content.towns[t.slug];
    const km = t.kmFromMelbourne ?? 0;
    const sections = GROUPS.map((g) => {
      const all = inGroup(t.slug, g);
      return { group: g, total: all.length, places: all.slice(0, ON_HUB) };
    });
    const nearby = towns
      .filter((o) => o.slug !== t.slug)
      .map((o) => ({ o, d: Math.hypot((o.centre![0] - t.centre![0]) * 111, (o.centre![1] - t.centre![1]) * 88) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map(({ o }) => info(o));
    const totals = Object.fromEntries(sections.map((s) => [s.group, s.total]));
    out.push({
      path: t.slug,
      template: 'vicTown',
      seo: {
        title: `${t.name}: where to stay, eat and things to do` + SUFFIX,
        rawTitle: true,
        description: `${t.name}, ${km} km from Melbourne: ${totals.stay} places to stay, ${totals.eat} places to eat and drink and ${totals.do} things to do, with addresses, hours and maps.`,
      },
      schema: [
        {
          '@context': 'https://schema.org',
          '@type': 'TouristDestination',
          name: `${t.name}, Victoria`,
          description: c.intro,
          url: `${SITE}/${t.slug}`,
          geo: { '@type': 'GeoCoordinates', latitude: t.centre![0], longitude: t.centre![1] },
        },
        crumbs([{ name: 'Home', path: '' }, { name: 'Towns', path: 'towns' }, { name: t.name, path: t.slug }]),
      ],
      props: {
        town: { name: t.name, slug: t.slug, km, region: c.region, intro: c.intro, tips: c.tips ?? [] },
        sections,
        nearby,
        collections: content.collections.filter((col) => col.towns.includes(t.slug)).map(({ slug, name }) => ({ slug, name })),
      },
    });
    for (const g of GROUPS) {
      const all = inGroup(t.slug, g);
      if (all.length <= ON_HUB) continue; // the hub already lists them all
      const kinds = [...new Set(all.map((p) => TYPE_LABEL[p.type] ?? p.type))].slice(0, 3).join(', ').toLowerCase();
      out.push({
        path: `${t.slug}/${g}`,
        template: 'vicTownSection',
        seo: {
          title: `${GROUP_LABEL[g].title(t.name)}: ${all.length} ${GROUP_LABEL[g].noun}` + SUFFIX,
          rawTitle: true,
          description: `${all.length} ${GROUP_LABEL[g].noun} in ${t.name}, Victoria, including ${kinds}. Addresses, opening hours, websites and maps.`,
        },
        schema: [
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: GROUP_LABEL[g].title(t.name),
            itemListElement: all.slice(0, 100).map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: placeSchema(p) })),
          },
          crumbs([{ name: 'Home', path: '' }, { name: t.name, path: t.slug }, { name: GROUP_LABEL[g].short, path: `${t.slug}/${g}` }]),
        ],
        props: { town: { name: t.name, slug: t.slug, km }, group: g, places: all },
      });
    }
  }

  // Trip ideas (collections)
  const townBySlug = new Map(towns.map((t) => [t.slug, t]));
  for (const col of content.collections) {
    const list = col.towns.map((s) => townBySlug.get(s)).filter((t): t is Town => !!t);
    out.push({
      path: `collections/${col.slug}`,
      template: 'vicCollection',
      seo: { title: col.name + SUFFIX, rawTitle: true, description: `${col.name}: ${col.intro}`.slice(0, 165) },
      schema: [
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: col.name,
          itemListElement: list.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/${t.slug}`, name: t.name })),
        },
      ],
      props: {
        name: col.name,
        intro: col.intro,
        towns: list.map((t) => ({ ...info(t), intro: content.towns[t.slug].intro, counts: Object.fromEntries(GROUPS.map((g) => [g, inGroup(t.slug, g).length])) })),
      },
    });
  }

  // Static pages
  for (const p of content.pages) {
    out.push({ path: p.slug, template: 'vicPage', seo: { title: p.title + SUFFIX, rawTitle: true, description: p.description }, props: { title: p.title, paragraphs: p.paragraphs } });
  }
  return out;
}
