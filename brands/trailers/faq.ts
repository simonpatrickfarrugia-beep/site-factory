/**
 * The questions on a film page ("Is it worth watching?", "How long is it?" ...), built only from facts we hold
 * (IMDb score, US rating, runtime, box office). Shared by the page (src/templates/Movie.astro) and its FAQPage
 * schema (site.ts), so the markup always matches what's on screen. No invented opinions; streaming services
 * aren't named as having a film, because we don't track that.
 */
import type { Movie } from './model';
import { basisLine, type FreeFilm } from './public-domain';

export const runtimeText = (minutes: number | null) =>
  minutes ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m` : null;

export function movieFaq(m: Movie, free: FreeFilm | null, upcoming: { freeOn: string } | null) {
  const runtime = runtimeText(m.runtimeMinutes);
  const r = typeof m.imdbRating === 'number' ? m.imdbRating : null;
  const g = (m.genres[0] ?? 'this kind of film').toLowerCase();
  const verdict =
    r === null ? null
    : r >= 8 ? `Yes. It's rated ${r}/10 on IMDb, which puts it among the best-reviewed films there. A safe pick if you haven't seen it.`
    : r >= 7 ? `Most people think so. It holds ${r}/10 on IMDb, a strong score.`
    : r >= 6 ? `It splits opinion: ${r}/10 on IMDb. Worth it if you enjoy ${g} films.`
    : `Reviews are mixed (${r}/10 on IMDb), so watch the trailer above first and decide.`;
  const gross = Number((m.boxOffice ?? '').replace(/[^0-9]/g, '')) || 0;
  const hit = gross >= 100_000_000 ? ` It was a big hit too, taking ${m.boxOffice} at the US box office.` : '';
  const length = m.runtimeMinutes
    ? `${runtime}${m.runtimeMinutes < 95 ? ': a short one, easy for a weeknight.' : m.runtimeMinutes <= 130 ? ': a standard movie-night length.' : m.runtimeMinutes <= 150 ? ': on the long side, so start early.' : ': a long one. Settle in for the evening.'}`
    : null;
  const ratings: Record<string, string> = {
    G: 'Rated G in the US: fine for all ages.',
    PG: 'Rated PG in the US: fine for most kids, though some scenes may need a parent nearby.',
    'PG-13': 'Rated PG-13 in the US: better for teens; some material may not suit under-13s.',
    R: 'Rated R in the US: for adults, or under-17s with a parent.',
    'NC-17': 'Rated NC-17 in the US: adults only.',
  };
  const kids = m.rating ? ratings[m.rating] ?? null : null;
  const items = [
    verdict && { q: `Is ${m.name} worth watching?`, a: verdict + hit },
    length && { q: `How long is ${m.name}?`, a: length },
    kids && { q: `Is ${m.name} OK for kids?`, a: kids },
    free && { q: `Is it legal to watch ${m.name} free?`, a: `Yes, in the United States. ${basisLine(free)} We only play it to US visitors because copyright rules differ between countries, and we show the plain original, never a restored or re-scored version.` },
    upcoming && { q: `When can I watch ${m.name} free?`, a: `From ${upcoming.freeOn}, when it enters the public domain in the United States. It will play in full on this page from that day.` },
    free
      ? { q: `Where can I stream ${m.name}?`, a: `Right here, free, if you're in the US (player above). For a sharper restored copy, rent or buy it on Prime Video or Blu-ray.` }
      : { q: `Where can I stream ${m.name}?`, a: `You can rent or buy it on Prime Video in the US (button above). For subscription services, JustWatch shows where it's streaming today, since that changes month to month.` },
  ].filter(Boolean) as { q: string; a: string }[];
  return { items, hasVerdict: !!verdict, runtime };
}

/** FAQPage markup for the same questions (only when the page shows more than one). */
export function faqSchema(items: { q: string; a: string }[]) {
  if (items.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}
