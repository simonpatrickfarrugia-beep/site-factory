// Website health checks. Pure functions + a fetch-based runner (works in Workers and Node).

export const CATEGORIES = [
  { key: 'speed', label: 'Speed', max: 25 },
  { key: 'seo', label: 'Google visibility', max: 25 },
  { key: 'mobile', label: 'Mobile', max: 15 },
  { key: 'security', label: 'Security', max: 15 },
  { key: 'leads', label: 'Turning visitors into leads', max: 20 },
];

export function normaliseUrl(input) {
  let s = String(input || '').trim();
  if (!s) throw new Error('Enter a website address');
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u;
  try { u = new URL(s); } catch { throw new Error("That doesn't look like a website address"); }
  const host = u.hostname.toLowerCase();
  if (!host.includes('.') || /^(localhost|.*\.local|.*\.internal)$/.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) {
    throw new Error('Enter a public website address, like yourbusiness.com.au');
  }
  return 'https://' + host + (u.pathname === '/' ? '' : u.pathname.replace(/\/$/, ''));
}

async function timedFetch(url, opts = {}, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  const start = Date.now();
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; IMN-HealthCheck/1.0; +https://imnetwork.com.au)', accept: 'text/html,*/*', ...(opts.headers || {}) } });
    return { res, ms: Date.now() - start };
  } finally { clearTimeout(t); }
}

export async function runScan(inputUrl) {
  const url = normaliseUrl(inputUrl);
  const host = new URL(url).hostname;
  const out = { url, host, fetchedAt: Date.now(), facts: {} };
  const f = out.facts;

  // Main page over HTTPS (fallback to HTTP if HTTPS fails)
  let main, html = '', finalUrl = url;
  try {
    main = await timedFetch(url, { redirect: 'follow' });
    f.https = true;
  } catch {
    f.https = false;
    try { main = await timedFetch(url.replace('https://', 'http://'), { redirect: 'follow' }); } catch (e) { throw new Error("We couldn't reach that website. Check the address and try again."); }
  }
  f.status = main.res.status;
  f.ttfb = main.ms;
  finalUrl = main.res.url || url;
  f.finalHttps = finalUrl.startsWith('https://');
  if (!f.finalHttps) f.https = false;
  html = await main.res.text();
  f.htmlKb = Math.round(new TextEncoder().encode(html).length / 1024);
  const h = main.res.headers;
  f.compressed = /gzip|br|zstd|deflate/i.test(h.get('content-encoding') || '') || f.htmlKb < 15;
  f.hsts = !!h.get('strict-transport-security');
  f.secHeaders = ['x-content-type-options', 'content-security-policy', 'x-frame-options', 'referrer-policy'].filter(k => h.get(k)).length;

  // HTTP -> HTTPS redirect
  try {
    const r = await timedFetch('http://' + host + '/', { redirect: 'manual' }, 6000);
    const loc = r.res.headers.get('location') || '';
    f.httpRedirects = (r.res.status >= 300 && r.res.status < 400 && loc.startsWith('https://')) || (r.res.url || '').startsWith('https://');
  } catch { f.httpRedirects = f.https; }

  Object.assign(f, analyseHtml(html, finalUrl));

  // robots.txt + sitemap
  const origin = new URL(finalUrl).origin;
  const [robots, sitemap] = await Promise.all([
    timedFetch(origin + '/robots.txt', {}, 6000).then(async r => (r.res.ok ? await r.res.text() : null)).catch(() => null),
    timedFetch(origin + '/sitemap.xml', {}, 6000).then(async r => r.res.ok && /<(urlset|sitemapindex)/i.test(await r.res.text())).catch(() => false),
  ]);
  f.robots = robots != null && !/^\s*<!doctype|<html/i.test(robots);
  f.robotsBlocksAll = f.robots && /user-agent:\s*\*[\s\S]*?disallow:\s*\/\s*$/im.test(robots) && !/disallow:\s*\/\S/im.test(robots);
  f.sitemap = sitemap || (f.robots && /sitemap:/i.test(robots));

  // Broken internal links (sample of 10)
  const links = f.internalLinks.slice(0, 10);
  const results = await Promise.all(links.map(l => timedFetch(l, { method: 'HEAD', redirect: 'follow' }, 6000)
    .then(r => (r.res.status === 405 || r.res.status === 403 ? timedFetch(l, { redirect: 'follow' }, 6000) : r))
    .then(r => ({ url: l, status: r.res.status })).catch(() => ({ url: l, status: 0 }))));
  f.brokenLinks = results.filter(r => r.status === 0 || r.status >= 400).map(r => r.url);
  f.linksChecked = links.length;
  delete f.internalLinks;

  out.result = score(f);
  return out;
}

