// Time zone maths without libraries: Intl does the zone rules (including daylight saving).

export const DEFAULT_TZ = 'Australia/Melbourne';
const DAY = 86_400_000;

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

export function validTz(tz: string) {
  try { fmt(tz); return true; } catch { return false; }
}

export interface LocalParts { y: number; m: number; d: number; hh: number; mm: number; ss: number; dow: number } // dow 1 = Monday … 7 = Sunday
const DOW: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export function localParts(ms: number, tz: string): LocalParts {
  const p: Record<string, string> = {};
  for (const x of fmt(tz).formatToParts(new Date(ms))) p[x.type] = x.value;
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour % 24, mm: +p.minute, ss: +p.second, dow: DOW[p.weekday] };
}

/** Offset of a zone from UTC at an instant, in ms (Melbourne summer = +11h). */
function offset(ms: number, tz: string) {
  const l = localParts(ms, tz);
  return Date.UTC(l.y, l.m - 1, l.d, l.hh, l.mm, l.ss) - Math.floor(ms / 1000) * 1000;
}

/** A wall-clock time in a zone → UTC ms. Times skipped by daylight saving move forward an hour. */
export function zonedToUtc(date: string, time: string, tz: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - offset(guess, tz);
  t = guess - offset(t, tz);
  return t;
}

export const pad = (n: number) => String(n).padStart(2, '0');
export function localDate(ms: number, tz: string) {
  const l = localParts(ms, tz);
  return `${l.y}-${pad(l.m)}-${pad(l.d)}`;
}
export function addDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY).toISOString().slice(0, 10);
}
export function isoDow(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}
/** Monday of the week containing this local date. */
export function weekStart(date: string) {
  return addDays(date, 1 - isoDow(date));
}

export interface Schedule {
  kind: string; days: string; time_local: string; tz: string; start_date: string; end_date: string | null;
}

export function scheduleDays(s: Schedule): number[] {
  if (s.kind === 'daily') return [1, 2, 3, 4, 5, 6, 7];
  return s.days.split(',').map(Number).filter((n) => n >= 1 && n <= 7);
}

/** Next send time strictly after `after` (UTC ms), or null when the schedule has finished. */
export function nextRun(s: Schedule, after: number): number | null {
  if (s.kind === 'once') {
    const t = zonedToUtc(s.start_date, s.time_local, s.tz);
    return t > after ? t : null;
  }
  const days = new Set(scheduleDays(s));
  if (!days.size) return null;
  let date = localDate(after, s.tz);
  if (date < s.start_date) date = s.start_date;
  for (let i = 0; i < 400; i++, date = addDays(date, 1)) {
    if (s.end_date && date > s.end_date) return null;
    if (!days.has(isoDow(date))) continue;
    const t = zonedToUtc(date, s.time_local, s.tz);
    if (t > after) return t;
  }
  return null;
}

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
