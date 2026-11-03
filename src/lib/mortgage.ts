/**
 * Home loan repayments for the MyPayCalc mortgage calculator. Pure maths, used at build time and in the browser.
 * Principal and interest: the standard amortisation formula on a monthly rate (annual rate / 12), which is how
 * Australian lenders quote monthly repayments. Weekly and fortnightly figures are the monthly amount spread
 * evenly (x 12 / 52, x 12 / 26), the way most lenders show them. Interest only: balance x rate / 12.
 * Tests: scripts/test-pay-tax.ts (CI, paycalc brand).
 */
export type LoanType = 'pi' | 'io';
export interface Loan { balance: number; rate: number; years: number; type: LoanType }

/** Monthly repayment. `rate` is a percentage (6.2 = 6.2% a year). */
export function monthlyRepayment({ balance, rate, years, type }: Loan): number {
  if (!(balance > 0)) return 0;
  const r = rate / 100 / 12;
  if (type === 'io') return balance * r;
  const n = Math.max(1, Math.round(years * 12));
  if (r === 0) return balance / n;
  return (balance * r) / (1 - Math.pow(1 + r, -n));
}

/** Total interest over the rest of the loan at this rate (interest only: for the years entered). */
export function totalInterest(loan: Loan): number {
  const m = monthlyRepayment(loan);
  const n = Math.max(1, Math.round(loan.years * 12));
  return loan.type === 'io' ? m * n : m * n - loan.balance;
}

export const perPeriod = (monthly: number) => ({ week: (monthly * 12) / 52, fortnight: (monthly * 12) / 26, month: monthly, year: monthly * 12 });

/** Before and after a rate change, with the difference per period. */
export function rateChange(loan: Loan, change: number) {
  const before = monthlyRepayment(loan);
  const after = monthlyRepayment({ ...loan, rate: Math.max(0, loan.rate + change) });
  return { before, after, diff: after - before, interestBefore: totalInterest(loan), interestAfter: totalInterest({ ...loan, rate: Math.max(0, loan.rate + change) }) };
}
