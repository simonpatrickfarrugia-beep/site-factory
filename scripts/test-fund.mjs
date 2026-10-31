// Browser test for /fund-the-next-film and the home banner (trailers). The /api/fund/* and /api/submit/pitch calls are
// mocked, so it works against a local build (uitest workflow, brand=trailers) and never writes to D1 or sends email.
// Usage: node scripts/test-fund.mjs http://localhost:4321
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('shots', { recursive: true });
const BASE = process.argv[2] || 'https://www.movietrailer.channel';
const fails = [];
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fails.push(m); };
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
let counts = { ok: true, total: 3, show: false, counts: null, leader: null };
const posts = [];
await ctx.route('**/api/fund/counts', (r) => r.fulfill({ json: counts }));
await ctx.route('**/api/fund/vote', (r) => { posts.push(['vote', r.request().postData() ?? '']); r.fulfill({ json: { ok: true, message: 'Nearly there! Check your inbox for a link to confirm your vote.' } }); });
await ctx.route('**/api/submit/pitch', (r) => { posts.push(['pitch', r.request().postData() ?? '']); r.fulfill({ json: { ok: true, message: 'Sent.' } }); });
await ctx.addInitScript(() => { window.__events = []; window.gtag = (_t, name) => window.__events.push(name); });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// Home banner
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
const banner = page.locator('.fund-banner');
ok(await banner.isVisible(), 'home banner shows');
ok(((await banner.boundingBox())?.y ?? 999) < 200, 'banner is above the fold');
ok(await page.locator('[data-fund-live]').isHidden(), 'banner hides the leader under 25 votes');
ok(await page.locator('nav a[href="/fund-the-next-film"]').count() > 0, 'nav links to the page');
await page.screenshot({ path: 'shots/fund-home.png' });

// Fund page
await page.goto(`${BASE}/fund-the-next-film`, { waitUntil: 'networkidle' });
ok(/Help us fund our first film/.test(await page.locator('h1').textContent()), 'hero heading');
ok(await page.locator('.fund-card').count() === 4, '4 concept cards');
ok(await page.locator('[data-bar]:visible').count() === 0, 'bars hidden under 25 votes');
ok(!(await page.locator('input[name=consent]').isChecked()), 'consent box starts unticked');
const html = await page.content();
ok(!/amazon\.|tag=movietrailerc|justwatch/i.test(html.replace(/<footer[\s\S]*<\/footer>/, '')), 'no affiliate links on the page');
await page.screenshot({ path: 'shots/fund-page.png', fullPage: true });

await page.locator('.fund-card', { hasText: 'Melbourne' }).click();
await page.fill('[data-fund-vote] input[name=email]', 'ci-test@example.com');
await page.check('input[name=consent]');
await page.click('[data-fund-vote] button[type=submit]');
await page.waitForFunction(() => /Nearly/.test(document.querySelector('[data-fund-vote] .fund-form__status')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
ok(/Nearly/.test(await page.locator('[data-fund-vote] .fund-form__status').textContent()), 'vote submits and asks to check inbox');
ok(/concept=melbourne-noir/.test(posts[0]?.[1]?.replace(/[\r\n-]+/g, '') ?? '') || /melbourne-noir/.test(posts[0]?.[1] ?? ''), 'chosen film is sent');
ok(/consent/.test(posts[0]?.[1] ?? ''), 'consent is sent when ticked');

await page.fill('input[name=name]', 'CI Test');
await page.fill('[data-fund-pitch] input[name=email]', 'ci-test@example.com');
await page.fill('input[name=project_title]', 'Test');
await page.fill('textarea[name=logline]', 'A test logline.');
await page.fill('input[name=reel_link]', 'https://example.com/reel');
await page.click('[data-fund-pitch] button[type=submit]');
await page.waitForFunction(() => /Pitch sent/.test(document.querySelector('[data-fund-pitch] .fund-form__status')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
ok(/Pitch sent/.test(await page.locator('[data-fund-pitch] .fund-form__status').textContent()), 'pitch submits');
const ev1 = await page.evaluate(() => [...(window.__events || []), ...[...(window.dataLayer || [])].filter((a) => a && a[0] === 'event').map((a) => a[1])]);
ok(ev1.includes('fund_vote_submitted') && ev1.includes('pitch_submitted'), `GA4 fund_vote_submitted + pitch_submitted (${ev1.join(',')})`);

// With 25+ votes: bars, total, leader
counts = { ok: true, total: 40, show: true, counts: { 'practical-horror': 22, 'melbourne-noir': 10, 'animated-fable': 6, 'shoestring-scifi': 2 }, leader: { id: 'practical-horror', name: '80s-style practical-effects horror short' } };
await page.goto(`${BASE}/fund-the-next-film?confirmed=1`, { waitUntil: 'networkidle' });
ok(await page.locator('[data-fund-confirmed]').isVisible(), 'confirmed message after the email link');
ok(await page.locator('[data-bar]:visible').count() === 4, 'bars show at 25+ votes');
ok(/55%/.test(await page.locator('[data-bar="practical-horror"]').textContent()), 'percentages are right (22 of 40 = 55%)');
const events = await page.evaluate(() => [...(window.__events || []), ...[...(window.dataLayer || [])].filter((a) => a && a[0] === 'event').map((a) => a[1])]);
ok(events.includes('fund_vote_confirmed'), `GA4 fund_vote_confirmed (${events.join(',')})`);
await page.screenshot({ path: 'shots/fund-page-votes.png', fullPage: true });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
ok(/Leading: 80s-style/.test(await page.locator('[data-fund-live]').textContent()), 'banner shows the leader at 25+ votes');
await page.screenshot({ path: 'shots/fund-home-votes.png' });

ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
console.log(fails.length ? `FAILED: ${fails.length}` : 'ALL PASSED');
process.exit(fails.length ? 1 : 0);
