import { defineBrand } from '../../src/lib/brand-schema';

export default defineBrand({
  slug: 'shortlisted',
  name: 'Shortlisted',
  domain: 'shortlisted.com.au',
  launched: false, // preview only: domain not bought yet (shortlisted.com.au looked unregistered on 23 Oct 2026)

  theme: 'shortlist',
  // Fountain-pen blue on cool paper; editor's red only for the pen marks (the circle and ticks).
  colors: { brand: '#1B2F6B', accent: '#C8283E' },
  // Schibsted Grotesk: a no-nonsense news grotesk for headlines. Public Sans: built for government services, very legible.
  fonts: { display: 'Schibsted Grotesk', body: 'Public Sans' },
  logo: { src: '/logo-mark.svg', alt: '', width: 30, height: 30 },
  favicon: '/favicon.png',
  shareImage: '/share.png',

  nav: [
    { label: 'Business travel', href: '/business-travel' },
    { label: 'Free travel policy', href: '/business-travel/travel-policy-template' },
    { label: 'Get a shortlist', href: '/get-a-shortlist' },
  ],
  footer: [
    { label: 'About', href: '/about' },
    { label: 'How we make money', href: '/how-we-make-money' },
    { label: 'Privacy', href: '/privacy-policy' },
  ],
  footerNote: 'Shortlisted is run by Independent Media Network Pty Ltd, Melbourne. Free for businesses. We tell you whenever a provider we suggest pays us.',

  seo: {
    titleSuffix: ' | Shortlisted',
    defaultDescription: 'Free help for Australian small and mid-sized businesses choosing a provider, starting with business travel. Tell us what you need; get a short, honest shortlist.',
  },

  data: { source: 'snapshot' },
  forms: ['shortlist'],
  payments: { enabled: false },
});
