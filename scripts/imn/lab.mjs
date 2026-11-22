#!/usr/bin/env node
// IMN Labs helper (docs/LABS.md). Moves a lab through its life; every step is a normal commit, so it can be undone.
//
//   node scripts/imn/lab.mjs status
//   node scripts/imn/lab.mjs close <slug>                  missed its 90-day target: pages come down, /labs/<slug>/* answers 410 Gone
//   node scripts/imn/lab.mjs graduate <slug> <domain>      hit its target and the domain is bought: creates brand <slug> from the lab
//                                                          (preview, noindex) on <domain>; the lab keeps running at /labs/<slug> meanwhile
//   node scripts/imn/lab.mjs graduate <slug> --live        the new site is live on its domain: launches the brand, adds it to the site
//                                                          check, and /labs/<slug>/* starts 301-ing to the same path on the new domain
//
// Never deletes anything: a closed lab's content file stays in data/imn/ (history), it just isn't built.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const REG = join(ROOT, 'data/imn/labs.json');
const today = new Date(Date.now() + 11 * 3600e3).toISOString().slice(0, 10); // Melbourne (AEDT)
const die = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
// Keep each file's own indent (hq/sitecheck.json uses 1 space) so diffs stay small.
const writeJson = (p, o) => {
  const ind = existsSync(p) ? (readFileSync(p, 'utf8').match(/^\{\r?\n( +)"/)?.[1].length ?? 2) : 2;
  writeFileSync(p, JSON.stringify(o, null, ind) + '\n');
};
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

const [cmd, slug, arg] = process.argv.slice(2);
const reg = readJson(REG);
const lab = slug ? reg.labs.find((l) => l.slug === slug) : null;
if (cmd !== 'status' && !lab) die(`No lab "${slug ?? ''}" in data/imn/labs.json. Labs: ${reg.labs.map((l) => l.slug).join(', ') || 'none'}`);

if (cmd === 'status' || !cmd) {
  if (!reg.labs.length) console.log('No labs yet.');
  for (const l of reg.labs) console.log(`${l.slug.padEnd(24)} ${l.status.padEnd(11)} launched ${l.launched || '—'}  target ${l.target?.number ?? '—'} ${l.target?.metric ?? ''}  ${l.domain || ''}`);
  console.log(`Live: ${reg.labs.filter((l) => ['live', 'graduating'].includes(l.status)).length} of max ${reg.maxLive}`);
} else if (cmd === 'close') {
  if (lab.status === 'closed') die(`${slug} is already closed`);
  if (lab.status === 'graduated') die(`${slug} has graduated to ${lab.domain}; closing would replace its 301s with 410s. Edit labs.json by hand if that's really wanted.`);
  lab.status = 'closed';
  lab.closedOn = today;
  writeJson(REG, reg);
  console.log(`✓ ${slug} closed. On the next deploy its pages are gone and /labs/${slug}/* answers 410 Gone (Google drops them fast).`);
  console.log('  Content kept in data/imn/lab-' + slug + '.json for the record. Commit and push.');
} else if (cmd === 'graduate' && arg === '--live') {
  if (lab.status !== 'graduating') die(`${slug} is ${lab.status}; run "graduate ${slug} <domain>" first`);
  const cfgPath = join(ROOT, 'brands', slug, 'brand.config.ts');
  if (!existsSync(cfgPath)) die(`brands/${slug}/ is missing`);
  writeFileSync(cfgPath, readFileSync(cfgPath, 'utf8').replace(/launched:\s*false/, 'launched: true'));
  lab.status = 'graduated';
  lab.graduatedOn = today;
  writeJson(REG, reg);
  const sc = readJson(join(ROOT, 'hq/sitecheck.json'));
  if (!sc.sites.some((s) => s.id === slug)) {
    sc.sites.push({ id: slug, name: lab.domain, url: `https://${lab.domain}`, brand: slug, launched: today, owner: 'imn', stats: `data/${slug}/stats.json`, money: lab.moneyKeys ?? [], icon: '🧪', label: lab.name });
    writeJson(join(ROOT, 'hq/sitecheck.json'), sc);
  }
  console.log(`✓ ${slug} launched on https://${lab.domain}; /labs/${slug}/* now 301s there on the next IMN deploy.`);
  console.log('  Added to the site check (hq/sitecheck.json). Next: GA4 + Search Console for the new domain (see docs/LABS.md). Commit and push.');
} else if (cmd === 'graduate') {
  const domain = String(arg ?? '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) die('Give the bare domain, e.g. node scripts/imn/lab.mjs graduate fair-price fairprice.com.au');
  if (lab.status !== 'live') die(`${slug} is ${lab.status}; only a live lab can graduate`);
  if (existsSync(join(ROOT, 'brands', slug))) die(`brands/${slug}/ already exists`);
  const content = join(ROOT, 'data/imn', `lab-${slug}.json`);
  if (!existsSync(content)) die(`data/imn/lab-${slug}.json is missing`);

  // 1. Data: the lab's pages + trust pages affiliate networks look for.
  mkdirSync(join(ROOT, 'data', slug), { recursive: true });
  writeFileSync(join(ROOT, 'data', slug, 'lab.json'), readFileSync(content, 'utf8'));
  const sec = (h, p) => ({ h, p });
  writeJson(join(ROOT, 'data', slug, 'pages.json'), {
    pages: [
      { path: 'about', seoTitle: `About ${lab.name}`, description: `${lab.name} is run by Independent Media Network Pty Ltd, a Melbourne company. How it started and how it works.`, title: `About ${lab.name}`, lede: lab.summary,
        sections: [sec('Who runs it', [`${lab.name} is run by Independent Media Network Pty Ltd (ABN 89 640 199 935), a small Melbourne company that builds and runs its own websites. It started in IMN Labs, where we test new ideas before they get their own site, and moved here once people found it useful.`]),
          sec('How we work', ['Every page is built from real, dated data and checked by the same quality checks we use on all our sites. When something changes, we update the page and the date.'])] },
      { path: 'contact', seoTitle: `Contact ${lab.name}`, description: `How to reach the team behind ${lab.name}: email, and what to include so we can help quickly.`, title: 'Contact us', lede: 'Spotted something out of date, or have a question? Email us and a person will reply.',
        sections: [sec('Email', ['hello@imnetwork.com.au (Independent Media Network, Melbourne). Tell us the page and what looks wrong; a link or a screenshot helps.'])] },
      { path: 'privacy-policy', seoTitle: `Privacy Policy | ${lab.name}`, description: `What ${lab.name} collects, why, and who sees it. Short and in plain English.`, title: 'Privacy policy', lede: `${lab.name} is run by Independent Media Network Pty Ltd (ABN 89 640 199 935, Melbourne, Australia).`,
        sections: [sec('What we collect', ['We use Google Analytics to count visits and which pages are read. These are counts, not information about who you are. If you email us, we keep your email only to reply.']),
          sec('Your choices', ["To see, correct or delete what we hold about you, email hello@imnetwork.com.au. If you're not happy with how we've handled your information, you can contact the Office of the Australian Information Commissioner (oaic.gov.au)."])] },
      { path: 'affiliate-disclosure', seoTitle: `How We Make Money | ${lab.name}`, description: `How ${lab.name} earns from affiliate links, and why that never changes what we say.`, title: 'How we make money', lede: 'Some links on this site are affiliate links. You pay the same price either way.',
        sections: [sec('Affiliate links', ['If you click through and buy, the shop may pay us a small commission. Affiliate links are marked as sponsored links, and buttons that lead to a shop say where they go.']),
          sec('What commissions never do', ["A shop can't pay to be listed, moved up or described differently. Comparisons are built from published prices and other facts we can check, each with the date we checked it."])] },
    ],
  });

  // 2. Brand folder.
  const imn = readFileSync(join(ROOT, 'brands/imn/brand.config.ts'), 'utf8');
  const colors = imn.match(/colors:\s*\{[^}]+\}/)?.[0] ?? "colors: { brand: '#121A2B', accent: '#F2A93B' }";
  const fonts = imn.match(/fonts:\s*\{[^}]+\}/)?.[0] ?? "fonts: { display: 'Bricolage Grotesque', body: 'Figtree' }";
  const nav = (readJson(content).nav ?? []).map((n) => `    { label: ${JSON.stringify(n.label)}, href: ${JSON.stringify('/' + n.path.replace(/^\/+/, ''))} },`).join('\n');
  const desc = JSON.stringify(lab.summary.slice(0, 165));
  mkdirSync(join(ROOT, 'brands', slug, 'public'), { recursive: true });
  writeFileSync(join(ROOT, 'brands', slug, 'brand.config.ts'), `import { defineBrand } from '../../src/lib/brand-schema';

// Graduated from IMN Labs (imnetwork.com.au/labs/${slug}) on ${today}: scripts/imn/lab.mjs. Preview until "graduate ${slug} --live".
export default defineBrand({
  slug: '${slug}',
  name: ${JSON.stringify(lab.name)},
  domain: '${domain}',
  launched: false,

  theme: 'network',
  ${colors},
  ${fonts},
  wordmark: ${JSON.stringify(lab.name)},
  // analytics: { ga4Id: 'G-…' }, // add once Simon creates the GA4 property

  nav: [
${nav}
  ],
  footer: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'How we make money', href: '/affiliate-disclosure' },
    { label: 'Privacy', href: '/privacy-policy' },
  ],
  footerNote: 'Some links are affiliate links: we may earn a commission at no cost to you.',

  seo: {
    titleSuffix: ${JSON.stringify(' | ' + lab.name)},
    defaultDescription: ${desc},
  },

  data: { source: 'snapshot' },
  payments: { enabled: false },
});
`);
  writeFileSync(join(ROOT, 'brands', slug, 'site.ts'), `/**
 * ${lab.name} (${domain}): graduated from IMN Labs (imnetwork.com.au/labs/${slug}) on ${today}.
 * Same pages and template as the lab (src/lib/labs.ts), now at the root of its own domain.
 * Content: data/${slug}/lab.json (the lab's pages) + data/${slug}/pages.json (about, contact, privacy, disclosure).
 */
import { getSingleton } from '../../src/lib/data';
import { labRoutes, type Lab, type LabContent } from '../../src/lib/labs';
import type { Route } from '../../src/lib/routes';

const SITE = 'https://${domain}';
const LAB: Lab = ${JSON.stringify({ ...lab, status: 'graduated', domain }, null, 2).replace(/\n/g, '\n')};

export function routes(): Route[] {
  const opts = { base: '', site: SITE, inLab: false };
  return [...labRoutes(LAB, getSingleton<LabContent>('lab'), opts), ...labRoutes(LAB, getSingleton<LabContent>('pages'), opts)];
}
`);
  writeFileSync(join(ROOT, 'brands', slug, 'wrangler.jsonc'), `{
  // Cloudflare Worker for ${lab.name} (${domain}), graduated from IMN Labs.
  // Build:  BRAND=${slug} npm run build
  // Deploy: npx wrangler deploy --config brands/${slug}/wrangler.jsonc
  "$schema": "../../node_modules/wrangler/config-schema.json",
  "name": "${slug}",
  "compatibility_date": "2026-06-01",
  "main": "../../src/worker/site.ts",
  "assets": {
    "directory": "../../dist",
    "binding": "ASSETS",
    "run_worker_first": ["/api/*"],
    "html_handling": "drop-trailing-slash",
    "not_found_handling": "404-page"
  },
  "vars": { "BRAND": "${slug}" },
  "d1_databases": [
    { "binding": "DB", "database_name": "site-factory-forms", "database_id": "5441b63f-1ab8-484f-a6c7-0a0af4302774" }
  ],
  // The bare domain is canonical; redirect www to it with a Cloudflare Redirect Rule.
  "routes": [
    { "pattern": "${domain}", "custom_domain": true },
    { "pattern": "www.${domain}", "custom_domain": true }
  ]
}
`);

  // 3. Registries: brands/index.ts, brands/sites.ts, CI plan.
  const ident = camel(slug);
  const patch = (file, edits) => {
    let s = readFileSync(join(ROOT, file), 'utf8');
    for (const [find, add] of edits) {
      if (!s.includes(find)) die(`${file}: couldn't find "${find.trim()}"; add ${slug} by hand`);
      s = s.replace(find, add);
    }
    writeFileSync(join(ROOT, file), s);
  };
  patch('brands/index.ts', [
    ["import imn from './imn/brand.config';\n", `import imn from './imn/brand.config';\nimport ${ident} from './${slug}/brand.config';\n`],
    ['  imn,\n} as const;', `  imn,\n  '${slug}': ${ident},\n} as const;`],
  ]);
  patch('brands/sites.ts', [
    ["import { routes as imn } from './imn/site';\n", `import { routes as imn } from './imn/site';\nimport { routes as ${ident} } from './${slug}/site';\n`],
    ['  imn,\n};', `  imn,\n  '${slug}': ${ident},\n};`],
  ]);
  patch('scripts/ci-plan.mjs', [["'backyard-wild', 'imn'];", `'backyard-wild', 'imn', '${slug}'];`]]);

  lab.status = 'graduating';
  lab.domain = domain;
  writeJson(REG, reg);
  console.log(`✓ Brand ${slug} created from the lab (preview, noindex) for https://${domain}. The lab keeps running at /labs/${slug} until it's live.`);
  console.log('  Next (docs/LABS.md): commit + push, wait for "Check build"; Simon connects the Worker in Cloudflare and points the domain;');
  console.log(`  then run: node scripts/imn/lab.mjs graduate ${slug} --live`);
} else {
  die('Usage: lab.mjs status | close <slug> | graduate <slug> <domain> | graduate <slug> --live');
}
