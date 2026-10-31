import { defineBrand } from '../../src/lib/brand-schema';

export default defineBrand({
  slug: 'trailers',
  name: 'MovieTrailer.Channel',
  // Canonical host. Webflow served www and Search Console tracks the www property, so keep it.
  domain: 'www.movietrailer.channel',
  launched: true, // live on movietrailer.channel since the DNS cutover

  theme: 'cinematic',
  colors: { brand: '#12162B', accent: '#F2B53A' }, // late-night broadcast indigo, marquee amber
  fonts: { display: 'Big Shoulders Display', body: 'Instrument Sans' },

  nav: [
    { label: 'Browse', href: '/browse' },
    { label: 'Discover', href: '/discover' },
    { label: 'Original films', href: '/original-films' },
  ],
  footer: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
  // Required by the Amazon Associates programme. Carried over from Webflow.
  footerNote: 'As an Amazon Associate, movietrailer.channel earns from qualifying purchases.',

  seo: {
    titleSuffix: ' | MovieTrailer.Channel',
    defaultDescription:
      'Classic movie trailers and where to watch each film tonight: rent, buy or stream. Browse by decade, genre and director, or play the free 24/7 trailer channel.',
  },

  // Snapshot exported from Webflow on 2026-10-16. Switches to airtable once the
  // Retro Video Store Directory base's API quota resets (1 Nov).
  data: { source: 'snapshot' },

  forms: ['contact'],
  analytics: { ga4Id: 'G-RXGCJ51YWJ' }, // same property Webflow used, so traffic history continues
  payments: { enabled: false },
});
