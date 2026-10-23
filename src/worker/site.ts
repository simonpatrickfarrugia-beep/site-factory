/**
 * Small Worker in front of a brand's static site. Only /api/* reaches this code
 * (wrangler "run_worker_first"); every other request is served straight from the built files.
 *
 *   POST /api/subscribe   email list signup: { email, source?, interests? } (JSON or a plain HTML form post)
 *
 * Same origin as the site, so no CORS. Signups go to the shared D1 database (site-factory-forms),
 * table `subscribers`, one row per brand + email. Spam: a hidden honeypot field.
 */
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  /** Brand slug, set per brand in its wrangler.jsonc vars. */
  BRAND: string;
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
    if (pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
