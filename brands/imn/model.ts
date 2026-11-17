/** Content model for Independent Media Network (imnetwork.com.au). Mirrors data/imn/*.json (edited by chat). */
export interface Item { t: string; d: string }
export interface OurSite { name: string; url: string; what: string; built: string }
export interface Faq { q: string; a: string }
export interface SiteInfo {
  email: string;
  formsEndpoint: string;
  price: { monthly: number; monthlyIncGst: number };
  setup: { normal: number; promo: boolean; promoLabel: string; promoSpots: number; promoTerm: number };
  changeCapMinutes: number;
  extraChange: number;
  /** Stripe payment links (public URLs). plan = the monthly plan. */
  payLinks?: { plan?: string; extraPage?: string; extraChange?: string; _note?: string };
  extraPage: number;
  includedChanges: number;
  hero: { kicker: string; title: string; lede: string };
  included: Item[];
  steps: Item[];
  ai: { title: string; paragraphs: string[]; pair: { who: string; what: string }[] };
  glance: { title: string; paragraphs: string[] };
  change: string;
  sites: OurSite[];
  faq: Faq[];
}
export interface TextPage { title: string; description: string; paragraphs: string[] }
export interface FormPage { title: string; description: string; lede: string }
export interface TermsPage { title: string; description: string; updated: string; sections: { h: string; p: string[] }[] }
export interface Pages {
  about: TextPage;
  terms: TermsPage;
  contact: FormPage;
  'get-started': FormPage;
  'privacy-policy': TextPage;
  welcome: WelcomePage;
}
export interface WelcomePage { title: string; description: string; lede: string; steps: Item[]; ready: string[]; note: string }
/** Example dashboard numbers, read at build time from one of our own sites' stats (data/vic/stats.json). */
export interface DemoStats {
  site: string;
  url: string;
  start: string;
  end: string;
  asOf: string;
  views: number;
  users: number;
  gscClicks: number;
  gscImpressions: number;
  daily: { date: string; views: number }[];
  pages: { path: string; views: number }[];
  queries: { query: string; impressions: number }[];
}
/** "Confidence at a glance": real status for one of our own sites, read at build time from hq/sitecheck + hq/confidence. */
export type Light = 'green' | 'amber' | 'red';
export interface Glance {
  site: string;
  url: string;
  asOf: string;
  overall: Light;
  headline: string;
  sub: string;
  lights: { label: string; status: Light; value: string; note: string }[];
  checks: { label: string; grade: string }[];
  fixed: string[];
  scoreFrom: number | null;
  scoreTo: number;
  since: string;
  nextCheck: string;
}

/** SEO guide pages (data/imn/guides.json). */
export interface Guide {
  slug: string;
  seoTitle: string;
  description: string;
  kicker: string;
  title: string;
  lede: string;
  sections: { h: string; p?: string[]; list?: string[] }[];
  table?: { caption: string; head: string[]; rows: string[][]; note: string };
  example?: { label: string; name: string; tagline: string; call: string; bits: string[]; services: string[] };
  links: { path: string; t: string; d: string }[];
  faq: Faq[];
  sources: { t: string; url: string; checked: string }[];
}
export interface Guides { guides: Guide[] }
