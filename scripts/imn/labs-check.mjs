// IMN Labs rules (DECISIONS.md 21 Nov 2026), run by scripts/verify-build.mjs for the imn brand, and on its own:
//   node scripts/imn/labs-check.mjs [dist]      (registry only when dist/ is missing)
// - at most `maxLive` labs live at once (live + graduating count)
// - every lab has a valid slug, name, summary and status; live labs have a launch date and a 90-day target
// - graduating/graduated labs name their domain; closed and graduated labs build no pages (the Worker sends 410 / 301)
// - every live lab has its content file (data/imn/lab-<slug>.json) with a home page, and its pages were built
// - IMN Labs is never in IMN's main menu (footer link only)
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const STATUSES = ['live', 'graduating', 'graduated', 'closed'];
const METRICS = ['gsc_impressions', 'gsc_clicks', 'visits', 'money_clicks'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;
const DOMAIN = /^[a-z0-9.-]+\.[a-z]{2,}$/;

export function checkLabs({ root = '.', dist = null } = {}) {
  const problems = [];
  const regFile = join(root, 'data', 'imn', 'labs.json');
  if (!existsSync(regFile)) return { problems: ['IMN Labs: data/imn/labs.json is missing'], live: 0, total: 0 };
  let reg;
  try { reg = JSON.parse(readFileSync(regFile, 'utf8')); } catch (e) { return { problems: [`IMN Labs: labs.json is not valid JSON (${e.message})`], live: 0, total: 0 }; }
  const labs = Array.isArray(reg.labs) ? reg.labs : (problems.push('IMN Labs: labs.json needs a "labs" array'), []);
  const max = Number(reg.maxLive);
  if (!Number.isInteger(max) || max < 1 || max > 4) problems.push(`IMN Labs: maxLive must be 1–4 (is ${reg.maxLive}); Simon's cap is at most 4 live labs`);
  const seen = new Set();
  for (const l of labs) {
    const id = `IMN Labs "${l?.slug ?? '?'}"`;
    if (!SLUG.test(l?.slug ?? '')) { problems.push(`${id}: slug must be lowercase letters, numbers and dashes`); continue; }
    if (seen.has(l.slug)) problems.push(`${id}: slug used twice`);
    seen.add(l.slug);
    if (!l.name) problems.push(`${id}: no name`);
    if (!l.summary) problems.push(`${id}: no summary (one line for the /labs page)`);
    if (!STATUSES.includes(l.status)) problems.push(`${id}: status must be one of ${STATUSES.join(', ')}`);
    if (l.status !== 'closed') {
      if (!DATE.test(l.launched ?? '')) problems.push(`${id}: launched must be a YYYY-MM-DD date`);
      if (!METRICS.includes(l.target?.metric) || !(Number(l.target?.number) > 0)) problems.push(`${id}: set the 90-day target before launch (metric ${METRICS.join(' | ')}, number > 0)`);
    }
    if (['graduating', 'graduated'].includes(l.status) && !DOMAIN.test(l.domain ?? '')) problems.push(`${id}: ${l.status} needs its domain (bare, e.g. fairprice.com.au)`);
    if (l.domain && !DOMAIN.test(l.domain)) problems.push(`${id}: domain "${l.domain}" should be bare, e.g. fairprice.com.au`);
    if (['live', 'graduating'].includes(l.status)) {
      const cf = join(root, 'data', 'imn', `lab-${l.slug}.json`);
      if (!existsSync(cf)) problems.push(`${id}: missing data/imn/lab-${l.slug}.json`);
      else {
        try {
          const c = JSON.parse(readFileSync(cf, 'utf8'));
          const paths = (c.pages ?? []).map((p) => p.path);
          if (!paths.includes('')) problems.push(`${id}: content needs a home page (path "")`);
          if (new Set(paths).size !== paths.length) problems.push(`${id}: two pages share a path`);
          for (const p of c.pages ?? []) if (!p.seoTitle || !p.description || !p.title || !Array.isArray(p.sections)) problems.push(`${id}: page "${p.path}" needs seoTitle, description, title and sections`);
          if (dist) for (const p of paths) {
            const f = join(dist, 'labs', l.slug, ...(p ? [`${p}.html`] : ['index.html']));
            const alt = join(dist, 'labs', `${l.slug}.html`);
            if (!existsSync(f) && !(p === '' && existsSync(alt))) problems.push(`${id}: page /labs/${l.slug}${p ? '/' + p : ''} was not built`);
          }
        } catch (e) { problems.push(`${id}: lab-${l.slug}.json is not valid JSON (${e.message})`); }
      }
    }
    if (dist && ['closed', 'graduated'].includes(l.status)) {
      if (existsSync(join(dist, 'labs', l.slug)) || existsSync(join(dist, 'labs', `${l.slug}.html`))) problems.push(`${id}: is ${l.status} but its pages were still built`);
    }
  }
  const live = labs.filter((l) => ['live', 'graduating'].includes(l.status)).length;
  if (Number.isInteger(max) && live > max) problems.push(`IMN Labs: ${live} labs live, the cap is ${max}. Graduate or close one first (scripts/imn/lab.mjs)`);
  const cfgFile = join(root, 'brands', 'imn', 'brand.config.ts');
  if (existsSync(cfgFile)) {
    const nav = readFileSync(cfgFile, 'utf8').match(/\bnav:\s*\[([\s\S]*?)\]/);
    if (nav && /\/labs/.test(nav[1])) problems.push('IMN Labs: keep Labs out of the main menu (footer link only)');
  }
  return { problems, live, total: labs.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] ?? 'dist';
  const r = checkLabs({ dist: existsSync(dist) && readdirSync(dist).length ? dist : null });
  console.log(r.problems.length ? r.problems.map((p) => `- ${p}`).join('\n') : `IMN Labs OK: ${r.live} live of ${r.total}`);
  process.exit(r.problems.length ? 1 : 0);
}
