// Browser test for the pay calculator (BASE = site root). Expected figures are hand-worked from the ATO 2026–27 rates
// (see scripts/test-pay-tax.ts). Run via the uitest workflow with brand=paycalc before launch.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const BASE = (process.argv[2] || 'https://mypaycalc.com.au').replace(/\/$/, '');
await mkdir('shots', { recursive: true });
const fails = [];
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fails.push(m); };
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
const posts = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { if (r.method() !== 'GET') posts.push(r.url()); });
const net = () => page.locator('[data-slip] [data-f="net"]').first().innerText();
const setPay = async (v) => { await page.fill('#pay', v); await page.waitForTimeout(120); };

ok((await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })).ok(), 'home loads');
ok((await net()) === '$67,280', `no-JS default: $85,000 → $67,280 a year (${await net()})`);

await setPay('50000');
ok((await net()) === '$43,730', `$50,000 → $43,730 (LITO $250, Medicare $1,000) (${await net()})`);
ok(/pay=50000/.test(page.url()), 'address updates so the result can be shared');

await page.locator('[data-slip] [data-per="fortnight"]').click();
ok((await net()) === '$1,682', `fortnight view: $1,682 (${await net()})`);
ok((await page.locator('[data-slip] [data-perlabel]').innerText()) === 'a fortnight', 'period label follows');
await page.locator('[data-slip] [data-per="year"]').click();

await setPay('20000');
ok((await net()) === '$20,000', `$20,000 → no tax or Medicare (${await net()})`);

await setPay('85000');
await page.check('[data-in="help"]');
await page.waitForTimeout(120);
ok((await net()) === '$64,959', `$85,000 with HECS-HELP → $64,959 (${await net()})`);
ok(await page.locator('[data-slip] [data-row="help"]').isVisible(), 'HECS-HELP line shows');
ok((await page.locator('[data-rate="marginal"]').innerText()) === '47%', `marginal 47% with HECS (${await page.locator('[data-rate="marginal"]').innerText()})`);
await page.uncheck('[data-in="help"]');

await page.selectOption('[data-in="period"]', 'hour');
await setPay('40');
ok(await page.locator('#hours').isVisible(), 'hours box appears for hourly pay');
ok((await page.locator('[data-slip] [data-f="gross"]').innerText()) === '$79,040', `$40/hr × 38 → $79,040 gross`);
await page.selectOption('[data-in="period"]', 'year');

await setPay('112000');
await page.locator('input[name="super"][value="included"]').check();
await page.waitForTimeout(120);
ok((await page.locator('[data-slip] [data-f="gross"]').innerText()) === '$100,000', `$112,000 package incl. super → $100,000 salary`);
await page.screenshot({ path: 'shots/calc-phone.png', fullPage: true });

await page.goto(`${BASE}/?pay=120000&per=year&help=1`, { waitUntil: 'networkidle' });
ok(await page.isChecked('[data-in="help"]') && (await page.inputValue('#pay')) === '120,000', 'opens from a shared address');
const t = await page.locator('[data-table] tr[data-per-row="year"] [data-t="net"]').innerText();
ok(t === (await net()), `table matches the payslip (${t})`);

await page.goto(`${BASE}/salary/85000-after-tax`, { waitUntil: 'networkidle' });
ok(/\$85,000 After Tax in Australia 2026–27: \$67,280 a Year/.test(await page.title()), 'salary page title');
await page.locator('[data-slip] [data-per="week"]').click();
ok((await net()) === '$1,294', `salary page period switch: $1,294 a week (${await net()})`);
const w = await page.evaluate(() => {
  const p = [...document.querySelectorAll('main p')].find((x) => /pay rise/.test(x.closest('section')?.textContent || '') && /Going from/.test(x.textContent || ''));
  return p ? `${getComputedStyle(p).fontWeight} | parent chain: ${(() => { const a = []; let e = p; while (e && e.tagName !== 'MAIN') { a.push(e.tagName + (e.className ? '.' + String(e.className).split(' ').join('.') : '')); e = e.parentElement; } return a.join(' < '); })()}` : 'not found';
});
console.log(`ℹ️ body text weight on salary page: ${w}`);
ok(/^400/.test(w), 'salary page body text is regular weight');
await page.screenshot({ path: 'shots/salary-phone.png', fullPage: true });

for (const path of ['/salary', '/tax-brackets', '/hecs-help-repayments', '/how-we-calculate', '/salary/20000-after-tax', '/salary/300000-after-tax']) {
  const r = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  ok(r.ok() && !(await page.content()).includes('NaN'), `${path} loads with no NaN`);
}
ok(posts.length === 0, `nothing typed is sent anywhere (${posts.length} non-GET requests)`);
ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASSED');
process.exit(fails.length ? 1 : 0);
