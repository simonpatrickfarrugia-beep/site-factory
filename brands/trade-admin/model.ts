/** Content model for Trade Admin. Mirrors data/trade-admin/*.json (edited by chat). */
export interface Faq { q: string; a: string }
export interface Plan { name: string; price: number; per: 'month' | 'user'; jobs?: number; users?: number; sms?: number }
export interface App { name: string; url: string; model: string; gst: 'inc' | 'ex' | 'unstated'; trial: string; plans: Plan[] }
export interface Apps { checked: string; note: string; apps: Record<'servicem8' | 'tradify' | 'fergus', App>; bigger: string }
export interface ToolPage { title: string; seoTitle: string; description: string; lede: string; faq: Faq[] }
export interface ComparePage { title: string; seoTitle: string; description: string; lede: string }
export interface TextPage { title: string; description: string; paragraphs: string[] }
export interface Pages {
  home: { title: string; lede: string; tools: { href: string; t: string; d: string }[]; why: { t: string; d: string }[] };
  'quote-builder': ToolPage;
  'invoice-builder': ToolPage;
  'job-management-software': ComparePage;
  'tradify-vs-servicem8': ComparePage;
  'servicem8-pricing': ComparePage;
  'tradify-pricing': ComparePage;
  'fergus-pricing': ComparePage;
  about: TextPage;
  contact: TextPage;
  'how-we-make-money': TextPage;
  'privacy-policy': TextPage;
}
