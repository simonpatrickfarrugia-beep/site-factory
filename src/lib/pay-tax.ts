/**
 * Australian take-home pay for an Australian resident, for one income year.
 * Pure functions, no dependencies: used at build time (salary pages) and in the browser (the calculator).
 * Rates come from data/paycalc/rates.json; nothing here hard-codes a tax figure.
 *
 * What it covers: resident income tax, the low income tax offset, the Medicare levy (single, with the
 * low-income reduction), compulsory study loan (HELP) repayments, and employer super.
 * What it doesn't: the Medicare levy surcharge, family thresholds, other offsets, deductions, non-residents
 * and working holiday makers. The pages say so.
 */

export interface Bracket { from: number; rate: number }
export interface HelpRates { nilTo: number; bands: { from: number; upTo: number; base: number; rate: number }[]; flatFrom: number; flatRate: number }
export interface Rates {
  brackets: Bracket[];
  lito: { max: number; full: number; r1: number; mid: number; midAmount: number; r2: number };
  medicare: { rate: number; shadeIn: number; singleLower: number; singleUpper: number };
  help: HelpRates;
  super: { rate: number; maxBase: number };
}

export type Period = 'year' | 'month' | 'fortnight' | 'week' | 'hour';
export interface PayInput {
  amount: number;
  period: Period;
  /** Hours a week, for hourly pay (and for the per-hour figure). */
  hours?: number;
  /** 'on-top' = the amount is your salary; super is paid on top. 'included' = the amount is a package that includes super. */
  superMode?: 'on-top' | 'included';
  help?: boolean;
}

export interface PayResult {
  gross: number;        // taxable income for the year (salary, excluding super)
  incomeTax: number;    // tax on taxable income, after the low income tax offset
  taxBeforeOffset: number;
  lito: number;
  medicare: number;
  help: number;
  net: number;
  superAmount: number;
  effectiveRate: number;  // (incomeTax + medicare + help) / gross
  marginalRate: number;   // on the next dollar: income tax + Medicare + HELP
  hours: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function taxOnIncome(income: number, brackets: Bracket[]): number {
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const lo = brackets[i].from;
    const hi = i + 1 < brackets.length ? brackets[i + 1].from : Infinity;
    if (income > lo) tax += (Math.min(income, hi) - lo) * brackets[i].rate;
  }
  return r2(tax);
}

export function litoFor(income: number, l: Rates['lito']): number {
  if (income <= l.full) return l.max;
  if (income <= l.mid) return r2(l.max - (income - l.full) * l.r1);
  return r2(Math.max(0, l.midAmount - (income - l.mid) * l.r2));
}

export function medicareFor(income: number, m: Rates['medicare']): number {
  if (income <= m.singleLower) return 0;
  // The reduction phases out at the upper threshold: 10% of the excess until it reaches 2% of income.
  return r2(Math.min(income * m.rate, (income - m.singleLower) * m.shadeIn));
}

export function helpFor(income: number, h: HelpRates): number {
  if (income <= h.nilTo) return 0;
  if (income > h.flatFrom) return r2(income * h.flatRate);
  const band = [...h.bands].reverse().find((b) => income > b.from)!;
  return r2(band.base + (income - band.from) * band.rate);
}

export function annualise(amount: number, period: Period, hours = 38): number {
  switch (period) {
    case 'year': return amount;
    case 'month': return amount * 12;
    case 'fortnight': return amount * 26;
    case 'week': return amount * 52;
    case 'hour': return amount * hours * 52;
  }
}

function core(gross: number, rates: Rates, help: boolean) {
  const taxBeforeOffset = taxOnIncome(gross, rates.brackets);
  const lito = Math.min(taxBeforeOffset, litoFor(gross, rates.lito)); // non-refundable
  const incomeTax = r2(taxBeforeOffset - lito);
  const medicare = medicareFor(gross, rates.medicare);
  const helpAmt = help ? helpFor(gross, rates.help) : 0;
  return { taxBeforeOffset, lito: r2(lito), incomeTax, medicare, help: helpAmt, net: r2(gross - incomeTax - medicare - helpAmt) };
}

export function calculate(input: PayInput, rates: Rates): PayResult {
  const hours = input.hours && input.hours > 0 ? input.hours : 38;
  const stated = Math.max(0, annualise(input.amount || 0, input.period, hours));
  const sg = rates.super.rate;
  // A package that includes super: salary = package / (1 + SG), up to the maximum contribution base.
  let gross = input.superMode === 'included' ? stated / (1 + sg) : stated;
  if (input.superMode === 'included' && gross > rates.super.maxBase) gross = stated - rates.super.maxBase * sg;
  gross = r2(gross);
  const superAmount = r2(Math.min(gross, rates.super.maxBase) * sg);
  const c = core(gross, rates, !!input.help);
  const step = 100; // marginal rate measured over the next $100, so offsets and phase-ins show up
  const next = core(gross + step, rates, !!input.help);
  const marginalRate = Math.max(0, (step - (next.net - c.net)) / step);
  const taken = c.incomeTax + c.medicare + c.help;
  return { gross, ...c, superAmount, effectiveRate: gross > 0 ? taken / gross : 0, marginalRate: Math.round(marginalRate * 1000) / 1000, hours };
}

/** The figures per pay period. Week, fortnight and month are the year divided by 52, 26 and 12 (pay runs differ a little). */
export function perPeriod(n: number, hours = 38) {
  return { year: n, month: n / 12, fortnight: n / 26, week: n / 52, hour: n / 52 / hours };
}

/** Which tax brackets an income reaches, with the tax charged in each (for the "how it's worked out" steps). */
export function bracketSteps(income: number, brackets: Bracket[]) {
  const out: { from: number; to: number | null; rate: number; amount: number; tax: number }[] = [];
  for (let i = 0; i < brackets.length; i++) {
    const lo = brackets[i].from;
    const hi = i + 1 < brackets.length ? brackets[i + 1].from : null;
    if (income <= lo && !(lo === 0)) break;
    const top = hi === null ? income : Math.min(income, hi);
    const amount = Math.max(0, top - lo);
    out.push({ from: lo, to: hi, rate: brackets[i].rate, amount, tax: r2(amount * brackets[i].rate) });
    if (hi === null || income <= hi) break;
  }
  return out;
}

export const aud = (n: number, cents = false) =>
  '$' + (cents ? n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(n).toLocaleString('en-AU'));
export const pct = (n: number, dp = 1) => `${(n * 100).toFixed(dp).replace(/\.0$/, '')}%`;
