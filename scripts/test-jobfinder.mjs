// Browser test for the CHC job finder (BASE = site root). /api/jobs is mocked, so this tests the page, not Careerjet.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const BASE = (process.argv[2] || 'https://communityhelp.com.au').replace(/\/$/, '');
await mkdir('shots', { recursive: true });
const fails = [];
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fails.push(m); };
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
let mode = 'setup'; let lastQuery = '';
const job = (title, flags, extra = {}) => ({ title, company: 'Acme', where: 'Geelong VIC', date: 'Tue, 27 Oct 2026', salary: '$30 per hour', snippet: 'Great team.', url: 'https://jobviewtrack.com/x', flags, ...extra });
await page.route('**/api/jobs**', (route) => {
  lastQuery = route.request().url();
  if (mode === 'setup') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, reason: 'setup', message: 'Live job search is being set up.' }) });
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, hits: 57, pages: 3, jobs: [
    job('Admin assistant <img src=x onerror=alert(1)>', ['parttime', 'remote']),
    job('Retail team member', ['casual', 'noexp']),
    job('Delivery driver', ['licence', 'flexible']),
    job('Receptionist', ['parttime', 'flexible', 'noexp']),
  ] }) });
});
await page.goto(`${BASE}/job-finder`, { waitUntil: 'networkidle' });
ok(await page.locator('h1').innerText().then((t) => /part-time/i.test(t)), 'page loads');

await page.fill('[name=q]', 'admin'); await page.fill('[name=where]', 'Geelong');
await page.click('[data-jf-form] button[type=submit]');
await page.locator('[data-jf-results]').waitFor({ state: 'visible' });
await page.waitForTimeout(300);
ok(/coming soon/i.test(await page.locator('[data-jf-head]').innerText()), 'before setup: says live ads are coming soon');
const boards = await page.locator('[data-jf-boards] a').evaluateAll((a) => a.map((x) => x.href));
ok(boards.some((h) => h.includes('seek.com.au') && h.includes('part%20time') && h.includes('Geelong')), 'Seek link carries the search');
ok(/hours=part/.test(lastQuery) && /where=Geelong/.test(lastQuery), 'search sends hours and place');

mode = 'live';
await page.click('[data-jf-form] button[type=submit]');
await page.waitForTimeout(500);
ok((await page.locator('.jf-job').count()) === 4, '4 jobs shown');
ok(!(await page.locator('.jf-job img').count()) && (await page.locator('.jf-job h3').first().innerText()).includes('<img'), 'ad text is shown as text (no HTML injection)');
ok(/4 of 4/.test(await page.locator('[data-jf-head]').innerText()) && /57/.test(await page.locator('[data-jf-head]').innerText()), 'head counts matches and total');
await page.check('input[name=f][value=noexp]');
await page.waitForTimeout(150);
ok((await page.locator('.jf-job').count()) === 2, '"no experience" filter keeps 2');
await page.check('input[name=f][value=nolicence]');
await page.check('input[name=f][value=flexible]');
await page.waitForTimeout(150);
const t = await page.locator('.jf-job h3').allInnerTexts();
ok(t.length === 1 && t[0] === 'Receptionist', `combined filters → Receptionist (${t.join(', ')})`);
await page.uncheck('input[name=f][value=noexp]');
await page.waitForTimeout(150);
ok(!(await page.locator('.jf-job h3').allInnerTexts()).includes('Delivery driver'), '"no licence" filter hides the driver job');
ok(await page.locator('.jf-job a[rel*="sponsored"]').count() > 0, 'job links are marked sponsored');
ok(await page.locator('[data-jf-more]').isVisible(), 'load more shown when more pages exist');
await page.locator('[data-jf-more]').click(); await page.waitForTimeout(400);
ok(/page=2/.test(lastQuery), 'load more asks for page 2');
const tl = await page.locator('.jf-job .jf-tailor').first().getAttribute('href');
ok(tl.startsWith('/cover-letter-builder?') && tl.includes('employer=Acme') && tl.includes('job=https'), `each job has a "Tailor my application" link (${tl})`);
ok(await page.locator('[data-jf-any] [name=role]').isVisible(), '"Found a job somewhere else?" form is shown');
await page.screenshot({ path: 'shots/jobfinder.png', fullPage: true });
await page.goto(`${BASE}/job-finder`, { waitUntil: 'networkidle' });
await page.fill('[data-jf-any] [name=role]', 'Receptionist'); await page.fill('[data-jf-any] [name=employer]', 'Westside Medical');
await page.selectOption('[data-jf-any] [name=source]', 'Indeed');
await Promise.all([page.waitForURL(/cover-letter-builder/), page.click('[data-jf-any] button[type=submit]')]);
ok((await page.locator('[data-f="role"]').inputValue()) === 'Receptionist' && (await page.locator('[data-f="source"]').inputValue()) === 'Indeed', 'any-board form opens the cover letter with the job filled in');
const home = await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
ok((await page.locator('a[href="/job-finder"]').count()) > 0, 'home links to the job finder');
ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASSED');
process.exit(fails.length ? 1 : 0);
