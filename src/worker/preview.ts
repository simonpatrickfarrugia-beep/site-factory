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
  };
  services: { t: string; d: string }[];
  photos?: { src: string; alt: string }[]; // only images they publish themselves
  colors?: { brand?: string; accent?: string };
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
  email: 'simon@imnetwork.com.au',
  abn: '89 640 199 935',
  abnUrl: 'https://abr.business.gov.au/ABN/View?abn=89640199935',
  plan: 'https://buy.stripe.com/8x23cwfld2Gf5Ddb3R3Je00',
  site: 'https://imnetwork.com.au',
};

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const url = (s?: string) => (s && /^https:\/\/[^\s"'<>]+$/.test(s) ? s : '');
const hex = (s: string | undefined, d: string) => (s && /^#[0-9a-fA-F]{6}$/.test(s) ? s : d);
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
:root{--b:${brand};--a:${accent};--ink:#121A2B;--mut:#5B6475;--line:#E6DFD3;--paper:#FBF8F3}
*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink);background:#fff}
a{color:inherit}h1,h2,h3{line-height:1.15;margin:0 0 .5rem}.w{width:min(100% - 2rem,64rem);margin-inline:auto}
.trust{background:var(--ink);color:#E7EAF0;font-size:.9rem}.trust .w{display:flex;flex-wrap:wrap;gap:.3rem 1rem;align-items:center;justify-content:space-between;padding:.6rem 0}
.trust b{color:#fff}.trust a{color:#F2A93B;font-weight:700}
.pill{display:inline-block;background:#F2A93B;color:var(--ink);font-weight:800;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:.15rem .55rem;margin-right:.4rem}
/* their site */
.s-head{border-bottom:1px solid #eee}.s-head .w{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.9rem 0}
.s-name{font-weight:800;font-size:1.15rem}.s-call{background:var(--b);color:#fff;text-decoration:none;font-weight:800;padding:.55rem 1rem;border-radius:999px;white-space:nowrap}
.s-hero{background:linear-gradient(180deg,color-mix(in srgb,var(--b) 10%,#fff),#fff);padding:2.6rem 0 2rem}
.s-hero h1{font-size:clamp(1.8rem,5.5vw,2.8rem);max-width:22ch}.s-hero p{font-size:1.1rem;max-width:46ch;color:#333}
.s-chips{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0 1.3rem;padding:0;list-style:none}.s-chips li{background:#fff;border:1px solid #e3e3e3;border-radius:999px;padding:.3rem .8rem;font-size:.9rem}
.s-btns{display:flex;flex-wrap:wrap;gap:.7rem}.s-btn{display:inline-block;background:var(--a);color:var(--ink);font-weight:800;text-decoration:none;padding:.7rem 1.2rem;border-radius:10px}.s-btn--o{background:#fff;border:2px solid var(--b);color:var(--b)}
.s-sec{padding:2.4rem 0}.s-sec+.s-sec{border-top:1px solid #f0f0f0}.s-grid{display:grid;gap:.9rem}@media(min-width:40rem){.s-grid{grid-template-columns:1fr 1fr}}
.s-card{border:1px solid #e8e8e8;border-radius:12px;padding:1rem 1.1rem}.s-card h3{font-size:1.1rem;color:var(--b)}.s-card p{margin:0;color:#444}
.s-areas{columns:2;padding-left:1.1rem}@media(min-width:40rem){.s-areas{columns:3}}
.s-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(10rem,1fr));gap:.6rem}.s-photos img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px}
.s-form{display:grid;gap:.6rem;max-width:30rem}.s-form input,.s-form textarea{font:inherit;padding:.6rem .7rem;border:1px solid #ccc;border-radius:8px;background:#fafafa}
.s-note{font-size:.85rem;color:var(--mut)}.s-foot{background:#f6f6f6;padding:1.4rem 0;font-size:.9rem;color:#444}
/* IMN panel */
.imn{background:var(--paper);border-top:6px solid #F2A93B;padding:2.6rem 0 3rem}.imn h2{font-size:clamp(1.5rem,4vw,2rem)}
.imn h3{font-size:1.15rem;margin-top:2rem}.imn .lede{font-size:1.08rem;max-width:56ch}
.box{background:#fff;border:1px solid var(--line);border-radius:14px;padding:1rem 1.1rem;margin-top:.6rem}
.found li{margin:.35rem 0}.tbl{width:100%;border-collapse:collapse;font-size:.95rem}.tbl th,.tbl td{text-align:left;padding:.5rem .3rem;border-top:1px solid var(--line)}.tbl td.n{text-align:right;font-weight:800;white-space:nowrap}
.tbl thead th{border-top:0;color:var(--mut);font-size:.8rem;text-transform:uppercase;letter-spacing:.05em}
.offer{background:var(--ink);color:#E7EAF0;border-radius:16px;padding:1.4rem;margin-top:2rem}.offer h3{color:#fff;margin-top:0}.offer strong{color:#fff}
.offer .s-btn{margin-top:.6rem}.offer a.l{color:#F2A93B;font-weight:700}
.legit li{margin:.3rem 0}.small{font-size:.85rem;color:var(--mut)}
</style></head><body>${body}</body></html>`;
}

function render(row: Row, d: PreviewData): string {
  const b = d.business;
  const r = d.research;
  const brand = hex(d.colors?.brand, '#1F3A5F');
  const accent = hex(d.colors?.accent, '#F2A93B');
  const phone = b.phone ? `<a class="s-call" href="tel:${esc(tel(b.phone))}">Call ${esc(b.phone)}</a>` : '';
  const chips = [b.licence ? `${b.licence.label} ${b.licence.number}` : '', b.hours ?? '', b.areas.length ? `Servicing ${b.areas.slice(0, 3).join(', ')}${b.areas.length > 3 ? ' and more' : ''}` : '']
    .filter(Boolean).map((c) => `<li>${esc(c)}</li>`).join('') + (url(b.reviewsUrl) ? `<li><a href="${esc(url(b.reviewsUrl))}" rel="noopener">★ Our Google reviews</a></li>` : '');
  const sample = d.sample ? '<span class="pill">Sample</span>' : '';

  const site = `
<header class="s-head"><div class="w"><span class="s-name">${esc(b.name)}</span>${phone}</div></header>
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
  <p class="s-note">This form switches on when the site goes live. In this preview it doesn't send anything.</p>
</div></section>
<footer class="s-foot"><div class="w">${esc(b.name)}${b.licence ? ` · ${esc(b.licence.label)} ${esc(b.licence.number)}` : ''}${b.phone ? ` · ${esc(b.phone)}` : ''}${b.email ? ` · ${esc(b.email)}` : ''}</div></footer>`;

  const total = r.searches.reduce((n, s) => n + (s.volume || 0), 0);
  const panel = `
<section class="imn" id="built-for-you"><div class="w">
  <p class="small"><span class="pill">Built for ${esc(b.name)}</span>Only you can see this part. It won't be on your live site.</p>
  <h2>What we found, and why we built it this way</h2>
  <p class="lede">We looked at how ${esc(b.name)} shows up online today, what people near you search for, and who Google shows them instead. Here's what we found, checked ${esc(r.checked)}.</p>

  ${r.found.length ? `<h3>What we noticed</h3><div class="box"><ul class="found">${r.found.map((f) => `<li><b>${esc(f.t)}.</b> ${esc(f.d)}${url(f.source) ? ` <a class="small" href="${esc(url(f.source))}" rel="noopener">(see)</a>` : ''}</li>`).join('')}</ul></div>` : ''}

  ${r.searches.length ? `<h3>What people near you search on Google</h3><div class="box"><table class="tbl"><thead><tr><th>Search</th><th style="text-align:right">A month</th></tr></thead><tbody>${r.searches.map((s) => `<tr><td>${esc(s.q)}</td><td class="n">${nf(s.volume)}</td></tr>`).join('')}</tbody></table>
  <p class="small">About ${nf(total)} searches a month across these, Google Australia. Your new site is written so Google can match it to them.</p></div>` : ''}

  ${r.competitors.length ? `<h3>Who Google shows instead right now</h3><div class="box"><ul class="found">${r.competitors.map((c) => `<li><b>${url(c.url) ? `<a href="${esc(url(c.url))}" rel="noopener nofollow">${esc(c.name)}</a>` : esc(c.name)}</b>: ${esc(c.note)}</li>`).join('')}</ul></div>` : ''}

  ${r.built.length ? `<h3>What we built, and why</h3><div class="box"><ul class="found">${r.built.map((x) => `<li><b>${esc(x.t)}</b>: ${esc(x.why)}</li>`).join('')}</ul></div>` : ''}

  <div class="offer">
    <h3>Want it live?</h3>
    <p><strong>$99 + GST a month</strong> ($108.90 inc GST). We put this live on your own web address, host it, check it every day and make up to 2 rounds of changes a month. <strong>No setup fee, no lock-in contract</strong>: cancel any time.</p>
    <p>Want changes first? Just reply to my email and tell me what to change. No charge for that.</p>
    <a class="s-btn" href="${IMN.plan}" rel="noopener">Start my plan</a>
    <p class="small" style="color:#AEB6C5">Payment is handled by Stripe. We never ask for card details by email. Prefer to talk first? Email <a class="l" href="mailto:${IMN.email}?subject=${encodeURIComponent(`Website preview: ${b.name}`)}">${IMN.email}</a> and I'll call you.</p>
  </div>

  <h3>Who made this, and how to check us</h3>
  <div class="box"><ul class="legit">
    <li>Made by Simon at <a href="${IMN.site}" rel="noopener">${IMN.name}</a>, a Melbourne company (Pty Ltd). Check our ABN ${IMN.abn} on the <a href="${IMN.abnUrl}" rel="noopener">government's ABN Lookup</a>.</li>
    <li>This preview asks for nothing: no login, no form that sends, no payment details.</li>
    <li>It was built only from information ${esc(b.name)} already publishes${r.sources.length ? ` (${r.sources.map((s) => url(s.url) ? `<a href="${esc(url(s.url))}" rel="noopener">${esc(s.t)}</a>` : esc(s.t)).join(', ')})` : ''}. Want it taken down? Email ${IMN.email} and it's gone the same day.</li>
    <li>It isn't on Google and stops working on ${esc(day(row.expires_at))}.</li>
  </ul></div>
</div></section>`;

  const bar = `<div class="trust"><div class="w"><span>${sample}<b>Private preview</b> for ${esc(b.name)} · made by ${IMN.name} · not live</span><a href="#built-for-you">Why you're seeing this ↓</a></div></div>`;
  return shell(`${b.name}: website preview`, bar + site + panel, brand, accent);
}

function message(title: string, text: string, status: number) {
  return new Response(shell(title, `<div class="trust"><div class="w"><span><b>${IMN.name}</b></span><a href="${IMN.site}">imnetwork.com.au</a></div></div>
<section class="imn" style="border-top:0"><div class="w"><h2>${esc(title)}</h2><p class="lede">${text}</p></div></section>`), { status, headers: HEADERS });
}

export async function preview(env: { DB: D1Database }, slug: string, method: string, count = true): Promise<Response> {
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
  return new Response(method === 'HEAD' ? null : render(row, d), { headers: HEADERS });
}
