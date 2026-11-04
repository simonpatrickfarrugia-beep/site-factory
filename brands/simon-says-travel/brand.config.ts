import { defineBrand } from '../../src/lib/brand-schema';

export default defineBrand({
  slug: 'simon-says-travel',
  // Domain bought by Simon on Wix (Nov 2026). DNS to move to Cloudflare before the custom domain works.
  name: 'Simon Says Travel',
  domain: 'simonsaystravel.com.au',
  launched: true, // indexable from the first deploy on simonsaystravel.com.au (5 Nov 2026)

  theme: 'boarding',
  // Departure-board black with amber flap text, on warm boarding-pass paper.
  colors: { brand: '#16181D', accent: '#FFB23F' },
  // Archivo: tight, airport-signage headlines. Manrope: clean, friendly body with clear figures.
  fonts: { display: 'Archivo', body: 'Manrope' },
  logo: { src: '/logo-mark.svg', alt: '', width: 30, height: 30 },
  favicon: '/favicon.svg',

  nav: [
    { label: 'This month', href: '/' },
    { label: 'Destinations', href: '/destinations' },
    { label: 'Past reports', href: '/reports' },
    { label: 'How it works', href: '/how-it-works' },
  ],
  footer: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'How this site makes money', href: '/affiliate-disclosure' },
    { label: 'Privacy', href: '/privacy-policy' },
  ],
  footerNote: 'Simon Says Travel is run by Independent Media Network Pty Ltd, Melbourne. Rankings use Google Trends data for Australia (relative interest, not search counts). Some links are affiliate links: we may earn a commission if you book, at no extra cost to you.',

  seo: {
    titleSuffix: ' | Simon Says Travel',
    defaultDescription: 'Where Australians want to travel right now: monthly Google search trends for 36 destinations and travel styles, ranked and explained.',
  },

  data: { source: 'snapshot' },
  forms: [],
  analytics: {},
  ads: {},
  payments: { enabled: false },
});
