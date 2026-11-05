import { defineBrand } from '../../src/lib/brand-schema';

export default defineBrand({
  slug: 'backyard-wild',
  // No domain bought yet (Nov 2026: free path until it earns). Runs on backyard-wild.simonpatrickfarrugia.workers.dev. YouTube: @BackyardWildAU.
  name: 'Backyard Wild',
  domain: 'backyardwild.com',
  launched: false,

  theme: 'sanctuary',
  // Bush green on pale gum-leaf, bath-water teal, golden wattle for the one warm note.
  colors: { brand: '#1F3A2E', accent: '#E3B53B' },
  // Bricolage Grotesque: a little wild and hand-made for headlines. Figtree: calm, open body text.
  fonts: { display: 'Bricolage Grotesque', body: 'Figtree' },
  logo: { src: '/logo-mark.svg', alt: '', width: 30, height: 30 },
  favicon: '/favicon.svg',

  nav: [
    { label: 'Watch', href: '/' },
    { label: 'Visitors', href: '/visitors' },
    { label: 'The build', href: '/the-build' },
    { label: 'About', href: '/about' },
  ],
  footer: [
    { label: 'About', href: '/about' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'YouTube', href: 'https://www.youtube.com/@BackyardWildAU' },
  ],
  footerNote: 'Backyard Wild is run by Independent Media Network Pty Ltd, Melbourne. The camera points at the bird bath only, never at people, the street or the neighbours.',

  seo: {
    titleSuffix: ' | Backyard Wild',
    defaultDescription: 'A Melbourne bird bath on camera: which birds drop in, when, and what they get up to, with the real sound of the garden.',
  },

  data: { source: 'snapshot' },
  forms: [],
  analytics: {},
  ads: {},
  payments: { enabled: false },
});
