// Serves dist/ and saves phone + desktop screenshots of key pages to screenshots/.
// Used by CI so changes can be reviewed visually. Usage: node scripts/screenshots.mjs [paths...]
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.xml': 'application/xml', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const candidates = path === '/' ? ['dist/index.html'] : [join('dist', path), join('dist', `${path}.html`)];
  const file = candidates.find((f) => existsSync(f) && !f.endsWith('/'));
  if (!file) { res.writeHead(404, { 'content-type': 'text/html' }); res.end(await readFile('dist/404.html')); return; }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(4321, r));

const paths = process.argv.slice(2);
await mkdir('screenshots', { recursive: true });
const browser = await chromium.launch();
const sizes = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };
for (const [label, viewport] of Object.entries(sizes)) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  for (const p of paths) {
    await page.goto(`http://localhost:4321${p}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    const name = (p === '/' ? 'home' : p.slice(1).replace(/\//g, '__')) + `.${label}.png`;
    await page.screenshot({ path: `screenshots/${name}`, fullPage: true, clip: undefined });
    console.log(`saved ${name}`);
  }
  await page.close();
}
await browser.close();
server.close();
