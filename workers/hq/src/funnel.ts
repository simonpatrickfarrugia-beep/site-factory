// HQ tab (the CRM's front page): brand email connections and each site's search/visit/money numbers,
// so the page can draw one funnel from first contact to money and flag the bottlenecks.
// Email checklist: hq/mail.json (ticked by Claude when a mail hub step is done). Live part: mailReady
// from hq/prospect-targets.json and the last mail in/out per brand from the messages table.

import MAIL from '../../../hq/mail.json';
import VIC from '../../../data/vic/stats.json';
import TRAILERS from '../../../data/trailers/stats.json';
import CHC from '../../../data/community-help-co/stats.json';
import TA from '../../../data/trade-admin/stats.json';
import PAYCALC from '../../../data/paycalc/stats.json';

type Totals = { views?: number; cta?: Record<string, number>; gscClicks?: number; gscImpressions?: number };
type Stats = { generatedAt?: string; sources?: { ga4?: boolean }; totals?: Totals; pages?: { gscImpressions?: number; gscPosition?: number | null }[] };
const STATS: Record<string, Stats> = { vic: VIC as Stats, trailers: TRAILERS as Stats, 'community-help-co': CHC as Stats, 'trade-admin': TA as Stats, paycalc: PAYCALC as Stats };
// Money clicks per brand (CLAUDE.md, plus the Trade Admin quiz trial buttons).
const MONEY: Record<string, string[]> = {
  trailers: ['prime', 'disc'],
  vic: ['book_stay', 'book_tour', 'book_car'],
  'trade-admin': ['tradify_offer_sent', 'partner_fergus', 'quiz_trial_fergus', 'quiz_trial_tradify', 'quiz_trial_servicem8', 'app_site'],
};

type Brand = { name: string; active: boolean; mailReady?: boolean; from?: string; site?: string };
type MailBrand = { brand: string; name: string; address: string | null; steps: Record<string, boolean>; note?: string; todo?: string };

export async function hq(db: D1Database, brands: Record<string, Brand>) {
  const last = (await db.prepare(`SELECT brand, direction, COUNT(*) AS n, MAX(at) AS at FROM messages GROUP BY brand, direction`).all<{ brand: string; direction: string; n: number; at: string }>()).results;
  const m = MAIL as unknown as { updated: string; steps: { key: string; label: string; help: string }[]; brands: MailBrand[] };
  const mail = m.brands.map((b) => {
    const done = m.steps.filter((s) => b.steps[s.key]).length;
    const cfg = brands[b.brand];
    const io = (d: string) => last.find((r) => r.brand === b.brand && r.direction === d) ?? null;
    return {
      ...b,
      done,
      all: m.steps.length,
      state: done === m.steps.length ? 'on' : done > 0 ? 'part' : 'off',
      inOutreach: !!cfg,
      mailReady: !!cfg?.mailReady,
      lastIn: io('in')?.at ?? null,
      lastOut: io('out')?.at ?? null,
      mailIn: io('in')?.n ?? 0,
      mailOut: io('out')?.n ?? 0,
    };
  });
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const sites = Object.fromEntries(Object.entries(STATS).map(([k, s]) => {
    const t = s.totals ?? {};
    const pages = s.pages ?? [];
    const imp = sum(pages.map((p) => p.gscImpressions || 0));
    return [k, {
      asOf: s.generatedAt ?? null,
      ga4: !!s.sources?.ga4,
      seen: t.gscImpressions ?? 0,
      googleClicks: t.gscClicks ?? 0,
      position: imp ? Math.round(sum(pages.map((p) => (p.gscPosition ?? 0) * (p.gscImpressions || 0))) / imp) : null,
      visits: t.views ?? 0,
      clicks: sum(Object.values(t.cta ?? {})),
      money: sum((MONEY[k] ?? []).map((c) => t.cta?.[c] ?? 0)),
      tracksMoney: !!MONEY[k],
    }];
  }));
  return { steps: m.steps, mailUpdated: m.updated, mail, sites };
}
