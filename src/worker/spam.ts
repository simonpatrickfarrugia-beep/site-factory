/**
 * Comment spam filter (24 Nov 2026). Pure function, no I/O, so scripts/test-spam.ts can run it with plain Node.
 *
 * Verdicts:
 *   spam  — never shown, never offered for review (scams, sex/gambling ads, slurs, bots that fill hidden fields or post instantly).
 *   held  — waits for Simon in IMN HQ (links, contact details, strong swearing, shouting, junk-looking text).
 *   live  — shown straight away.
 * The caller adds the checks that need the database (rate limits, repeats, floods) on top of this.
 */
export type Verdict = 'live' | 'held' | 'spam';
export interface Screen { verdict: Verdict; score: number; reasons: string[]; name: string; body: string }

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]{1,}\.(com|net|org|io|co|me|ru|cn|xyz|top|info|biz|link|site|online|shop|app|ly|gg|tv|au)\b)/i;
const CONTACT = /([^\s@]+@[^\s@]+\.[a-z]{2,}|(\+?\d[\d\s().-]{7,}\d)|(^|\s)@[a-z0-9_.]{3,})/i;
// Ads and scams that turn up in comment boxes. Whole words, so "loaned" or "escorted" in a plot summary don't trip it.
const SCAM = /\b(crypto|bitcoin|btc|forex|casino|pokies|betting|bet365|viagra|cialis|porn|xxx|onlyfans|escorts?|hookups?|payday loans?|telegram|whatsapp|dm me|text me|click (here|the link|my)|free money|make money|earn \$?\d|work from home|investment (plan|opportunit)|seo services?|backlinks?|followers? for|cheap (followers|likes)|giveaway winner|claim your)\b/i;
// Hateful slurs (stems): spam outright. Kept short and to stems so variants are caught.
const SLUR = /\b(nigg|fagg?ot|fags?\b|kike|chink|spick?\b|wetback|tranny|retard)/i;
// Strong swearing: held for a look rather than blocked (it's a film site; "that ending was f***ing great" is fine to approve).
const STRONG = /\b(fuck|cunt|motherfuck|whore|slut)/i;

const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;
const upper = (s: string) => (s.match(/\p{Lu}/gu) ?? []).length;

/** Tidy and check a comment. `ageMs` = time since the page loaded (Base.astro stamps forms); `trap` = the hidden field. */
export function screenComment(input: { name?: string; body?: string; trap?: string; ageMs?: number }): Screen {
  const reasons: string[] = [];
  let score = 0;
  const clean = (s: string, max: number) => s.normalize('NFKC').replace(/[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
  const body = clean(input.body ?? '', 500);
  const name = clean(input.name ?? '', 40).replace(/\n/g, ' ') || 'Movie fan';
  const all = `${name}\n${body}`;
  const out = (verdict: Verdict): Screen => ({ verdict, score, reasons, name, body });

  if (input.trap) { reasons.push('hidden field filled (bot)'); return out('spam'); }
  const age = input.ageMs ?? NaN;
  if (!Number.isFinite(age) || age < 3000 || age > 86_400_000) { reasons.push('posted too fast or without the page stamp (bot)'); return out('spam'); }
  if (SCAM.test(all)) { reasons.push('advert or scam words'); return out('spam'); }
  if (SLUR.test(all)) { reasons.push('slur'); return out('spam'); }
  if ((all.match(new RegExp(LINK.source, 'gi')) ?? []).length >= 3) { reasons.push('3+ links'); return out('spam'); }

  if (LINK.test(all)) { score += 2; reasons.push('has a link'); }
  if (CONTACT.test(all)) { score += 2; reasons.push('has an email, phone number or handle'); }
  if (STRONG.test(all)) { score += 2; reasons.push('strong swearing'); }
  const L = letters(body);
  if (L >= 12 && upper(body) / L > 0.7) { score += 1; reasons.push('shouting (mostly capitals)'); }
  if (/(.)\1{6,}/u.test(body)) { score += 1; reasons.push('repeated characters'); }
  if (body.length >= 20 && L / body.length < 0.4) { score += 1; reasons.push('mostly symbols or emoji'); }
  if (/\p{Script=Cyrillic}|\p{Script=Han}|\p{Script=Arabic}/u.test(body) && L > 0 && (body.match(/[A-Za-z]/g) ?? []).length / L < 0.3) {
    score += 1; reasons.push('not in English (we can\'t check it)');
  }
  return out(score > 0 ? 'held' : 'live');
}

/** Problems a visitor can fix before posting (shown to them), as opposed to spam signals (never explained). */
export function commentProblem(body: string): string | null {
  const t = body.trim();
  if (t.length < 2) return 'Write a little more first.';
  if (t.length > 500) return 'Keep it under 500 characters.';
  return null;
}
