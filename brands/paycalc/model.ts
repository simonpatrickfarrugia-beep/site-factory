/** Content model for the pay calculator. Mirrors data/paycalc/*.json (edited by chat). Rates: src/lib/pay-tax.ts → Rates. */
import type { Rates } from '../../src/lib/pay-tax';

export interface Faq { q: string; a: string }
export interface Source { what: string; name: string; url: string }
export interface RateFile extends Rates {
  year: string;
  yearLabel: string;
  checked: string;
  medicare: Rates['medicare'] & { thresholdYear: string; note: string };
  previous: { yearLabel: string; brackets: Rates['brackets']; help: Rates['help'] };
  next: { yearLabel: string; change: string };
  /** RBA cash rate target (mortgage calculator). Checked monthly against rba.gov.au by rates-check. */
  cash: { rate: number; previous: number; decided: string; decidedLabel: string; url: string };
  sources: Source[];
}
export interface ToolPage { title: string; seoTitle: string; description: string; lede: string; faq: Faq[] }
export interface GuidePage { title: string; seoTitle: string; description: string; lede: string; how: string[]; faq: Faq[] }
export interface TextPage { title: string; description: string; paragraphs: string[] }
export interface Pages {
  home: ToolPage;
  mortgage: ToolPage & { how: string[] };
  salary: { title: string; seoTitle: string; description: string; lede: string };
  'tax-brackets': GuidePage;
  'hecs-help-repayments': GuidePage;
  'how-we-calculate': TextPage;
  about: TextPage;
  contact: TextPage;
  'how-we-make-money': TextPage;
  'privacy-policy': TextPage;
  'affiliate-disclosure': TextPage;
}
