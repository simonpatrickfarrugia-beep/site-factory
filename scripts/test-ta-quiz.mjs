// Browser test for the Trade Admin "which job app" quiz (BASE = site root).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const BASE = (process.argv[2] || 'https://tradeadmin.com.au').replace(/\/$/, '');
await mkdir('shots', { recursive: true });
const fails = [];
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fails.push(m); };
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
const sent = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { if (r.method() === 'POST' && r.url().startsWith(BASE)) sent.push(r.url()); });

async function run(people, jobs, need) {
  await page.goto(`${BASE}/which-job-app`, { waitUntil: 'networkidle' });
  for (const [name, label] of [['people', people], ['jobs', jobs], ['need', need]]) {
    await page.locator(`[data-q=${name}] label`, { hasText: label }).first().click();
    await page.waitForTimeout(150);
  }
  await page.locator('[data-result]').waitFor({ state: 'visible', timeout: 3000 });
  return { head: await page.locator('[data-headline]').innerText(), reason: await page.locator('[data-reason]').innerText(),
    rows: await page.locator('[data-out] tr').count(), free: await page.locator('[data-free-path]').isVisible(),
    trials: await page.locator('[data-trials] a').count() };
}

ok(await page.goto(`${BASE}/which-job-app`).then((r) => r.ok()), 'page loads');
ok(await page.locator('[data-q=people]').isVisible() && !(await page.locator('[data-q=jobs]').isVisible()), 'shows one question at a time');
await page.screenshot({ path: 'shots/quiz-q1.png', fullPage: true });

let r = await run('Just me', 'Up to 30', 'Writing quotes');
ok(/ServiceM8's free plan/.test(r.head), `solo, ≤30 jobs → ServiceM8 free plan (${r.head})`);
ok(r.free, 'solo paperwork-only sees the free builders path');
ok(r.rows === 3 && r.trials === 2, 'ranks 3 apps and links 2 free trials');
await page.screenshot({ path: 'shots/quiz-result-solo.png', fullPage: true });

r = await run('2 people', '51 to 150', 'Scheduling');
ok(/ServiceM8: about \$79/.test(r.head), `2 people, 150 jobs → ServiceM8 $79 (${r.head})`);
ok(!r.free, 'no free path for a team');

r = await run('Just me', 'More than 500', 'All of');
ok(/Tradify: about \$53/.test(r.head), `solo, 1000 jobs → Tradify ~$53 (${r.head})`);
ok(/Fergus costs about the same/.test(r.reason), 'near-tie is called out');

r = await run('7 to 10', '51 to 150', 'Chasing');
ok(/ServiceM8/.test(r.head) && /pays the same as one person/.test(r.reason), 'team of 10 → ServiceM8 with the per-job reason');
await page.screenshot({ path: 'shots/quiz-result-team.png', fullPage: true });

const calc = await page.locator('[data-calc-link]').getAttribute('href');
ok(calc === '/job-management-software?people=10&jobs=150', `calculator link carries the answers (${calc})`);
await page.goto(`${BASE}${calc}`, { waitUntil: 'networkidle' });
ok((await page.inputValue('[data-people]')) === '10' && (await page.inputValue('[data-jobs]')) === '150', 'calculator prefills from the link');
ok(/ServiceM8 Growing/.test(await page.locator('[data-out] tr').first().innerText()), 'calculator agrees: ServiceM8 Growing cheapest');
ok(await page.locator('a[href="/which-job-app"]').count() > 0, 'comparison page links to the quiz');

ok(sent.length === 0, 'answers are never sent to the server');
ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASSED');
process.exit(fails.length ? 1 : 0);
