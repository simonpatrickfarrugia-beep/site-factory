// Browser test for the Community Help Co resume builder, against the live site (or BASE).
// Fills the example, edits fields, checks the preview, remember-on-device, print view, and that nothing is sent anywhere.
// Usage: node scripts/test-resume.mjs [https://communityhelp.com.au]   → screenshots in shots/, exits 1 on failure.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.argv[2] || 'https://communityhelp.com.au';
const URL_ = `${BASE}/resume-builder`;
await mkdir('shots', { recursive: true });
const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? '✅' : '❌'} ${msg}`); if (!cond) fails.push(msg); };

// GitHub's runners ship Google Chrome: use it (no slow, hang-prone browser download); fall back to Playwright's Chromium.
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR: ' + e.message); });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE: ' + m.text()); });
page.on('requestfailed', (r) => console.log('REQUEST FAILED: ' + r.url() + ' ' + (r.failure()?.errorText ?? '')));
page.on('dialog', (d) => d.accept());
const posts = [];
page.on('request', (r) => { // Analytics beacons (Google Analytics, Cloudflare's /cdn-cgi/rum page-timing beacon) carry visits and timings, not form text.
  if (r.method() !== 'GET' && !/google-analytics|googletagmanager|analytics|\/cdn-cgi\/rum/.test(r.url())) posts.push(r.url()); });

await page.goto(URL_, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-preview] .rb-r-name', { timeout: 15000 }).catch(() => console.log('preview never rendered'));
const pv = page.locator('[data-preview]');
ok((await pv.textContent()).includes('Your name'), 'blank preview shows placeholder name');

await page.getByRole('button', { name: 'Fill with an example' }).click();
ok((await pv.textContent()).includes('Jordan Lee'), 'example fills the preview');
ok((await pv.locator('.rb-r-item').count()) >= 4, 'example shows jobs, education and volunteering');

await page.locator('[data-f="name"]').fill('Sam <b>Test</b>');
ok((await pv.locator('.rb-r-name').textContent()) === 'Sam <b>Test</b>', 'typed text shows as text (no HTML injection)');

const jobsBefore = await page.locator('[data-list="work"] .rb-item').count();
await page.getByRole('button', { name: '+ Add a job' }).click();
await page.locator('[data-list="work"] .rb-item').last().locator('[data-k="role"]').fill('Night packer');
ok((await pv.textContent()).includes('Night packer'), 'added job appears in preview');
await page.locator('[data-list="work"] .rb-item').last().getByRole('button', { name: 'Remove' }).click();
ok((await page.locator('[data-list="work"] .rb-item').count()) === jobsBefore && !(await pv.textContent()).includes('Night packer'), 'removed job disappears');

await page.locator('summary', { hasText: '8. Referees' }).click();
await page.locator('input[name="refs"][value="list"]').check();
await page.locator('[data-f="referees"]').fill('Alex Smith, Manager, 0400 111 222');
ok((await pv.textContent()).includes('Alex Smith'), 'listed referees appear');

await page.locator('input[name="look"][value="classic"]').check();
ok((await pv.getAttribute('class')).includes('rb-classic'), 'classic look applies');

// Not remembered by default
await page.reload({ waitUntil: 'networkidle' });
ok((await pv.textContent()).includes('Your name'), 'without "remember", a reload starts blank');

// Remember on this device
await page.getByRole('button', { name: 'Fill with an example' }).click();
await page.locator('[data-remember]').check();
await page.locator('[data-f="headline"]').fill('Warehouse and logistics');
await page.reload({ waitUntil: 'networkidle' });
ok((await pv.textContent()).includes('Warehouse and logistics') && (await page.locator('[data-remember]').isChecked()), '"remember" restores after reload');
await page.screenshot({ path: 'shots/phone-form.png', fullPage: false });
await pv.screenshot({ path: 'shots/phone-preview.png' });

// Print view: only the resume
await page.emulateMedia({ media: 'print' });
ok(!(await page.locator('.site-header').isVisible()) && !(await page.locator('.rb-form').isVisible()) && (await pv.isVisible()), 'print view shows only the resume');
await page.pdf({ path: 'shots/resume.pdf', format: 'A4', printBackground: true });
await page.emulateMedia({ media: 'screen' });

// Clear removes saved copy
await page.getByRole('button', { name: 'Clear everything' }).click();
await page.locator('[data-remember]').uncheck();
await page.reload({ waitUntil: 'networkidle' });
ok((await pv.textContent()).includes('Your name'), 'clear + untick forgets everything');

ok(posts.length === 0, `nothing typed is sent anywhere (non-GET requests: ${posts.length ? posts.join(', ') : 'none'})`);
ok(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);

// Desktop look
const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto(URL_, { waitUntil: 'networkidle' });
await d.getByRole('button', { name: 'Fill with an example' }).click();
await d.screenshot({ path: 'shots/desktop.png' });
await d.goto(BASE + '/', { waitUntil: 'networkidle' });
await d.screenshot({ path: 'shots/home.png', fullPage: true });

await browser.close();
console.log(fails.length ? `FAILED: ${fails.length}` : 'ALL PASSED');
process.exit(fails.length ? 1 : 0);
