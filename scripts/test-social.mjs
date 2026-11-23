// Live check of /watch likes and comments (uitest workflow: test=test-social.mjs, base=https://www.movietrailer.channel).
// Likes the first film then un-likes it (leaves no vote behind), and posts one comment WITH A LINK so the spam filter must
// hold it for IMN HQ (it never goes public). Hide that test comment in HQ afterwards.
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
await mkdir('shots', { recursive: true });
const BASE = process.argv[2] || 'https://www.movietrailer.channel';
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('dialog', (d) => d.dismiss());
let fails = 0;
const check = (label, pass, extra = '') => { if (!pass) fails++; console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}${extra ? ': ' + extra : ''}`); };

await page.goto(BASE + '/watch?notrack=1', { waitUntil: 'load', timeout: 60000 });
const counts = await page.waitForResponse((r) => r.url().includes('/api/social?films='), { timeout: 15000 }).catch(() => null);
check('counts load', !!counts && counts.ok(), counts ? String(counts.status()) : 'no request');
const card = page.locator('.wc').first();
const like = card.locator('[data-act="like"]');
const before = (await like.locator('span').textContent())?.trim();

const [on] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/social/vote'), { timeout: 10000 }), like.click()]);
const onBody = await on.json().catch(() => ({}));
check('like saved', on.ok() && onBody.ok === true && onBody.counts?.like >= 1, `like=${onBody.counts?.like} (label before: ${before})`);
const [off] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/social/vote'), { timeout: 10000 }), like.click()]);
const offBody = await off.json().catch(() => ({}));
check('un-like removes it', off.ok() && offBody.ok === true && offBody.counts?.like === onBody.counts.like - 1, `like=${offBody.counts?.like}`);

await card.locator('[data-act="comment"]').click();
await page.waitForSelector('#wcom[open]', { timeout: 5000 });
await page.waitForTimeout(4000); // the spam filter's time trap needs 3+ seconds since page load
await page.fill('#wcom-name', 'Claude setup check');
await page.fill('#wcom-body', 'Setup check, please hide: example.com');
const [post] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/comments') && r.request().method() === 'POST', { timeout: 10000 }), page.click('#wcom-form button[type=submit]')]);
const pb = await post.json().catch(() => ({}));
check('comment with a link is held', post.ok() && pb.ok === true && pb.status === 'held', JSON.stringify(pb).slice(0, 160));
await page.waitForTimeout(500);
check('held note shown to poster', (await page.locator('.wcom__wait').count()) >= 1);
await page.screenshot({ path: 'shots/social-comments.png' });

// Same test against a bot that posts instantly: must not go live.
const bot = await page.evaluate(async () => (await fetch('/api/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ film: document.querySelector('.wc').dataset.slug, body: 'Great film', _t: String(Date.now()) }) })).json());
check('instant bot post not shown', bot.status === 'held', JSON.stringify(bot).slice(0, 120));
const pub = await page.evaluate(async () => (await fetch('/api/comments?film=' + document.querySelector('.wc').dataset.slug + '&x=' + Date.now())).json());
check('test comments not public', !(pub.comments || []).some((c) => /Setup check|Great film/.test(c.body)), `${(pub.comments || []).length} live`);
await browser.close();
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
