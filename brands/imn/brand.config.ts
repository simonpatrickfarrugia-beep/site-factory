import { defineBrand } from '../../src/lib/brand-schema';

export default defineBrand({
  slug: 'imn',
  name: 'Independent Media Network',
  domain: 'imnetwork.com.au',
  launched: true, // live 16 Nov 2026 (Simon: "let's go live")

  theme: 'network',
  // Deep ink with one signal colour (amber "$1 coin"). Each page keeps to two colours plus paper.
  colors: { brand: '#121A2B', accent: '#F2A93B' },
  // Bricolage Grotesque: friendly, confident display face. Figtree: clear, warm body text.
  fonts: { display: 'Bricolage Grotesque', body: 'Figtree' },
  logo: { src: '/logo-mark.svg', alt: '', width: 30, height: 30 },
  favicon: '/logo-mark.svg',

  nav: [
    { label: 'Pricing', href: '/pricing' },
    { label: 'Our sites', href: '/our-sites' },
    { label: 'Dashboard', href: '/example-dashboard' },
    { label: 'Get started', href: '/get-started' },
  ],
  footer: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy-policy' },
  ],
  footerNote: 'Independent Media Network Pty Ltd, Melbourne. Human run, AI powered. Prices exclude GST.',

  seo: {
    titleSuffix: ' | Independent Media Network',
    defaultDescription: 'Websites for Australian small businesses, built and looked after for $99 + GST a month. Hosting, Google, a dashboard and 2 change rounds a month.',
  },

  data: { source: 'snapshot' },
  forms: ['start', 'enquiry'],
  payments: { enabled: false },
});
