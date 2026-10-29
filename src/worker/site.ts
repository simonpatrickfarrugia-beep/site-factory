/**
 * Small Worker in front of a brand's static site. Only /api/* reaches this code
 * (wrangler "run_worker_first"); every other request is served straight from the built files.
 *
 *   POST /api/subscribe   email list signup: { email, source?, interests? } (JSON or a plain HTML form post)
 *   POST /api/submit/<form>  a form submission (enquiry, referral…), for forms listed in the brand's FORMS var.
 *                            Stored in table `submissions` (one row, fields as JSON).
 *   GET  /api/jobs?q=&where=&hours=part|any&type=casual|temp|perm|any&page=  live job ads from Careerjet (brands with JOBS="1"),
 *                            each tagged with what the ad itself says (work from home, no experience, flexible hours…).
 *   GET  /api/plan-email     { enabled }: whether "Email me this plan" is switched on (PLAN_EMAIL="1" + RESEND_API_KEY secret).
 *   POST /api/plan-email     { email, url }: emails the visitor a link to one of OUR plan pages (title + description read from
 *                            the built page, never from the request, so it can't be used to send arbitrary text), and adds
 *                            them to the list (interests "plans"). Max 3 sends per email per day.
 *   GET  /api/unsubscribe?e=&t=  one-click unsubscribe (t = HMAC of the email), linked from every email.
 *   GET  /api/submit/status?since=<ISO time>  how many submissions arrived since then: a count only, never any details.
 *                            The `enquiries` GitHub workflow polls it and opens an issue (emailed to Simon) when it's above 0.
 *
 * Same origin as the site, so no CORS. Signups go to the shared D1 database (site-factory-forms),
 * table `subscribers`, one row per brand + email. Spam: a hidden honeypot field.
 */
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  /** Brand slug, set per brand in its wrangler.jsonc vars. */
  BRAND: string;
  /** Comma-separated form names this brand accepts at /api/submit/<form> (e.g. "enquiry,referral"). */
  FORMS?: string;
  /** "1" turns on /api/jobs for this brand. */
  JOBS?: string;
  /** Careerjet publisher API key (v4 API, basic auth; free account, Careerjet shares revenue on clicks).
   *  A Worker SECRET set in the Cloudflare dashboard, never in the repo. Until it's set, /api/jobs says so. */
  CAREERJET_KEY?: string;
  /** "1" offers "Email me this plan" (needs RESEND_API_KEY as a Worker secret and the domain verified in Resend). */
  PLAN_EMAIL?: string;
  RESEND_API_KEY?: string;
  /** From address for plan emails, e.g. "Vic Tours <plans@victours.com.au>". */
  MAIL_FROM?: string;
}

