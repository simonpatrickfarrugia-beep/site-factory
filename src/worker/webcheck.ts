/**
 * Free website check (IMN Labs: imnetwork.com.au/labs/website-check). Enabled per brand with WEBCHECK="1".
 *
 *   GET /api/webcheck?url=example.com.au   → { ok, url, finalUrl, score, grade, ms, kb, checks: [...], fixes: [...], report? }
 *
 * Engine: the health-check Worker (workers/health-check, service binding HEALTH_CHECK) when bound; this file's own checks otherwise.
 *
 * Fetches ONE public page (plus its http:// redirect and /sitemap.xml) and checks what a small
 * business owner can act on: loads, HTTPS, speed, mobile, Google basics, one-tap contact, business details for Google,
 * share preview, visitor counting, out-of-date footer. Nothing about the person checking is stored; the address checked
 * is only kept if they choose to send the "fix these for me" form (form "check" → D1 submissions).
 * Safety: http(s) only, public hostnames only (no IP literals, localhost or internal names), 8 s timeout, 1.5 MB cap,
 * results cached 1 hour per address so it can't be used to hammer a site.
 */

type Status = 'pass' | 'warn' | 'fail';
interface Check { id: string; label: string; status: Status; detail: string; fix: string; weight: number }

const UA = 'Mozilla/5.0 (compatible; IMNWebsiteCheck/1.0; +https://imnetwork.com.au/labs/website-check)';
const MAX_BYTES = 1_500_000;

function normalise(raw: string): URL | null {
  let s = raw.trim();
  if (!s || s.length > 300) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || (u.port && !['80', '443'].includes(u.port))) return null;
  const h = u.hostname.toLowerCase();
  // Public names only: must contain a dot and a letter TLD; no IP literals, localhost or internal suffixes.
  if (!/^[a-z0-9.-]+\.[a-z]{2,24}$/.test(h) || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes('..')) return null;
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp|test|invalid|example)$/.test(h)) return null;
  u.hash = '';
  return u;
}

async function grab(url: string, opts: { manual?: boolean; ms?: number } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.ms ?? 8000);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { redirect: opts.manual ? 'manual' : 'follow', signal: ctl.signal, headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*;q=0.8' } });
    const ms = Date.now() - t0;
    let body = '';
    if (!opts.manual && r.body) {
      const reader = r.body.getReader();
      const chunks: Uint8Array[] = [];
      let n = 0;
      while (n < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        n += value.byteLength;
      }
      try { await reader.cancel(); } catch { /* already closed */ }
      const all = new Uint8Array(n);
      let off = 0;
      for (const c of chunks) { all.set(c.subarray(0, Math.min(c.byteLength, n - off)), off); off += c.byteLength; if (off >= n) break; }
      body = new TextDecoder('utf-8').decode(all);
      return { ok: true as const, status: r.status, url: r.url || url, headers: r.headers, ms, body, bytes: n };
    }
    return { ok: true as const, status: r.status, url: r.url || url, headers: r.headers, ms, body, bytes: 0 };
  } catch (e) {
    return { ok: false as const, error: (e as Error).name === 'AbortError' ? 'took longer than 8 seconds' : 'could not be reached' };
  } finally {
    clearTimeout(timer);
  }
}

const meta = (html: string, name: string) => {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  return tag ? (tag.match(/content=["']([^"']*)["']/i)?.[1] ?? '').trim() : null;
};
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

