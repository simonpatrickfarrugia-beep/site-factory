import { defineBrand } from '../../src/lib/brand-schema';

export default defineBrand({
  slug: 'trailers',
  name: 'MovieTrailer.Channel',
  domain: 'movietrailer.channel',
  launched: false, // keep false until DNS cutover; previews stay out of Google

  theme: 'cinematic',
  colors: { brand: '#12162B', accent: '#F2B53A' }, // late-night broadcast indigo, marquee amber
  fonts: { display: 'Big Shoulders Display', body: 'Instrument Sans' },

  nav: [
    { label: 'Browse', href: '/browse' },
    { label: 'Discover', href: '/discover' },
  ],
  footer: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms' },
  ],

  seo: {
    titleSuffix: ' | MovieTrailer.Channel',
    defaultDescription:
      'Watch trailers for new releases, award winners, indie films, and hidden gems. Free 24/7 trailer stream, plus where to rent, buy, or stream each movie.',
  },

  // Snapshot exported from Webflow on 2026-10-16. Switches to airtable once the
  // Retro Video Store Directory base's API quota resets (1 Nov).
  data: { source: 'snapshot' },

  forms: ['contact'],
  analytics: {},
  payments: { enabled: false },
});
