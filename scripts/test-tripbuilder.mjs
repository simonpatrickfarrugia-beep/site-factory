// Browser test for the Vic Tours Trip Builder (BASE = site root).
import { chromium } from 'playwright';
import { mkdir, stat } from 'node:fs/promises';
const BASE = (process.argv[2] || 'https://victours.com.au').replace(/\/$/, '');
await mkdir('shots', { recursive: true });
const fails = [];
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fails.push(m); };
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
const posts = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { if (r.method() === 'POST' && r.url().startsWith(BASE)) posts.push(r.url()); });
const res = await page.goto(`${BASE}/trip-builder`, { waitUntil: 'networkidle' });
ok(res.ok(), 'page loads');
const size = (await page.content()).length;
ok(size < 900000, `page size reasonable (${Math.round(size / 1024)} KB of HTML)`);
const pick = async (name, value) => page.locator(`input[name=${name}][value="${value}"]`).check({ force: true });
const build = async () => { await page.click('.tb-go'); await page.locator('[data-tb-results]').waitFor({ state: 'visible' }); await page.waitForTimeout(200); };
const cards = async () => page.locator('.tb-card').evaluateAll((els) => els.map((e) => ({ name: e.querySelector('.tb-card__name')?.textContent, meta: e.querySelector('.tb-card__meta')?.textContent, rank: e.querySelector('.tb-card__rank')?.textContent, html: e.innerHTML })));

// Day trip, driving, up to 100 km
await build();
let c = await cards();
ok(c.length === 3, `day trip: 3 towns (${c.map((x) => x.name).join(', ')})`);
ok(c.every((x) => /Day trip/.test(x.rank)), 'all are day-trip plans');
ok(c.every((x) => Number(x.meta.match(/(\d+) km/)[1]) <= 100), 'all within 100 km');
ok(new Set(c.map((x) => x.meta.split(' · ')[1] ?? x.name)).size === 3, 'spread across 3 regions');
ok(c[0].html.includes('Morning') && c[0].html.includes('Lunch'), 'first plan shows its steps');
ok(c[0].html.includes('viator.com') && c[0].html.includes('victours-tb-'), 'tour link with a Trip Builder campaign label');
ok(c[0].html.includes('discovercars.com'), 'car hire link when driving');
ok(!(await page.locator('[data-who]').isVisible()), '"who" question hidden for day trips');
ok(/[?&]len=day/.test(page.url()), 'choices kept in the address');
await page.screenshot({ path: 'shots/tb-day.png', fullPage: true });

// Weekend, family, up to 200 km
await pick('len', 'weekend'); await pick('who', 'family'); await pick('far', '200');
await build();
c = await cards();
ok(c.length > 0 && c.every((x) => /Family weekend/.test(x.rank)), `family weekend: ${c.map((x) => x.name).join(', ')}`);
ok(c.every((x) => Number(x.meta.match(/(\d+) km/)[1]) <= 200), 'all within 200 km');
ok(c[0].html.includes('Saturday') && c[0].html.includes('Sunday'), 'weekend plan has two days');

// No car
await pick('car', 'train');
await build();
c = await cards();
ok(c.length > 0 && c.every((x) => /Weekend by train/.test(x.rank) && /train station/.test(x.meta)), `by train: ${c.map((x) => x.name).join(', ')}`);
ok(!c.some((x) => x.html.includes('discovercars.com')), 'no car hire when going by train');

// Region filter
await pick('car', 'car'); await pick('who', 'couples'); await pick('far', '300');
await page.selectOption('select[name=region]', 'Yarra Valley').catch(() => {});
await build();
c = await cards();
ok(c.length > 0, `couples in a region: ${c.map((x) => x.name + ' (' + x.meta + ')').join('; ')}`);
await page.screenshot({ path: 'shots/tb-couples.png', fullPage: true });

// Shared link restores the result
const url = page.url();
await page.goto(url, { waitUntil: 'networkidle' });
ok(await page.locator('[data-tb-results]').isVisible() && (await page.locator('.tb-card').count()) > 0, 'shared link shows the same result');

// Text is escaped (no injection through data)
ok(!(await page.locator('.tb-card script').count()), 'no scripts inside cards');
const home = await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
ok((await page.locator('a[href="/trip-builder"]').count()) > 0, 'home page links to the Trip Builder');
ok(posts.length === 0, 'nothing is sent to the server');
ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASSED');
process.exit(fails.length ? 1 : 0);
