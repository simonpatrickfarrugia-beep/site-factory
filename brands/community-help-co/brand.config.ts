import { defineBrand } from '../../src/lib/brand-schema';

export default defineBrand({
  slug: 'community-help-co',
  name: 'Community Help Co',
  domain: 'communityhelp.com.au',
  launched: true, // live on communityhelp.com.au since 22 Oct 2026 (Microsoft 365 email records kept in Cloudflare DNS)

  theme: 'calm',
  // Logo mint (#9EF5CF) and a deep forest ink; sunny yellow is only for "done" ticks.
  colors: { brand: '#123B30', accent: '#9EF5CF' },
  // Outfit echoes the logo's rounded geometric lettering; Atkinson Hyperlegible Next was designed for low-vision readers.
  fonts: { display: 'Outfit', body: 'Atkinson Hyperlegible Next' },
  logo: { src: '/logo-mark.png', alt: '', width: 61, height: 36 },
  favicon: '/favicon.png',
  shareImage: '/share.png',

  nav: [
    { label: 'Life goals', href: '/life-goals-mentoring' },
    { label: 'Job Catalyst', href: '/job-catalyst' },
    { label: 'Resume builder', href: '/resume-builder' },
    { label: 'Free journal', href: '/free-daily-journal' },
    { label: 'Contact', href: '/contact' },
  ],
  footer: [
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Advocacy support', href: '/advocacy-support' },
    { label: 'About Simon', href: '/about' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Refer someone', href: '/contact#refer' },
    { label: 'Privacy policy', href: '/privacy-policy' },
  ],
  footerNote: 'ABN 89 640 199 935. Private clients welcome. For NDIS, we are an unregistered provider working with self-managed and plan-managed participants. Based in Melbourne, with sessions online across Australia.',

  seo: {
    titleSuffix: ' | Community Help Co',
    defaultDescription: 'Practical 1:1 life goals mentoring and employment coaching, online from Melbourne. NDIS or private. Weekly sessions with written notes.',
  },

  data: { source: 'snapshot' },
  forms: ['enquiry', 'referral'],
  payments: { enabled: false },
});
