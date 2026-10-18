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
/** OMDb sometimes puts the year inside the title ("Mad Max (1979)"); the year has its own field. */
const stripYear = (title: string) => title.replace(/\s*\(\d{4}\)\s*$/, '');

export async function omdbYearsForTitle(apiKey: string, title: string): Promise<{ Title: string; Year: string }[]> {
  const q = new URLSearchParams({ apikey: apiKey, s: title, type: 'movie' });
  const res = await fetch(`https://www.omdbapi.com/?${q}`);
  if (!res.ok) throw new Error(`OMDb search: HTTP ${res.status}`);
  const body = (await res.json()) as { Response: string; Search?: { Title: string; Year: string }[] };
  return body.Response === 'True' ? (body.Search ?? []).map((m) => ({ ...m, Title: stripYear(m.Title) })) : [];
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
  return { ...body, Title: stripYear(body.Title) };
}

export interface Copy {
  tagline: string;
  summary: string;
}

/** Claude writes an original tagline and summary (same brief the Make scenario used). */
/** Set when the API key isn't scoped to a workspace (Anthropic then needs the workspace named on each request). */
let anthropicWorkspace: string | undefined;
export const setAnthropicWorkspace = (id: string | undefined) => {
  anthropicWorkspace = id?.trim() || undefined;
};
const claudeHeaders = (apiKey: string): Record<string, string> => ({
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01',
  'content-type': 'application/json',
  ...(anthropicWorkspace ? { 'anthropic-workspace-id': anthropicWorkspace } : {}),
});

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
    headers: claudeHeaders(apiKey),
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

/** Claude writes copy for a new collection page: tagline, a two-paragraph intro and a meta description. */
export async function writeCollectionCopy(
  apiKey: string,
  model: string,
  name: string,
  films: { name: string; year: string | null }[],
): Promise<{ tagline: string; intro: string[]; metaDescription: string }> {
  const list = films.slice(0, 40).map((f) => `${f.name}${f.year ? ` (${f.year})` : ''}`).join('; ');
  const prompt = [
    `Collection page on a movie trailer website: "${name}".`,
    `Films in it: ${list}.`,
    '',
    'Write:',
    '1. tagline: at most 10 words, no quotation marks.',
    '2. intro: two short paragraphs (2–3 sentences each) for film fans. Say what ties these films together and name a few of them.',
    '   Natural language a person would search for (e.g. the theme name), no keyword stuffing, no claims about prices or availability.',
    `3. metaDescription: one sentence, 130–155 characters, for Google results. Mention "${name}" and trailers.`,
    '',
    'Reply with JSON only: {"tagline": "...", "intro": ["...", "..."], "metaDescription": "..."}',
  ].join('\n');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: claudeHeaders(apiKey),
    body: JSON.stringify({ model, max_tokens: 700, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { content: { type: string; text?: string }[] };
  const json = body.content.map((c) => c.text ?? '').join('').match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error('Claude: no JSON in reply');
  const c = JSON.parse(json) as { tagline?: string; intro?: string[]; metaDescription?: string };
  const intro = (c.intro ?? []).map((p) => p.trim()).filter(Boolean);
  if (!c.tagline?.trim() || intro.length === 0 || !c.metaDescription?.trim()) throw new Error('Claude: reply missing fields');
  return { tagline: c.tagline.trim().replace(/^["“]|["”]$/g, ''), intro: intro.slice(0, 3), metaDescription: c.metaDescription.trim().slice(0, 160) };
}
