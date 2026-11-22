# Draft: HECS repayment (strengthen /hecs-help-repayments)

**Site:** mypaycalc.com.au · **Kind:** strengthen · **Page:** /hecs-help-repayments (position 70.5)
**Monthly searches (AU, DataForSEO 16 Nov 2026):** "hecs repayment" 3,600 · "hecs repayment threshold" 3,600 · "when do you start paying hecs" 260
**Searches Google already shows us for (17 Oct–13 Nov 2026):** "hecs repayment", "hecs repayment calculator fortnightly",
"hecs repayment threshold", "how much help debt do i pay", "hecs repayment threshold 2026", plus "how much hecs should i be paying",
"when do you start paying hecs", "hecs debt threshold 2025/2026", "hecs interest rate 2026". 22+ impressions, 0 clicks.

**What the searcher wants:** "How much comes out of my pay for HECS, from what income, and is it growing?" — a number, fast.

**Title (proposed, 57 chars):** HECS Repayment Thresholds 2026–27 & Fortnightly Amounts
**Description (proposed, 150 chars):** No HECS repayment until $69,528. See what comes out each fortnight at $80k, $100k and $150k, the 2025–26 threshold and the 2026 indexation rate.

---

## What the page is missing (to add)

**Direct answer up top (new lede line):** In 2026–27 you start repaying HECS-HELP once your repayment income passes $69,528.
You repay 15c of each dollar above that, so at $80,000 it's about $1,571 a year, roughly $60 a fortnight.

**Fortnightly table (worked from `data/paycalc/rates.json`, annual ÷ 26):**

| Income | Per year | Per fortnight |
|---|---|---|
| $69,528 or less | $0 | $0 |
| $80,000 | $1,571 | $60 |
| $100,000 | $4,571 | $176 |
| $150,000 | $12,476 | $480 |

_Note under the table:_ Your employer uses the ATO's withholding tables, so the amount on your payslip can differ by a few dollars; the
final figure is settled at tax time. Link: "Work out yours" → `/?help=1` (the calculator already supports the HECS tick box).

**FAQ additions (from what people typed):**
- *When do you start paying HECS?* Once your repayment income for the year is above the threshold ($69,528 in 2026–27). Below that,
  nothing comes out. Repayments go through your pay (tick the study loan box on your TFN declaration) and the tax return.
- *What was the threshold in 2025–26?* $67,000, the first year of the marginal system (`rates.json` → previous).
- *Is there interest on a HECS debt?* No interest, but the debt is indexed each 1 June. The 2026 indexation rate was 2.8%
  (Department of Education, Study Assist, 7 May 2026: https://www.studyassist.gov.au/node/253).
- *How much HECS should I be paying?* Use the table above or tick the box in the calculator for your exact pay.

_Checked 18 Nov 2026 (Claude queue job 32): all four table rows re-worked from rates.json and match; 2.8% indexation confirmed on the Study Assist page dated 7 May 2026._

**Facts used:** thresholds and rates from `data/paycalc/rates.json` (sourced to the ATO study loans page); 2025–26 threshold from
`rates.json` previous year; indexation from Study Assist (gov.au). Fortnightly figures are arithmetic on those numbers.

---

## SIMON'S LINE

_(empty — your words go here)_

**Question to prompt it:** When your own study loan started coming out of your pay, what surprised you? One sentence.

**Suggested lines (Claude, 22 Nov — general tips, not personal claims; pick one, tweak it, or write your own):**
- **A:** Tip: check your first payslip after you pass the threshold. If nothing's coming out for HECS, the study loan box on your TFN declaration probably wasn't ticked.
- **B:** The fortnightly number is the one to budget around. The yearly figure only settles at tax time.
- **C:** No interest, but indexation each June still grows the balance, so even small extra payments before 1 June do some work.

To use one: reply `publish hecs-repayment with A` (or B / C). Your own words always beat these.
