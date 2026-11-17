---
name: imn-preview
description: Build a private IMN website preview for a business that said yes to seeing one: research their real details, gaps, local searches and competitors, store the preview in D1, check it live, and draft Simon's reply email with the link. Run when Simon says "preview for <business>" or queues one from IMN HQ.
---

# IMN website preview

A prospect replied "yes, show me". Build them a private preview at `https://imnetwork.com.au/preview/<slug>` that looks
researched, not auto-generated: their own site plus a "Built for <business>" panel showing the homework. Template and rules:
`src/worker/preview.ts` (PreviewData). Follow `CLAUDE.md`. You never send email: Simon sends the reply.

**Only build for a business that asked.** A preview link is never sent cold (Simon, 17 Nov: cold links look like scams).

## Step 1: Their real details (only what they publish)
From their Google listing, their own website, Facebook/Instagram About and directory listings they manage (WebSearch, then WebFetch):
name, trade, phone and email as published, suburbs/areas they say they cover, hours, services in their own words, licence or
registration number only if they publish it (electricians in Victoria must show their REC number in ads; builders their registration
number), their Google reviews link, a line or two about them in their own words. Photos: only images on their own site or pages,
and only if the URL is https. Never invent a service, area, number, review, rating, testimonial or year founded. If a detail isn't
published, leave it out. Note every page you used in `research.sources`.

## Step 2: The homework (the "calculated" part)
- **found**: their real gaps, kindly worded, each checked by looking: dead website link on the Google listing (old business.site),
  no website, not secure (http), hard to use on a phone, free-builder address, out-of-date hours/prices/copyright. Link the page.
- **searches**: 6–12 searches people near them use, e.g. "<trade> <suburb>", "<service> <suburb>", "emergency <trade> <region>".
  Real Google Australia monthly volumes: `scripts/claude/volumes.sh "a|b|c" 2036` (~US$0.09, say the cost). Drop zero-volume rows, and keep only one of near-identical variants that return the same number ("plumber werribee" / "werribee plumber" / "plumbers werribee" are one search cluster), so the total isn't inflated. Never claim something about competitors or "sites that rank" you didn't check.
- **competitors**: the top 3 local results for their main search (WebSearch "<trade> <main suburb>"). One fair, factual note each
  (e.g. "a national franchise", "has a website with online booking"). Never disparage; never claim they're worse.
- **built**: each page or feature on the preview and the reason, tied to a gap or a search ("Hot water page: 'hot water repairs
  werribee' is searched 90 times a month and you list it as a service").
- **checked**: today's date, e.g. "17 Nov 2026".

## Step 3: Store it
Slug = business name in lowercase-hyphens + "-" + 4 random lowercase letters/digits (e.g. `werribee-plumbing-k7f2`).
Expires 30 days from now. JSON matches PreviewData; set `colors.brand` to a colour from their logo or signage if obvious, else omit.
Validate first: `python3 -I scripts/imn/check_preview.py <file.json>` (keep the JSON outside the repo, e.g. /tmp; it holds client details).
`INSERT INTO previews (slug, org_id, business, data, status, expires_at) VALUES (?, ?, ?, ?, 'draft', ?)` with params
(org_id = the IMN HQ org id if it came from outreach, else NULL).
Rows you may change: `previews` only. Updates: `UPDATE previews SET data = ?, expires_at = ? WHERE slug = ?` (changes or extension),
`UPDATE previews SET status = ? WHERE slug = ?` (sent / won / lost). Never delete rows; a takedown request = set expires_at to now.

## Step 4: Check it live
Probe `https://imnetwork.com.au/preview/<slug>?notrack=1` (scripts/claude/probe.sh): HTTP 200, `x-robots-tag: noindex`, the business
name in the H1 area, no empty sections, phone tap link correct. Fix and re-store until clean. `?notrack=1` keeps Simon's checks out of the view count.

## Step 5: Draft Simon's reply (give it to him in chat, ready to paste)
Reply in the same email thread, from the IMN address. Plain, short, Australian English, no hype:

```
Subject: Re: <their thread subject>

Hi <first name>,

Thanks for getting back to me. Here's the preview I put together for <business>:
https://imnetwork.com.au/preview/<slug>

No login, nothing to fill in and no payment details, just have a look. I've added a screenshot of the home page below.

At the bottom there's a short section on what I found and why I built it this way (including what people near you search
for each month).

Happy to change anything: just reply with what you'd like different. Or if it's easier, I can walk you through it on a
quick 5-minute call.

Thanks,
```
Tell Simon to paste a screenshot of the preview's top section into the email (open the link on his phone, screenshot, paste) before
sending, and to set From = simon@imnetwork.com.au. Then `UPDATE previews SET status = 'sent' WHERE slug = ?` once he confirms.

## Reporting
Give Simon: the link, 3 lines on what you found, the top search and its volume, the DataForSEO cost, and the reply draft.
Views: `SELECT business, status, views, first_viewed_at, last_viewed_at, expires_at FROM previews ORDER BY created_at DESC`.
