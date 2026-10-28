/**
 * Trade Admin: monthly cost of each job app for a given team size and job volume.
 * Shared by the comparison calculator and the "which job app" quiz, so both always agree.
 * Prices come from data/trade-admin/apps.json (each vendor's own AU pricing page, dated).
 */
export type CostPlan = { name: string; price: number; per: 'month' | 'user'; jobs?: number; users?: number };
export type CostApp = { name: string; url?: string; gst: 'inc' | 'ex' | 'unstated'; plans: CostPlan[] };
export type CostRow = {
  key: string;        // app key, e.g. "servicem8"
  app: string;        // "ServiceM8"
  plan: string;       // "Growing"
  cost: number;       // monthly A$, GST added where the price excludes it
  text: string;       // "$79", "$349+", "$106*"
  why: string;        // one-line reason
  over: boolean;      // volume beyond the top published plan
  unstatedGst: boolean;
};

export const fmtMoney = (n: number) => '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Every plan row (per-user apps list each plan; job-priced apps list only the cheapest plan that fits). Cheapest first. */
export function costRows(apps: Record<string, CostApp>, people: number, jobs: number): CostRow[] {
  const rows: CostRow[] = [];
  for (const [key, a] of Object.entries(apps)) {
    if (a.plans[0]?.per === 'month') {
      // Priced by job volume: the cheapest plan with enough jobs (the free plan is 1 user only).
      const fit = a.plans.find((p) => (p.jobs ?? Infinity) >= jobs && (p.users ?? Infinity) >= people);
      const p = fit ?? a.plans[a.plans.length - 1];
      rows.push({
        key, app: a.name, plan: p.name, cost: p.price, over: !fit, unstatedGst: false,
        text: fmtMoney(p.price) + (fit ? '' : '+'),
        why: fit ? `up to ${p.jobs} new jobs, ${p.users ? '1 user' : 'unlimited users'}` : `${p.jobs}+ jobs: very high volumes may cost more`,
      });
    } else {
      for (const p of a.plans) {
        const base = p.price * people;
        const cost = a.gst === 'ex' ? base * 1.1 : base;
        rows.push({
          key, app: a.name, plan: p.name, cost, over: false, unstatedGst: a.gst === 'unstated',
          text: fmtMoney(cost) + (a.gst === 'unstated' ? '*' : ''),
          why: `${people} × $${p.price}${a.gst === 'ex' ? ' + GST' : ''}, unlimited jobs`,
        });
      }
    }
  }
  return rows.sort((x, y) => x.cost - y.cost);
}

/** The cheapest row per app (its entry-level plan that fits), cheapest app first. */
export function cheapestPerApp(rows: CostRow[]): CostRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true)));
}
