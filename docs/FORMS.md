# Forms and polls

One Worker (`workers/forms`) handles forms for every brand. Submissions are stored in the
Cloudflare D1 database `site-factory-forms` (free; no record cap like Airtable).

| Endpoint | What it does |
|---|---|
| `POST /submit/<form>` | Saves a submission and emails a notification |
| `POST /vote/<item>` with `answer=yes|no|maybe` | Records a poll answer |
| `GET /vote/<item>` | Returns poll counts |

The brand comes from the website the request is sent from (`BRAND_ORIGINS`).

## One-time setup (Cloudflare dashboard)
1. Workers & Pages → Create → Import a repository → `site-factory`, project name `forms`.
2. Build command: leave empty. Deploy command: `npx wrangler deploy --config workers/forms/wrangler.jsonc`.
3. After the first deploy: the Worker → Settings → Variables and secrets → add secrets
   `RESEND_API_KEY` and `TURNSTILE_SECRET` (optional until spam appears; a hidden honeypot field is always on).

## Reading submissions
Ask Claude ("show me this week's trailer submissions"). It queries D1 directly.

## Adding a form to a brand
Add the form name to that brand's list in `BRAND_FORMS`, then push.
