import { defineBrand } from '../../src/lib/brand-schema';

export default defineBrand({
  slug: 'paycalc',
  // Working name and domain until Simon picks one (unregistered on 29 Oct 2026: mypaycalc.com.au, takehomecalc.com.au, aftertaxpay.com.au).
  name: 'MyPayCalc',
  domain: 'mypaycalc.com.au',
  launched: false,

  theme: 'payslip',
  // Payslip navy on cool office-paper white; highlighter yellow marks the one number people came for (take-home pay).
  colors: { brand: '#152B4D', accent: '#FFE14D' },
  // Bricolage Grotesque: confident, slightly quirky headlines that don't read as a bank. Figtree: friendly, very legible figures.
  fonts: { display: 'Bricolage Grotesque', body: 'Figtree' },
  logo: { src: '/logo-mark.svg', alt: '', width: 30, height: 30 },
  favicon: '/favicon.svg',

  nav: [
    { label: 'Pay calculator', href: '/' },
    { label: 'Salaries', href: '/salary' },
    { label: 'Tax brackets', href: '/tax-brackets' },
    { label: 'HECS-HELP', href: '/hecs-help-repayments' },
  ],
  footer: [
    { label: 'How we calculate', href: '/how-we-calculate' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'How we make money', href: '/how-we-make-money' },
    { label: 'Privacy', href: '/privacy-policy' },
  ],
  footerNote: 'MyPayCalc is run by Independent Media Network Pty Ltd, Melbourne. Estimates for Australian residents using the ATO’s published rates. General information only, not tax advice.',

  seo: {
    titleSuffix: ' | MyPayCalc',
    defaultDescription: 'Free Australian pay calculator for 2026–27: take-home pay after tax, Medicare, HECS-HELP and super, per week, fortnight, month and year.',
  },

  data: { source: 'snapshot' },
  forms: [],
  analytics: {},
  payments: { enabled: false },
});