const EMAIL = /^[^@\s<>"']{1,64}@[^@\s<>"']{1,190}\.[a-z]{2,24}$/i;

async function readBody(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get('content-type') ?? '';
  const out: Record<string, string> = {};
  try {
    if (type.includes('application/json')) {
      for (const [k, v] of Object.entries((await request.json()) as Record<string, unknown>)) out[k] = String(v ?? '');
    } else {
      for (const [k, v] of (await request.formData()).entries()) if (typeof v === 'string') out[k] = v;
    }
  } catch {
    /* empty or malformed body: treated as missing fields */
  }
  return out;
}

async function subscribe(request: Request, env: Env): Promise<Response> {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const back = (ok: boolean, message: string, status = ok ? 200 : 400) => {
    if (wantsJson) return Response.json({ ok, message }, { status });
    // Plain form post (no JavaScript): send the visitor back to the page they came from.
    let to = '/';
    try { const r = new URL(request.headers.get('referer') ?? '/', request.url); if (r.host === new URL(request.url).host) to = r.pathname; } catch { /* keep / */ }
    return Response.redirect(new URL(`${to}?subscribed=${ok ? 1 : 0}#signup`, request.url).toString(), 303);
  };

  const f = await readBody(request);
  if (f.company_website) return back(true, "You're on the list."); // honeypot: bots fill hidden fields
  const email = (f.email ?? '').trim().toLowerCase();
  if (!EMAIL.test(email)) return back(false, 'That email address doesn’t look right.');
  const source = (f.source ?? request.headers.get('referer') ?? '').slice(0, 300);
  const interests = (f.interests ?? '').slice(0, 200);

  await env.DB.prepare(
    `INSERT INTO subscribers (brand, email, source, interests) VALUES (?, ?, ?, ?)
     ON CONFLICT (brand, email) DO UPDATE SET unsubscribed_at = NULL, interests = COALESCE(NULLIF(excluded.interests, ''), interests)`,
  ).bind(env.BRAND, email, source, interests).run();
  return back(true, "You're on the list. Thanks!");
}

async function submit(request: Request, env: Env, form: string): Promise<Response> {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json') || request.headers.get('sec-fetch-mode') === 'cors';
  const page = (() => { try { return new URL(request.headers.get('referer') ?? '/', request.url).pathname; } catch { return '/'; } })();
  const back = (ok: boolean, message: string, status = ok ? 200 : 400) =>
    wantsJson ? Response.json({ ok, message }, { status }) : Response.redirect(new URL(`${page}?sent=${ok ? 1 : 0}#${form}`, request.url).toString(), 303);

  const f = await readBody(request);
  if (f.company_website) return back(true, 'Sent.'); // honeypot
  const email = (f.email ?? '').trim();
  if (!EMAIL.test(email)) return back(false, 'That email address doesn’t look right.');
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) {
    if (k === 'company_website' || Object.keys(data).length >= 20) continue;
    data[k.slice(0, 40)] = String(v).trim().slice(0, 4000);
  }
  await env.DB.prepare('INSERT INTO submissions (id, brand, form, data, page) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), env.BRAND, form, JSON.stringify(data), page.slice(0, 300)).run();
  return back(true, 'Sent.');
}

// ---------------------------------------------------------------- job ads (Careerjet)
const FLAGS: { key: string; re: RegExp }[] = [
  { key: 'remote', re: /\b(work(ing)? from home|wfh|remote|hybrid)\b/i },
  { key: 'noexp', re: /\b(no (prior )?experience (needed|required|necessary)|entry[- ]level|trainee(ship)?|apprentice(ship)?|will train|training provided|graduate)\b/i },
  { key: 'flexible', re: /\b(flexible (hours|hrs|roster|working|shifts)|school hours|choose your (own )?hours|days? to suit)\b/i },
  { key: 'casual', re: /\bcasual\b/i },
  { key: 'parttime', re: /\bpart[- ]time\b/i },
  { key: 'licence', re: /\b(driver'?s? licen[cs]e|own (car|vehicle)|reliable (car|vehicle|transport))\b/i },
];
const strip = (s: unknown) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

async function jobs(request: Request, env: Env): Promise<Response> {
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
  if (!env.CAREERJET_KEY) return json({ ok: false, reason: 'setup', message: 'Live job search is being set up.' }, 503);
  const u = new URL(request.url);
  const clean = (k: string, n: number) => (u.searchParams.get(k) ?? '').replace(/[^\p{L}\p{N} ,'&/+.-]/gu, ' ').trim().slice(0, n);
  const q = clean('q', 80);
  const where = clean('where', 60) || 'Australia';
  const hours = u.searchParams.get('hours') === 'part' ? 'part' : 'any';
  const type = (['casual', 'temp', 'perm'] as const).find((t) => t === u.searchParams.get('type')) ?? 'any';
  const page = Math.max(1, Math.min(10, Number(u.searchParams.get('page')) || 1));
  // Careerjet has no "casual" contract type, so casual work is a keyword; temporary and permanent are real filters.
  const keywords = [q, type === 'casual' ? 'casual' : ''].filter(Boolean).join(' ');
  // Careerjet v4 API: https://www.careerjet.com/partners/api (basic auth: key as username, empty password).
  const api = new URL('https://search.api.careerjet.net/v4/query');
  const params: Record<string, string> = {
    locale_code: 'en_AU', keywords, location: where, sort: 'date', page_size: '20', page: String(page), fragment_size: '320',
    user_ip: request.headers.get('cf-connecting-ip') ?? '0.0.0.0', user_agent: (request.headers.get('user-agent') ?? 'Mozilla/5.0').slice(0, 300),
  };
  if (hours === 'part') params.work_hours = 'p';
  if (type === 'temp') params.contract_type = 't';
  if (type === 'perm') params.contract_type = 'p';
  for (const [k, v] of Object.entries(params)) api.searchParams.set(k, v);
  let data: Record<string, any>;
  let upstream = 0;
  try {
    const r = await fetch(api.toString(), {
      headers: { accept: 'application/json', authorization: `Basic ${btoa(`${env.CAREERJET_KEY}:`)}`, referer: `${u.origin}/job-finder` },
    });
    upstream = r.status;
    if (!r.ok) throw new Error(`careerjet ${r.status}: ${(await r.text()).slice(0, 200)}`);
    data = (await r.json()) as Record<string, any>;
  } catch (e) {
    console.error('jobs failed', e);
    // upstream = Careerjet's HTTP status (403 usually means the server IP isn't declared in the Careerjet partner account).
    return json({ ok: false, reason: 'down', upstream, message: 'Live job search is not responding right now.' }, 502);
  }
  if (data.type === 'LOCATIONS') return json({ ok: true, hits: 0, pages: 0, jobs: [], places: (data.locations ?? data.solveLocations ?? []).map((l: any) => strip(typeof l === 'string' ? l : l.name)).slice(0, 8) });
  const list = Array.isArray(data.jobs) ? data.jobs : [];
  return json({
    ok: true, hits: Number(data.hits) || 0, pages: Number(data.pages) || 0,
    jobs: list.map((j: Record<string, unknown>) => {
      const title = strip(j.title).slice(0, 160);
      const text = `${title} ${strip(j.description)}`;
      return {
        title, company: strip(j.company).slice(0, 100), where: strip(j.locations).slice(0, 100), date: strip(j.date).slice(0, 40),
        salary: strip(j.salary).slice(0, 80), snippet: strip(j.description).slice(0, 320), url: String(j.url ?? ''),
        flags: FLAGS.filter((f) => f.re.test(text)).map((f) => f.key),
      };
    }).filter((j: { url: string }) => /^https:\/\//.test(j.url)),
  });
}

// ---------------------------------------------------------------- "Email me this plan" (Resend)
const planEmailOn = (env: Env) => env.PLAN_EMAIL === '1' && !!env.RESEND_API_KEY && !!env.MAIL_FROM;
async function unsubToken(email: string, env: Env): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`unsub:${env.RESEND_API_KEY ?? ''}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${env.BRAND}:${email}`));
  return [...new Uint8Array(sig)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const htmlEsc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const decodeEntities = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function planEmail(request: Request, env: Env): Promise<Response> {
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
  if (request.method === 'GET') return json({ enabled: planEmailOn(env) });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!planEmailOn(env)) return json({ ok: false, message: 'Plan emails aren’t switched on yet.' }, 503);
  const f = await readBody(request);
  if (f.company_website) return json({ ok: true, message: 'Sent! Check your inbox.' });
  const email = (f.email ?? '').trim().toLowerCase();
  if (!EMAIL.test(email)) return json({ ok: false, message: 'That email address doesn’t look right.' }, 400);
  const origin = new URL(request.url).origin;
  let target: URL;
  try { target = new URL(f.url ?? '', origin); } catch { return json({ ok: false, message: 'Unknown plan.' }, 400); }
  if (target.origin !== origin || !/^\/(day-trips|weekends|trip-builder|road-trips)(\/|$)/.test(target.pathname)) return json({ ok: false, message: 'Unknown plan.' }, 400);
  // Read the plan's own title and description from the built page (nothing from the request goes into the email text).
  const page = await env.ASSETS.fetch(new Request(new URL(target.pathname, origin).toString()));
  if (!page.ok) return json({ ok: false, message: 'Unknown plan.' }, 400);
  const html = await page.text();
  const title = decodeEntities((html.match(/<title>([^<]{1,200})<\/title>/) ?? [])[1] ?? 'Your trip plan').replace(/\s*\|\s*[^|]+$/, '');
  const desc = decodeEntities((html.match(/<meta name="description" content="([^"]{1,400})"/) ?? [])[1] ?? '');
  // Rate limit: 3 plan emails per address per day.
  const sent = await env.DB.prepare(`SELECT COUNT(*) AS n FROM submissions WHERE brand = ? AND form = 'plan-email' AND page = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')`)
    .bind(env.BRAND, email).first<{ n: number }>();
  if ((sent?.n ?? 0) >= 3) return json({ ok: false, message: 'We’ve already sent a few plans to that address today. Check your inbox (and spam folder).' }, 429);
  await env.DB.prepare(
    `INSERT INTO subscribers (brand, email, source, interests) VALUES (?, ?, ?, 'plans')
     ON CONFLICT (brand, email) DO UPDATE SET unsubscribed_at = NULL`,
  ).bind(env.BRAND, email, target.pathname.slice(0, 300)).run();
  const link = `${target.origin}${target.pathname}${target.pathname === '/trip-builder' ? target.search : ''}`;
  const unsub = `${origin}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${await unsubToken(email, env)}`;
  const site = new URL(origin).host;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM, to: [email], subject: `Your plan: ${title}`,
      headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      text: `${title}\n\n${desc}\n\nOpen your plan: ${link}\n\nCheck opening hours and prices before you go.\n\nYou'll also get new day trips and weekend ideas from ${site} about once a month. Unsubscribe any time: ${unsub}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#1f2a24;max-width:560px">
        <h1 style="font-size:22px;color:#00653B;margin:0 0 8px">${htmlEsc(title)}</h1>
        <p style="margin:0 0 16px">${htmlEsc(desc)}</p>
        <p style="margin:0 0 20px"><a href="${htmlEsc(link)}" style="background:#00653B;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Open your plan</a></p>
        <p style="margin:0 0 16px;color:#555">Check opening hours and prices before you go. Have a great trip!</p>
        <p style="font-size:13px;color:#777;margin:24px 0 0">You'll also get new day trips and weekend ideas from ${htmlEsc(site)} about once a month. <a href="${htmlEsc(unsub)}" style="color:#777">Unsubscribe</a>.</p>
      </div>`,
    }),
  });
  await env.DB.prepare('INSERT INTO submissions (id, brand, form, data, page) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), env.BRAND, 'plan-email', JSON.stringify({ url: link, status: r.status }), email).run();
  if (!r.ok) { console.error('resend failed', r.status, await r.text()); return json({ ok: false, message: 'That didn’t send. Please try again in a minute.' }, 502); }
  return json({ ok: true, message: 'Sent! Check your inbox (and your spam folder, just in case).' });
}

async function unsubscribe(request: Request, env: Env): Promise<Response> {
  const u = new URL(request.url);
  const email = (u.searchParams.get('e') ?? '').trim().toLowerCase();
  const page = (msg: string, status = 200) => new Response(`<!doctype html><meta name="viewport" content="width=device-width"><title>Unsubscribe</title><body style="font-family:Arial,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem"><h1 style="font-size:1.4rem">${htmlEsc(msg)}</h1><p><a href="/">Back to the site</a></p></body>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  if (!EMAIL.test(email) || u.searchParams.get('t') !== (await unsubToken(email, env))) return page('That unsubscribe link isn’t valid. Reply to any email and we’ll remove you.', 400);
  await env.DB.prepare(`UPDATE subscribers SET unsubscribed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE brand = ? AND email = ?`).bind(env.BRAND, email).run();
  return page('You’re unsubscribed. You won’t get any more emails from us.');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/subscribe') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
      try {
        return await subscribe(request, env);
      } catch (e) {
        console.error('subscribe failed', e);
        return Response.json({ ok: false, message: 'Something went wrong. Please try again.' }, { status: 500 });
      }
    }
    if (pathname === '/api/submit/status' && (env.FORMS ?? '').trim()) {
      const since = new URL(request.url).searchParams.get('since') ?? '';
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/.test(since)) return Response.json({ ok: false, message: 'since must be an ISO UTC time' }, { status: 400 });
      const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM submissions WHERE brand = ? AND created_at > ?').bind(env.BRAND, since).first<{ n: number }>();
      return Response.json({ ok: true, count: row?.n ?? 0 }, { headers: { 'cache-control': 'no-store' } });
    }
    const sub = pathname.match(/^\/api\/submit\/([a-z0-9-]{1,40})$/);
    const allowed = (env.FORMS ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    if (sub && allowed.includes(sub[1])) {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
      try {
        return await submit(request, env, sub[1]);
      } catch (e) {
        console.error('submit failed', e);
        return Response.json({ ok: false, message: 'Something went wrong. Please try again.' }, { status: 500 });
      }
    }
    if (pathname === '/api/plan-email') {
      try { return await planEmail(request, env); } catch (e) { console.error('plan-email failed', e); return Response.json({ ok: false, message: 'Something went wrong. Please try again.' }, { status: 500 }); }
    }
    if (pathname === '/api/unsubscribe') return unsubscribe(request, env);
    if (pathname === '/api/jobs' && env.JOBS === '1') {
      if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { allow: 'GET' } });
      return jobs(request, env);
    }
    if (pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
