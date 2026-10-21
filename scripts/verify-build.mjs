// Checks a finished build: every URL in brands/<slug>/webflow-urls.txt exists,
// and every page has a title, description and canonical. Exits non-zero on failure.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const brand = process.env.BRAND;
if (!brand) { console.error('BRAND is not set'); process.exit(1); }
const dist = 'dist';
const problems = [];
const gh = !!process.env.GITHUB_ACTIONS;
const notice = (msg) => console.log(gh ? `::notice title=Verify (${brand})::${msg}` : msg);

// A launched brand's pages are indexable except private ones; before launch every page is noindex.
const brandLaunched = () => /launched:\s*true/.test(readFileSync(join('brands', brand, 'brand.config.ts'), 'utf8'));

const fileFor = (url) => (url === '/' ? join(dist, 'index.html') : join(dist, `${url.slice(1)}.html`));

const listPath = join('brands', brand, 'webflow-urls.txt');
if (existsSync(listPath)) {
  const urls = readFileSync(listPath, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  // An old URL is covered by its own page or by a 301 in _redirects (checked below).
  const redirected = new Set(existsSync(join(dist, '_redirects')) ? readFileSync(join(dist, '_redirects'), 'utf8').split('\n').map((l) => l.trim().split(/\s+/)[0]) : []);
  for (const url of urls) if (!existsSync(fileFor(url)) && !redirected.has(url)) problems.push(`Missing page for ${url}`);
  notice(`Checked ${urls.length} required URLs`);
}

// Permanent redirects (dist/_redirects): each target must be a real page, so no old URL ends in a 404.
const redirectsPath = join(dist, '_redirects');
if (existsSync(redirectsPath)) {
  const rules = readFileSync(redirectsPath, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  for (const rule of rules) {
    const [from, to, code] = rule.split(/\s+/);
    if (!to || !['301', '308'].includes(code ?? '')) problems.push(`_redirects: "${rule}" must be "from to 301"`);
    else if (to.startsWith('/') && !existsSync(fileFor(to))) problems.push(`_redirects: ${from} points to missing page ${to}`);
    if (from && existsSync(fileFor(from))) problems.push(`_redirects: ${from} still has its own page (the redirect would never run)`);
  }
  notice(`Checked ${rules.length} redirect(s)`);
}

// Affiliate-ready: networks review these pages before approving a site, so every launched brand needs them.
if (brandLaunched()) {
  for (const need of ['/about', '/contact', '/privacy-policy']) if (!existsSync(fileFor(need))) problems.push(`Affiliate-ready: missing ${need} page`);
  const cfg = readFileSync(join('brands', brand, 'brand.config.ts'), 'utf8');
  // A disclosure is only needed once the site carries paid links (rel="sponsored").
  const listHtml = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? listHtml(p) : p.endsWith('.html') ? [p] : []; });
  const hasSponsored = listHtml(dist).some((f) => /rel="[^"]*sponsored/.test(readFileSync(f, 'utf8')));
  if (hasSponsored && !existsSync(fileFor('/affiliate-disclosure')) && !/footerNote:[\s\S]{0,40}(Amazon Associate|commission|affiliate)/i.test(cfg)) problems.push('Affiliate-ready: no affiliate disclosure (a /affiliate-disclosure page or a footer note)');
  notice('Affiliate-ready pages checked');
}

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
});
const pages = walk(dist);
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  if (!/<title>[^<]+<\/title>/.test(html)) problems.push(`${file}: no <title>`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) problems.push(`${file}: no meta description`);
  if (!file.endsWith('404.html') && !/<link rel="canonical"/.test(html)) problems.push(`${file}: no canonical`);
  if (/>undefined<|>null<|="undefined"/.test(html)) problems.push(`${file}: contains "undefined" or "null"`);
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(json); } catch { problems.push(`${file}: invalid JSON-LD`); }
  }
}

// Affiliate links: every Amazon link carries the one tracking tag and is marked sponsored,
// pages with Amazon links show the Associates disclosure, and every movie page offers Prime Video.
const amazonTags = new Map();
let amazonLinks = 0;
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const links = [...html.matchAll(/<a\b[^>]*href="(https?:\/\/(?:www\.)?amazon\.[^"]+)"[^>]*>/g)];
  for (const [tag, href] of links) {
    amazonLinks++;
    let t = null;
    try { t = new URL(href.replace(/&amp;/g, '&')).searchParams.get('tag'); } catch { /* bad URL */ }
    if (!t) problems.push(`${file}: Amazon link without a tracking tag: ${href}`);
    else amazonTags.set(t, (amazonTags.get(t) ?? 0) + 1);
    if (!/rel="[^"]*sponsored/.test(tag)) problems.push(`${file}: Amazon link not marked rel="sponsored"`);
  }
  if (links.length && !/As an Amazon Associate/.test(html)) problems.push(`${file}: Amazon links but no Associates disclosure`);
  if (/[\\/]movies[\\/]/.test(file) && !/amazon\.[^"]*[?&](?:amp;)?i=instant-video|data-cta="prime"/.test(html))
    problems.push(`${file}: no Prime Video link`);
}
if (amazonTags.size > 1) problems.push(`More than one Amazon tag in use: ${[...amazonTags.keys()].join(', ')}`);
if (amazonLinks) notice(`Checked ${amazonLinks} Amazon links (tag: ${[...amazonTags.keys()].join(', ')})`);

const sitemap = join(dist, 'sitemap.xml');
if (existsSync(sitemap)) {
  const count = (readFileSync(sitemap, 'utf8').match(/<loc>/g) ?? []).length;
  notice(`Sitemap lists ${count} URLs`);
  // 404 and private (noindex) pages are left out of the sitemap on purpose.
  const hidden = pages.filter((f) => f.endsWith('404.html') || (brandLaunched() && /<meta name="robots" content="noindex/.test(readFileSync(f, 'utf8')))).length;
  if (count < pages.length - hidden) problems.push(`Sitemap lists ${count} URLs but ${pages.length - hidden} public pages were built`);
} else {
  problems.push('No sitemap.xml');
}
notice(`Checked ${pages.length} HTML pages`);

if (problems.length) {
  const list = problems.slice(0, 50).map((p) => `  - ${p}`).join('\n');
  console.error(gh ? `::error title=Verify failed (${brand})::${problems.length} problem(s)%0A${list.replace(/\n/g, '%0A')}` : `\n${problems.length} problem(s):\n${list}`);
  process.exit(1);
}
notice('Build verified');
