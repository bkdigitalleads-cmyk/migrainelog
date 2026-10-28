/**
 * Calendar days on the phone's local clock, as pure functions (no imports),
 * checked by `npm test`. A day is a string "YYYY-MM-DD". Arithmetic goes
 * through the date's own fields, never by adding 24 hours, so daylight
 * saving changes never shift a day.
 */

export const HOUR_MS = 3_600_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** The local calendar day of a time. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

export function isDayKey(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const { y, m, d } = parseDay(v);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

/** Local midnight at the start of a day, in ms. */
export function dayStart(key: string): number {
  const { y, m, d } = parseDay(key);
  return new Date(y, m - 1, d).getTime();
}

/** The local time on `key` at hour:minute. */
export function atTime(key: string, hour: number, minute = 0): number {
  const { y, m, d } = parseDay(key);
  return new Date(y, m - 1, d, hour, minute).getTime();
}

export function addDays(key: string, n: number): string {
  const { y, m, d } = parseDay(key);
  return dayKey(new Date(y, m - 1, d + n, 12).getTime());
}

/** Whole days from a to b (b later is positive). */
export function daysBetween(a: string, b: string): number {
  const pa = parseDay(a);
  const pb = parseDay(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}

/** Every day from `from` to `to`, both included. Empty when to is before from. */
export function dayRange(from: string, to: string): string[] {
  const n = daysBetween(from, to);
  const out: string[] = [];
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/** "YYYY-MM" of a day. */
export function monthOf(key: string): string {
  return key.slice(0, 7);
}

export function firstOfMonth(y: number, m: number): string {
  return `${y}-${pad(m)}-01`;
}

export function lastOfMonth(y: number, m: number): string {
  return `${y}-${pad(m)}-${pad(daysInMonth(y, m))}`;
}

/** The month before or after (delta months). */
export function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const i = y * 12 + (m - 1) + delta;
  return { y: Math.floor(i / 12), m: (i % 12) + 1 };
}

/** Monday = 0 ... Sunday = 6, the column of a day in a week that starts on Monday. */
export function weekdayMon(key: string): number {
  const { y, m, d } = parseDay(key);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function monthName(m: number): string {
  return MONTHS[m - 1];
}

/** "October 2026" */
export function monthLabel(y: number, m: number): string {
  return `${MONTHS[m - 1]} ${y}`;
}

/** "Oct 27", or "Oct 27, 2025" when `withYear`. */
export function shortDate(key: string, withYear = false): string {
  const { y, m, d } = parseDay(key);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}${withYear ? `, ${y}` : ''}`;
}

/** "Tue, Oct 27" */
export function dayLabel(key: string): string {
  return `${WEEKDAYS[weekdayMon(key)]}, ${shortDate(key)}`;
}

/** "2:41 pm" */
export function timeLabel(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(d.getMinutes())} ${h < 12 ? 'am' : 'pm'}`;
}

/** "14:41", for files a spreadsheet reads. */
export function time24(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "3 pm", or "3:30 pm" when not on the hour. */
export function hourLabel(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}${m === 0 ? '' : `:${pad(m)}`} ${h < 12 ? 'am' : 'pm'}`;
}

/** When something happened, as short as it can be: "today, 3 pm", "yesterday, 9:30 am", "Sun, 3 pm", "Oct 3, 3 pm". */
export function whenShort(ms: number, now: number): string {
  const day = dayKey(ms);
  const ago = daysBetween(day, dayKey(now));
  const which = ago === 0 ? 'today' : ago === 1 ? 'yesterday' : ago > 1 && ago < 7 ? WEEKDAYS[weekdayMon(day)] : shortDate(day, day.slice(0, 4) !== dayKey(now).slice(0, 4));
  return `${which}, ${hourLabel(ms)}`;
}
