# Draft: Australian tax brackets by year (2020–21 to 2026–27)

**Site:** mypaycalc.com.au · **Kind:** new page · **Proposed URL:** /tax-brackets/history

**Target searches (Search Console, 12 Oct–8 Nov 2026):** "tax brackets 2021" (position 55.7), "tax brackets 2022" (60.7),
"tax brackets 2025" (92.6). Google is already showing /tax-brackets for these, but that page only covers 2026–27,
so it can't answer them.

**What the searcher wants:** the rates for a past year, usually to check a tax return, an old payslip or how much a cut was worth.

**Title (58):** Australian Tax Brackets by Year: 2020–21 to 2026–27
**Description (150):** Every Australian resident tax rate and threshold from 2020–21 to 2026–27, from the ATO, with what changed each year and what it means for your pay.

---

## Copy

Australia's resident tax rates have changed three times since 2020: the Stage 3 cuts in July 2024, and the 16% rate dropping to 15%
in July 2026. Here's every table from 2020–21, straight from the ATO. None include the 2% Medicare levy.

### 2026–27 (current)
| Taxable income | Tax on this income |
|---|---|
| 0 – $18,200 | Nil |
| $18,201 – $45,000 | 15c for each $1 over $18,200 |
| $45,001 – $135,000 | $4,020 plus 30c for each $1 over $45,000 |
| $135,001 – $190,000 | $31,020 plus 37c for each $1 over $135,000 |
| $190,001 and over | $51,370 plus 45c for each $1 over $190,000 |

**What changed:** the second rate fell from 16% to 15%. Thresholds didn't move.

### 2024–25 and 2025–26 (Stage 3)
| Taxable income | Tax on this income |
|---|---|
| 0 – $18,200 | Nil |
| $18,201 – $45,000 | 16c for each $1 over $18,200 |
| $45,001 – $135,000 | $4,288 plus 30c for each $1 over $45,000 |
| $135,001 – $190,000 | $31,288 plus 37c for each $1 over $135,000 |
| $190,001 and over | $51,638 plus 45c for each $1 over $190,000 |

**What changed in July 2024:** 19% became 16%, 32.5% became 30%, the 37% bracket started at $135,000 (was $120,000)
and the top rate at $190,000 (was $180,000).

### 2020–21 to 2023–24
| Taxable income | Tax on this income |
|---|---|
| 0 – $18,200 | Nil |
| $18,201 – $45,000 | 19c for each $1 over $18,200 |
| $45,001 – $120,000 | $5,092 plus 32.5c for each $1 over $45,000 |
| $120,001 – $180,000 | $29,467 plus 37c for each $1 over $120,000 |
| $180,001 and over | $51,667 plus 45c for each $1 over $180,000 |

**Links on the page:** current year → /tax-brackets · work out your pay → / (calculator) · a salary → /salary.
**Build note:** add a "Past years" link on /tax-brackets pointing here, and a `TaxRateTable`-style section per year from a
`history` array in `data/paycalc/rates.json` (rates verified against the source below on 12 Nov 2026).

Source: ATO, "Tax rates – Australian resident" (last updated 13 August 2026):
https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents

---

## SIMON'S LINE

_(empty — your words go here, one or two sentences)_

**Question to prompt it:** When the tax cut landed in your own pay, what did you actually notice or do with it?
