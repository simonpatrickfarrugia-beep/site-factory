// Screenshots IMN HQ (/hq on the trailer site) at phone and desktop width and checks the funnel sections render.
// Run via the uitest workflow with brand=trailers (builds the branch locally). Shots go to the uitest-shots branch.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('shots', { recursive: true });
const BASE = process.argv[2] || 'http://localhost:4321';
const fails = [];
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fails.push(m); };
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
for (const [name, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]]) {
  const page = await (await browser.newContext({ viewport, deviceScaleFactor: name === 'phone' ? 2 : 1 })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/hq`, { waitUntil: 'networkidle' });
  for (const id of ['funnel', 'bottlenecks', 'email', 'pipeline']) ok(await page.locator(`#${id}`).isVisible(), `${name}: #${id} shows`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 1, `${name}: no sideways scroll (${overflow}px)`);
  ok(errors.length === 0, `${name}: no page errors ${errors.join(' | ')}`);
  for (const id of ['funnel', 'bottlenecks', 'email', 'pipeline']) await page.locator(`#${id}`).screenshot({ path: `shots/hq-${name}-${id}.png` }).catch(() => {});
  await page.screenshot({ path: `shots/hq-${name}-full.png`, fullPage: true });
}
await browser.close();
console.log(fails.length ? `FAIL ${fails.length}` : 'ALL OK');
process.exit(fails.length ? 1 : 0);
