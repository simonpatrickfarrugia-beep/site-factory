# Community Help Co Check-in

A private, installable web app (PWA) at **https://checkin.communityhelp.com.au**. Simon sends his mentoring clients scheduled reminders and messages; they arrive as phone notifications. Clients tick reminders (Done / Not today) and their weekly goals; Simon reviews it all before each session.

- Code: `workers/checkin/` (Worker `chc-checkin`). Front end: `workers/checkin/public/` (plain JS, no build step).
- Database: its own D1, `chc-checkin` (id `39d0e041-9743-4e0d-a9ae-eaef1dea2da4`), never the public sites' `site-factory-forms`.
- Cron: every minute (`* * * * *`), sends due reminders. Workers Free allows 5 crons per account; this is the 4th (pipeline 2, HQ 1).
- Cost: A$0 (Workers Free, D1 free, Web Push is free, email through the existing Microsoft 365 app).

## Privacy rules (NDIS clients)
- Stores only: first name, email, reminders, goal text, ticks, "Not today" notes and messages.
- Never add fields for health or diagnosis info, NDIS numbers or addresses.
- **Never put client names, goals or messages in this repo** (it's public). Client data lives only in D1.
- Every response sends `X-Robots-Tag: noindex`; `robots.txt` blocks everything; the app needs a login for every API call and each client query is scoped to that client's id.
- Admin has **Export** (JSON download) and **Delete** (removes every row) per client: Clients → name → Settings.

## How it works
| Part | How |
|---|---|
| Login | Magic link **and** a 6-digit code in the same email. Link → "Log me in" page → button (so email scanners can't use the link up). Code is for iPhone home-screen apps (they don't share Safari's login). Client sessions 90 days, admin 30, both sliding. |
| Admin | Emails in `ADMIN_EMAILS` (simon@communityhelp.com.au). |
| Invites | Admin adds first name + email → invite link valid 7 days. |
| Reminders | once / daily / chosen weekdays / weekly, time + time zone (default Australia/Melbourne), start/end date, on/off, optional linked goal. `next_run_at` is precomputed; the cron claims each due row before sending so nothing double-sends. More than 90 minutes late (outage) = skipped. |
| Push | Standard Web Push: VAPID (RFC 8292) + aes128gcm (RFC 8291) in `src/push.ts`, WebCrypto only. The VAPID key pair is generated on first use and stored in D1 `settings` (no secret to manage). Dead subscriptions (404/410) are deleted. |
| Email fallback | No working push subscription → the reminder is emailed with a signed one-tap **Done** / **Not today** link (`/r/<id>`). New message from Simon with no push → short "you have a message" email (no content), max every 30 min. Client message with no admin push → email to Simon, max hourly per client. |
| Email sending | Service binding `MAILER` → `imn-hq`'s `Mailer` entrypoint → Microsoft Graph `sendMail` from simon@communityhelp.com.au (same Entra app as HQ one-click send). Optional instead: secrets `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET` on `chc-checkin`. Bodies contain "Community Advocate" so the Exchange signature rule doesn't stack the full signature. Not saved to Sent Items. |
| Goals | 5–7 per week (week starts Monday). Each has a "times" target (e.g. 3 for "Showered 3 times"; guessed from the text when pasted). Paste from the goals spreadsheet, or copy last week (linked reminders move across). Done on a goal-linked reminder ticks that goal once; changing it back un-ticks. All goals done → "All green! 🎉". |
| Activity | Per reminder per day: ✅ done, ✋ not today (+ note), 👀 opened, 📩 sent by push, ✉️ sent by email, ⚠️ couldn't reach. Plus the week's goal ticks. |
| Security | Session cookie HttpOnly/Secure/SameSite=Lax; API writes need the `x-checkin: 1` header (CSRF); CSP `script-src 'self'`; codes lock after 5 wrong tries; 6 login emails per address per hour. |

## One-time setup (Simon)
1. Cloudflare → Workers & Pages → Create → **Import a repository** → `site-factory`. Project name `chc-checkin`. Build command: leave empty. Deploy command: `npx wrangler deploy --config workers/checkin/wrangler.jsonc`. Root directory: leave empty. Save and deploy.
2. The custom domain `checkin.communityhelp.com.au` is created by the deploy (it's in `routes`). The Microsoft 365 email records aren't touched.
3. Open https://checkin.communityhelp.com.au, log in with simon@communityhelp.com.au.

The database tables already exist (created 19 Nov 2026). Later schema changes: add `migrations/0002_*.sql` and run `npx wrangler d1 migrations apply chc-checkin --remote --config workers/checkin/wrangler.jsonc`.

## Later (structured for, not built)
- **Daily journal** + optional paid quarterly AI summaries: new table `journal_entries` (migration 0002), a Journal tab, summaries via the Claude API on a schedule.
- **Goals sync from the spreadsheet**: `goals.source` / `goals.external_ref` are there for it; a sync job would upsert by `external_ref`.

## Testing
Run locally against an in-memory SQLite D1 with mocked push endpoints (Node 22 `node:sqlite` + tsx): 65 API/crypto checks (push payload decrypted with a test key pair, VAPID JWT verified, DST maths, isolation between clients, export/delete) and 13 Playwright phone-screen checks (admin sets up client + reminder + goals → client logs in → reminder → Done → Simon sees it). Real delivery to a phone can only be checked live with "Send test notification".
