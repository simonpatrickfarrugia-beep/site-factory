/**
 * Small Worker in front of a brand's static site. Only /api/* reaches this code
 * (wrangler "run_worker_first"); every other request is served straight from the built files.
 *
 *   POST /api/subscribe   email list signup: { email, source?, interests? } (JSON or a plain HTML form post)
 *   POST /api/submit/<form>  a form submission (enquiry, referral…), for forms listed in the brand's FORMS var.
 *                            Stored in table `submissions` (one row, fields as JSON).
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
    if (pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