export function analyseHtml(html, baseUrl) {
  const f = {};
  const strip = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const decode = s => s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [html])[0];
  const meta = name => {
    const re = new RegExp('<meta[^>]+(?:name|property)=["\']' + name + '["\'][^>]*>', 'i');
    const tag = (head.match(re) || html.match(re) || [])[0];
    return tag ? decode((tag.match(/content=["']([^"']*)["']/i) || [])[1] || '') : null;
  };
  f.title = decode(strip((head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ''));
  f.description = meta('description');
  f.h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  f.h1 = strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').slice(0, 120);
  f.viewport = /<meta[^>]+name=["']viewport["'][^>]*width=device-width/i.test(html);
  f.lang = /<html[^>]+lang=["'][a-z]/i.test(html);
  f.canonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  f.jsonLd = /<script[^>]+application\/ld\+json/i.test(html);
  f.ogTitle = !!meta('og:title');
  f.ogImage = !!meta('og:image');
  f.favicon = /<link[^>]+rel=["'][^"']*icon/i.test(html);
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  f.images = imgs.length;
  f.imagesWithAlt = imgs.filter(i => /\balt=["'][^"']+["']/i.test(i)).length;
  f.lazyImages = imgs.filter(i => /loading=["']lazy/i.test(i)).length;
  f.scripts = (html.match(/<script\b[^>]*\bsrc=/gi) || []).length;
  f.mixedContent = (html.match(/<(?:img|script|iframe|link)\b[^>]+(?:src|href)=["']http:\/\/[^"']+/gi) || []).filter(t => !/rel=["'](?:canonical|alternate)/i.test(t)).length;
  f.telLink = /href=["']tel:/i.test(html);
  f.mailto = /href=["']mailto:/i.test(html);
  f.form = /<form\b/i.test(html) || /(contact|quote|enquir|book)[^"']*["'][^>]*>/i.test(html) && /href=["'][^"']*(contact|quote|enquir|book)/i.test(html);
  f.analytics = /googletagmanager\.com|google-analytics\.com|gtag\(|plausible\.io|clarity\.ms|fbq\(|cloudflareinsights|static\.hotjar|umami/i.test(html);
  const years = (strip(html).match(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/i) || [])[1];
  f.copyrightYear = years ? Number(years) : null;
  f.platform = /wp-content|wp-includes/i.test(html) ? 'WordPress' : /cdn\.shopify|Shopify\./.test(html) ? 'Shopify' : /static\.wixstatic|wix\.com/i.test(html) ? 'Wix' : /squarespace/i.test(html) ? 'Squarespace' : /webflow/i.test(html) ? 'Webflow' : /godaddy|wsimg\.com/i.test(html) ? 'GoDaddy' : null;
  // internal links
  const base = new URL(baseUrl);
  const seen = new Set();
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(decode(m[1]), base);
      if (u.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '') || !/^https?:$/.test(u.protocol)) continue;
      if (/\.(pdf|jpe?g|png|gif|webp|zip|docx?|xlsx?|mp4)$/i.test(u.pathname)) continue;
      u.hash = '';
      const k = u.toString();
      if (k.replace(/\/$/, '') !== base.toString().replace(/\/$/, '')) seen.add(k);
    } catch {}
  }
  f.internalLinks = [...seen];
  return f;
}

export function score(f) {
  const items = [];
  const add = (cat, pts, max, ok, title, fix, why) => items.push({ cat, pts: Math.max(0, Math.min(max, pts)), max, ok, title, fix, why });
  const nowYear = new Date().getFullYear();

  // Speed (25)
  add('speed', f.ttfb < 600 ? 8 : f.ttfb < 1500 ? 4 : 0, 8, f.ttfb < 600, `Server response: ${(f.ttfb / 1000).toFixed(1)}s`,
    'Move to faster hosting or add caching so the page starts loading in under 0.6s.', 'Slow sites lose about half their visitors before the page even appears.');
  add('speed', f.htmlKb < 100 ? 5 : f.htmlKb < 300 ? 2 : 0, 5, f.htmlKb < 100, `Page weight: ${f.htmlKb} KB of code`,
    'Trim unused page-builder code and plugins.', 'Heavy pages load slowly on mobile data.');
  add('speed', f.compressed ? 4 : 0, 4, f.compressed, f.compressed ? 'Compression turned on' : 'Compression is off',
    'Turn on gzip or Brotli compression at your host or CDN.', 'Compression makes pages 3 to 5 times smaller to download.');
  add('speed', f.scripts <= 15 ? 4 : f.scripts <= 30 ? 2 : 0, 4, f.scripts <= 15, `${f.scripts} script files loaded`,
    'Remove unused plugins, chat widgets and tracking scripts.', 'Every script slows the page down.');
  add('speed', f.images <= 6 || f.lazyImages >= f.images * 0.5 ? 4 : 1, 4, f.images <= 6 || f.lazyImages >= f.images * 0.5, `${f.images} images, ${f.lazyImages} lazy-loaded`,
    'Lazy-load images below the fold and serve them as WebP.', 'Images are usually the biggest part of a page.');

  // SEO (25)
  const tl = (f.title || '').length;
  add('seo', tl >= 30 && tl <= 65 ? 5 : tl > 0 ? 2 : 0, 5, tl >= 30 && tl <= 65, tl ? `Page title (${tl} characters)` : 'No page title',
    'Write a 30 to 65 character title with your main service and suburb, e.g. "Emergency Plumber Brunswick | Smith Plumbing".', 'The title is the blue headline people click on in Google.');
  const dl = (f.description || '').length;
  add('seo', dl >= 70 && dl <= 160 ? 5 : dl > 0 ? 2 : 0, 5, dl >= 70 && dl <= 160, dl ? `Google description (${dl} characters)` : 'No Google description',
    'Add a 70 to 160 character description that sells the click, with a call to action.', 'Without one, Google picks random text from your page.');
  add('seo', f.h1Count === 1 ? 4 : f.h1Count > 1 ? 2 : 0, 4, f.h1Count === 1, f.h1Count === 1 ? 'One main heading' : f.h1Count ? `${f.h1Count} main headings (should be 1)` : 'No main heading',
    'Use one clear H1 heading that says what you do and where.', 'Google uses the main heading to work out what the page is about.');
  add('seo', f.sitemap ? 3 : 0, 3, f.sitemap, f.sitemap ? 'Sitemap found' : 'No sitemap',
    'Create a sitemap.xml and submit it in Google Search Console.', 'Sitemaps help Google find all your pages.');
  add('seo', f.robots && !f.robotsBlocksAll ? 3 : f.robotsBlocksAll ? 0 : 1, 3, f.robots && !f.robotsBlocksAll, f.robotsBlocksAll ? 'robots.txt is BLOCKING Google' : f.robots ? 'robots.txt in place' : 'No robots.txt',
    f.robotsBlocksAll ? 'Urgent: your robots.txt tells Google not to index the site. Remove "Disallow: /".' : 'Add a robots.txt that points to your sitemap.', 'This file tells search engines what they may read.');
  add('seo', f.jsonLd ? 3 : 0, 3, f.jsonLd, f.jsonLd ? 'Business details marked up for Google' : 'No business markup (schema)',
    'Add LocalBusiness schema with your name, address, phone and hours.', 'Schema helps you show up in Google Maps and rich results.');
  add('seo', f.canonical ? 2 : 0, 2, f.canonical, f.canonical ? 'Canonical tag set' : 'No canonical tag',
    'Add a canonical tag so Google knows the main version of each page.', 'This prevents duplicate-page penalties.');

  // Mobile (15)
  add('mobile', f.viewport ? 8 : 0, 8, f.viewport, f.viewport ? 'Built for mobile screens' : 'Not set up for mobile',
    'Add a responsive viewport and mobile layout. Most of your visitors are on phones.', 'Google ranks sites by their mobile version.');
  const altPct = f.images ? f.imagesWithAlt / f.images : 1;
  add('mobile', altPct >= 0.8 ? 5 : altPct >= 0.4 ? 2 : 0, 5, altPct >= 0.8, f.images ? `${Math.round(altPct * 100)}% of images have descriptions` : 'No images to check',
    'Add short alt text describing each image.', 'Alt text helps accessibility and image search.');
  add('mobile', f.lang ? 2 : 0, 2, f.lang, f.lang ? 'Language set' : 'Page language not set',
    'Add lang="en-AU" to the page.', 'This helps screen readers and translation.');

  // Security (15)
  add('security', f.https ? 6 : 0, 6, f.https, f.https ? 'Secure connection (HTTPS)' : 'NOT SECURE: no HTTPS',
    'Install an SSL certificate. Browsers show "Not secure" on your site right now.', 'Visitors leave when they see a security warning.');
  add('security', f.httpRedirects ? 4 : 0, 4, f.httpRedirects, f.httpRedirects ? 'Insecure visits redirected to secure' : 'Insecure version still reachable',
    'Redirect every http:// visit to https://.', 'Otherwise some visitors land on the unsafe version.');
  add('security', (f.hsts ? 2 : 0) + (f.secHeaders >= 2 ? 1 : 0), 3, f.hsts && f.secHeaders >= 2, `${(f.hsts ? 1 : 0) + f.secHeaders} of 5 security headers`,
    'Turn on HSTS and basic security headers at your host or CDN.', 'These block common attacks.');
  add('security', f.mixedContent === 0 ? 2 : 0, 2, f.mixedContent === 0, f.mixedContent ? `${f.mixedContent} insecure files on a secure page` : 'No insecure files',
    'Update image and script links from http:// to https://.', 'Mixed content triggers browser warnings.');

  // Leads (20)
  add('leads', f.telLink ? 5 : 0, 5, f.telLink, f.telLink ? 'Tap-to-call phone link' : 'No tap-to-call button',
    'Make your phone number a tap-to-call link in the header.', 'On mobile, calls are the number one way locals get in touch.');
  add('leads', f.form || f.mailto ? 4 : 0, 4, f.form || f.mailto, f.form ? 'Enquiry form found' : f.mailto ? 'Email link only (no form)' : 'No way to enquire online',
    'Add a short quote/enquiry form above the fold.', 'People who are ready to buy want a fast way to ask.');
  add('leads', (f.ogTitle ? 1.5 : 0) + (f.ogImage ? 1.5 : 0), 3, f.ogTitle && f.ogImage, f.ogImage ? 'Looks good when shared' : 'Shares badly on Facebook/LinkedIn',
    'Add social share tags (og:title, og:image).', 'Links shared without an image get far fewer clicks.');
  add('leads', f.analytics ? 3 : 0, 3, f.analytics, f.analytics ? 'Visitor tracking installed' : 'No visitor tracking',
    'Install Google Analytics or similar so you know where enquiries come from.', "You can't improve what you can't measure.");
  const stale = f.copyrightYear && f.copyrightYear < nowYear - 1;
  add('leads', stale ? 0 : 2, 2, !stale, stale ? `Footer says © ${f.copyrightYear}, so the site looks abandoned` : 'Site looks current',
    'Update the copyright year and any old content.', 'An old date makes visitors wonder if you are still trading.');
  add('leads', f.favicon ? 1 : 0, 1, f.favicon, f.favicon ? 'Browser icon set' : 'No browser icon',
    'Add your logo as the favicon.', 'A small detail that builds trust.');
  add('leads', f.brokenLinks.length === 0 ? 2 : 0, 2, f.brokenLinks.length === 0, f.brokenLinks.length ? `${f.brokenLinks.length} broken link${f.brokenLinks.length > 1 ? 's' : ''} found` : `No broken links (${f.linksChecked} checked)`,
    'Fix or remove the broken links.', 'Broken links frustrate visitors and hurt rankings.');

  const cats = CATEGORIES.map(c => {
    const its = items.filter(i => i.cat === c.key);
    const got = its.reduce((a, i) => a + i.pts, 0), max = its.reduce((a, i) => a + i.max, 0);
    return { ...c, score: Math.round(got / max * 100) };
  });
  const total = Math.round(items.reduce((a, i) => a + i.pts, 0));
  const fixes = items.filter(i => !i.ok).sort((a, b) => (b.max - b.pts) - (a.max - a.pts));
  return { total, grade: total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'F', cats, items, fixes };
}
