// Tests for the comment spam filter (src/worker/spam.ts). Run: node --experimental-strip-types scripts/test-spam.ts
import { screenComment } from '../src/worker/spam.ts';

const ok = { ageMs: 20_000 };
const cases: [string, Parameters<typeof screenComment>[0], string][] = [
  ['plain praise', { ...ok, name: 'Jess', body: 'Saw this at the drive-in in 1985. Still the best ending ever.' }, 'live'],
  ['short', { ...ok, body: 'Classic!' }, 'live'],
  ['emoji ok', { ...ok, body: 'Loved it 😍🍿' }, 'live'],
  ['plot words not scams', { ...ok, body: 'He loaned the money to his brother and escorted her home. Great film.' }, 'live'],
  ['honeypot', { ...ok, body: 'nice', trap: 'http://x' }, 'spam'],
  ['too fast', { ageMs: 900, body: 'nice film' }, 'spam'],
  ['no stamp', { body: 'nice film' }, 'spam'],
  ['crypto', { ...ok, body: 'Earn $500 a day with crypto, DM me' }, 'spam'],
  ['whatsapp', { ...ok, body: 'Contact me on WhatsApp for free movies' }, 'spam'],
  ['three links', { ...ok, body: 'a.com b.net c.org' }, 'spam'],
  ['one link', { ...ok, body: 'Full review at https://myblog.example' }, 'held'],
  ['email', { ...ok, body: 'email me at someone@example.com' }, 'held'],
  ['handle', { ...ok, body: 'follow @bestmovies123 for more' }, 'held'],
  ['swearing', { ...ok, body: 'That fucking ending though' }, 'held'],
  ['shouting', { ...ok, body: 'THIS IS THE GREATEST MOVIE EVER MADE' }, 'held'],
  ['repeats', { ...ok, body: 'sooooooooo good' }, 'held'],
  ['emoji wall', { ...ok, body: '🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥' }, 'held'],
  ['link in name', { ...ok, name: 'cheapstuff.xyz', body: 'good movie' }, 'held'],
];
let fail = 0;
for (const [label, input, want] of cases) {
  const r = screenComment(input);
  const pass = r.verdict === want;
  if (!pass) fail++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}: ${r.verdict}${pass ? '' : ` (wanted ${want})`} ${r.reasons.join('; ')}`);
}
const tidy = screenComment({ ...ok, name: '  ', body: 'hi‮ there\n\n\n\nyou' });
if (tidy.name !== 'Movie fan' || tidy.body !== 'hi there\n\nyou') { fail++; console.log('FAIL tidy', JSON.stringify(tidy)); } else console.log('ok   tidy');
console.log(fail ? `${fail} failed` : 'all passed');
process.exit(fail ? 1 : 0);
