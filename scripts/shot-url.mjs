// Phone + desktop screenshots of live pages (uitest workflow: test=shot-url.mjs, base=https://site, SHOT_PATHS env or default below).
// Used to eyeball pages Claude can't open from chat, e.g. IMN previews (?notrack=1 keeps view counts clean).
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
await mkdir('shots', { recursive: true });
const BASE = process.argv[2] || 'https://imnetwork.com.au';
const paths = (process.env.SHOT_PATHS || '/preview/sample-plumbing-co-x7k2?notrack=1').split(/\s+/).filter(Boolean);
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
for (const p of paths) {
  const name = p.replace(/[?#].*$/, '').replace(/^\//, '').replace(/\//g, '-') || 'home';
  for (const [tag, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: tag === 'phone' ? 2 : 1 });
    const r = await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `shots/${name}-${tag}.png`, fullPage: true });
    console.log(`${tag} ${p}: HTTP ${r?.status()}`);
    await page.close();
  }
}
await browser.close();
