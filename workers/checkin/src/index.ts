// Community Help Co Check-in: goal reminders and messages between Simon and his clients.
// Worker `chc-checkin` on checkin.communityhelp.com.au. Docs: docs/CHECKIN.md.
//   /auth/*  passwordless login        /api/*  JSON API (session cookie)
//   /r/:id   one-tap Done from a fallback email     everything else: the app (public/)
// Cron (every minute): sends reminders that are due.

import { bad, json, runDue, sign, now, type Env } from './core';
import { getSession, handleAuth, page } from './auth';
import { handleApi, respond } from './api';
import { esc } from './mail';

const SECURITY: Record<string, string> = {
  'x-robots-tag': 'noindex, nofollow, noarchive',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'strict-transport-security': 'max-age=31536000',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};

function secure(res: Response) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY)) if (!r.headers.has(k)) r.headers.set(k, v);
  return r;
}

async function oneTap(env: Env, req: Request, url: URL, id: number) {
  const a = url.searchParams.get('a') === 'not_today' ? 'not_today' : 'done';
  const s = url.searchParams.get('s') || '';
  if (s !== (await sign(env, `d:${id}`))) return page('Link not valid', '<h1>That link isn\'t valid</h1><p><a class="btn primary big" href="/">Open Check-in</a></p>', 400);
  const d = await env.DB.prepare('SELECT client_id, message, status FROM deliveries WHERE id = ?').bind(id).first<{ client_id: number; message: string; status: string | null }>();
  if (!d) return page('Not found', '<h1>That reminder is gone</h1>', 404);
  if (req.method === 'POST') {
    const form = await req.formData().catch(() => null);
    const note = String(form?.get('note') ?? '').slice(0, 280).trim();
    await respond(env, d.client_id, id, a, note);
    return page('Saved', a === 'done'
      ? '<div class="celebrate-static">✅</div><h1>Nice work!</h1><p>That\'s ticked off. Simon will see it.</p><p><a class="btn big" href="/#today">Open Check-in</a></p>'
      : '<h1>Thanks for letting Simon know</h1><p>Tomorrow is a fresh start.</p><p><a class="btn big" href="/#today">Open Check-in</a></p>');
  }
  // GET shows a button, so link scanners in email apps can't tick it by accident.
  const q = `?a=${a}&s=${esc(s)}`;
  return page('Check-in', `<p class="eyebrow">Reminder</p><h1>${esc(d.message)}</h1>
<form method="post" action="/r/${id}${q}">${a === 'done'
    ? '<button class="btn done big" type="submit">Done ✅</button>'
    : '<label class="field"><span>Want to say why? (optional)</span><input name="note" maxlength="280"></label><button class="btn big" type="submit">Not today</button>'}</form>`);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (p === '/robots.txt') return secure(new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain' } }));

      if (p.startsWith('/auth/')) {
        const r = await handleAuth(env, req, url);
        return secure(r ?? bad('Not found', 404));
      }

      const tap = p.match(/^\/r\/(\d+)$/);
      if (tap) return secure(await oneTap(env, req, url, +tap[1]));

      if (p.startsWith('/api/')) {
        // CSRF guard: the app always sends this header; a form on another site can't.
        if (req.method !== 'GET' && req.headers.get('x-checkin') !== '1') return secure(bad('Missing app header', 403));
        const sess = await getSession(env, req);
        if (!sess) return secure(bad('Not logged in', 401));
        const res = (await handleApi(env, req, url, sess.s)) ?? bad('Not found', 404);
        if (sess.setCookie) res.headers.append('set-cookie', sess.setCookie);
        return secure(res);
      }

      // The app itself: static files; unknown paths get the app shell.
      const res = await env.ASSETS.fetch(req);
      const out = secure(res);
      if (p === '/sw.js' || p === '/' || p.endsWith('.html')) out.headers.set('cache-control', 'no-cache');
      return out;
    } catch (e) {
      console.error('request failed', p, (e as Error).stack || e);
      return secure(json({ error: 'Something went wrong. Please try again.' }, 500));
    }
  },

  async scheduled(_ev: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDue(env).then((r) => { if (r.length) console.log('reminders', now(), JSON.stringify(r)); }));
  },
};
