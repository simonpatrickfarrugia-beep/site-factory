/**
 * Checks the pay calculator's maths against hand-worked figures from the ATO rate tables (2026–27).
 * Run: node --experimental-strip-types scripts/test-pay-tax.ts   (CI runs it for the paycalc brand)
 */
import { readFileSync } from 'node:fs';
import { calculate, taxOnIncome, litoFor, medicareFor, helpFor, type Rates } from '../src/lib/pay-tax.ts';

const rates = JSON.parse(readFileSync(new URL('../data/paycalc/rates.json', import.meta.url), 'utf8')) as Rates & { previous: { brackets: Rates['brackets']; help: Rates['help'] } };
let fails = 0, n = 0;
const eq = (name: string, got: number, want: number, tol = 0.01) => {
  n++;
  if (Math.abs(got - want) > tol) { fails++; console.log(`FAIL ${name}: got ${got}, want ${want}`); }
};

// Income tax (before offsets), 2026–27 table: 15% from $18,201, $4,020 at $45,000, $31,020 at $135,000, $51,370 at $190,000.
eq('tax 18,200', taxOnIncome(18200, rates.brackets), 0);
eq('tax 45,000', taxOnIncome(45000, rates.brackets), 4020);
eq('tax 135,000', taxOnIncome(135000, rates.brackets), 31020);
eq('tax 190,000', taxOnIncome(190000, rates.brackets), 51370);
eq('tax 250,000', taxOnIncome(250000, rates.brackets), 51370 + 60000 * 0.45);
eq('tax 85,000', taxOnIncome(85000, rates.brackets), 4020 + 40000 * 0.3);
// 2025–26 (16%): $4,288 at $45,000, $31,288 at $135,000, $51,638 at $190,000 (ATO 2025–26 table).
eq('2025–26 tax 45,000', taxOnIncome(45000, rates.previous.brackets), 4288);
eq('2025–26 tax 135,000', taxOnIncome(135000, rates.previous.brackets), 31288);
eq('2025–26 tax 190,000', taxOnIncome(190000, rates.previous.brackets), 51638);

// LITO: $700 to $37,500; minus 5c/$ to $45,000 ($325); minus 1.5c/$ to nil at ~$66,667.
eq('lito 30,000', litoFor(30000, rates.lito), 700);
eq('lito 37,500', litoFor(37500, rates.lito), 700);
eq('lito 40,000', litoFor(40000, rates.lito), 575);
eq('lito 45,000', litoFor(45000, rates.lito), 325);
eq('lito 50,000', litoFor(50000, rates.lito), 250);
eq('lito 66,667', litoFor(66667, rates.lito), 0, 0.02);
eq('lito 80,000', litoFor(80000, rates.lito), 0);

// Medicare: nil to $28,011, 10% of the excess to $35,013, then 2% of income.
eq('medicare 28,011', medicareFor(28011, rates.medicare), 0);
eq('medicare 30,000', medicareFor(30000, rates.medicare), 198.9);
eq('medicare 35,013', medicareFor(35013, rates.medicare), 700.2, 0.05);
eq('medicare 40,000', medicareFor(40000, rates.medicare), 800);
eq('medicare 85,000', medicareFor(85000, rates.medicare), 1700);

// HELP 2026–27: nil to $69,528; 15c per $ over; $9,028 + 17c over $129,717; 10% of all income from $186,051.
eq('help 69,528', helpFor(69528, rates.help), 0);
eq('help 85,000', helpFor(85000, rates.help), 2320.8);
eq('help 129,717', helpFor(129717, rates.help), 9028.35, 0.5); // the table's own base rounds to $9,028
eq('help 150,000', helpFor(150000, rates.help), 9028 + 20283 * 0.17);
eq('help 200,000', helpFor(200000, rates.help), 20000);
// 2025–26 thresholds as a cross-check of the band logic.
eq('2025–26 help 125,000', helpFor(125000, rates.previous.help), 8700);
eq('2025–26 help 179,286', helpFor(179286, rates.previous.help), 17928.6);

// Whole calculations.
const at = (amount: number, extra: object = {}) => calculate({ amount, period: 'year', ...extra }, rates);
eq('net 20,000 (tax wiped by LITO)', at(20000).net, 20000);
eq('net 30,000', at(30000).net, 30000 - (1770 - 700) - 198.9);
eq('net 50,000', at(50000).net, 50000 - (5520 - 250) - 1000);
eq('net 85,000', at(85000).net, 67280);
eq('net 85,000 + HELP', at(85000, { help: true }).net, 67280 - 2320.8);
eq('net 200,000', at(200000).net, 200000 - (51370 + 4500) - 4000);
eq('super 85,000', at(85000).superAmount, 10200);
eq('super capped', at(300000).superAmount, 270830 * 0.12);
eq('package incl. super 112,000', at(112000, { superMode: 'included' }).gross, 100000);
eq('weekly 1,500', calculate({ amount: 1500, period: 'week' }, rates).gross, 78000);
eq('hourly 40 x 38', calculate({ amount: 40, period: 'hour', hours: 38 }, rates).gross, 79040);
eq('marginal 85,000', at(85000).marginalRate, 0.32);
eq('marginal 85,000 + HELP', at(85000, { help: true }).marginalRate, 0.47);
eq('marginal 50,000 (LITO phase-out)', at(50000).marginalRate, 0.335);

console.log(`${n - fails}/${n} pay-tax checks passed`);
if (fails) process.exit(1);