export async function webcheck(request: Request, hc?: Fetcher): Promise<Response> {
  const json = (body: unknown, status = 200, cache = 'no-store') => Response.json(body, { status, headers: { 'cache-control': cache } });
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET' } });
  const target = normalise(new URL(request.url).searchParams.get('url') ?? '');
  if (!target) return json({ ok: false, message: 'Type a website address like yourbusiness.com.au' }, 400);

  // One free website check (26 Nov 2026): when the imn Worker is bound to the health-check Worker, that engine runs the
  // check, stores the full report (check.imnetwork.com.au/r/<id>) and returns this same JSON shape plus `report`.
  // The checks below are the fallback if the binding is missing or the engine errors.
  if (hc) {
    try {
      const r = await hc.fetch(new Request('https://check.imnetwork.com.au/api/check?url=' + encodeURIComponent(target.toString()), {
        headers: { accept: 'application/json', 'cf-connecting-ip': request.headers.get('cf-connecting-ip') ?? '' },
      }));
      if (r.status < 500 && (r.headers.get('content-type') ?? '').includes('application/json')) return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
      console.error('health-check engine answered', r.status);
    } catch (e) { console.error('health-check engine failed', e); }
  }

  // One result per address per hour, shared across visitors.
  const cacheKey = new Request(`https://webcheck.cache/${encodeURIComponent(target.toString())}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return new Response(hit.body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-cache': 'hit' } });

  const page = await grab(target.toString());
  if (!page.ok) return json({ ok: false, message: `We couldn't open ${target.hostname}: it ${page.error}. Check the address, or the site may be down.` }, 200);
  if (page.status >= 400) return json({ ok: false, message: `${target.hostname} answered with an error (HTTP ${page.status}). If that's your site, visitors are seeing an error page too.` }, 200);
  const ctype = page.headers.get('content-type') ?? '';
  if (!/html/i.test(ctype)) return json({ ok: false, message: `${target.hostname} didn't send a web page (it sent ${ctype.split(';')[0] || 'something else'}).` }, 200);

  const final = new URL(page.url);
  const html = page.body;
  const head = html.slice(0, 200_000);
  const text = decode(html.replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '));
  const [httpProbe, sitemap] = await Promise.all([
    grab(`http://${final.hostname}/`, { manual: true, ms: 5000 }),
    grab(`${final.origin}/sitemap.xml`, { ms: 5000 }),
  ]);

  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  // 1. Secure connection
  const httpsOk = final.protocol === 'https:';
  const httpRedirects = httpProbe.ok && httpProbe.status >= 300 && httpProbe.status < 400 && /^https:/i.test(httpProbe.headers.get('location') ?? '');
  add({ id: 'https', label: 'Secure connection (the padlock)', weight: 3,
    status: httpsOk && (httpRedirects || !httpProbe.ok) ? 'pass' : httpsOk ? 'warn' : 'fail',
    detail: !httpsOk ? 'The site loads without HTTPS, so browsers mark it "Not secure".' : httpRedirects || !httpProbe.ok ? 'Loads over HTTPS.' : 'Loads over HTTPS, but the http:// address doesn\'t forward to it.',
    fix: !httpsOk ? 'Turn on HTTPS (most hosts do it free) so browsers stop showing "Not secure".' : 'Forward http:// to https:// so every visitor gets the secure version.' });

  // 2. Speed (server response as seen from our checker) and page weight
  const ms = page.ms;
  add({ id: 'speed', label: 'First response speed', weight: 3,
    status: ms <= 800 ? 'pass' : ms <= 1800 ? 'warn' : 'fail',
    detail: `The server started answering in ${(ms / 1000).toFixed(1)} seconds from our checker (good is 0.8 s or less, poor is over 1.8 s).`,
    fix: 'Ask your host about caching, or move to faster hosting. Slow first responses lose visitors on phones.' });
  const kb = Math.round(page.bytes / 1024);
  add({ id: 'weight', label: 'Page size', weight: 1,
    status: kb <= 300 ? 'pass' : kb <= 1000 ? 'warn' : 'fail',
    detail: `The page's HTML is ${kb.toLocaleString('en-AU')} KB${page.bytes >= MAX_BYTES ? ' or more' : ''} (images not included).`,
    fix: 'Trim heavy page-builder code and inline scripts; lighter pages load faster on mobile data.' });

  // 3. Mobile
  const viewport = /<meta[^>]+name=["']viewport["'][^>]*width=device-width/i.test(head);
  add({ id: 'mobile', label: 'Set up for phones', weight: 3, status: viewport ? 'pass' : 'fail',
    detail: viewport ? 'The page tells phones to fit it to the screen.' : 'No mobile viewport tag: on phones the page may show zoomed out and tiny.',
    fix: 'Add a mobile viewport tag (or move to a mobile-friendly template). Most local searches happen on phones.' });

  // 4. Google basics
  const title = decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  add({ id: 'title', label: 'Page title for Google', weight: 2,
    status: !title ? 'fail' : title.length >= 20 && title.length <= 65 ? 'pass' : 'warn',
    detail: !title ? 'No page title: Google has to guess what to call you.' : `"${title.slice(0, 90)}" (${title.length} characters).`,
    fix: 'Write a title of about 30–60 characters that says what you do and where, e.g. "Plumber in Geelong | Smith Plumbing".' });
  const desc = decode(meta(head, 'description') ?? '');
  add({ id: 'description', label: 'Description for Google', weight: 2,
    status: !desc ? 'fail' : desc.length >= 70 && desc.length <= 160 ? 'pass' : 'warn',
    detail: !desc ? 'No meta description, so Google picks a random bit of text for your search listing.' : `${desc.length} characters${desc.length < 70 ? ' (a bit short)' : desc.length > 160 ? ' (may be cut off)' : ''}.`,
    fix: 'Add a 70–160 character description: what you offer, where, and a reason to click.' });
  const h1s = (html.match(/<h1\b/gi) ?? []).length;
  add({ id: 'h1', label: 'Main heading', weight: 1, status: h1s === 1 ? 'pass' : h1s === 0 ? 'warn' : 'warn',
    detail: h1s === 1 ? 'One main heading, as it should be.' : h1s === 0 ? 'No main (H1) heading on the page.' : `${h1s} main (H1) headings; one is clearer for Google.`,
    fix: 'Use one clear main heading that says what you do.' });
  const robotsMeta = (meta(head, 'robots') ?? '') + ' ' + (page.headers.get('x-robots-tag') ?? '');
  const blocked = /noindex/i.test(robotsMeta);
  add({ id: 'indexable', label: 'Allowed in Google', weight: 3, status: blocked ? 'fail' : 'pass',
    detail: blocked ? 'The page tells Google NOT to list it (noindex). It won\'t show up in search.' : 'Nothing on the page blocks Google.',
    fix: 'Remove the "noindex" setting (often a leftover "discourage search engines" tick from when the site was built).' });
  const hasSitemap = sitemap.ok && sitemap.status === 200 && /<(urlset|sitemapindex)\b/i.test(sitemap.body.slice(0, 5000));
  add({ id: 'sitemap', label: 'Sitemap for Google', weight: 1, status: hasSitemap ? 'pass' : 'warn',
    detail: hasSitemap ? 'Found /sitemap.xml.' : 'No sitemap at /sitemap.xml (it may live elsewhere).',
    fix: 'Add a sitemap and submit it in Google Search Console so new pages get found faster.' });

  // 5. Customers can act
  const tel = /href=["']tel:/i.test(html);
  const mail = /href=["']mailto:/i.test(html);
  const form = /<form\b/i.test(html);
  add({ id: 'contact', label: 'One-tap contact', weight: 3, status: tel ? 'pass' : mail || form ? 'warn' : 'fail',
    detail: tel ? 'Phone number is tappable on mobile.' : mail || form ? 'There\'s a way to get in touch, but no tap-to-call phone link.' : 'No tap-to-call number, email link or form on this page.',
    fix: 'Make your phone number a tap-to-call link at the top of the page.' });

  // 6. Business details for Google, share preview, visitor counting
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join(' ');
  const biz = /"@type"\s*:\s*\[?\s*"(LocalBusiness|Organization|[A-Za-z]*(Business|Store|Restaurant|Service|Contractor|Plumber|Electrician|Dentist|Physician|Attorney|Agent|Agency|Shop|Cafe|CafeOrCoffeeShop|Bakery|Winery|LodgingBusiness|Hotel|Motel))"/.test(ld);
  add({ id: 'schema', label: 'Business details for Google', weight: 2, status: biz ? 'pass' : 'warn',
    detail: biz ? 'Structured business details found (helps Google show your hours, address and more).' : 'No structured business details (LocalBusiness) on the page.',
    fix: 'Add LocalBusiness structured data with your name, address, phone and hours.' });
  const ogImage = meta(head, 'og:image');
  const ogTitle = meta(head, 'og:title');
  add({ id: 'share', label: 'Preview when shared', weight: 1, status: ogImage && ogTitle ? 'pass' : ogTitle || ogImage ? 'warn' : 'warn',
    detail: ogImage && ogTitle ? 'Has a title and image for Facebook, Messenger and text previews.' : 'Missing a share title or image, so links to your site look plain when shared.',
    fix: 'Add a share image and title (Open Graph tags) so your link looks good in messages and on Facebook.' });
  const analytics = /googletagmanager\.com|google-analytics\.com|gtag\(|plausible\.io|static\.cloudflareinsights\.com|clarity\.ms|matomo/i.test(html);
  add({ id: 'analytics', label: 'Counting visitors', weight: 1, status: analytics ? 'pass' : 'warn',
    detail: analytics ? 'A visitor-counting tool is installed.' : 'No visitor counting found, so you can\'t see how many people visit or from where.',
    fix: 'Install free analytics (Google Analytics) so you know what\'s working.' });

  // 7. Looks current
  const years = [...text.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d{2})/gi)].map((m) => Number(m[1]));
  const nowYear = new Date().getUTCFullYear();
  const newest = years.length ? Math.max(...years) : null;
  add({ id: 'fresh', label: 'Looks up to date', weight: 1, status: newest === null || newest >= nowYear - 1 ? 'pass' : 'warn',
    detail: newest === null ? 'No dated copyright line found.' : newest >= nowYear - 1 ? `Copyright shows ${newest}.` : `The footer says © ${newest}: visitors may think the business is closed or the site abandoned.`,
    fix: 'Update the footer year (or make it update itself) and refresh anything that\'s out of date.' });

  const total = checks.reduce((a, c) => a + c.weight, 0);
  const got = checks.reduce((a, c) => a + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
  const score = Math.round((got / total) * 100);
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';
  const rank = { fail: 0, warn: 1, pass: 2 } as const;
  const fixes = checks.filter((c) => c.status !== 'pass').sort((a, b) => rank[a.status] - rank[b.status] || b.weight - a.weight).slice(0, 3).map((c) => ({ id: c.id, label: c.label, fix: c.fix }));
  const result = { ok: true, url: target.toString(), finalUrl: final.toString(), host: final.hostname, checkedAt: new Date().toISOString(), score, grade, ms, kb,
    checks: checks.map(({ weight: _w, ...c }) => c), fixes };
  const body = JSON.stringify(result);
  await cache.put(cacheKey, new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=3600' } }));
  return new Response(body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
