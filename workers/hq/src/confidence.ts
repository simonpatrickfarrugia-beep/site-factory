// Confidence panel (top of IMN HQ → Home): this week's work (micro), the 90-day trajectory (macro), a forecast, and one
// top line: on track / drifting / stalled, plus the one thing to fix first. Honest by design (docs/CONFIDENCE.md).
// Repo half: hq/confidence.json (scripts/hq/confidence.py, daily), read live from the public repo and cached 10 minutes.
// Live half (D1): first emails sent this week vs the warm-up ramp, and follow-ups done vs due.

import { RAMP, ensureTable } from './send';

const RAW = 'https://raw.githubusercontent.com/simonpatrickfarrugia-beep/site-factory/main/hq/confidence.json';
type Light = 'green' | 'amber' | 'red';
type Item = { key: string; label: string; value: number; target: number; status: Light; unit?: string; fix: string; weight: number; note?: string; open?: string };
type Site = { id: string; name: string; status: Light; trend: 'up' | 'flat' | 'down'; why: string[] };
type File = { generatedAt: string; micro: { items: Item[] }; macro: { status: Light; summary: string; sites: Site[] }; [k: string]: unknown };
const SCORE: Record<Light, number> = { green: 2, amber: 1, red: 0 };
const light = (s: number): Light => (s >= 1.5 ? 'green' : s >= 0.75 ? 'amber' : 'red');
const ratioLight = (v: number, t: number): Light => { const r = t ? v / t : 1; return r >= 0.8 ? 'green' : r >= 0.34 ? 'amber' : 'red'; };

async function repoHalf(): Promise<File | null> {
  const cache = caches.default;
  const key = new Request(RAW);
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const res = await fetch(RAW, { headers: { 'user-agent': 'imn-hq' } });
  if (!res.ok) return null;
  const body = await res.text();
  await cache.put(key, new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=600' } }));
  return JSON.parse(body);
}

const melbDay = (d: Date) => new Date(d.getTime() + 11 * 3600_000).toISOString().slice(0, 10);

/** `due` = follow-ups due now, `ready` = drafts waiting + Radar prospects to review, `senders` = brands on the mail hub. */
export async function confidence(db: D1Database, live: { due: number; ready: number; senders: number }) {
  const file = await repoHalf();
  if (!file) return { error: 'No confidence data yet (hq/confidence.json is written daily by the brief job).' };
  await ensureTable(db);
  const today = melbDay(new Date());
  const days = [...Array(7)].map((_, i) => melbDay(new Date(Date.now() - i * 86400_000)));
  const from = days[6];
  const first = (await db.prepare(`SELECT MIN(day) AS d FROM sends`).first<{ d: string | null }>())?.d ?? null;
  const counts = (await db.prepare(`SELECT kind, COUNT(*) AS n FROM sends WHERE day >= ? GROUP BY kind`).bind(from).all<{ kind: string; n: number }>()).results;
  const sent7 = counts.find((c) => c.kind === 'first')?.n ?? 0;
  const followSent = counts.find((c) => c.kind === 'followup')?.n ?? 0;
  const followOpened = (await db.prepare(`SELECT COUNT(*) AS n FROM touches WHERE note = 'Follow-up opened' AND at >= ?`).bind(from).first<{ n: number }>())?.n ?? 0;
  const follow7 = Math.max(followSent, followOpened);

  // This week's sending allowance on the warm-up ramp, weekdays only (nobody expects Sunday outreach).
  let cap = 0;
  for (const d of days) {
    const wd = new Date(d + 'T00:00:00Z').getUTCDay();
    if (wd === 0 || wd === 6) continue;
    const n = first && d >= first ? Math.floor((Date.parse(d) - Date.parse(first)) / 86400_000) + 1 : 1;
    const step = RAMP.find((r) => n <= r.untilDay)!;
    cap += step.totalPerDay ?? (step.perBrand ?? 0) * Math.max(1, live.senders);
  }
  const possible = sent7 + live.ready;
  const target = Math.min(cap, possible);
  const outreach: Item = target === 0
    ? { key: 'outreach', label: 'Outreach emails sent', value: sent7, target: 0, status: 'amber', weight: 2, open: 'today',
        fix: 'Nothing is ready to send: ask Claude for more Radar prospects', note: 'No drafts or Radar prospects waiting' }
    : { key: 'outreach', label: 'Outreach emails sent', value: sent7, target, status: ratioLight(sent7, target), weight: 2, open: 'board',
        fix: `Send ${Math.max(1, Math.min(5, target - sent7))} of the ${live.ready} drafts and Radar prospects waiting (Outreach tab)`,
        note: `Warm-up allows ${cap} this week; ${live.ready} ready to go` };
  const fu: Item = { key: 'followups', label: 'Follow-ups done', value: follow7, target: follow7 + live.due, weight: 1, open: 'board',
    status: live.due === 0 ? 'green' : ratioLight(follow7, follow7 + live.due), fix: `Send the ${live.due} follow-up${live.due === 1 ? '' : 's'} due (Outreach tab)`,
    note: live.due === 0 ? 'None due' : `${live.due} due now` };
  const items = [outreach, fu, ...file.micro.items.map((i) => ({ ...i, open: i.key === 'todos' ? 'imn' : 'checks' }))];
  const w = items.reduce((a, i) => a + i.weight, 0);
  const microStatus = light(items.reduce((a, i) => a + SCORE[i.status] * i.weight, 0) / w);

  const macro = file.macro;
  const sliding = macro.sites.filter((s) => s.trend === 'down');
  const verdict = microStatus === 'red' || macro.status === 'red' ? 'stalled'
    : microStatus === 'green' && macro.status !== 'red' && sliding.length === 0 ? 'on track' : 'drifting';
  // The one thing: the worst bit of this week's work first (that's in Simon's hands), then the weakest site.
  const worst = items.filter((i) => i.status !== 'green').sort((a, z) => SCORE[a.status] - SCORE[z.status] || z.weight - a.weight)[0];
  const weakSite = [...macro.sites].sort((a, z) => SCORE[a.status] - SCORE[z.status] || (a.trend === 'down' ? -1 : 0) - (z.trend === 'down' ? -1 : 0))[0];
  const fixFirst = worst
    ? { text: worst.fix, why: `${worst.label}: ${worst.value} of ${worst.target}`, open: worst.open }
    : weakSite && weakSite.status !== 'green'
      ? { text: `Turn ${weakSite.name} around`, why: weakSite.why[0] ?? '', open: 'app:' + weakSite.id }
      : { text: 'Keep doing what you’re doing', why: 'Work done and every site on pace', open: null };
  const line = {
    'on track': 'This week’s work is done and the sites are heading the right way.',
    drifting: microStatus === 'green' ? 'You’re putting the work in; the results haven’t caught up yet.' : 'Some of this week’s work is slipping.',
    stalled: microStatus === 'red' ? 'Not much got done this week. Small steps today get it moving.' : 'A site has gone flat for a while: worth a closer look.',
  }[verdict];
  return { ...file, today, verdict, line, fixFirst, micro: { status: microStatus, items }, macro };
}
