/** Outside services: YouTube channel feeds, OMDb and Claude. */

export interface FeedVideo {
  youtubeId: string;
  title: string;
  channelId: string;
  publishedAt: string;
  description?: string;
}

/**
 * Newest videos from a YouTube channel via its public feed (about 15 videos).
 * No API key or quota needed, so it replaces the paid Apify scraper.
 */
export async function channelFeed(channelId: string): Promise<FeedVideo[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
    headers: { 'user-agent': 'movietrailer.channel pipeline' },
  });
  if (!res.ok) throw new Error(`YouTube feed ${channelId}: HTTP ${res.status}`);
  return parseFeed(await res.text(), channelId);
}

export function parseFeed(xml: string, channelId: string): FeedVideo[] {
  const out: FeedVideo[] = [];
  for (const entry of xml.split('<entry>').slice(1)) {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([^<]*)<\/title>/)?.[1];
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    const description = entry.match(/<media:description>([^<]*)<\/media:description>/)?.[1];
    if (id && title)
      out.push({ youtubeId: id, title: decodeXml(title), channelId, publishedAt: published ?? '', description: decodeXml(description ?? '') });
  }
  return out;
}

function decodeXml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export interface OmdbMovie {
  Title: string;
  Year: string;
  Rated: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Actors: string;
  Plot: string;
  BoxOffice?: string;
  imdbRating: string;
  imdbID: string;
  Type: string;
}

/** Years of every film OMDb has with this title (OMDb search, first page). Used to spot remakes. */
export async function omdbYearsForTitle(apiKey: string, title: string): Promise<{ Title: string; Year: string }[]> {
  const q = new URLSearchParams({ apikey: apiKey, s: title, type: 'movie' });
  const res = await fetch(`https://www.omdbapi.com/?${q}`);
  if (!res.ok) throw new Error(`OMDb search: HTTP ${res.status}`);
  const body = (await res.json()) as { Response: string; Search?: { Title: string; Year: string }[] };
  return body.Response === 'True' ? (body.Search ?? []) : [];
}

/** OMDb lookup by exact title (and year when known). Free key: 1,000 lookups a day. */
export async function omdbLookup(apiKey: string, title: string, year: number | null): Promise<OmdbMovie | null> {
  const q = new URLSearchParams({ apikey: apiKey, t: title, type: 'movie', plot: 'short' });
  if (year) q.set('y', String(year));
  const res = await fetch(`https://www.omdbapi.com/?${q}`);
  if (!res.ok) throw new Error(`OMDb: HTTP ${res.status}`);
  const body = (await res.json()) as OmdbMovie & { Response: string; Error?: string };
  if (body.Response !== 'True') {
    if (body.Error && !/not found/i.test(body.Error)) throw new Error(`OMDb: ${body.Error}`);
    return null;
  }
  return body;
}

export interface Copy {
  tagline: string;
  summary: string;
}

/** Claude writes an original tagline and summary (same brief the Make scenario used). */
export async function writeCopy(apiKey: string, model: string, m: OmdbMovie): Promise<Copy> {
  const prompt = [
    `Film: ${m.Title} (${m.Year})`,
    `Genre: ${m.Genre}`,
    `Director: ${m.Director}`,
    `Starring: ${m.Actors}`,
    `Plot outline: ${m.Plot}`,
    '',
    'Write copy for a movie trailer website:',
    '1. A tagline of at most 12 words. No quotation marks.',
    '2. An original summary of 2–3 sentences. Do not copy the plot outline wording, and no spoilers beyond the setup.',
    '',
    'Reply with JSON only: {"tagline": "...", "summary": "..."}',
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = body.content.map((c) => c.text ?? '').join('');
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error('Claude: no JSON in reply');
  const copy = JSON.parse(json) as Partial<Copy>;
  const tagline = copy.tagline?.trim().replace(/^["“]|["”]$/g, '');
  const summary = copy.summary?.trim();
  if (!tagline || !summary) throw new Error('Claude: reply missing tagline or summary');
  if (tagline.split(/\s+/).length > 14) throw new Error('Claude: tagline too long');
  return { tagline, summary };
}
