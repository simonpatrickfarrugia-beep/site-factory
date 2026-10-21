/** Content types for Community Help Co (data/community-help-co/*.json, edited by chat). */
export interface Service {
  slug: string;
  name: string;
  short: string;
  navLabel: string;
  seoTitle: string;
  seoDescription: string;
  lede: string;
  whoFor: string[];
  included: string[];
  funding: string;
  order: number;
  published: boolean;
}
export interface Faq { q: string; a: string; service: string | null }
/** Only real quotes with written consent. Never invent. First name or initials only. */
export interface Testimonial { quote: string; name: string; context: string; consent: boolean; published: boolean }
export interface SiteInfo {
  /** Primary call to action: mailto link for a free chat. */
  book: string;
  email: string;
  abn: string;
  formsEndpoint: string;
  hero: { title: string; lede: string; note: { label: string; week: string; goals: { t: string; s: 'done' | 'next' }[]; nextStep: string } };
  audiences: { t: string; d: string; href?: string; link?: string }[];
}
export interface Pages {
  'how-it-works': { title: string; description: string; lede: string; steps: { t: string; d: string }[] };
  about: { title: string; description: string; paragraphs: string[] };
  'privacy-policy': { title: string; description: string; paragraphs: string[] };
}
