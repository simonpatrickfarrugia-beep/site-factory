/**
 * Free films rules (brands/trailers/public-domain.ts): the release date maths and every way a film can be refused.
 * Run: node --experimental-strip-types scripts/test-public-domain.ts   (CI runs it for the trailers brand)
 */
import { readFileSync } from 'node:fs';
import { freeFilmsToPublish, usCutoffYear, type FreeFilm } from '../brands/trailers/public-domain.ts';

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean) => (cond ? pass++ : fails.push(name));
const throws = (name: string, fn: () => unknown, re: RegExp) => {
  try { fn(); fails.push(`${name}: did not throw`); } catch (e) { ok(name, re.test(String(e))); if (!re.test(String(e))) fails.push(`${name}: ${String(e).slice(0, 200)}`); }
};

// 1. Cutoff: 1931 films are free from 1 January 2027 in Hawaii (10:00 UTC), not a minute earlier.
ok('cutoff on 1 Nov 2026 is 1930', usCutoffYear(new Date('2026-11-01T00:00:00Z')) === 1930);
ok('still 1930 at 23:59 31 Dec in Hawaii', usCutoffYear(new Date('2027-01-01T09:59:00Z')) === 1930);
ok('1931 at 00:00 1 Jan in Hawaii', usCutoffYear(new Date('2027-01-01T10:00:00Z')) === 1931);
ok('Melbourne New Year is too early', usCutoffYear(new Date('2026-12-31T13:00:00Z')) === 1930);

// 2. The real data passes, and held 1931 films wait for their day.
const films = JSON.parse(readFileSync('data/trailers/public-domain.json', 'utf8')) as FreeFilm[];
const now = freeFilmsToPublish(films, new Date('2026-11-01T00:00:00Z')).map((f) => f.slug);
const jan = freeFilmsToPublish(films, new Date('2027-01-01T10:00:00Z')).map((f) => f.slug);
ok('Dracula held in November 2026', !now.includes('dracula-1931'));
ok('Dracula live on 1 January 2027', jan.includes('dracula-1931'));
ok('pending films never publish', !now.some((s) => films.find((f) => f.slug === s)?.status === 'pending'));
ok('every published film has evidence', freeFilmsToPublish(films).every((f) => f.evidence.length >= 1));

// 3. Every way in that must be refused.
const base = films.find((f) => f.slug === 'his-girl-friday-1940')!;
const t = (patch: Partial<FreeFilm>) => () => freeFilmsToPublish([{ ...base, ...patch }], new Date('2026-11-01T00:00:00Z'));
throws('foreign lapsed film refused (URAA)', t({ country: 'GB' }), /US-made/);
throws('lapsed film after 1977 refused', t({ year: '1980', slug: 'his-girl-friday-1980' }), /before 1978/);
throws('one evidence link refused for lapsed', t({ evidence: [base.evidence[0]] }), /two evidence/);
throws('underlying work still owned refused', t({ underlying: [{ work: 'A 1950 novel', year: 1950, status: 'public-domain' }] }), /not public domain by age/);
throws('blocked title refused', t({ slug: 'its-a-wonderful-life-1946', name: "It's a Wonderful Life", year: '1946' }), /blocked/);
throws('too-new film refused unless held', t({ basis: 'term-expired', year: '1935', slug: 'his-girl-friday-1935' }), /still in US copyright/);
throws('silent film needs an audio check', t({ audio: 'silent' }), /audioCheckedOn/);
throws('added score refused', t({ audio: 'rescored' as FreeFilm['audio'] }), /audio must be/);
throws('trademark words refused', t({ about: base.about + ' A Universal Monsters classic.' }), /trademark/);
throws('thin copy refused', t({ about: 'Too short.' }), /80\+/);
throws('no human check refused', t({ audit: { checkedOn: '' } }), /checkedOn/);
throws('bad Archive id refused', t({ archiveId: 'x' }), /archiveId/);
ok('removed film is skipped', freeFilmsToPublish([{ ...base, status: 'removed', country: 'GB' }]).length === 0);

if (fails.length) { console.error(`FAIL ${fails.length}:\n- ${fails.join('\n- ')}`); process.exit(1); }
console.log(`${pass}/${pass} free films rules passed`);
