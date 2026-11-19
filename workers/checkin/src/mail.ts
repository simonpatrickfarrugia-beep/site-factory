// Email through Microsoft 365 (Graph sendMail), the same Entra app IMN HQ already uses. $0.
// Route 1: the MAILER service binding to imn-hq's Mailer entrypoint (no new secrets).
// Route 2: this Worker's own MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET secrets, if set.
// No route (local dev): the email is logged to the console.
//
// Every email body contains "Community Advocate", so the Exchange "Community Help Co signature" rule
// doesn't stack Simon's full signature on top of app emails.

export interface MailEnv {
  MAILER?: { send(msg: { to: string; subject: string; html: string; saveToSentItems?: boolean }): Promise<{ ok: boolean; error?: string }> };
  MS_TENANT_ID?: string;
  MS_CLIENT_ID?: string;
  MS_CLIENT_SECRET?: string;
  MAIL_FROM?: string;
  APP_URL?: string;
}

export const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let token: { v: string; exp: number } | null = null;
async function graphToken(env: MailEnv) {
  if (token && token.exp > Date.now() + 60_000) return token.v;
  const r = await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.MS_CLIENT_ID!, client_secret: env.MS_CLIENT_SECRET!, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
  if (!r.ok || !j.access_token) throw new Error('Microsoft sign-in failed (' + r.status + ')');
  token = { v: j.access_token, exp: Date.now() + (j.expires_in ?? 3000) * 1000 };
  return token.v;
}

export function mailConfigured(env: MailEnv) {
  return !!(env.MAILER || (env.MS_TENANT_ID && env.MS_CLIENT_ID && env.MS_CLIENT_SECRET));
}

export async function sendMail(env: MailEnv, to: string, subject: string, html: string): Promise<boolean> {
  try {
    if (env.MS_TENANT_ID && env.MS_CLIENT_ID && env.MS_CLIENT_SECRET) {
      const from = env.MAIL_FROM || 'simon@communityhelp.com.au';
      const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
        method: 'POST',
        headers: { authorization: 'Bearer ' + (await graphToken(env)), 'content-type': 'application/json' },
        body: JSON.stringify({
          message: { subject, body: { contentType: 'HTML', content: html }, toRecipients: [{ emailAddress: { address: to } }] },
          saveToSentItems: false,
        }),
      });
      if (r.status !== 202) console.error('Graph sendMail', r.status, (await r.text().catch(() => '')).slice(0, 200));
      return r.status === 202;
    }
    if (env.MAILER) {
      const r = await env.MAILER.send({ to, subject, html, saveToSentItems: false });
      if (!r.ok) console.error('Mailer', r.error);
      return r.ok;
    }
    console.log(`[mail not configured] to=${to} subject=${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')}`);
    return false;
  } catch (e) {
    console.error('sendMail failed', (e as Error).message);
    return false;
  }
}

/** One simple, warm email layout. `button` is the main action. */
export function emailHtml(o: { hello: string; lines: string[]; button?: { label: string; url: string }; after?: string[] }) {
  const p = (t: string) => `<p style="margin:0 0 14px;font-size:17px;line-height:1.5;color:#123B30">${t}</p>`;
  const btn = o.button
    ? `<p style="margin:22px 0"><a href="${esc(o.button.url)}" style="display:inline-block;background:#123B30;color:#ffffff;text-decoration:none;font-weight:bold;font-size:18px;padding:14px 26px;border-radius:12px">${esc(o.button.label)}</a></p>`
    : '';
  return `<div style="font-family:'Atkinson Hyperlegible',Verdana,Arial,sans-serif;background:#F3FBF7;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:26px 24px;border:1px solid #CFEFE0">
${p(esc(o.hello))}${o.lines.map(p).join('')}${btn}${(o.after ?? []).map(p).join('')}
<p style="margin:22px 0 0;font-size:14px;color:#3F6157">Simon · Community Advocate, Community Help Co</p>
</div></div>`;
}
