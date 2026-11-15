# Confidence panel (IMN HQ → Home, first card)

One honest answer to "is this working?": **On track / Drifting / Stalled**, the one thing to fix first, and three parts.
Nothing turns green because infrastructure exists.

| Part | What it scores | Where it's worked out |
|---|---|---|
| **This week** (micro) | Only work in Simon's hands: first outreach emails sent vs the warm-up ramp (weekdays, capped at what's ready to send), follow-ups done vs due, site check fixes cleared, site improvements shipped (hand-made commits named for a site), Simon's to-dos done. Green if the work got done, whatever Google does. | Outreach: HQ Worker, live from D1 (`workers/hq/src/confidence.ts`). The rest: `scripts/hq/confidence.py` |
| **90 days** (macro) | Each site's 28-day visits vs its `target90` (hq/portfolio.json) on a new-site ramp: expected share by day *a* = (a/90)^1.5. Trend = last 14 days vs the 14 before (visits and Google impressions, one-day spikes capped at 3× a typical day). No site goes red before 45 days live; red needs a flat or falling trend, under 50% of pace and 28+ days of Search Console data. Visits on pace but no money clicks after 60 days caps a site at amber. Portfolio: green needs most sites green, none red and none sliding. | `scripts/hq/confidence.py` |
| **Forecast** | Low / likely / high 28-day visits (and money clicks) at 3, 6 and 12 months per site. Monthly growth blends the site's own impression growth with a young-site prior (1.25 a month under 6 months, 1.08 after), trusting its own data more as Search Console days build up (full trust at 90 days). Growth fades over time; low follows the current slide if there is one. Money clicks = visits × the site's own click rate once it has 300+ visits and a money click, else a typical 0.3–2.5%. | `scripts/hq/confidence.py` |

**Top line:** Stalled if this week or the 90 days is red. On track if this week is green, nothing is red and no site is sliding. Otherwise Drifting.
**Fix first:** the weakest part of this week's work (outreach counts double), else the weakest site.

## It checks itself
Every 7 days the forecast for each site is logged to `hq/forecasts.json` at 1, 3, 6 and 12 months out. When one comes due
it's scored against the real 28-day visits (`hq/confidence-history.json` keeps a daily snapshot). After 3+ scored forecasts the
likely line is scaled by the median actual/likely ratio (0.5–2×), and if under 70% land in range the bands widen. HQ shows the hit rate.

Runs daily in `.github/workflows/brief.yml` (before the brief, which gets a short Confidence section). Run now: `scripts/claude/brief.sh`.
Tuning lives at the top of the script (`MIN_RED_AGE`, ramp, priors). Targets still marked provisional show as such on the card.
