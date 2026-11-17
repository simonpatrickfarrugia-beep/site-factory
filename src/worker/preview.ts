/**
 * IMN website previews (17 Nov 2026): https://imnetwork.com.au/preview/<slug>
 *
 * A private, not-indexed preview of a prospect's new website, plus a "Built for <business>" panel that shows the homework:
 * the gaps we found, what people nearby search (real monthly numbers), who shows up on Google now, what we built and why,
 * and the plan. Rows live in D1 `previews` (workers/forms/migrations/0012_previews.sql), written by the imn-preview skill.
 * Client details never go in the public repo: this file is only the template.
 *
 * Trust rules (Simon, 17 Nov: "they might think the link is a scam"): the page asks for nothing (no login, no form that
 * submits, no payment details), says who made it and why at the top, links ABN Lookup, and the only button is Start my plan
 * (Stripe) or email/call Simon.
 */

export interface PreviewData {
  business: {
    name: string;
    trade: string;                    // e.g. "Plumber"
    tagline: string;                  // one line, from what they say about themselves
    phone?: string;                   // as they publish it
    email?: string;
    areas: string[];                  // suburbs/regions they say they cover
    hours?: string;
    licence?: { label: string; number: string }; // e.g. { label: "Plumbing licence", number: "12345" } only if published
    reviewsUrl?: string;              // their Google reviews / listing link
    facebookUrl?: string;
    about?: string[];                 // 1-3 short paragraphs, from their own words
    logo?: { src: string; alt?: string; dark?: boolean }; // their own logo (https, from their site); dark = logo needs a dark background
    domain?: string;                  // their web address if they have one, shown in the preview frame's address bar
  };
  services: { t: string; d: string }[];
  photos?: { src: string; alt: string }[]; // only images they publish themselves
  colors?: { brand?: string; accent?: string }; // from their logo/signage (scripts: brand-grab workflow); defaults are neutral
  research: {
    checked: string;                  // "17 Nov 2026"
    found: { t: string; d: string; source?: string }[];       // their real gaps, kindly worded
    searches: { q: string; volume: number }[];                // Google Australia monthly searches
    competitors: { name: string; url?: string; note: string }[]; // who shows up now, and a fair note
    built: { t: string; why: string }[];                       // each page/feature and the reason
    sources: { t: string; url: string }[];                     // where the business details came from
  };
  sample?: boolean;                   // true = made-up business for demos
}

interface Row { slug: string; business: string; data: string; status: string; expires_at: string; views: number }

