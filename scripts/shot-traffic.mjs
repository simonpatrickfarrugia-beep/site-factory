// Screenshots of the private morning traffic dashboard (BASE = trailer site root), phone and desktop. Run via the uitest workflow.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const BASE = (process.argv[2] || 'https://www.movietrailer.channel').replace(/\/$/, '');
await mkdir('shots', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const errors = [];
for (const [name, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]]) {
  const page = await (await browser.newContext({ viewport })).newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const r = await page.goto(`${BASE}/hq/traffic`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log(`${r.ok() ? '✅' : '❌'} ${name}: HTTP ${r.status()}, ${(await page.locator('main').innerText()).split(/\s+/).length} words`);
  await page.screenshot({ path: `shots/traffic-${name}.png`, fullPage: true });
}
console.log(errors.length ? `❌ page errors: ${errors.join(' | ')}` : '✅ no page errors');
await browser.close();
