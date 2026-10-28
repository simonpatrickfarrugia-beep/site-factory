// Live browser test for the Trade Admin admin-help form (BASE = site root). Sends one test row marked "TEST"; delete it after.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const BASE = (process.argv[2] || 'https://tradeadmin.com.au').replace(/\/$/, '');
await mkdir('shots', { recursive: true });
const fails = [];
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fails.push(m); };
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/admin-help`, { waitUntil: 'networkidle' });
ok(/handle your admin/i.test(await page.locator('h1').innerText()), 'page loads');
await page.click('button[type=submit]');
ok(/tick at least one|fill/i.test(await page.locator('[data-status]').innerText()) || (await page.evaluate(() => !document.querySelector('form[data-help]').checkValidity())), 'empty form is not sent');
await page.check('input[name=help_quotes]'); await page.check('input[name=help_chasing]');
await page.fill('[name=trade]', 'TEST electrician');
await page.selectOption('[name=team]', '2 to 5');
await page.selectOption('[name=hours]', '3 to 6');
await page.fill('[name=name]', 'TEST Claude');
await page.fill('[name=email]', 'test+claude@tradeadmin.com.au');
await page.fill('[name=message]', 'TEST submission from the browser test. Delete me.');
const [resp] = await Promise.all([page.waitForResponse((r) => r.url().includes('/api/submit/admin-help')), page.click('button[type=submit]')]);
ok(resp.status() === 200, `form posts to the Worker (HTTP ${resp.status()})`);
await page.waitForTimeout(500);
ok(/Thanks/.test(await page.locator('[data-status]').innerText()), 'shows the thank-you message');
await page.screenshot({ path: 'shots/ta-help.png', fullPage: true });
for (const path of ['/', '/invoice-builder']) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  ok((await page.locator('a[href="/admin-help"]').count()) > 0, `${path} links to admin help`);
}
const st = await (await page.request.get(`${BASE}/api/submit/status?since=2026-10-28T00:00:00Z`)).json();
ok(st.ok && st.count >= 1, `status endpoint counts it (${st.count})`);
ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASSED');
process.exit(fails.length ? 1 : 0);
