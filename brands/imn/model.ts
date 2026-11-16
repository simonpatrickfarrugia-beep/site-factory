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
  extraPage: number;
  includedChanges: number;
  hero: { kicker: string; title: string; lede: string };
  included: Item[];
  steps: Item[];
  ai: { title: string; paragraphs: string[] };
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
}
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
