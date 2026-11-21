# IMN Labs and the site value checker

Decided 21 Nov 2026 (DECISIONS.md, IMN-LABS.md in the Site Factory Project). Test new ideas at
**imnetwork.com.au/labs/&lt;slug&gt;** before buying a domain. Ideas with sale potential graduate to their own domain
(a lab can't be sold); ideas that miss their target come down. No zombies.

## Files

| What | Where |
|---|---|
| Registry (slug, name, status, launch date, 90-day target, domain, money keys) | `data/imn/labs.json` |
| A lab's pages | `data/imn/lab-<slug>.json` (`LabContent`: `nav` + `pages`, paths relative to the lab) |
| Route builder + types (brand-agnostic) | `src/lib/labs.ts` |
| Templates | `src/templates/labs/LabPage.astro`, `LabIndex.astro` (styles: "IMN Labs" block in `global.css`) |
| Lab header (own name + menu + "IMN Labs" label) | `src/components/Header.astro` via `route.chrome` |
| 410 / 301 | `src/worker/site.ts` → `labGate()` (imn only, `LABS: "1"`, `/labs/*` runs the Worker first) |
| CI rules | `scripts/imn/labs-check.mjs` (run by `verify-build.mjs` for imn) |
| Lifecycle helper | `scripts/imn/lab.mjs` |
| Per-lab numbers | `labRows()` in `src/lib/hq.ts` (/hq/traffic) · `scripts/hq/labstats.py` (site check card, value checker) |

## Rules (CI fails the build otherwise)

- At most `maxLive` labs live at once (live + graduating). `maxLive` is 4 (Simon, 21 Nov: a judgement call; 1–4 allowed).
- Every non-closed lab has a launch date and a **90-day target set before launch**: `target.metric` is
  `gsc_impressions`, `gsc_clicks`, `visits` or `money_clicks` (the lab's `moneyKeys` CTA clicks), per 28 days by day 90.
- Live labs have their content file with a home page (`path: ""`), and every page is built. Same quality gate as any site.
- Closed and graduated labs build no pages. Labs never appear in IMN's main menu (footer link only).
- Sponsored links need a disclosure: IMN has `/affiliate-disclosure` (already in place), and every lab page links to it.
- `/labs` is noindex until a lab is live.

## Lifecycle

1. **Launch:** add the entry to `labs.json` with `status: "live"`, `launched`, `target` and `moneyKeys`, and write
   `lab-<slug>.json`. Before relying on affiliate money, check each programme accepts imnetwork.com.au/labs.
2. **Day 90, missed:** `node scripts/imn/lab.mjs close <slug>` → pages come down, `/labs/<slug>/*` answers **410 Gone**.
   The content file stays for the record.
3. **Day 90, hit:** Simon buys the domain, then `node scripts/imn/lab.mjs graduate <slug> <domain>`:
   creates `brands/<slug>/` (preview, noindex) from the lab with the same pages at the root of the domain, plus about,
   contact, privacy and disclosure pages (`data/<slug>/`), and registers the brand. The lab keeps running meanwhile.
   Push, wait for "Check build", then Simon connects the new Worker in Cloudflare (Workers & Pages → Create → import the
   repo, build command `BRAND=<slug> npm run build`, deploy command `npx wrangler deploy --config brands/<slug>/wrangler.jsonc`)
   and moves the domain's DNS to Cloudflare.
4. **New site serving:** `node scripts/imn/lab.mjs graduate <slug> --live` → brand launched, added to the site check,
   `/labs/<slug>/*` **301s** to the same path on the new domain. Then: GA4 property + Search Console for the domain,
   add the brand to the stats job and `TRAFFIC_SITES`. Expect a short ranking dip.

## Site value checker

`scripts/hq/value.py` runs every morning in the `brief` workflow and writes `hq/value.json`; IMN HQ → **Value** shows it,
and the brief has a one-line summary.

- **Average monthly net profit** over the last 12 months (or the months live, if fewer): revenue from
  `hq/finance.json` `revenue[]` (`{ month, amount, site, source }`; `site` = a site id from `hq/sitecheck.json`, its brand,
  or `lab:<slug>`) minus costs (`costs[]` one-offs tagged with `site` are that site's; untagged ones and `monthlyRunning`
  are split evenly across IMN's own sites; labs carry only costs tagged `lab:<slug>`).
- **Value range = monthly profit × 25–45** (`hq/value-config.json`, benchmarks dated there). The multiple moves:
  under 12 months old → 25–30; one income source −3; ≥80% of non-direct visits from Google −3; 2+ income sources +2/+3;
  100+ email subscribers +2; 10+ linking sites +2; hands-off (autopilot) +2. Never above 45.
- **Trend** = value now vs the same maths with the window ending last month.
- **Flags:** low estimate passes Simon's "worth selling" number (`worthSelling` in the config, unset until he picks one);
  profit hasn't grown for 3 months (only once a site has revenue).
- Estimates, not offers. In Nov 2026 every site is near A$0 profit, so values start at $0.

When Simon reports a payout, add a `revenue[]` row with its `site` and `source`; the value updates the next morning
(or run `python3 scripts/hq/value.py --print`).
