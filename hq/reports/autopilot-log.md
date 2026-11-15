
## 2026-11-01 · Weekly autopilot
- Sprint "First $1" passed its 31 Oct deadline with A$0 revenue. Did not move the sprint (level not reached); added a "decide" todo for Simon to set a new deadline.
- Vic: 12 towns probed; 0 published (all under ~25 places). Hold notes added (incl. Falls Creek, Mallacoota, Hepburn Springs per VIC-TOURS.md). Olinda, San Remo, Creswick left without a note so next week's run retries them. Mount Buller needs a centre fix in osm_probe.py (matched ~14 km south of the village).
- Thin pages: wrote Eat guide paragraphs for Marysville and Anglesea from the listed places (no invented facts).
- Trailers: Halloween collection featured → false (season over). Removed "Vinegar Syndrome" (label promo) and "The Sacred & The Cursed: The Joko Anwar Collection" (box set) from the queue. 13 well-known films sit in review with "no OMDb match": looks like a lookup bug, not ambiguity; added to Claude's actions.
- Affiliates: no new approvals/earnings in Gmail (24 Oct–1 Nov). Discover Cars status corrected to approved (welcome email 24 Oct; link already live).
- Logged here rather than DECISIONS.md: the project doc is too large to rewrite safely from an automated run.

## 2026-11-08 · Weekly autopilot
- Health #6 (competition job "late"): not a failure. Weekly niche jobs skip a week when their slot lands on the 1st–4th (monthly jobs take the slot), so health.json now allows 15 days for discover/niches/competition. Issue closes itself on the next clean check.
- Mount Buller: added `centreOverride` support to osm_probe.py and set the village centre; re-probe found 67 places.
- Vic: probed 10 (the last un-noted towns). Published Olinda (61), Mount Buller (67), San Remo (34) and added a Dandenong Ranges region hub (Belgrave + Olinda; 4,120 searches/mo). Held: Sassafras (1.3 km from Olinda, same places), Arthurs Seat (1.7 km from Dromana), Clunes 23, Creswick 18, Mount Macedon 13, Wye River 9, Jindivick 3. The towns list is now exhausted: next growth needs new towns added and volume-checked.
- Quality: both brands clean. Simon Says Travel /contact (51 words, a form page) set to noindex rather than padded.
- Trailers: the two non-films removed on 1 Nov were re-added by intake from the label feed on 2 Nov. Added a `rejected` queue status (kept in the queue so intake skips them) and set both to rejected. Ambiguous for Simon: "Soul Patrol" and "The Second Act" (several films share each title). No seasonal collection change (Christmas from late November).
- Affiliates: no new approvals or earnings in Gmail (31 Oct–8 Nov). Commission Factory asked for a media kit on 6 Nov after Simon's re-application: status → applying, todo added. Fergus/Tradify welcomes already recorded.
- Todo: merged the duplicate Trade Admin mail-hub items. Sprint "First $1" left as is (level not reached; Simon's decide item still open).
- Niches job: nothing waiting (scored 0); calibration 4.1% click rate. Priority report refreshed.

## 2026-11-16 · Weekly autopilot
- Health: no open `health` or `review` issues; all checks passing. (Open #5 is a Community Help Co enquiry from 2 Nov: Simon's to reply and close.)
- Affiliates: Commission Factory declined again on 12 Nov after the media kit ("established inbound traffic and decent engagement" needed). Status → declined; re-apply once traffic grows. HQ now lists declined programmes last. No approvals or earnings otherwise (Viator mails were promos).
- Vic: towns list still exhausted (64 published; the rest are regions, held or duplicates). Added a "decide" item proposing 27 new towns to volume-check (~US$0.05). Nothing probed or published this week.
- Quality: all brands clean in the latest Check build (0 thin, 0 near-dup, 0 hard fails).
- Trailers: 16 classics (Casablanca, Se7en, Mary Poppins…) were still in review after the 11 Nov OMDb fix. Likely cause: an item started with too few calls left, so omdbFind skipped its search fallback and the film landed in review as "no match". Enrich now starts an item only with 6+ calls left; the 16 are back to `new`. Atonement: trailer names Kenneth Branagh, Boyd Holbrook and Hiam Abbass, so set to 2026 (the age cutoff will skip it). Still ambiguous for Simon: "Soul Patrol", "The Second Act"; "A Fox Under a Pink Moon" needs genres by hand. No Christmas collection yet: due from late November (next run).
- Money model: niches scored 0 (nothing waiting); calibration 4.1% click rate, 4.9% conversion. Priority report refreshed.
- Todo: Agoda and resume-sharing items prepped (answers link, ready-to-paste message). Cover letter builder is live, so it came off Claude's list. Sprint "First $1" unchanged (deadline 30 Nov, not reached).
- Public repo hygiene: reworded a done item that named Simon's employer.

## 2026-11-16 · Follow-up with Simon (chat)
- "Yes towns": added 27 towns to data/vic/towns.json; towns job checked 30 places (27 new + 3 stale). Top: Traralgon 9,380, Frankston 9,300, Warragul 5,080, Emerald 4,800, Yarrawonga 4,700. Sale, Hamilton, Portland, Emerald and Maryborough share names with places outside Victoria, so their numbers are likely inflated. Probed the top 12 (vic-probe).
- Sorrento eat page: Simon delegated the picks. Wrote three factual paragraphs (no first-person claims): The Baths by the pier (seafood, bay views; weekendnotes.com review), the 1875 limestone Continental Hotel, now the InterContinental Sorrento (Heritage Victoria; bosshunting.com.au 2022), Stringers Cafe ~350 m from the pier, All Smiles at the ocean beach. OSM still calls it "The Continental Hotel".
- Christmas: new featured collection /discover/christmas-movies with 10 catalogue films + 15 queued (Elf, Polar Express, Nightmare Before Christmas, Grinch…). All 15 published after three enrich runs.
- OMDb root cause: the budget-guard fix didn't help; title lookup and search both miss many classics (Casablanca, Kung Fu Hustle, A Clockwork Orange). Added optional `imdbId` on queue items (looked up first with `i=`; a wrong id fails the mismatch check). Ids set for 37 films; 27 published so far. Note: OMDb's Year follows US release for some (Gone with the Wind → 1940, Mary Poppins → 1965).
