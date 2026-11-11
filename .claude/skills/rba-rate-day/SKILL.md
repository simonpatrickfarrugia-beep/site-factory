---
name: rba-rate-day
description: Update MyPayCalc's cash rate on an RBA decision day, check it, ping IndexNow and schedule the next decision day. Run by the one-off "RBA rate day" scheduled task at 15:15 Melbourne on each decision day.
---

# RBA rate day (MyPayCalc)

On every RBA decision day the site's rate is updated the same day (agreed 4 Nov 2026). Follow `CLAUDE.md`.
Only change `data/paycalc/rates.json`. Never invent a figure.

1. Find today's decision on the RBA's own site: the media release "Statement by the Monetary Policy Board: Monetary Policy Decision"
   for today's date on https://www.rba.gov.au (search the web if needed, then open the rba.gov.au page). Use only the RBA page.
2. In `data/paycalc/rates.json`, `cash` = {rate, previous, decided, decidedLabel, url}. Changed or unchanged, update it:
   previous = old rate, rate = new target, decided = today (YYYY-MM-DD), decidedLabel (e.g. "8 December 2026"), url = the release.
   Update the matching `sources` entry (the rba.gov.au media release) to the new URL and wording. 2-space indent.
3. `node --experimental-strip-types --no-warnings scripts/test-pay-tax.ts` must pass. Commit
   `MyPayCalc: RBA cash rate <x>% (<date> decision)`, push, wait for "Check build" to pass.
4. ~20 minutes later:
   `gh api -X POST repos/simonpatrickfarrugia-beep/site-factory/actions/workflows/indexnow.yml/dispatches -f ref=main -f 'inputs[site]=paycalc' -f 'inputs[mode]=all'`
5. Next decision day: find the RBA's published Monetary Policy Board meeting dates on rba.gov.au. Create a one-off scheduled task for the
   next one at 15:15 Melbourne, named "RBA rate day: update MyPayCalc", push notifications off, prompt:
   "Clone simonpatrickfarrugia-beep/site-factory, then read and follow .claude/skills/rba-rate-day/SKILL.md."
   If you can't find the dates on rba.gov.au, don't guess: say so.
6. Final message, one line: the new rate, up/down/unchanged, and that MyPayCalc is updated.
