# IMN HQ home screen

IMN HQ (https://imn-hq.simonpatrickfarrugia.workers.dev) opens on **Home**: a phone-style home screen where every site is a
client app. A red badge counts what needs Simon; tap the app to see the notifications and act on them.
Above the apps sits the **confidence panel** (on track / drifting / stalled, this week, 90 days, forecast): docs/CONFIDENCE.md.

## Apps = clients
The client registry is `hq/sitecheck.json` → `sites` (`id`, `name`, `label` under the icon, `icon` emoji, `owner`).
IMN's own sites have `owner: "imn"`; client studio sites get `owner: "client"` (and a `carePlan`) and show under **Clients**.
Adding a client = adding an entry there. The **IMN** app holds company-wide items.

## Where notifications come from
| Notification | Source |
|---|---|
| 🔴 Broken / 🛠 Fix | Site check report card (`hq/sitecheck/index.json` → `top`): every broken finding + the top 3 fixes |
| 🐙 Issue | Open GitHub issues whose title names the site (health, sitecheck, enquiries); others go to IMN |
| 📥 New form | D1 `submissions` in the last 48 h (Tradify trials, enquiries, pitches…) |
| 💬 Reply · 📨 Outreach | Replies waiting, follow-ups due, drafts to send, Radar prospects (D1, same data as the other tabs) |
| ✅ To-do / 🤔 Decide | `hq/portfolio.json` → `todo` items with `brand` = the site id (no brand = IMN) |

## Working on one
- **Fix with Claude** copies a ready-made brief (site, repo, the finding, the rules) to the clipboard and opens the
  Site Factory project in Claude; start a new chat and paste. Full repo access, no extra cost.
- **Ask Claude about <site>** does the same with a general brief (report card + stats, "the one thing that would move it").
- **Open** jumps to the right HQ tab (Radar, Outreach, Replies, Affiliates) or the report card.
- Deep link: `/#app=<site id>` opens an app directly (used by the morning report).

## Later (decide in December)
A built-in chat inside HQ would call the Claude API from the HQ Worker: pay per message, and it can't change code or push
without an agent around it. The copy-and-open handoff covers the work for now.
