// Built-in first-email templates (version 0) per brand and segment. Saved versions in the
// D1 `templates` table replace them; IMN HQ always offers the newest version.
// Placeholders, filled in the Draft email sheet:
//   {first_name} {organisation} {region} {page} {site}
// Every email says who Simon is and which site, and ends with the opt-out line (claude/OUTREACH.md).
// No sign-off name: the Exchange signature rule adds the brand signature.

export type Template = { subject: string; body: string };

const OPT_OUT = `Reply "no thanks" and I won't contact you again.`;

const T: Record<string, Record<string, Template>> = {
  vic: {
    '*': {
      subject: 'A free {region} guide for your visitors',
      body: `Hi {first_name},

I'm Simon from Vic Tours ({site}), a free guide to Victoria's towns. I've put together a {region} page with things to do, places to eat and stay, and a day trip plan from Melbourne:
{page}

You know {region} far better than we do, so I'd love your eye on it: is anything out of date, or is there a local favourite we've missed? I'm also happy to add {organisation} to the page so visitors can find you.

And if it's useful for the people you help plan a trip, we'd be grateful for a link from your visitor resources.

Thanks,

${OPT_OUT}`,
    },
    traders: {
      subject: 'Sending day-trippers to {region}',
      body: `Hi {first_name},

I'm Simon from Vic Tours ({site}), a free guide to Victoria's towns.

Our {region} page sends people planning a day out to the town's cafes, shops and things to do:
{page}

If it would help your members, you're welcome to share it or link to it from {organisation}'s site. I'm also happy to add any local businesses or events we've missed.

Thanks,

${OPT_OUT}`,
    },
  },
  'community-help-co': {
    '*': {
      subject: 'Free resume and cover letter tools for the people you help',
      body: `Hi {first_name},

I'm Simon from Community Help Co ({site}). I spent years in employment services, and I've built a set of free job tools that might help the people {organisation} works with:

- Resume builder (Australian format, saves as a PDF): {site}/resume-builder
- Cover letter builder: {site}/cover-letter-builder
- Job finder: {site}/job-finder

They're free with no sign-up, and nothing people type leaves their device, so they're safe on a shared computer.

If they'd suit your job-seeker resources, we'd be grateful for a link. And I'd love to hear what would make them more useful for the people you see.

Thanks,

${OPT_OUT}`,
    },
    'support-coordination': {
      subject: '1:1 goal mentoring for your participants',
      body: `Hi {first_name},

I'm Simon from Community Help Co ({site}). We provide practical 1:1 mentoring for life and work: we set small goals with each person, they take them on, and every week they (and you) get written notes on progress and next steps.

It can suit participants with capacity-building funding who want steady, practical support:
{site}/how-it-works

If it sounds useful for anyone {organisation} supports, I'd be glad to send more detail or set up a short call.

Thanks,

${OPT_OUT}`,
    },
  },
  'trade-admin': {
    '*': {
      subject: 'A free {region} invoice template for your members',
      body: `Hi {first_name},

I'm Simon from Trade Admin ({site}). We've made a free {region} invoice and quote template with the lines most jobs need, licence number and GST done for you. It saves as a PDF and works on a phone:
{page}

It's free, with no account needed. If it would suit {organisation}'s member or apprentice resources, we'd be grateful for a link, and I'm happy to add anything your members would want on it.

Thanks,

${OPT_OUT}`,
    },
  },
  trailers: {
    '*': {
      subject: 'Free trailers for your screening list',
      body: `Hi {first_name},

I'm Simon from MovieTrailer.Channel ({site}). We have the original trailer for hundreds of classic films, each with where to watch, rent or buy it today:
{page}

It might be handy for {organisation}'s members when you announce a screening. If it fits, we'd be grateful for a link from your resources page.

Thanks,

${OPT_OUT}`,
    },
    'film-school': {
      subject: 'Funding pitches from new filmmakers',
      body: `Hi {first_name},

I'm Simon from MovieTrailer.Channel ({site}). A share of what the site earns goes into producing original films, most likely short films from independent filmmakers to start, and the filmmakers keep creative control. Anyone can pitch an idea here:
{page}

If {organisation}'s students or members have projects looking for support, we'd love to hear from them, and a link from your student resources would help them find us.

Thanks,

${OPT_OUT}`,
    },
  },
  paycalc: {
    '*': {
      subject: 'A free take-home pay calculator for the people you help',
      body: `Hi {first_name},

I'm Simon from MyPayCalc ({site}), a free Australian pay calculator. It shows take-home pay after tax, Medicare, super and HECS for any salary or hourly rate, in plain language:
{page}

It might be useful for the people {organisation} helps compare job offers or plan a budget. If it fits your resources page, we'd be grateful for a link.

Thanks,

${OPT_OUT}`,
    },
  },
};

export function defaultTemplate(brand: string, segment: string): Template {
  const b = T[brand] ?? T.vic;
  return b[segment] ?? b['*'];
}
