# IMN brain

The promise on imnetwork.com.au ("every site makes yours better") is this system. It runs inside the daily site check.

1. **Spot fixes.** When a site check finding (seo, health, indexing, content, speed, tracking) disappears between two scans, it's recorded in `hq/brain/fixes.json` with a baseline: Search Console impressions, clicks and position plus visits for the affected pages (28 days, from `data/<brand>/stats.json`).
2. **Measure.** 35 days later (a fresh 28-day window) the fixed pages are compared with a control: the rest of the same site, or for site-wide fixes the rest of the portfolio. Lift = their growth minus the control's. Win ≥ +20%, worse ≤ −20%, otherwise flat; under 60 impressions = too little data.
3. **Playbook.** `hq/brain/playbook.json` rolls results up per fix type. More wins than losses = proven.
4. **Share.** On every new site check card, a proven fix type gets its evidence in the detail ("IMN brain: fixing this lifted Google impressions +X% on …") and a 1.5× impact boost, so it climbs the top 5 (IMN HQ, morning report, auto-fixer).

Report: `hq/reports/brain.md`. Code: `scripts/brain/brain.py`, self-test `python3 scripts/brain/test_brain.py`.
Client sites are measured but never named in the playbook: lessons are shared, client data never is.
Results are early signals, not proof: small sites, seasonal swings and Google updates all move the numbers.
