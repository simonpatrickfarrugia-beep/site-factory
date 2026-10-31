// Browser test for /original-films and the home banner (trailers). /api/subscribe and /api/submit/pitch are mocked,
// so it runs against a local build (uitest workflow, brand=trailers) and never writes to D1.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('shots', { recursive: true });
const BASE = process.argv[2] || 'https://www.movietrailer.channel';
const fails = [];
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fails.push(m); };
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const posts = [];
await ctx.route('**/api/subscribe', (r) => { posts.push(['sub', r.request().postData() ?? '']); r.fulfill({ json: { ok: true, message: "You're on the list." } }); });
await ctx.route('**/api/submit/pitch', (r) => { posts.push(['pitch', r.request().postData() ?? '']); r.fulfill({ json: { ok: true, message: 'Sent.' } }); });
await ctx.addInitScript(() => { window.__events = []; window.gtag = (_t, name) => window.__events.push(name); });
const events = (page) => page.evaluate(() => [...(window.__events || []), ...[...(window.dataLayer || [])].filter((a) => a && a[0] === 'event').map((a) => a[1])]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
const banner = page.locator('.fund-banner');
ok(await banner.isVisible(), 'home banner shows');
ok(((await banner.boundingBox())?.y ?? 999) < 200, 'banner is above the fold');
ok((await banner.getAttribute('href')) === '/original-films', 'banner links to /original-films');
ok(await page.locator('nav a[href="/original-films"]').count() > 0, 'nav links to the page');
ok(!/vote/i.test(await banner.textContent()), 'no voting language');
await page.screenshot({ path: 'shots/films-home.png' });

await page.goto(`${BASE}/original-films`, { waitUntil: 'networkidle' });
ok(/helps make new films/.test(await page.locator('h1').textContent()), 'hero heading');
ok(/creative control/i.test(await page.content()), 'creative control is stated');
const html = (await page.content()).replace(/<footer[\s\S]*<\/footer>/, '');
ok(!/amazon\.|tag=movietrailerc|justwatch/i.test(html), 'no affiliate links on the page');
ok(!/\d+\s?%/.test(await page.locator('main').innerText()), 'no percentage published');
await page.screenshot({ path: 'shots/films-page.png', fullPage: true });

await page.fill('[data-films-updates] input[name=email]', 'ci-test@example.com');
await page.click('[data-films-updates] button[type=submit]');
await page.waitForFunction(() => /on the list/.test(document.querySelector('[data-films-updates] .fund-form__status')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
ok(/on the list/.test(await page.locator('[data-films-updates] .fund-form__status').textContent()), 'updates signup works');
ok(/films/.test(posts.find((p) => p[0] === 'sub')?.[1] ?? ''), 'signup is tagged "films"');

await page.fill('input[name=name]', 'CI Test');
await page.fill('[data-films-pitch] input[name=email]', 'ci-test@example.com');
await page.fill('input[name=project_title]', 'Test');
await page.fill('textarea[name=logline]', 'A test logline.');
await page.fill('input[name=reel_link]', 'https://example.com/reel');
await page.click('[data-films-pitch] button[type=submit]');
await page.waitForFunction(() => /Pitch sent/.test(document.querySelector('[data-films-pitch] .fund-form__status')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
ok(/Pitch sent/.test(await page.locator('[data-films-pitch] .fund-form__status').textContent()), 'pitch submits');
const ev = await events(page);
ok(ev.includes('films_signup') && ev.includes('pitch_submitted'), `GA4 films_signup + pitch_submitted (${ev.join(',')})`);

await page.goto(`${BASE}/privacy-policy`, { waitUntil: 'domcontentloaded' });
ok(/Original films updates/.test(await page.content()), 'privacy policy covers the signup');
ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
console.log(fails.length ? `FAILED: ${fails.length}` : 'ALL PASSED');
process.exit(fails.length ? 1 : 0);
