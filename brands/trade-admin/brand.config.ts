import { defineBrand } from '../../src/lib/brand-schema';

export default defineBrand({
  slug: 'trade-admin',
  name: 'Trade Admin',
  domain: 'tradeadmin.com.au',
  launched: true, // live 25 Oct 2026

  theme: 'workshop',
  // Carpenter's-pencil graphite on docket-book paper; safety orange only for the one thing to do next.
  colors: { brand: '#23262B', accent: '#E8641B' },
  // Barlow Semi Condensed: signwriting / ute-door lettering. Source Sans 3: plain, very legible on phones in the sun.
  fonts: { display: 'Barlow Semi Condensed', body: 'Source Sans 3' },
  logo: { src: '/logo-mark.svg', alt: '', width: 30, height: 30 },
  favicon: '/favicon.png',
  shareImage: '/share.png',

  nav: [
    { label: 'Quote builder', href: '/quote-builder' },
    { label: 'Invoice builder', href: '/invoice-builder' },
    { label: 'Job apps compared', href: '/job-management-software' },
  ],
  footer: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'How we make money', href: '/how-we-make-money' },
    { label: 'Privacy', href: '/privacy-policy' },
  ],
  footerNote: 'Trade Admin is run by Independent Media Network Pty Ltd, Melbourne. The builders are free and run in your browser. Some links to software may earn us a referral fee; it never changes what we recommend.',

  seo: {
    titleSuffix: ' | Trade Admin',
    defaultDescription: 'Free quote and invoice builders for Australian tradies, plus honest, dated price comparisons of the job management apps.',
  },

  data: { source: 'snapshot' },
  forms: [],
  payments: { enabled: false },
});
