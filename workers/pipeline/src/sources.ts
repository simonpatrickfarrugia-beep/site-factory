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
  /** e.g. "17 Oct 2025" (US release) or "N/A". */
  Released?: string;
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

/** Pull the JSON object out of a Claude reply; on failure say what came back so the log is useful. */
async function claudeJson(res: Response): Promise<string> {
  if (!res.ok) throw new Error(`Claude: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
  const text = (body.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
  const json = text.replace(/```(?:json)?/g, '').match(/\{[\s\S]*\}/)?.[0];
  if (!json) {
    const types = (body.content ?? []).map((c) => c.type).join(',') || 'none';
    throw new Error(`Claude: no JSON in reply (stop=${body.stop_reason}, blocks=${types}, text="${text.slice(0, 120)}")`);
  }
  return json;
}

export async function writeCopy(apiKey: string, model: string, m: OmdbMovie): Promise<Copy> {
  const prompt = [
    `Film: ${m.Title} (${m.Year})`,
    `Genre: ${m.Genre}`,
    `Director: ${m.Director}`,
    `Starring: ${m.Actors}`,
    `Plot outline: ${m.Plot}`,
    '',
    'Write copy for a movie trailer website:',
    '1. A tagline of at most 10 words. No quotation marks.',
    '2. An original summary of 2–3 sentences. Do not copy the plot outline wording, and no spoilers beyond the setup.',
    '',
    'Reply with JSON only: {"tagline": "...", "summary": "..."}',
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: claudeHeaders(apiKey),
    body: JSON.stringify({ model, max_tokens: 6000, messages: [{ role: 'user', content: prompt }] }),
  });
  const json = await claudeJson(res);
  const copy = JSON.parse(json) as Partial<Copy>;
  const tagline = copy.tagline?.trim().replace(/^["“]|["”]$/g, '');
  const summary = copy.summary?.trim();
  if (!tagline || !summary) throw new Error('Claude: reply missing tagline or summary');
  if (tagline.split(/\s+/).length > 18) throw new Error('Claude: tagline too long');
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
    body: JSON.stringify({ model, max_tokens: 8000, messages: [{ role: 'user', content: prompt }] }),
  });
  const json = await claudeJson(res);
  const c = JSON.parse(json) as { tagline?: string; intro?: string[]; metaDescription?: string };
  const intro = (c.intro ?? []).map((p) => p.trim()).filter(Boolean);
  if (!c.tagline?.trim() || intro.length === 0 || !c.metaDescription?.trim()) throw new Error('Claude: reply missing fields');
  return { tagline: c.tagline.trim().replace(/^["“]|["”]$/g, ''), intro: intro.slice(0, 3), metaDescription: c.metaDescription.trim().slice(0, 160) };
}

export interface Suggestion {
  title: string;
  year: number | null;
  theme: string;
}

/**
 * Claude suggests films to add to the catalogue candidate list. Every suggestion still has its
 * search volume checked before it can be queued, so only films with real demand get published.
 */
export async function suggestCandidates(
  apiKey: string,
  model: string,
  themes: { theme: string; volume: number }[],
  known: string[],
  count: number,
): Promise<Suggestion[]> {
  const prompt = [
    'You help grow a movie trailer website for a US audience. Each film page links to rent or stream it (Prime Video, JustWatch).',
    '',
    'Themes we already cover, most searched first (monthly US Google searches):',
    ...themes.map((t) => `- ${t.theme}: ${t.volume.toLocaleString()}`),
    '',
    `Suggest ${count} more feature films people in the USA actively search for and can rent or stream in the USA today.`,
    '- About three quarters for the themes above (strongest themes first); the rest for up to 2 NEW themes close to them.',
    '- Any decade, including recent films, but only films already released digitally (no films still only in cinemas).',
    '- Exact original release title and year as IMDb lists it. Theatrical feature films only: no TV series, shorts or documentaries.',
    '- Do NOT suggest any film in this list (we already have or track it):',
    known.join('; '),
    '',
    'Reply with JSON only: {"films": [{"title": "...", "year": 1999, "theme": "..."}]}',
  ].join('\n');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: claudeHeaders(apiKey),
    body: JSON.stringify({ model, max_tokens: 12000, messages: [{ role: 'user', content: prompt }] }),
  });
  const json = await claudeJson(res);
  const parsed = JSON.parse(json) as { films?: { title?: unknown; year?: unknown; theme?: unknown }[] };
  return (parsed.films ?? [])
    .filter((f) => typeof f.title === 'string' && f.title.trim())
    .map((f) => ({
      title: String(f.title).trim(),
      year: Number.isInteger(Number(f.year)) && Number(f.year) > 1900 ? Number(f.year) : null,
      theme: typeof f.theme === 'string' && f.theme.trim() ? f.theme.trim() : 'Suggested',
    }));
}

