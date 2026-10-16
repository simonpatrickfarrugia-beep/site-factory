/**
 * Shared forms Worker for every brand.
 *
 *   POST /submit/<form>          store a form submission, email a notification
 *   POST /vote/<item>            record a poll answer ({ answer })
 *   GET  /vote/<item>            current poll counts
 *
 * The brand is worked out from the Origin header, so one Worker serves all sites.
 * Submissions go to D1 (free, no record cap). Spam is filtered with Turnstile.
 */

export interface Env {
  DB: D1Database;
  /** Map of allowed origin hostname -> brand slug, as JSON. e.g. {"movietrailer.channel":"trailers"} */
  BRAND_ORIGINS: string;
  /** Forms each brand accepts, as JSON. e.g. {"trailers":["contact","submission","notify"]} */
  BRAND_FORMS: string;
  /** Where notification emails go. */
  NOTIFY_TO: string;
  /** Sender address on the factory's verified Resend domain. */
  NOTIFY_FROM: string;
  /** Secrets (set in Cloudflare, never committed). Optional so the Worker runs before they exist. */
  TURNSTILE_SECRET?: string;
  RESEND_API_KEY?: string;
}

const MAX_FIELDS = 30;
const MAX_VALUE = 5000;
const VOTE_ANSWERS = new Set(['yes', 'no', 'maybe']);

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

function resolveBrand(request: Request, env: Env): { brand: string; origin: string } | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  let host: string;
  try {
    host = new URL(origin).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  // Exact hostnames only (list preview hosts like site-factory.<acct>.workers.dev explicitly).
  const map = JSON.parse(env.BRAND_ORIGINS) as Record<string, string>;
  const brand = map[host];
  return brand ? { brand, origin } : null;
}

function cors(origin: string) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };
}

async function readBody(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get('content-type') ?? '';
  const out: Record<string, string> = {};
  if (type.includes('application/json')) {
    const data = (await request.json()) as Record<string, unknown>;
    for (const [k, v] of Object.entries(data)) out[k] = String(v ?? '');
  } else {
    const form = await request.formData();
    for (const [k, v] of form.entries()) if (typeof v === 'string') out[k] = v;
  }
  return out;
}

async function passesTurnstile(token: string | undefined, ip: string | null, env: Env): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true; // not configured yet: accept (honeypot still applies)
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const result = (await res.json()) as { success: boolean };
  return result.success;
}

async function notify(env: Env, brand: string, form: string, fields: Record<string, string>, page: string | null) {
  if (!env.RESEND_API_KEY) return;
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n');
  const replyTo = fields.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email) ? fields.email : undefined;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.NOTIFY_FROM,
      to: env.NOTIFY_TO,
      reply_to: replyTo,
      subject: `[${brand}] New ${form} submission`,
      text: `${lines}\n\nSent from: ${page ?? 'unknown page'}`,
    }),
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const match = resolveBrand(request, env);
    if (!match) return json({ error: 'Unknown site' }, 403);
    const headers = cors(match.origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

    const [, action, name] = url.pathname.split('/');
    if (!name || !/^[a-z0-9-]{1,120}$/.test(name)) return json({ error: 'Not found' }, 404, headers);

    // --- Form submissions ---
    if (action === 'submit' && request.method === 'POST') {
      const forms = (JSON.parse(env.BRAND_FORMS) as Record<string, string[]>)[match.brand] ?? [];
      if (!forms.includes(name)) return json({ error: 'Unknown form' }, 404, headers);

      const fields = await readBody(request);
      // Honeypot: real people never fill this hidden field.
      if (fields.company_website) return json({ ok: true }, 200, headers);
      const token = fields['cf-turnstile-response'];
      delete fields['cf-turnstile-response'];
      delete fields.company_website;

      if (!(await passesTurnstile(token, request.headers.get('cf-connecting-ip'), env))) {
        return json({ error: 'Spam check failed. Please try again.' }, 400, headers);
      }
      const entries = Object.entries(fields).slice(0, MAX_FIELDS).map(([k, v]) => [k.slice(0, 60), v.slice(0, MAX_VALUE)]);
      if (!entries.length) return json({ error: 'The form was empty.' }, 400, headers);
      const clean = Object.fromEntries(entries) as Record<string, string>;
      const page = request.headers.get('referer');

      await env.DB.prepare('INSERT INTO submissions (id, brand, form, data, page) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), match.brand, name, JSON.stringify(clean), page)
        .run();
      ctx.waitUntil(notify(env, match.brand, name, clean, page).catch(() => {}));
      return json({ ok: true }, 200, headers);
    }

    // --- Poll votes ---
    if (action === 'vote') {
      if (request.method === 'POST') {
        const { answer } = await readBody(request);
        if (!VOTE_ANSWERS.has(answer)) return json({ error: 'Unknown answer' }, 400, headers);
        await env.DB.prepare(
          'INSERT INTO votes (brand, item, answer, count) VALUES (?, ?, ?, 1) ON CONFLICT (brand, item, answer) DO UPDATE SET count = count + 1',
        )
          .bind(match.brand, name, answer)
          .run();
      }
      const { results } = await env.DB.prepare('SELECT answer, count FROM votes WHERE brand = ? AND item = ?')
        .bind(match.brand, name)
        .all<{ answer: string; count: number }>();
      const counts = Object.fromEntries(results.map((r) => [r.answer, r.count]));
      return json({ counts }, 200, headers);
    }

    return json({ error: 'Not found' }, 404, headers);
  },
};