const IMN = {
  name: 'Independent Media Network',
  email: 'hello@imnetwork.com.au',
  abn: '89 640 199 935',
  abnUrl: 'https://abr.business.gov.au/ABN/View?abn=89640199935',
  plan: 'https://buy.stripe.com/8x23cwfld2Gf5Ddb3R3Je00',
  site: 'https://imnetwork.com.au',
};

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const url = (s?: string) => (s && /^https:\/\/[^\s"'<>]+$/.test(s) ? s : '');
const hex = (s: string | undefined, d: string) => (s && /^#[0-9a-fA-F]{6}$/.test(s) ? s : d);
const ink = (bg: string) => { // readable text colour on a background (WCAG relative luminance)
  const c = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.4 ? '#121A2B' : '#FFFFFF';
};
const tel = (s?: string) => (s ? s.replace(/[^\d+]/g, '') : '');
const nf = (n: number) => Number(n || 0).toLocaleString('en-AU');
const day = (iso: string) => { try { return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Melbourne' }); } catch { return iso; } };

const HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'x-robots-tag': 'noindex, nofollow, noarchive',
  'cache-control': 'private, no-store',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
};

function shell(title: string, body: string, brand = '#1F3A5F', accent = '#F2A93B') {
  return `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><title>${esc(title)}</title><link rel="icon" href="/logo-mark.svg">
<style>
:root{--b:${brand};--bi:${ink(brand)};--a:${accent};--ai:${ink(accent)};--ink:#121A2B;--mut:#5B6475;--line:#E6DFD3;--paper:#FBF8F3;--coin:#F2A93B}
*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink);background:var(--paper)}
a{color:inherit}h1,h2,h3{line-height:1.15;margin:0 0 .5rem}.w{width:min(100% - 2rem,64rem);margin-inline:auto}
/* ---------- IMN wrapper (everything outside the frame) ---------- */
.imn-bar{background:var(--ink);color:#E7EAF0;font-size:.92rem}.imn-bar .w{display:flex;flex-wrap:wrap;gap:.3rem 1rem;align-items:center;justify-content:space-between;padding:.6rem 0}
.imn-brand{display:inline-flex;align-items:center;gap:.5rem;color:#fff;font-weight:800;text-decoration:none}.imn-brand img{width:26px;height:26px;border-radius:6px}
.imn-bar a.j{color:var(--coin);font-weight:700}
.pill{display:inline-block;background:var(--coin);color:var(--ink);font-weight:800;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:.15rem .55rem}
.intro{padding:1.4rem 0 1rem}.intro p{margin:.3rem 0 0;max-width:60ch;color:#333}
.label{display:flex;align-items:center;gap:.6rem;font:800 .78rem system-ui;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);margin:0 0 .6rem}
.label::after{content:"";flex:1;height:1px;background:var(--line)}
/* ---------- the preview frame (their website) ---------- */
.frame{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 0 0 1px #d8d1c4,0 18px 50px rgba(18,26,43,.14);margin-bottom:.8rem}
.chrome{display:flex;align-items:center;gap:.6rem;background:#ECE6DC;padding:.55rem .8rem}
.dots{display:flex;gap:5px}.dots i{width:10px;height:10px;border-radius:50%;background:#CFC6B7;display:block}
.addr{flex:1;min-width:0;background:#fff;border-radius:999px;padding:.25rem .8rem;font-size:.82rem;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.site{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}.site .w{width:min(100% - 2rem,60rem)}
.s-head{background:var(--b);color:var(--bi)}.s-head .w{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.8rem 0}
.s-name{font-weight:800;font-size:1.15rem;display:flex;align-items:center;gap:.6rem}.s-logo{max-height:46px;max-width:170px;display:block}.s-logo--dark{background:#121A2B;padding:4px 8px;border-radius:6px}
.s-call{flex:none;background:var(--a);color:var(--ai);text-decoration:none;font-weight:800;padding:.55rem 1rem;border-radius:999px;white-space:nowrap}.s-call .sm{display:none}@media(max-width:34rem){.s-call .lg{display:none}.s-call .sm{display:inline}.s-logo{max-width:140px;max-height:40px}}
.s-hero{background:linear-gradient(180deg,color-mix(in srgb,var(--b) 12%,#fff),#fff);padding:2.4rem 0 2rem}
.s-hero h1{font-size:clamp(1.8rem,5.5vw,2.7rem);max-width:22ch;color:var(--b)}.s-hero p{font-size:1.1rem;max-width:46ch;color:#333}
.s-chips{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0 1.3rem;padding:0;list-style:none}.s-chips li{background:#fff;border:1px solid #e3e3e3;border-radius:999px;padding:.3rem .8rem;font-size:.9rem}
.s-btns{display:flex;flex-wrap:wrap;gap:.7rem}.s-btn{display:inline-block;background:var(--a);color:var(--ai);font-weight:800;text-decoration:none;padding:.7rem 1.2rem;border-radius:10px}.s-btn--o{background:#fff;border:2px solid var(--b);color:var(--b)}
.s-sec{padding:2.2rem 0}.s-sec+.s-sec{border-top:1px solid #f0f0f0}.s-sec h2{color:var(--b)}.s-grid{display:grid;gap:.9rem}@media(min-width:40rem){.s-grid{grid-template-columns:1fr 1fr}}
.s-card{border:1px solid #e8e8e8;border-top:4px solid var(--b);border-radius:12px;padding:1rem 1.1rem}.s-card h3{font-size:1.1rem}.s-card p{margin:0;color:#444}
.s-areas{columns:2;padding-left:1.1rem}@media(min-width:40rem){.s-areas{columns:3}}
.s-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:.6rem}.s-photos img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px}
.s-form{display:grid;gap:.6rem;max-width:30rem}.s-form input,.s-form textarea{font:inherit;padding:.6rem .7rem;border:1px solid #ccc;border-radius:8px;background:#fafafa}
.s-note{font-size:.85rem;color:var(--mut)}.s-foot{background:var(--b);color:var(--bi);padding:1.2rem 0;font-size:.9rem}
.endframe{text-align:center;font-size:.85rem;color:var(--mut);margin:0 0 2rem}
/* ---------- IMN notes (below the frame) ---------- */
.imn{padding:.5rem 0 3rem}.imn h2{font-size:clamp(1.45rem,4vw,1.9rem)}
.imn h3{font-size:1.12rem;margin-top:1.8rem}.imn .lede{font-size:1.05rem;max-width:58ch}
.box{background:#fff;border:1px solid var(--line);border-radius:14px;padding:1rem 1.1rem;margin-top:.6rem}
.found{margin:0;padding-left:1.1rem}.found li{margin:.35rem 0}.tbl{width:100%;border-collapse:collapse;font-size:.95rem}.tbl th,.tbl td{text-align:left;padding:.5rem .3rem;border-top:1px solid var(--line)}.tbl td.n{text-align:right;font-weight:800;white-space:nowrap}
.tbl thead th{border-top:0;color:var(--mut);font-size:.8rem;text-transform:uppercase;letter-spacing:.05em}
.offer{background:var(--ink);color:#E7EAF0;border-radius:16px;padding:1.4rem;margin-top:2rem}.offer h3{color:#fff;margin-top:0}.offer strong{color:#fff}
.offer .go{display:inline-block;background:var(--coin);color:var(--ink);font-weight:800;text-decoration:none;padding:.75rem 1.3rem;border-radius:10px;margin-top:.4rem}.offer a.l{color:var(--coin);font-weight:700}
.guar{display:flex;gap:.7rem;align-items:flex-start;background:rgba(242,169,59,.12);border:1px solid rgba(242,169,59,.5);border-radius:12px;padding:.8rem .9rem;margin:.9rem 0}
.guar b{color:#fff}.small{font-size:.85rem;color:var(--mut)}
</style></head><body>${body}</body></html>`;
}

function render(row: Row, d: PreviewData, guarantee: string): string {
  const b = d.business;
  const r = d.research;
  const brand = hex(d.colors?.brand, '#1F3A5F');
  const accent = hex(d.colors?.accent, '#F2A93B');
  const logo = url(b.logo?.src);
  const phone = b.phone ? `<a class="s-call" href="tel:${esc(tel(b.phone))}" aria-label="Call ${esc(b.phone)}"><span class="lg">Call ${esc(b.phone)}</span><span class="sm">📞 Call</span></a>` : '';
  const chips = [b.licence ? `${b.licence.label} ${b.licence.number}` : '', b.hours ?? '', b.areas.length ? `Servicing ${b.areas.slice(0, 3).join(', ')}${b.areas.length > 3 ? ' and more' : ''}` : '']
    .filter(Boolean).map((c) => `<li>${esc(c)}</li>`).join('') + (url(b.reviewsUrl) ? `<li><a href="${esc(url(b.reviewsUrl))}" rel="noopener">★ Our Google reviews</a></li>` : '');
  const addr = b.domain && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(b.domain) ? b.domain : `${b.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'yourbusiness'}.com.au`;
  const brandMark = logo
    ? `<img class="s-logo${b.logo?.dark ? ' s-logo--dark' : ''}" src="${esc(logo)}" alt="${esc(b.logo?.alt || b.name)}" onerror="this.remove();document.getElementById('nm').hidden=false"><span id="nm" hidden>${esc(b.name)}</span>`
    : esc(b.name);

  const site = `
<div class="frame" role="region" aria-label="Preview of the new ${esc(b.name)} website">
<div class="chrome"><span class="dots"><i></i><i></i><i></i></span><span class="addr">🔒 ${esc(addr)}</span><span class="pill">Preview</span></div>
<div class="site">
<header class="s-head"><div class="w"><span class="s-name">${brandMark}</span>${phone}</div></header>
<section class="s-hero"><div class="w">
  <h1>${esc(b.tagline)}</h1>
  <p>${esc(b.trade)}${b.areas.length ? ` for ${esc(b.areas.slice(0, 4).join(', '))}` : ''}. ${b.phone ? 'Call now or send a quick quote request.' : 'Send a quick quote request.'}</p>
  <ul class="s-chips">${chips}</ul>
  <div class="s-btns">${b.phone ? `<a class="s-btn" href="tel:${esc(tel(b.phone))}">Call ${esc(b.phone)}</a>` : ''}<a class="s-btn s-btn--o" href="#quote">Get a quote</a></div>
</div></section>
<section class="s-sec"><div class="w"><h2>What we do</h2><div class="s-grid">${d.services.map((s) => `<div class="s-card"><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></div>`).join('')}</div></div></section>
${(d.photos ?? []).filter((p) => url(p.src)).length ? `<section class="s-sec"><div class="w"><h2>Recent work</h2><div class="s-photos">${(d.photos ?? []).filter((p) => url(p.src)).map((p) => `<img src="${esc(url(p.src))}" alt="${esc(p.alt)}" loading="lazy">`).join('')}</div></div></section>` : ''}
${b.areas.length ? `<section class="s-sec"><div class="w"><h2>Areas we cover</h2><ul class="s-areas">${b.areas.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div></section>` : ''}
${b.about?.length ? `<section class="s-sec"><div class="w"><h2>About ${esc(b.name)}</h2>${b.about.map((p) => `<p>${esc(p)}</p>`).join('')}</div></section>` : ''}
<section class="s-sec" id="quote"><div class="w"><h2>Get a quote</h2>
  <div class="s-form" aria-disabled="true"><input disabled placeholder="Your name"><input disabled placeholder="Phone or email"><input disabled placeholder="Suburb"><textarea disabled rows="3" placeholder="What do you need done?"></textarea></div>
  <p class="s-note">This form switches on when the site goes live. In the preview it doesn't send anything.</p>
</div></section>
<footer class="s-foot"><div class="w">${esc(b.name)}${b.licence ? ` · ${esc(b.licence.label)} ${esc(b.licence.number)}` : ''}${b.phone ? ` · ${esc(b.phone)}` : ''}${b.email ? ` · ${esc(b.email)}` : ''}</div></footer>
</div></div>
<p class="endframe">▲ End of the website preview</p>`;

  const total = r.searches.reduce((n, s) => n + (s.volume || 0), 0);
  const notes = `
<section class="imn" id="from-imn">
  <p class="label">From IMN · not part of your website</p>
  <h2>What we found, and why we built it this way</h2>
  <p class="lede">We looked at how ${esc(b.name)} shows up online today, what people near you search for, and who Google shows them instead. Checked ${esc(r.checked)}.</p>

  ${r.found.length ? `<h3>What we noticed</h3><div class="box"><ul class="found">${r.found.map((f) => `<li><b>${esc(f.t)}.</b> ${esc(f.d)}${url(f.source) ? ` <a class="small" href="${esc(url(f.source))}" rel="noopener">(see)</a>` : ''}</li>`).join('')}</ul></div>` : ''}

  ${r.searches.length ? `<h3>What people near you search on Google</h3><div class="box"><table class="tbl"><thead><tr><th>Search</th><th style="text-align:right">A month</th></tr></thead><tbody>${r.searches.map((s) => `<tr><td>${esc(s.q)}</td><td class="n">${nf(s.volume)}</td></tr>`).join('')}</tbody></table>
  <p class="small">About ${nf(total)} searches a month across these, Google Australia. Your new site is written so Google can match it to them.</p></div>` : ''}

  ${r.competitors.length ? `<h3>Who Google shows instead right now</h3><div class="box"><ul class="found">${r.competitors.map((c) => `<li><b>${url(c.url) ? `<a href="${esc(url(c.url))}" rel="noopener nofollow">${esc(c.name)}</a>` : esc(c.name)}</b>: ${esc(c.note)}</li>`).join('')}</ul></div>` : ''}

  ${r.built.length ? `<h3>What we built, and why</h3><div class="box"><ul class="found">${r.built.map((x) => `<li><b>${esc(x.t)}</b>: ${esc(x.why)}</li>`).join('')}</ul></div>` : ''}

  <div class="offer">
    <h3>Want it live?</h3>
    <p><strong>$99 + GST a month</strong> ($108.90 inc GST). We put this live on your own web address, host it, check it every day and make up to 2 rounds of changes a month. <strong>No setup fee, no lock-in contract</strong>: cancel any time.</p>
    ${guarantee ? `<div class="guar"><span aria-hidden="true">🛡️</span><div>${guarantee}</div></div>` : ''}
    <p>Want changes first? Reply to our email and tell us what to change. No charge for that.</p>
    <a class="go" href="${IMN.plan}?client_reference_id=${encodeURIComponent(row.slug)}" rel="noopener">Start my plan</a>
    <p class="small" style="color:#AEB6C5;margin-top:.5rem">Next: a secure Stripe checkout, then a welcome page with what happens next. We email you within 1 business day to put your site live.</p>
    <p class="small" style="color:#AEB6C5">Payment is handled by Stripe. We never ask for card details by email. Prefer to talk first? Email <a class="l" href="mailto:${IMN.email}?subject=${encodeURIComponent(`Website preview: ${b.name}`)}">${IMN.email}</a> and we'll call you.</p>
  </div>

  <h3>Who we are, and how to check us</h3>
  <div class="box"><ul class="found">
    <li><a href="${IMN.site}" rel="noopener">${IMN.name} (IMN)</a> is a Melbourne company that builds and looks after websites for local businesses. Check our ABN ${IMN.abn} on the <a href="${IMN.abnUrl}" rel="noopener">government's ABN Lookup</a>.</li>
    <li>This preview asks for nothing: no login, no form that sends, no payment details.</li>
    <li>We built it only from information ${esc(b.name)} already publishes${r.sources.length ? ` (${r.sources.map((s) => url(s.url) ? `<a href="${esc(url(s.url))}" rel="noopener">${esc(s.t)}</a>` : esc(s.t)).join(', ')})` : ''}${logo ? ', including your logo and colours' : ''}. Want it taken down? Email ${IMN.email} and it's gone the same day.</li>
    <li>It isn't on Google and stops working on ${esc(day(row.expires_at))}.</li>
  </ul></div>
</section>`;

  const bar = `<div class="imn-bar"><div class="w"><a class="imn-brand" href="${IMN.site}" rel="noopener"><img src="/logo-mark.svg" alt="">IMN</a><span>${d.sample ? '<span class="pill">Sample</span> ' : ''}Website preview for <b>${esc(b.name)}</b></span><a class="j" href="#from-imn">Why you're seeing this ↓</a></div></div>
<div class="w intro"><p class="label">Your new website · preview</p><p>Here's a preview of a new website for <b>${esc(b.name)}</b>, built from what you already publish online. It isn't live. Below the preview, we explain what we found and why we built it this way.</p></div>`;
  return shell(`${b.name}: website preview by IMN`, bar + `<main class="w">${site}${notes}</main>`, brand, accent);
}

/** Guarantee line in the offer box. Set by Simon's choice (PREVIEW_GUARANTEE var in brands/imn/wrangler.jsonc); empty = no line. */
function guaranteeHtml(key?: string): string {
  const G: Record<string, string> = {
    'money-back-30': '<b>30-day money-back guarantee.</b> If you\'re not happy in your first 30 days, tell us and we\'ll refund your first month in full.',
    'live-7': '<b>Live within 7 days of your go-ahead</b> (once we have your details and domain access), or your first month is free.',
    'both': '<b>Our guarantee:</b> live within 7 days of your go-ahead or your first month is free, and if you\'re not happy in your first 30 days we refund your first month in full. <a class="l" href="https://imnetwork.com.au/terms">Details in our terms</a>.',
  };
  return G[(key ?? '').trim()] ?? '';
}

function message(title: string, text: string, status: number) {
  return new Response(shell(title, `<div class="imn-bar"><div class="w"><a class="imn-brand" href="${IMN.site}"><img src="/logo-mark.svg" alt="">IMN</a><a class="j" href="${IMN.site}">imnetwork.com.au</a></div></div>
<main class="w imn" style="padding-top:2rem"><h2>${esc(title)}</h2><p class="lede">${text}</p></main>`), { status, headers: HEADERS });
}

export async function preview(env: { DB: D1Database; PREVIEW_GUARANTEE?: string }, slug: string, method: string, count = true): Promise<Response> {
  if (method !== 'GET' && method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  if (!/^[a-z0-9-]{6,80}$/.test(slug)) return message('Preview not found', `Check the link in your email, or email <a href="mailto:${IMN.email}">${IMN.email}</a>.`, 404);
  const row = await env.DB.prepare('SELECT slug, business, data, status, expires_at, views FROM previews WHERE slug = ?').bind(slug).first<Row>();
  if (!row) return message('Preview not found', `Check the link in your email, or email <a href="mailto:${IMN.email}">${IMN.email}</a>.`, 404);
  if (row.status !== 'won' && Date.parse(row.expires_at) < Date.now()) {
    return message('This preview has expired', `Previews switch off after a few weeks. Still interested? Email <a href="mailto:${IMN.email}?subject=${encodeURIComponent(`Website preview: ${row.business}`)}">${IMN.email}</a> and we'll bring it back.`, 410);
  }
  let d: PreviewData;
  try { d = JSON.parse(row.data) as PreviewData; } catch { return message('Preview unavailable', `Something went wrong on our side. Email <a href="mailto:${IMN.email}">${IMN.email}</a>.`, 500); }
  if (method === 'GET' && count) {
    await env.DB.prepare(`UPDATE previews SET views = views + 1, last_viewed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), first_viewed_at = COALESCE(first_viewed_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE slug = ?`).bind(slug).run();
  }
  return new Response(method === 'HEAD' ? null : render(row, d, guaranteeHtml(env.PREVIEW_GUARANTEE)), { headers: HEADERS });
}
