# Opportunity engine log

Weekly record of what the opportunity engine fixed, drafted and published, and how rankings moved 4 weeks later.

## 2026-11-12 (first run, from chat)

Data: Search Console 12 Oct–8 Nov 2026. No DataForSEO spend (Vic volumes from data/vic/towns.json).

**Fixed (template-wide, live after "Check build"):**
- Vic Tours eat pages: title now leads with "<Town> Restaurants & Cafes: Where to Eat" (was "Where to eat in <Town>: N places…").
  Searches: "sorrento restaurants", "mornington peninsula restaurants", "coffee daylesford" (eat pages: 14,800/mo on the Peninsula alone).
- Vic Tours things-to-do pages: "Things to Do in <Town>: Attractions & Activities". Searches: "things to do in ballarat", "phillip island things to do".
- Vic Tours town hubs: "<Town>: Things to Do, Where to Stay & Eat". Searches landing on hubs: "things to do in queenscliff", "activities lorne", "bright things to do".
- MyPayCalc salary pages (42): title adds the tax figure ("$300,000 After Tax Australia 2026–27: $X Take-Home, $Y Tax") and the
  description leads with "Tax on $X". Searches: "tax on 300k" (position 9.4, 0 clicks), "tax on 25000" (10.5, 0 clicks).

**Drafted for Simon:** Sorrento restaurants (strengthen), Australian tax brackets by year (new page).

**Re-check on 2026-12-10:** positions and clicks for the searches above vs this baseline.

## 2026-11-16 (scheduled run)

Data: Search Console 17 Oct–13 Nov 2026. DataForSEO: one AU volume lookup, 10 searches (~US$0.09), saved to `hq/opportunity-volumes.json`.

**Fixed:** nothing new. The only fix-snippet candidates ("tax on 300k", "tax on 25000") and the eat/do/hub title templates were
shipped on 12 Nov; too soon to touch again. Sorrento and tax-brackets-by-year skipped (drafted 12 Nov).

**Drafted for Simon:**
- MyPayCalc HECS repayment (strengthen /hecs-help-repayments, position 70.5): "hecs repayment" 3,600/mo, "hecs repayment threshold" 3,600/mo.
  Fortnightly table, 2025–26 threshold, 2026 indexation 2.8% (Study Assist, 7 May 2026).
- Vic Mornington Main Street restaurants (strengthen /mornington/eat, position 57.9): 390/mo; 28 Main Street places from OSM data.
- Vic Warrnambool accommodation near the centre (strengthen /warrnambool/stay, position 56.5): 6,600/mo for Warrnambool stays.

**Skipped on judgement:** "pay calculator" (301,000/mo head term), "australian tax brackets" (74,000/mo; same page as the 12 Nov draft),
"all you can eat mornington" (no data to answer it).

**Re-checks:** 12 Nov changes due 2026-12-10 (only 4 days live, no read yet). Each draft above gets a re-check 4 weeks after it's published.
