/** Content model for Shortlisted. Mirrors data/shortlisted/*.json (edited by chat). */
export interface Step { t: string; d: string }
export interface Category { slug: string; name: string; live: boolean; d: string }
export interface SiteInfo {
  email: string;
  formsEndpoint: string;
  hero: { title: string; lede: string; card: { heading: string; rows: { t: string; s: 'out' | 'pick'; why: string }[] } };
  steps: Step[];
  categories: Category[];
}
export interface Section { h: string; p?: string[]; list?: string[] }
export interface Faq { q: string; a: string }
export interface Pages {
  'business-travel': { title: string; seoTitle: string; description: string; lede: string; sections: Section[] };
  'travel-policy-template': { title: string; seoTitle: string; description: string; lede: string; faq: Faq[] };
  about: { title: string; description: string; paragraphs: string[] };
  'how-we-make-money': { title: string; description: string; paragraphs: string[] };
  'privacy-policy': { title: string; description: string; paragraphs: string[] };
  'get-a-shortlist': { title: string; description: string; lede: string };
}
