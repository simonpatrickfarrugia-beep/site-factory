// Screenshots of the Vic mini maps on a few town pages (BASE = site root), for a visual check.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const BASE = (process.argv[2] || 'https://victours.com.au').replace(/\/$/, '');
await mkdir('shots', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
let fails = 0;
for (const slug of ['torquay', 'healesville', 'bright', 'mildura', 'geelong', 'lakes-entrance', 'day-trips/torquay']) {
  await page.goto(`${BASE}/${slug}`, { waitUntil: 'networkidle' });
  const map = page.locator('figure.vicmap').first();
  if (!(await map.count())) { console.log(`❌ ${slug}: no map`); fails++; continue; }
  await map.screenshot({ path: `shots/map-${slug.replace('/', '-')}.png` });
  console.log(`✅ ${slug}: map shown`);
}
await browser.close();
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