/** Claude judges how well a niche suits the Site Factory model (automated pages built on real data). */
export async function judgeNiche(
  apiKey: string,
  model: string,
  idea: string,
  notes: string | null | undefined,
  market: string,
  keywords: { keyword: string; volume: number; cpc: number | null; kd: number | null }[],
): Promise<import('./niches').FitJudgement> {
  const prompt = [
    'You assess website niches for a solo founder who runs many small sites from one codebase.',
    'His model: pages are generated automatically from a FREE or cheap structured data source (APIs, open data, feeds),',
    'enriched with short AI-written copy, and monetised with affiliate links, display ads or leads. Google penalises thin,',
    'mass-produced AI text, so a niche only works if real data makes every page genuinely useful.',
    '',
    `Niche: ${idea}`,
    notes ? `Founder's notes: ${notes}` : '',
    `Biggest related Google searches in ${market} (monthly volume in ${market}, CPC USD, SEO difficulty 0-100). Google Ads groups close variants, so near-identical searches can share one volume figure:`,
    ...keywords.slice(0, 30).map((k) => `- ${k.keyword}: ${k.volume}/mo, cpc ${k.cpc ?? '?'}, kd ${k.kd ?? '?'}`),
    '',
    'Score "fit" 0-100: is there a usable data source that can generate hundreds of useful pages automatically,',
    'clear ways to earn (name real affiliate programs or ad potential), low legal/YMYL/copyright risk, and room for a small site.',
    'Be blunt; most niches should score under 60.',
    '',
    'Reply with JSON only: {"fit": 0-100, "verdict": "one or two sentences", "angle": "the specific site to build",',
    '"dataSources": ["..."], "monetisation": ["..."], "pageTypes": ["e.g. /[thing]/[city] pages ..."], "risks": ["..."]}',
  ]
    .filter((l) => l !== '')
    .join('\n');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: claudeHeaders(apiKey),
    body: JSON.stringify({ model, max_tokens: 8000, messages: [{ role: 'user', content: prompt }] }),
  });
  const j = JSON.parse(await claudeJson(res)) as Partial<import('./niches').FitJudgement>;
  const list = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 8) : []);
  return {
    fit: Number(j.fit) || 0,
    verdict: String(j.verdict ?? ''),
    angle: String(j.angle ?? ''),
    dataSources: list(j.dataSources),
    monetisation: list(j.monetisation),
    pageTypes: list(j.pageTypes),
    risks: list(j.risks),
  };
}

/** Claude picks which affiliate categories fit a niche (from the catalogue's list). */
export async function pickCategories(apiKey: string, model: string, idea: string, notes: string | null | undefined, categories: Record<string, string>): Promise<string[]> {
  const prompt = [
    `Website idea: ${idea}`,
    notes ? `Notes: ${notes}` : '',
    '',
    'Which of these affiliate categories would this site realistically earn from? Pick 1 to 3, most relevant first.',
    ...Object.entries(categories).map(([id, label]) => `- ${id}: ${label}`),
    '',
    'Reply with JSON only: {"categories": ["id", "id"]}',
  ].filter((l) => l !== '').join('\n');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: claudeHeaders(apiKey),
    body: JSON.stringify({ model, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
  });
  const j = JSON.parse(await claudeJson(res)) as { categories?: unknown };
  return (Array.isArray(j.categories) ? j.categories.map(String) : []).filter((c) => c in categories).slice(0, 3);
}

export interface NicheCandidate { idea: string; seeds: string[]; terms: string[]; market: 'US' | 'AU'; why: string }

/**
 * Weekly niche discovery: Claude proposes new site ideas that fit the factory model
 * (many useful pages generated from free structured data), avoiding everything already tried.
 */
export async function brainstormNiches(apiKey: string, model: string, n: number, avoid: string[], liked: string[]): Promise<NicheCandidate[]> {
  const prompt = [
    'You find website niches for a solo founder in Melbourne who runs many small sites from one codebase.',
    'His model: hundreds of pages generated from a FREE structured data source (open data, free APIs, Wikidata, government data),',
    'each page answering a real search with real numbers, monetised with affiliate links, display ads or leads.',
    'He wins on long-tail, templated searches that big sites ignore: "[thing] in [place]", "[a] vs [b]", "[thing] [attribute]",',
    '"how long/how much/when/where to [thing]". Thin AI text without data loses, and so do health, finance and legal advice (YMYL).',
    '',
    `Propose ${n} NEW, specific niche ideas. Mix them: about two thirds for the United States, one third for Australia.`,
    'Each idea must name the repeating page pattern and have a plausible free data source. Avoid generic mega-topics.',
    avoid.length ? `Already tried or rejected (do not repeat or rephrase): ${avoid.join('; ')}` : '',
    liked.length ? `Ideas that scored well before (find different niches with the same shape): ${liked.join('; ')}` : '',
    '',
    'For each, give 3 short seed searches that real people type (the templated long-tail kind, not brand names),',
    'and 1 to 4 topic words that EVERY relevant search would contain (e.g. ["tornado", "hail"] or ["ski"]): single words, specific to the topic, never generic words like "best", "near", "county", "city", "price" or place names.',
    'Reply with JSON only: {"ideas": [{"idea": "short name", "seeds": ["...", "...", "..."], "terms": ["..."], "market": "US" or "AU", "why": "the page pattern + data source in one sentence"}]}',
  ].filter((l) => l !== '').join('\n');
  // One retry: a long JSON list occasionally comes back malformed.
  let j: { ideas?: unknown } = {};
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: claudeHeaders(apiKey),
      body: JSON.stringify({ model, max_tokens: 6000, messages: [{ role: 'user', content: prompt }] }),
    });
    try {
      j = JSON.parse(await claudeJson(res)) as { ideas?: unknown };
      break;
    } catch (e) {
      if (attempt === 1) throw e;
    }
  }
  const out: NicheCandidate[] = [];
  for (const raw of Array.isArray(j.ideas) ? j.ideas : []) {
    const r = raw as Record<string, unknown>;
    const seeds = Array.isArray(r.seeds) ? r.seeds.map(String).filter(Boolean).slice(0, 5) : [];
    const terms = Array.isArray(r.terms) ? r.terms.map(String).filter((t) => t && !t.includes(' ')).slice(0, 4) : [];
    if (!r.idea || !seeds.length || !terms.length) continue;
    out.push({ idea: String(r.idea).slice(0, 90), seeds, terms, market: r.market === 'AU' ? 'AU' : 'US', why: String(r.why ?? '').slice(0, 300) });
  }
  return out.slice(0, n);
}
