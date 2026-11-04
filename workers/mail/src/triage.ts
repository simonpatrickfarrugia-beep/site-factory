// Reply triage for the mail hub: a quick, rules-only read of an incoming email.
//   optout   → they asked not to be contacted: the contact is opted out for every brand
//   auto     → out of office, bounce or other automatic mail: logged, never shown as a reply
//   positive → sounds like a yes ("added", "shared", "happy to link"): link check runs first thing next morning
//   reply    → anything else: goes on the "Needs your reply" pile in IMN HQ → Today
// Rules only (no AI call), so it's free and predictable. When unsure it says "reply", so a human reads it.

export type Triage = 'optout' | 'auto' | 'positive' | 'reply';

// Our own opt-out line, which people often quote back. Removed before reading.
const OUR_OPT_OUT = /reply\s+["“']?no thanks["”']?\s+and\s+i\s+won['’]?t\s+contact\s+you\s+again\.?/gi;

const AUTO_SUBJECT = /^\s*(automatic reply|auto(matic)?[- ]?reply|autoreply|out of (the )?office|ooo\b|away from|on leave|undeliverable|undelivered|delivery (status|failure)|mail delivery|returned mail|failure notice)/i;
const AUTO_BODY = /\b(out of (the )?office|on (annual |parental |long service )?leave (until|from|and)|i am (currently )?away|i'?m (currently )?away|will be back (on|in)|returning (on|to the office)|automatic reply|this is an automated|do not reply to this (email|message)|mailbox (is )?(no longer|not) monitored|message (could not|wasn'?t) (be )?delivered)\b/i;

const OPT_OUT = /\b(no,? thanks?( you)?|no thank you|unsubscribe|remove (me|us)|take (me|us) off|not interested|please don'?t (contact|email)|do not (contact|email)|stop (emailing|contacting)|no longer (wish|want) to (receive|hear))\b/i;

const POSITIVE = /\b(we('ve| have)|i('ve| have)) (added|linked|included|shared|put|listed)|\b(happy|glad|pleased) to (add|share|link|include|list|pass (it|this) on)|\b(will|i'll|we'll) (add|share|link|include|list|pass (it|this) on)|\b(added|linked) (it|you|the (page|link))|great resource|love (it|this)|looks great|very useful|really useful/i;

export function triage(subject: string, body: string, headers: Headers): Triage {
  const autoHeader = (headers.get('auto-submitted') ?? 'no').toLowerCase() !== 'no'
    || headers.has('x-autoreply') || headers.has('x-autorespond')
    || /auto_reply|bulk|junk/i.test(headers.get('precedence') ?? '');
  if (autoHeader || AUTO_SUBJECT.test(subject)) return 'auto';

  const text = body.replace(OUR_OPT_OUT, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 1500 && AUTO_BODY.test(text)) return 'auto';
  // Opt-outs are short. A long email that happens to say "not interested in X" is read by a human instead.
  if (text.length < 600 && OPT_OUT.test(text) && !POSITIVE.test(text)) return 'optout';
  if (POSITIVE.test(text)) return 'positive';
  return 'reply';
}
