# Simon Says Travel (simonsaystravel.com.au)

Monthly "Aussie Travel Pulse": where Australians want to travel, from Google Trends. Brand `simon-says-travel`, built 5 Nov 2026. (DECISIONS.md and COSTS.md entries for this are below. Copy them in at the next docs refresh.)

## 2026-11-05 · Simon Says Travel built (simonsaystravel.com.au): the monthly "Aussie Travel Pulse"

- **What:** a data site on where Australians want to travel. Each month Google Trends (Australia, 12 months, weekly) for 36 searches: 19 overseas and 11 domestic "flights to X", plus 6 travel styles (travel insurance, cruise deals, ski holidays…). One index where **Bali's last 4 weeks = 100**. Home = departure-board rankings, "Simon says" headlines worked out from the numbers, travel styles, email signup. Also monthly report pages (frozen in `archive.json`), and a page per destination with enough searches (12-month chart vs Bali, busiest and quietest month, peak week, similar destinations, Wotif hotel + Viator/GetYourGuide tour links). Brand `simon-says-travel`, theme `boarding`. Full notes: `SIMON-SAYS-TRAVEL.md`.
- **How we got here (Simon, 4–5 Nov):**
  - First idea: an FCBT corporate-lead site → dropped (employer conflict; Simon won't raise it at work).
  - Then: a leisure site that "looks like a travel agency" → reframed. It must not pose as an agency (ACL, affiliate terms); trip plans that link out are fine.
  - Final: a trends site, purely data-based. Simon overrode the one-new-site-a-month rule ("I've paid for the domain, get it live").
- **Method check:** Simon's phone screenshots (5 Nov) showed "X holiday" searches are too small and spiky. "flights to X" over 12 months is clean, so that's the method. Two pipeline runs gave the same numbers.
- **Automation:** new pipeline job `travel` (`workers/pipeline/src/travel.ts`), 07:00 Melbourne on the 6th. Batches of 4 searches + the "flights to bali" anchor are rescaled onto one scale. It writes `data/simon-says-travel/trends.json` + `archive.json`, and the commit rebuilds the site. On demand: `scripts/claude/pipe-run.sh travel`. ~US$0.10 a run.
- **Honest limits on the site:** relative interest, not counts. Searches too small to call are listed but not ranked. Capital cities include work trips. "vs last year" compares the last 4 weeks with the first 4 weeks of the window.
- **Rules kept:** Flight Centre never named. Not an agency; "nothing books through this site". Affiliate disclosure page and footer note are in place.
- **Not done yet (Simon):** Cloudflare import, DNS move from Wix, GA4. See the doc.
- **Cost:** ~US$0.10 a month from the DataForSEO credit. No new service.
- **Revisit:** after 3 monthly reports (Feb 2027). Signups, Google impressions for "flights to X", and pickup by any news site.

## Files
- `brands/simon-says-travel/` (config, `site.ts` routes, `model.ts` maths + headline sentences, `wrangler.jsonc`, icons)
- `src/templates/sst/*` (Board, Chart, Spark, Signup, pages); theme `boarding` in `src/styles/global.css`
- `data/simon-says-travel/terms.json`: the 36 searches. To add or remove one, edit here; it takes effect at the next run. Max 48. Keep the biggest searches at the top so they're batched together.
- `data/simon-says-travel/content.json`: all copy, plus `notes["YYYY-MM"]`, the optional hand-written "Simon says" note for each month
- `trends.json` and `archive.json` are written by the pipeline. Don't edit them by hand.

## Monthly loop
- On the 6th at 07:00 the `travel` job runs. The commit rebuilds the site, so new numbers, headlines and a new `/reports/YYYY-MM` page appear by themselves.
- Optional: Simon says "write this month's Simon says note" and Claude adds `notes["YYYY-MM"]`.
- Email list: signups go to D1 `subscribers` (brand `simon-says-travel`, interests `pulse`). Nothing is sent yet. Sending needs Resend (same as the Vic plan).

## Launch steps (Simon)
1. **Cloudflare, connect the repo:** Workers & Pages → Create → Import a repository → `site-factory`.
   - Project name: `simon-says-travel`
   - Build command: `BRAND=simon-says-travel npm run build`
   - Deploy command: `npx wrangler deploy --config brands/simon-says-travel/wrangler.jsonc`
   - Non-production branch deploy command: `npx wrangler versions upload --config brands/simon-says-travel/wrangler.jsonc`
   - Root directory: blank
2. **Cloudflare, add the domain:** Add a domain → `simonsaystravel.com.au` → Free plan. Delete any imported Wix parking A/CNAME records. Copy the 2 nameservers.
3. **Wix:** Domains → simonsaystravel.com.au → change the nameservers to Cloudflare's 2.
4. Tell Claude "SST domain is on Cloudflare". Claude adds the custom-domain routes and the www → root redirect, submits IndexNow and adds the site to the health check.
5. Later: a GA4 property (send the G- ID); Search Console + Bing; add the site to the Viator, GetYourGuide and Expedia (Wotif) partner accounts if their dashboards ask for each website.

## COSTS.md lines
- DataForSEO: + Simon Says Travel monthly Trends, ~US$0.10 a month (9 calls).
- Domains: simonsaystravel.com.au, registered on Wix (DNS to Cloudflare), price: fill in.

## Ideas, not built
- Pitch each month's report to travel journalists (Traveller, news.com.au Escape, Executive Traveller).
- A "Price drop watch" isn't possible honestly without fares data. Don't fake it.
