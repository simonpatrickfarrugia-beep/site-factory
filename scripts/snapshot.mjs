// Save self-contained copies of built pages (stylesheets inlined) so Claude can show Simon a clickable preview
// when Cloudflare's branch preview isn't available. Run through the uitest workflow: test=snapshot.mjs, brand=<slug>.
// Pages: SNAP_PATHS env (space separated), default the fund page and home. Output: shots/<name>.html (uitest-shots branch).
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('shots', { recursive: true });
const BASE = process.argv[2] || 'http://localhost:4321';
const paths = (process.env.SNAP_PATHS || '/original-films /').split(/\s+/).filter(Boolean);
for (const p of paths) {
  let html = await (await fetch(BASE + p)).text();
  for (const m of [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*href="(\/[^"]+)"[^>]*>/g)]) {
    const css = await (await fetch(BASE + m[1])).text();
    html = html.replace(m[0], `<style>${css}</style>`);
  }
  const name = p === '/' ? 'home' : p.replace(/^\//, '').replace(/\//g, '-');
  await writeFile(`shots/${name}.html`, html);
  console.log(`saved ${name}.html (${html.length} bytes)`);
}
