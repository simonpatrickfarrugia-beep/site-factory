# UX and conversion audit (27 Oct 2026)

Audit of the live sites, then the quick wins shipped the same night (commits 4236c89 → test-chc-form, all on main, CI green).

## Shipped 27 Oct

**Community Help Co**
- **Enquiry and referral forms work now.** They posted to the never-deployed forms Worker, so every enquiry failed and asked people to email instead. They now post to the site's own Worker (`/api/submit/<form>`, `src/worker/site.ts`, `FORMS` var in `brands/community-help-co/wrangler.jsonc`) and land in D1 `site-factory-forms`, table `submissions`. Live browser test `scripts/test-chc-form.mjs` (uitest workflow): 7/7 passed; test row deleted.
- **Alerts:** `/api/submit/status?since=<ISO>` returns a count only (no details). The `enquiries` GitHub workflow checks it about 8am, 1pm and 6pm Melbourne and opens an issue labelled `enquiry` (GitHub emails Simon). Read the enquiry by asking Claude "show my CHC enquiries" (D1 query). Free; doesn't depend on Claude scheduled tasks.
- Success message promises a reply "usually within a working day".
- About page H1 is now "Hi, I’m Simon" (SEO title unchanged).

**Movie Trailer Channel**
- Film pages: H1 reads "Where to watch {Film} {Year}" (matches the page title); the rent / buy / stream buttons sit right under the title instead of below two paragraphs; one description instead of two near-duplicates.
- Home and meta description: "classic films … where to watch tonight" instead of "new releases".
- Halloween collection: dropped Dead Eyes (2013) and Predator; added Carrie, The Hills Have Eyes, Shaun of the Dead.

**Vic Tours**
- **Opening hours in the plan engine** (`src/lib/bundles.ts`): slots have a time `window`; places whose OSM hours never cover it are skipped (unknown hours stay in; if nothing fits, the rule is ignored so pages never disappear). Day trips show "Best days: Fri–Sun" when some stops close on other days. Fixed Phillip Island sending people to a café that shuts at 12:00.
- Viator links say what they are: "Tickets on Viator" vs "Tour from Melbourne". Inside plans only tickets appear on a stop (no more A$175 day tour on the Penguin Parade step for people already driving there).
- Home: Day trips / Weekends away / Road trips / Pick a town chips under the hero; town and neighbourhood lists fold after 10 / 6 (all links stay in the HTML).
- Town pages: day trips are labelled "Day trip:", not "Weekend plan:".
- Day-trip share images use the plan's card photo.

## Audit corrections
- Trailers "Surprise me" does pick a random film and "Submit your trailer" is a working mailto (the page reader missed the script).
- CHC already has GA4 (G-W507HD781R).

## Found: scheduled tasks failing
Daily traffic report, First-dollar coach and Weekly autopilot all failed with "usage limit reached" (last runs 25–27 Oct). GitHub workflows (brief, leads, health, enquiries) are unaffected.

## Open (needs Simon or bigger work)
1. Trailers: GA4 country split. If 20%+ are Australian, route them to JustWatch AU / amazon.com.au (Prime links are amazon.com search pages).
2. Vic: Stay sections earn nothing until Booking.com approves. Apply to Agoda or Expedia as a backup.
3. CHC: a real photo of Simon (home + About), 2–3 consented testimonials, a "from $X a session" price line, a `/for-coordinators` page.
4. Vic: real drive times (OSRM, free) instead of repeating "about 81 km"; Phillip Island plan built around the Penguin Parade; email offer as a free "12 day trips" PDF.
5. Trade Admin: robots.txt blocked our page reader. Check it isn't blocking Google; GA4; "doing this every week?" link from the invoice builder to the cost calculator.
