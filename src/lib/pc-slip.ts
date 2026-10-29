/** Browser side of the payslip card: switch periods, and redraw when the calculator changes the figures. */
import { aud } from './pay-tax';

type Annual = { gross: number; incomeTax: number; medicare: number; help: number; net: number; superAmount: number };
const DIV = { week: 52, fortnight: 26, month: 12, year: 1 } as const;
const PER = { week: 'a week', fortnight: 'a fortnight', month: 'a month', year: 'a year' } as const;
export type SlipPeriod = keyof typeof DIV;

export function drawSlip(slip: HTMLElement, a?: Annual, showHelp?: boolean) {
  if (a) slip.dataset.annual = JSON.stringify(a);
  const annual = JSON.parse(slip.dataset.annual || '{}') as Annual;
  const per = (slip.dataset.period || 'year') as SlipPeriod;
  for (const el of slip.querySelectorAll<HTMLElement>('[data-f]')) {
    const k = el.dataset.f as keyof Annual;
    const v = aud((annual[k] ?? 0) / DIV[per]);
    el.textContent = ['incomeTax', 'medicare', 'help'].includes(k) ? `−${v}` : v;
  }
  const label = slip.querySelector<HTMLElement>('[data-perlabel]');
  if (label) label.textContent = PER[per];
  if (showHelp !== undefined) {
    const row = slip.querySelector<HTMLElement>('[data-row="help"]');
    if (row) row.hidden = !showHelp;
  }
  for (const b of slip.querySelectorAll<HTMLButtonElement>('[data-per]')) b.setAttribute('aria-pressed', String(b.dataset.per === per));
}

export function bindSlips(onPeriod?: (p: SlipPeriod) => void) {
  for (const slip of document.querySelectorAll<HTMLElement>('[data-slip]')) {
    slip.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLButtonElement>('[data-per]');
      if (!b) return;
      slip.dataset.period = b.dataset.per;
      drawSlip(slip);
      onPeriod?.(b.dataset.per as SlipPeriod);
    });
  }
}
