import { defineBrand } from '../../src/lib/brand-schema';

export default defineBrand({
  slug: 'vic',
  name: 'Vic Tours',
  domain: 'victours.com.au',
  launched: true, // live on victours.com.au since 20 Oct 2026

  theme: 'roadtrip',
  // Australian road signage: highway-sign green for places, tourist-sign brown for things to do.
  colors: { brand: '#00653B', accent: '#8A4B26' },
  fonts: { display: 'Overpass', body: 'Source Serif 4' },

  nav: [
    { label: 'Towns', href: '/towns' },
    { label: 'Day trips', href: '/collections/day-trips-from-melbourne' },
    { label: 'Weekends', href: '/collections/weekend-getaways' },
  ],
  footer: [
    { label: 'About', href: '/about' },
    { label: 'How we build our guides', href: '/how-we-build-our-guides' },
  ],
  footerNote:
    'Place details come from OpenStreetMap (© OpenStreetMap contributors, ODbL) and can change. Check opening hours with the venue before you go.',

  seo: {
    titleSuffix: ' | Vic Tours',
    defaultDescription: 'Where to stay, eat and what to do in Victoria’s towns and Melbourne’s neighbourhoods, town by town.',
  },

  data: { source: 'snapshot' },
  forms: [],
  analytics: {},
  payments: { enabled: false },
});
