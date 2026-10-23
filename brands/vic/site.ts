/**
 * Every page on victours.com.au. Towns come from data/vic/towns.json (published: true),
 * places from data/vic/places.json (OpenStreetMap, built by scripts/vic/build_data.py),
 * write-ups and trip ideas from data/vic/content.json.
 */
import { getCollection, getSingleton } from '../../src/lib/data';
import type { Route } from '../../src/lib/routes';
import { GROUP_LABEL, TYPE_LABEL, address, prettyHours, website, type Content, type Group, type Place, type Town } from './model';
import { AUDIENCE, vicBundles, type Audience, type Station, type TownExtras, type VicBundle } from './bundles';
import { walkMins, type Item } from '../../src/lib/bundles';

const SITE = 'https://victours.com.au';
const SUFFIX = ' | Vic Tours';
const GROUPS: Group[] = ['stay', 'eat', 'do'];
const ON_HUB = 6; // places shown per section on a town page
const MAX_LIST = 300; // full list pages show the best-documented 300 (keeps big-city pages fast on phones)

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
  const photos = getSingleton<{ towns: Record<string, unknown>; places: Record<string, unknown> }>('photos');
  /** Share image (og:image) for a page: the first of these towns that has a photo; pages without one use brand.shareImage. */
  const photoUrl = (...slugs: string[]) => {
    for (const slug of slugs) {
      const p = photos.towns[slug] as { url?: string } | undefined;
      if (p?.url) return p.url;
    }
    return undefined;
  };
  const byTown = new Map<string, Place[]>();
  for (const p of places) (byTown.get(p.town) ?? byTown.set(p.town, []).get(p.town)!).push(p);
  const inGroup = (slug: string, g: Group) => (byTown.get(slug) ?? []).filter((p) => p.group === g); // already best-first
  const info = (t: Town) => ({ slug: t.slug, name: t.name, km: t.kmFromMelbourne ?? 0, region: content.towns[t.slug].region });
  // Ready-made weekend plans (bundles): only for towns and audiences people search for (see brands/vic/bundles.ts).
  const optional = <T,>(name: string, fallback: T): T => { try { return getSingleton<T>(name); } catch { return fallback; } };
  const stations = optional<{ stations: Station[] }>('stations', { stations: [] }).stations;
  const extras = optional<{ towns: Record<string, TownExtras> }>('extras', { towns: {} }).towns;
  const demand = optional<{ volumes: Record<string, number> }>('bundle-demand', { volumes: {} }).volumes;
  const bundles: VicBundle[] = stations.length ? vicBundles(towns, content, byTown, stations, extras, demand) : [];
  const bundleLabel = (b: VicBundle) =>
    ({ daytrip: b.region ? `${b.region} day trip: ${b.town.name}` : `${b.town.name} day trip`, train: `${b.town.name} by train`, budget: `${b.town.name} on a budget`, couples: `Romantic weekend in ${b.town.name}`, family: `${b.town.name} with kids` } as Record<Audience, string>)[b.audience];
  const hasDayTripsEarly = bundles.some((b) => b.audience === 'daytrip');
  /** Card photo for a plan: its own stops first (Sovereign Hill beats a street), then the region's (for region day trips), then the town's. */
  const placePhoto = (id: string) => (photos.places[id] as { url?: string } | undefined)?.url ? photos.places[id] : null;
  const DO_PHOTO = new Set(['museum', 'gallery', 'attraction', 'viewpoint', 'zoo', 'nature_reserve', 'park', 'beach_resort', 'theme_park', 'aquarium']);
  const SCENIC = ['viewpoint', 'nature_reserve', 'beach', 'beach_resort', 'park', 'zoo'];
  const SIGNATURE_PHOTO = /sovereign hill|golden dragon|puffing billy|arthurs seat|healesville sanctuary/i;
  const planPhoto = (b: VicBundle) => {
    const picks = ['morning', 'afternoon', 'see', 'big', 'unwind', 'free'].flatMap((k) => b.result.picks[k] ?? []).map((p) => p.item).filter((it) => placePhoto(it.id));
    // 1. A scenic or signature stop on the plan itself (Arthurs Seat Lookout, Sovereign Hill).
    const best = picks.find((it) => SCENIC.includes(it.kind) || SIGNATURE_PHOTO.test(it.name));
    if (best) return placePhoto(best.id);
    // 2. A lookout or nature park in the town (Red Bluff beats a museum car park).
    const local = (byTown.get(b.town.slug) ?? []).filter((p) => ['viewpoint', 'nature_reserve'].includes(p.type) && placePhoto(p.id))
      .sort((x, y) => (x.type === 'viewpoint' ? 0 : 1) - (y.type === 'viewpoint' ? 0 : 1));
    if (local[0]) return placePhoto(local[0].id);
    // 3. Any stop on the plan, then the town's own photo (often just a main street), then anything in the region.
    if (picks[0]) return placePhoto(picks[0].id);
    // 4. Region day trips (Mornington Peninsula, Yarra Valley): the region's own scenery beats one town's main street.
    if (b.region) {
      const slugs = towns.filter((t) => content.towns[t.slug]?.region === b.region).map((t) => t.slug);
      const scenic = slugs.flatMap((sl) => byTown.get(sl) ?? []).find((p) => ['viewpoint', 'nature_reserve', 'beach'].includes(p.type) && placePhoto(p.id));
      if (scenic) return placePhoto(scenic.id);
    }
    if (photos.towns[b.town.slug]) return photos.towns[b.town.slug];
    if (b.region) {
      const slugs = towns.filter((t) => content.towns[t.slug]?.region === b.region).map((t) => t.slug);
      for (const sl of slugs) for (const p of byTown.get(sl) ?? []) if (DO_PHOTO.has(p.type) && placePhoto(p.id)) return placePhoto(p.id);
    }
    for (const p of byTown.get(b.town.slug) ?? []) if (DO_PHOTO.has(p.type) && placePhoto(p.id)) return placePhoto(p.id);
    return null;
  };

  const usedTile = new Set<string>();

  const bundlesByTown = new Map<string, VicBundle[]>();
  for (const b of bundles) (bundlesByTown.get(b.town.slug) ?? bundlesByTown.set(b.town.slug, []).get(b.town.slug)!).push(b);
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
      collections: content.collections.filter((c) => !(hasDayTripsEarly && c.slug === 'day-trips-from-melbourne')),
      dayTrips: bundles.filter((b) => b.audience === 'daytrip').sort((a, b) => (b.demand?.volume ?? 0) - (a.demand?.volume ?? 0)).slice(0, 6).map((b) => {
        const m = b.result.picks.morning?.[0]?.item; const l = b.result.picks.lunch?.[0]?.item;
        return { href: `/${b.path}`, title: b.region ?? b.town.name, town: b.region ? b.town.name : null, km: b.town.kmFromMelbourne ?? 0, photo: planPhoto(b),
          line: [m && m.name, l && `lunch at ${l.name}`].filter(Boolean).join(', then ') };
      }).map((d) => { const u = (d.photo as { url?: string } | null)?.url; if (u) usedTile.add(u); return d;
      }),
      weekendTiles: (['train', 'couples', 'family', 'budget'] as Audience[]).map((a) => {
        const list = bundles.filter((b) => b.audience === a).sort((x, y) => y.rank - x.rank);
        const top = list.find((b) => { const ph = planPhoto(b) as { url?: string } | null; return ph?.url && !usedTile.has(ph.url); });
        const ph = top ? (planPhoto(top) as { url: string }) : null;
        if (ph) usedTile.add(ph.url);
        return { href: `/${AUDIENCE[a].hubPath}`, title: ({ train: 'By train', couples: 'Romantic weekends', family: 'With kids', budget: 'On a budget' } as Record<string, string>)[a], count: list.length,
          photo: ph, example: top?.town.name ?? null };
      }).filter((t) => t.count > 0),
      loops: (content.loops ?? []).filter((l) => !l.draft).map((l) => ({ slug: l.slug, name: l.name, summary: l.summary, days: l.days.length })),
    },
  });

  // Region hubs (content.regions): only regions with 2+ published member towns get a page.
  const regionList = (content.regions ?? []).map((r) => ({ ...r, towns: byKm.filter((t) => content.towns[t.slug].region === r.label) })).filter((r) => r.towns.length >= 2);
  const regionHref = (label: string) => { const r = regionList.find((x) => x.label === label); return r ? `/${r.slug}` : undefined; };
  /** Best places across a region's towns, alternating towns so one big town doesn't fill the list. */
  const mergeRegion = (slugs: string[], g: Group) => {
    const lists = slugs.map((s) => inGroup(s, g));
    const out: Place[] = [];
    for (let i = 0; out.length < lists.reduce((a, l) => a + l.length, 0); i++) for (const l of lists) if (l[i]) out.push(l[i]);
    return out;
  };
  // All towns, grouped by region
  const regions = new Map<string, ReturnType<typeof info>[]>();
  for (const t of byKm) (regions.get(info(t).region) ?? regions.set(info(t).region, []).get(info(t).region)!).push(info(t));
  out.push({
    path: 'towns',
    template: 'vicTowns',
    seo: { title: 'All towns and neighbourhoods' + SUFFIX, rawTitle: true, description: 'Every Victorian town and Melbourne neighbourhood in the Vic Tours guide, grouped by region.' },
    props: {
      groups: [...regions].map(([region, list]) => ({ region, href: regionHref(region), towns: list })),
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
        image: photoUrl(t.slug),
        description: `${t.name}, ${km < 3 ? 'in central Melbourne' : `${km} km from Melbourne`}: ${totals.stay} places to stay, ${totals.eat} places to eat and drink and ${totals.do} things to do, with addresses, hours and maps.`,
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
        affiliates: content.affiliates ?? null,
        photo: photos.towns[t.slug] ?? null,
        placePhotos: Object.fromEntries(sections.flatMap((x) => x.places).filter((p) => photos.places[p.id]).map((p) => [p.id, photos.places[p.id]])),
        sections,
        nearby,
        collections: [
          ...(bundlesByTown.get(t.slug) ?? []).map((b) => ({ href: `/${b.path}`, name: `Weekend plan: ${bundleLabel(b)}` })),
          ...(content.loops ?? []).filter((l) => !l.draft && l.days.some((d) => d.stops.includes(t.slug))).map((l) => ({ href: `/road-trips/${l.slug}`, name: `Road trip: ${l.name}` })),
          ...content.collections.filter((col) => col.towns.includes(t.slug) && !(hasDayTripsEarly && col.slug === 'day-trips-from-melbourne')).map(({ slug, name }) => ({ href: `/collections/${slug}`, name })),
        ],
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
          image: photoUrl(t.slug),
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
        props: { town: { name: t.name, slug: t.slug, km }, guide: content.towns[t.slug].sections?.[g] ?? [], group: g, places: all.slice(0, MAX_LIST), total: all.length, affiliates: content.affiliates ?? null, placePhotos: Object.fromEntries(all.slice(0, MAX_LIST).filter((p) => photos.places[p.id]).map((p) => [p.id, photos.places[p.id]])) },
      });
    }
  }

  // Region hub pages: /<region> and /<region>/stay|eat|do
  for (const r of regionList) {
    const slugs = r.towns.map((t) => t.slug);
    const townNames = Object.fromEntries(r.towns.map((t) => [t.slug, t.name]));
    const km = Math.min(...r.towns.map((t) => t.kmFromMelbourne ?? 0));
    const sections = GROUPS.map((g) => { const all = mergeRegion(slugs, g); return { group: g, total: all.length, places: all.slice(0, ON_HUB) }; });
    const totals = Object.fromEntries(sections.map((s) => [s.group, s.total]));
    out.push({
      path: r.slug,
      template: 'vicTown',
      seo: {
        title: `${r.name}: where to stay, eat and things to do` + SUFFIX,
        rawTitle: true,
        image: photoUrl(...r.towns.map((x) => x.slug)),
        description: `The ${r.name}, town by town: ${r.towns.length} towns, ${totals.stay} places to stay, ${totals.eat} places to eat and drink and ${totals.do} things to do.`,
      },
      schema: [
        { '@context': 'https://schema.org', '@type': 'TouristDestination', name: `${r.name}, Victoria`, description: r.intro, url: `${SITE}/${r.slug}`, includesAttraction: r.towns.map((t) => ({ '@type': 'TouristDestination', name: t.name, url: `${SITE}/${t.slug}` })) },
        crumbs([{ name: 'Home', path: '' }, { name: 'Towns', path: 'towns' }, { name: r.name, path: r.slug }]),
      ],
      props: {
        town: { name: r.name, slug: r.slug, km, region: 'Region', intro: r.intro, tips: [] },
        body: r.body ?? [],
        members: r.towns.map(info),
        townNames,
        isRegion: true,
        affiliates: content.affiliates ?? null,
        photo: photos.towns[r.towns[0].slug] ?? null,
        placePhotos: Object.fromEntries(sections.flatMap((x) => x.places).filter((p) => photos.places[p.id]).map((p) => [p.id, photos.places[p.id]])),
        sections,
        nearby: [],
        collections: [
          ...(content.loops ?? []).filter((l) => !l.draft && l.days.some((d) => d.stops.some((s) => slugs.includes(s)))).map((l) => ({ href: `/road-trips/${l.slug}`, name: `Road trip: ${l.name}` })),
          ...content.collections.filter((col) => col.towns.some((s) => slugs.includes(s))).map(({ slug, name }) => ({ href: `/collections/${slug}`, name })),
        ],
      },
    });
    for (const g of GROUPS) {
      const all = mergeRegion(slugs, g);
      if (all.length <= ON_HUB) continue;
      out.push({
        path: `${r.slug}/${g}`,
        template: 'vicTownSection',
        seo: {
          title: `${GROUP_LABEL[g].title(r.name)}: ${all.length} ${GROUP_LABEL[g].noun}` + SUFFIX,
          rawTitle: true,
          image: photoUrl(...r.towns.map((x) => x.slug)),
          description: `${all.length} ${GROUP_LABEL[g].noun} across the ${r.name} (${r.towns.map((t) => t.name).slice(0, 5).join(', ')}${r.towns.length > 5 ? ' and more' : ''}). Addresses, hours, websites and maps.`,
        },
        schema: [crumbs([{ name: 'Home', path: '' }, { name: r.name, path: r.slug }, { name: GROUP_LABEL[g].short, path: `${r.slug}/${g}` }])],
        props: { town: { name: r.name, slug: r.slug, km }, group: g, places: all.slice(0, MAX_LIST), total: all.length, townNames, affiliates: content.affiliates ?? null, placePhotos: Object.fromEntries(all.slice(0, MAX_LIST).filter((p) => photos.places[p.id]).map((p) => [p.id, photos.places[p.id]])) },
      });
    }
  }

  // Trip ideas (collections)
  const townBySlug = new Map(towns.map((t) => [t.slug, t]));
  // The day-trips collection is replaced by the /day-trips itineraries hub when day-trip plans exist (301 in public/_redirects).
  const hasDayTrips = bundles.some((b) => b.audience === 'daytrip');
  const MERGED_COLLECTIONS: Record<string, string> = hasDayTrips ? { 'day-trips-from-melbourne': '/day-trips' } : {};
  for (const col of content.collections) {
    if (MERGED_COLLECTIONS[col.slug]) continue;
    const list = col.towns.map((s) => townBySlug.get(s)).filter((t): t is Town => !!t);
    out.push({
      path: `collections/${col.slug}`,
      template: 'vicCollection',
      seo: { title: col.name + SUFFIX, rawTitle: true, description: `${col.name}: ${col.intro}`.slice(0, 165), image: photoUrl(...col.towns) },
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
        body: col.body ?? [],
        towns: list.map((t) => ({ ...info(t), intro: col.notes?.[t.slug] ?? content.towns[t.slug].intro, counts: Object.fromEntries(GROUPS.map((g) => [g, inGroup(t.slug, g).length])) })),
      },
    });
  }

  // Road trips (loops)
  const loops = (content.loops ?? []).filter((l) => !l.draft); // drafts wait until their towns are published
  const townName = (s: string) => townBySlug.get(s)?.name ?? null;
  const loopRoute = (l: (typeof loops)[number]) => ['Melbourne', ...new Set(l.days.flatMap((d) => d.stops).map(townName).filter(Boolean)), 'Melbourne'].join(' → ');
  if (loops.length) {
    out.push({
      path: 'road-trips',
      template: 'vicLoops',
      seo: { title: 'Road trips from Melbourne' + SUFFIX, rawTitle: true, description: 'Self-drive road trips from Melbourne, planned day by day, with where to stay, eat and what to do at every stop.' },
      props: { loops: loops.map((l) => ({ slug: l.slug, name: l.name, summary: l.summary, route: loopRoute(l), days: l.days.length })) },
    });
  }
  for (const l of loops) {
    const top = (s: string, g: Group, n: number) => inGroup(s, g).slice(0, n);
    const days = l.days.map((d, i) => ({
      title: d.title,
      text: d.text,
      stops: d.stops.filter((s) => townBySlug.has(s)).map((s) => ({ slug: s, name: townName(s)! })),
      overnight:
        d.overnight && townBySlug.has(d.overnight) && l.days[i - 1]?.overnight !== d.overnight // second night in the same town: don't repeat
          ? { slug: d.overnight, name: townName(d.overnight)!, stay: top(d.overnight, 'stay', 3), eat: top(d.overnight, 'eat', 3), do: top(d.overnight, 'do', 3) }
          : null,
    }));
    const nights = l.days.filter((d) => d.overnight).length;
    out.push({
      path: `road-trips/${l.slug}`,
      template: 'vicLoop',
      seo: {
        title: `${l.name}: ${l.days.length}-day road trip from Melbourne` + SUFFIX,
        rawTitle: true,
        image: photoUrl(...l.days.flatMap((d) => [...d.stops, ...(d.overnight ? [d.overnight] : [])])),
        description: `${l.summary} Day-by-day plan with where to stay, eat and what to do.`.slice(0, 165),
      },
      schema: [
        {
          '@context': 'https://schema.org',
          '@type': 'TouristTrip',
          name: l.name,
          description: l.intro,
          itinerary: {
            '@type': 'ItemList',
            itemListElement: days.flatMap((d) => d.stops).map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'TouristDestination', name: `${s.name}, Victoria`, url: `${SITE}/${s.slug}` } })),
          },
        },
        crumbs([{ name: 'Home', path: '' }, { name: 'Road trips', path: 'road-trips' }, { name: l.name, path: `road-trips/${l.slug}` }]),
      ],
      props: { name: l.name, intro: l.intro, nights, route: loopRoute(l), days, affiliates: content.affiliates ?? null },
    });
  }

  // Private dashboard (noindex, no analytics, not in the sitemap). Data: data/vic/stats.json, refreshed daily.
  const titles: Record<string, string> = { '/': 'Home page', '/towns': 'All towns', '/road-trips': 'Road trips' };
  const primaryPaths: string[] = [];
  for (const t of towns) {
    titles[`/${t.slug}`] = t.name;
    primaryPaths.push(`/${t.slug}`);
    for (const g of GROUPS) {
      titles[`/${t.slug}/${g}`] = `${t.name}: ${GROUP_LABEL[g].short}`;
      primaryPaths.push(`/${t.slug}/${g}`);
    }
  }
  for (const l of loops) titles[`/road-trips/${l.slug}`] = `Road trip: ${l.name}`;
  for (const col of content.collections) titles[`/collections/${col.slug}`] = `Collection: ${col.name}`;
  out.push({
    path: 'hq/stats',
    template: 'dashboard',
    private: true,
    seo: { title: 'Dashboard' + SUFFIX, rawTitle: true, description: 'Private site stats: visits, place clicks and Google searches per page.' },
    props: {
      stats: getSingleton('stats'),
      titles,
      moneyCtas: ['website', 'call'],
      ctaLabels: { website: 'Website', call: 'Call', map: 'Map' },
      primaryPrefix: '',
      primaryPaths,
      labels: {
        primaryTab: 'Towns',
        primaryHelp: 'Every town and its stay / eat / do pages, most visited first.',
        money: 'Business clicks',
        moneyShort: 'clicks',
        rateSub: 'Website and call clicks per town-page visit',
        fixHelp: 'Visited 10+ times but nobody clicked through to a business yet. Better local picks or photos can turn these around.',
        foot: 'Visits and clicks: Google Analytics. Searches: Google Search Console (about 3 days behind). Refreshed every morning. Business clicks = taps on a place’s Website or Call link (Map taps are shown separately).',
      },
    },
  });

  // Static pages

  // ---------------------------------------------------------------- weekend plans (bundles)
  if (bundles.length) {
    const T_MAX = 60;
    const fit = (...o: string[]) => o.find((x) => x.length <= T_MAX) ?? o[o.length - 1];
    const ref = (b: VicBundle, slot: string) =>
      b.audience === 'train' && ['stay', 'see', 'lunch'].includes(slot) ? 'the station' : b.audience === 'daytrip' && slot === 'lunch' ? 'your morning stop' : ['dinner', 'breakfast', 'eat', 'drinks'].includes(slot) ? 'your stay' : `${b.town.name} centre`;
    const kindOf = (i: Item) =>
      ({ beach: 'beach', playground: 'playground', pool: 'swimming pool', spa: 'day spa', wine: 'cellar door', icecream: 'ice cream', picnic: 'picnic spot', bike: 'bike hire' } as Record<string, string>)[i.kind] ?? (TYPE_LABEL[i.kind] ?? i.kind);
    const dist = (d: number | null, from: string) => (d === null ? null : d <= 1.5 ? `${walkMins(d)} min walk from ${from}` : `${d.toFixed(1)} km from ${from}`);
    const view = (i: Item, d: number | null, from: string) => ({
      name: i.name, kind: kindOf(i), address: address(i.tags), hours: prettyHours(i.tags.opening_hours), website: website(i.tags),
      map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${i.name} ${i.lat},${i.lon}`)}`, dist: dist(d, from),
    });
    const seoTitle = (b: VicBundle) => {
      const T = b.town.name;
      const R = b.region ?? T;
      return {
        daytrip: fit(`${R} Day Trip from Melbourne: ${b.region ? T + ' ' : ''}Itinerary` + SUFFIX, `${R} Day Trip from Melbourne: Itinerary` + SUFFIX, `${R} Day Trip from Melbourne: Itinerary`, `${R} Day Trip from Melbourne`),
        train: fit(`${T} by Train: a Weekend Without a Car` + SUFFIX, `${T} by Train: a Weekend Without a Car`, `${T} by Train: Weekend Plan`),
        budget: fit(`Cheap Weekend in ${T}: Budget Stays & Free Fun` + SUFFIX, `Cheap Weekend in ${T}: Budget Stays & Free Fun`, `Cheap Weekend in ${T}`),
        couples: fit(`Romantic Weekend in ${T}: Stay, Dine & Unwind` + SUFFIX, `Romantic Weekend in ${T}: Stay, Dine & Unwind`, `Romantic Weekend in ${T}`),
        family: fit(`Family Weekend in ${T}: Kid-Friendly Plan` + SUFFIX, `Family Weekend in ${T}: Kid-Friendly Plan`, `Family Weekend in ${T}`),
      }[b.audience];
    };
    const first = (b: VicBundle, slot: string) => b.result.picks[slot]?.[0];
    const summary = (b: VicBundle) => {
      const st = first(b, 'stay')?.item;
      const bits: string[] = [];
      if (b.audience === 'train' && b.station) bits.push(`Train to ${b.station.name}`);
      if (st) bits.push(`stay at ${st.name}`);
      const main = first(b, ({ daytrip: 'morning', train: 'see', budget: 'free', couples: 'unwind', family: 'big' } as Record<string, string>)[b.audience])?.item;
      if (main) bits.push(`${b.audience === 'budget' ? 'free: ' : ''}${main.name}`);
      const din = first(b, b.audience === 'budget' ? 'eat' : b.audience === 'daytrip' ? 'lunch' : 'dinner')?.item;
      if (din) bits.push(`${b.audience === 'daytrip' ? 'lunch' : 'dinner'} at ${din.name}`);
      const s0 = bits.join(', ');
      return s0.charAt(0).toUpperCase() + s0.slice(1) + '.';
    };
    const description = (b: VicBundle) => {
      const T = b.town.name;
      const lead = {
        daytrip: `A day trip to ${b.region ? `the ${b.region} (${T})` : T} from Melbourne, planned hour by hour: what to see in the morning, where to have lunch, an afternoon stop, and a treat before you head home.`,
        train: `A weekend in ${T} without a car: train to ${b.station?.name} station, a stay within walking distance, and where to eat and what to see.`,
        budget: `A cheap weekend in ${T}: a budget place to stay, free things to do and cheap eats, planned day by day.`,
        couples: `A romantic weekend in ${T} for two: where to stay, dinner, and places to unwind, planned day by day.`,
        family: `A family weekend in ${T}: kid-friendly places to stay, a big day out, playgrounds and easy dinners.`,
      }[b.audience];
      return lead.length <= 158 ? lead : lead.slice(0, 155).replace(/\s\S*$/, '') + '…';
    };
    const intro = (b: VicBundle) => {
      const T = b.town.name;
      const st = first(b, 'stay');
      const lines = [content.towns[b.town.slug].intro];
      if (b.audience === 'train' && b.station && st)
        lines.push(`${T} has its own train station (${b.station.name}), so you can leave the car at home. This plan keeps everything close: your stay is about ${walkMins(st.km ?? 0)} minutes' walk from the platform, and dinner and breakfast are a short walk from your bed.`);
      if (b.audience === 'daytrip')
        lines.push(`A day out with everything close together: a morning stop, lunch nearby, an afternoon stop and a treat before the drive home. ${T} is about ${b.town.kmFromMelbourne ?? 0} km from Melbourne, an easy day out from the city.`);
      if (b.audience === 'budget')
        lines.push(`This plan keeps costs down without skipping the good bits: a ${kindOf(st!.item).toLowerCase()} to sleep in, ${b.result.picks.free.length} things to do that cost nothing, and pubs and cafés for cheap meals.`);
      if (b.audience === 'couples')
        lines.push(`A slow weekend for two: a ${kindOf(st!.item).toLowerCase()} to stay in, a proper dinner, and time to unwind${b.result.picks.unwind.some((p) => ['spa', 'wine', 'winery'].includes(p.item.kind)) ? ' with a spa or a glass of local wine' : ''}.`);
      if (b.audience === 'family')
        lines.push(`Built for kids: a ${kindOf(st!.item).toLowerCase()} with room to spread out, a playground on day one, a big day out on day two, and easy dinners.`);
      return lines;
    };
    const gettingThere = (b: VicBundle) => {
      const km = b.town.kmFromMelbourne ?? 0;
      const out2: string[] = [];
      if (b.audience === 'train' && b.station) {
        const metro = /metro/i.test(b.station.network);
        out2.push(metro
          ? `${b.station.name} is on the Metro network: tap on with myki. The PTV journey planner shows the next trains.`
          : `${b.station.name} is on the V/Line network. Shorter V/Line trips use myki; longer trips need a booked V/Line ticket. The PTV journey planner shows times and which ticket you need.`);
        out2.push(`Everything in this plan is chosen to be walkable from the station or a short taxi ride, so you won't need a car once you arrive.`);
      } else {
        if (km >= 3) out2.push(`${b.town.name} is about ${km} km from Melbourne by road.`);
        const st = stations.filter((x) => !x.tourist).map((x) => ({ x, d: Math.hypot((x.lat - b.town.centre![0]) * 111, (x.lon - b.town.centre![1]) * 88) })).sort((a2, c2) => a2.d - c2.d)[0];
        if (st && st.d <= 2.5) out2.push(`No car? ${b.town.name} has a train station (${st.x.name}), about ${st.d.toFixed(1)} km from the centre.`);
      }
      return out2;
    };
    const TIPS: Record<Audience, string[]> = {
      daytrip: ['Leave early: you\'ll beat the traffic out of Melbourne and the lunch crowd.', 'Check opening hours for each stop before you go; some close early or on certain days.', 'Weekdays are quieter than weekends at most of these places.'],
      train: ['Check the timetable before you plan the day: some regional lines run fewer trains on weekends.', 'Travel light: a backpack beats a wheelie case on country footpaths.', 'Save the station on your phone map so the walk back on Sunday is easy.'],
      budget: ['Compare prices for the exact night you want: budget stays change price with demand, and midweek or off-season is usually cheaper.', 'Many caravan parks have cabins as well as sites, so you don’t need your own tent.', 'Free places are free to enter, but parking nearby may cost. Pack water and snacks.'],
      couples: ['Book Saturday dinner ahead: the best tables go first.', 'B&Bs and cottages often have a two-night minimum on weekends, so check when you book.', 'Ask for a late checkout on Sunday. It’s often free if you ask.'],
      family: ['Check opening hours for the big day out before you go: some attractions close early or need booking.', 'Holiday parks with cabins are often the easiest family stay: space, a kitchen, and somewhere to run around.', 'Pack swimmers and a change of clothes, even in spring.'],
    };
    for (const b of bundles) {
      const T = b.town.name;
      const days = b.days.map((d) => ({
        title: d.title,
        steps: d.steps.map((s) => ({ when: s.when, text: s.text, place: s.pick ? view(s.pick.item, null, '') : null })),
      }));
      const swapSlots = Object.entries(b.result.alternates).filter(([, list]) => list.length > 0);
      const LABEL: Record<string, string> = { morning: 'More to see', afternoon: 'More afternoon ideas', lunch: 'Other lunch spots', stay: 'Other places to stay', dinner: 'Other dinner options', see: 'More to see', free: 'More free things to do', unwind: 'More ways to unwind', big: 'Other big days out', outdoors: 'More outdoors', eat: 'More cheap eats' };
      const swaps = swapSlots.filter(([k]) => LABEL[k]).map(([k, list]) => ({ label: LABEL[k], places: list.map((p) => view(p.item, p.km, ref(b, k))) }));
      const related = [
        ...(bundlesByTown.get(b.town.slug) ?? []).filter((o) => o !== b).map((o) => ({ href: `/${o.path}`, label: bundleLabel(o) })),
        ...bundles.filter((o) => o.audience === b.audience && o !== b).slice(0, 4).map((o) => ({ href: `/${o.path}`, label: bundleLabel(o) })),
      ];
      const places = Object.values(b.result.picks).flat();
      out.push({
        path: b.path,
        template: 'vicBundle',
        seo: { title: seoTitle(b), rawTitle: true, description: description(b), image: photoUrl(b.town.slug) },
        schema: [
          {
            '@context': 'https://schema.org',
            '@type': 'TouristTrip',
            name: bundleLabel(b),
            description: description(b),
            touristType: { daytrip: 'Day trippers', train: 'Travellers without a car', budget: 'Budget travellers', couples: 'Couples', family: 'Families with children' }[b.audience],
            itinerary: { '@type': 'ItemList', itemListElement: places.map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Place', name: p.item.name, geo: { '@type': 'GeoCoordinates', latitude: p.item.lat, longitude: p.item.lon } } })) },
          },
          crumbs(b.audience === 'daytrip' ? [{ name: 'Home', path: '' }, { name: 'Day trips', path: 'day-trips' }, { name: bundleLabel(b), path: b.path }] : [{ name: 'Home', path: '' }, { name: 'Weekend plans', path: 'weekends' }, { name: AUDIENCE[b.audience].hubTitle, path: AUDIENCE[b.audience].hubPath }, { name: bundleLabel(b), path: b.path }]),
        ],
        props: {
          title: bundleLabel(b),
          sub: b.audience === 'daytrip' ? `Day trip · about ${b.town.kmFromMelbourne ?? 0} km from Melbourne` : `2 days, 1 night · ${b.audience === 'train' && b.station ? `${b.station.name} station` : b.town.kmFromMelbourne && b.town.kmFromMelbourne >= 3 ? `${b.town.kmFromMelbourne} km from Melbourne` : 'Melbourne'}`,
          intro: intro(b),
          town: { name: T, slug: b.town.slug },
          days, swaps, gettingThere: gettingThere(b), tips: TIPS[b.audience],
          related: related.filter((r, i, a) => a.findIndex((x) => x.href === r.href) === i).slice(0, 6),
          hub: { href: `/${AUDIENCE[b.audience].hubPath}`, label: AUDIENCE[b.audience].hubTitle },
          affiliates: content.affiliates ?? null,
          showTours: b.audience === 'couples' || b.audience === 'family' || b.audience === 'daytrip',
          showStay: b.audience !== 'daytrip',
          root: b.audience === 'daytrip' ? { href: '/day-trips', label: 'Day trips' } : { href: '/weekends', label: 'Weekend plans' },
          bundle: { audience: b.audience, town: T, summary: summary(b), demand: b.demand },
        },
      });
    }
    // Hubs: one per audience, plus /weekends with all of them.
    const card = (b: VicBundle) => ({
      href: `/${b.path}`, town: bundleLabel(b), km: b.town.kmFromMelbourne ?? 0, summary: summary(b),
      highlights: [] as string[], photo: planPhoto(b),
    });
    const HUB_INTRO: Record<Audience, string[]> = {
      daytrip: ['Day trips from Melbourne, planned hour by hour: a morning stop, lunch close by, an afternoon stop and a treat before you drive home. Every plan uses real places near each other, with addresses, opening hours and maps.', 'Most are within two hours of the city. Leave early to beat the traffic and the lunch crowd.'],
      train: ['Leave the car at home. Each plan picks a Victorian town with its own train station, a place to stay within walking distance of the platform, and where to eat and what to see on foot.', 'Plans only include towns with a station close to the centre. Check the PTV journey planner for times before you book.'],
      budget: ['Weekends away that don’t cost a fortune: budget stays (hostels, caravan parks, motels), free things to do, and pubs and cafés for cheap meals.', 'We never list prices because they change daily. Compare for your dates before you book.'],
      couples: ['Weekend plans for two: a B&B, cottage or boutique stay, a proper dinner, and time to unwind with a spa, a cellar door or a view.', 'Towns are picked by how well they fit a romantic weekend, using what each one actually has nearby.'],
      family: ['Weekend plans built for kids: holiday-park cabins and apartments, a big day out (beaches, pools, wildlife parks), playgrounds and easy dinners.', 'Towns are picked by what each one actually has for families nearby.'],
    };
    const auds = (Object.keys(AUDIENCE) as Audience[]).filter((a) => bundles.some((b) => b.audience === a));
    for (const a of auds) {
      const list = bundles.filter((b) => b.audience === a).sort((x, y) => (y.demand?.volume ?? 0) - (x.demand?.volume ?? 0) || y.rank - x.rank);
      out.push({
        path: AUDIENCE[a].hubPath,
        template: 'vicBundles',
        seo: { title: a === 'daytrip' ? 'Day Trips from Melbourne: Ready-Made Itineraries' + SUFFIX : AUDIENCE[a].hubTitle + SUFFIX, rawTitle: true, description: a === 'daytrip' ? `${list.length} ready-made day trips from Melbourne, planned hour by hour: a morning stop, lunch, an afternoon stop and a treat, with real places and maps.` : `${AUDIENCE[a].hubTitle}: ${list.length} ready-made weekend plans with where to stay, eat and what to do, day by day.`, image: photoUrl(...list.map((b) => b.town.slug)) },
        schema: [crumbs(a === 'daytrip' ? [{ name: 'Home', path: '' }, { name: 'Day trips', path: 'day-trips' }] : [{ name: 'Home', path: '' }, { name: 'Weekend plans', path: 'weekends' }, { name: AUDIENCE[a].hubTitle, path: AUDIENCE[a].hubPath }])],
        props: {
          title: AUDIENCE[a].hubTitle, intro: HUB_INTRO[a], groups: [{ title: AUDIENCE[a].hubTitle, cards: list.map(card) }],
          others: auds.filter((o) => o !== a).map((o) => ({ href: `/${AUDIENCE[o].hubPath}`, label: AUDIENCE[o].hubTitle })),
          crumb: a === 'daytrip' ? null : { href: '/weekends', label: 'Weekend plans' },
        },
      });
    }
    out.push({
      path: 'weekends',
      template: 'vicBundles',
      seo: { title: 'Weekend Itineraries from Melbourne: Ready-Made Plans' + SUFFIX, rawTitle: true, description: `${bundles.filter((b) => b.audience !== 'daytrip').length} ready-made weekend itineraries from Melbourne: by train, on a budget, for couples and for families, with where to stay, eat and what to do, day by day.`, image: photoUrl(...bundles.map((b) => b.town.slug)) },
      schema: [crumbs([{ name: 'Home', path: '' }, { name: 'Weekend plans', path: 'weekends' }])],
      props: {
        title: 'Weekend itineraries from Melbourne',
        intro: ['Ready-made weekend plans: pick how you want to travel and who’s coming, and each plan gives you where to stay, where to eat and what to do, day by day, with real places and maps.', 'Every plan uses places from open data near each other, so the weekend works on the ground.'],
        groups: auds.filter((a) => a !== 'daytrip').map((a) => ({ title: AUDIENCE[a].hubTitle, href: `/${AUDIENCE[a].hubPath}`, intro: HUB_INTRO[a][0], cards: bundles.filter((b) => b.audience === a).sort((x, y) => (y.demand?.volume ?? 0) - (x.demand?.volume ?? 0) || y.rank - x.rank).slice(0, 4).map(card) })),
        others: [],
      },
    });
  }
  for (const p of content.pages) {
    out.push({ path: p.slug, template: 'vicPage', seo: { title: p.title + SUFFIX, rawTitle: true, description: p.description }, props: { title: p.title, paragraphs: p.paragraphs } });
  }
  return out;
}
