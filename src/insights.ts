/**
 * Counting, as pure functions checked by `npm test`: attack length, which
 * days had a headache or a migraine, long attacks, medication days by type,
 * triggers and days lost. The screens, the report and the CSV all count
 * through here, so they always agree.
 *
 * Rules:
 *  - An attack covers every local calendar day from the day it started to
 *    the day it ended (an attack that ends exactly at midnight does not
 *    reach the next day). An open attack runs to now.
 *  - A headache day is a day any attack covers. A migraine day is a day a
 *    migraine covers: the person said it was one, or it was moderate or
 *    severe (from the severity, or the pain score when no severity was
 *    picked: 1 to 3 mild, 4 to 6 moderate, 7 to 10 severe). The person's
 *    own "not a migraine" wins over severity.
 *  - A medication day is a local day with at least one dose of that type.
 *  - Headache-free days are only the ones the person marked. A day with no
 *    entry is unknown, never counted as free.
 * No advice, no prediction: these are counts of what was logged.
 */
import type { Attack, MedKind, Severity } from './model';
import { ACUTE_KINDS } from './labels.ts';
import { addDays, dayKey, dayRange, daysBetween, firstOfMonth, HOUR_MS, lastOfMonth } from './days.ts';

/** An attack this long or longer is a long attack (the 4 hours preventive treatments are judged on). */
export const LONG_ATTACK_MS = 4 * HOUR_MS;

/** How long it lasted, or has lasted so far. Never negative. */
export function durationMs(a: { startedAt: number; endedAt: number | null }, now: number): number {
  return Math.max(0, (a.endedAt ?? now) - a.startedAt);
}

/** "45 min", "4 h 10 min", "2 days 3 h". */
export function formatDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return `${d} ${d === 1 ? 'day' : 'days'}${rh > 0 ? ` ${rh} h` : ''}`;
}

/** Severity as picked, or read from the pain score. Null when neither was given (or pain was 0). */
export function severityOf(a: { severity: Severity | null; pain: number | null }): Severity | null {
  if (a.severity) return a.severity;
  if (a.pain == null || a.pain <= 0) return null;
  if (a.pain <= 3) return 'mild';
  if (a.pain <= 6) return 'moderate';
  return 'severe';
}

const SEVERITY_PAIN: Record<Severity, number> = { mild: 3, moderate: 6, severe: 9 };

/** The pain score, or a stand-in from severity, for shading the calendar. Null when unknown. */
export function painLevel(a: { severity: Severity | null; pain: number | null }): number | null {
  if (a.pain != null) return a.pain;
  return a.severity ? SEVERITY_PAIN[a.severity] : null;
}

export function isMigraine(a: { migraine: boolean | null; severity: Severity | null; pain: number | null }): boolean {
  if (a.migraine != null) return a.migraine;
  const s = severityOf(a);
  return s === 'moderate' || s === 'severe';
}

export function isLong(a: { startedAt: number; endedAt: number | null }, now: number): boolean {
  return durationMs(a, now) >= LONG_ATTACK_MS;
}

/** The local days an attack covers, first to last. */
export function coveredDays(a: { startedAt: number; endedAt: number | null }, now: number): string[] {
  const end = Math.max(a.startedAt, (a.endedAt ?? now) - 1);
  return dayRange(dayKey(a.startedAt), dayKey(end));
}

export type DayStatus = 'migraine' | 'headache' | 'free' | 'none';

export interface DayInfo {
  day: string;
  status: DayStatus;
  /** Worst pain of the attacks that day (0 to 10), or null when no pain was logged. */
  worstPain: number | null;
  /** An attack of 4 hours or more covered this day. */
  long: boolean;
  /** Acute and preventive kinds with a dose that day. */
  medKinds: MedKind[];
  attackIds: number[];
  /** Work or study missed (yes) or reduced (partly) that day. */
  missed: boolean;
  reduced: boolean;
}

const emptyDay = (day: string): DayInfo => ({
  day,
  status: 'none',
  worstPain: null,
  long: false,
  medKinds: [],
  attackIds: [],
  missed: false,
  reduced: false,
});

/** Every day from `from` to `to` with what was logged on it. */
export function buildDays(attacks: Attack[], freeDays: Iterable<string>, from: string, to: string, now: number): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>();
  for (const d of dayRange(from, to)) map.set(d, emptyDay(d));
  for (const a of attacks) {
    const migraine = isMigraine(a);
    const long = isLong(a, now);
    const pain = painLevel(a);
    for (const d of coveredDays(a, now)) {
      const info = map.get(d);
      if (!info) continue;
      info.attackIds.push(a.id);
      if (migraine) info.status = 'migraine';
      else if (info.status !== 'migraine') info.status = 'headache';
      if (pain != null) info.worstPain = Math.max(info.worstPain ?? 0, pain);
      if (long) info.long = true;
      if (a.impact === 'yes') info.missed = true;
      if (a.impact === 'partly') info.reduced = true;
    }
    for (const dose of a.doses) {
      const info = map.get(dayKey(dose.takenAt));
      if (info && !info.medKinds.includes(dose.medKind)) info.medKinds.push(dose.medKind);
    }
  }
  for (const d of freeDays) {
    const info = map.get(d);
    if (info && info.status === 'none') info.status = 'free';
  }
  return map;
}

/** Days with any non-preventive dose. */
export function hasAcuteMed(info: DayInfo): boolean {
  return info.medKinds.some((k) => k !== 'preventive');
}

/**
 * Days a month on which doctors start to watch for medication-overuse
 * headache (International Classification of Headache Disorders, 3rd
 * edition, 8.2): 10 or more days a month of triptans, ergots, opioids or
 * combination painkillers; 15 or more of simple painkillers. The app only
 * mentions the number; it never says what to do.
 */
export const WATCH_DAYS: Partial<Record<MedKind, number>> = { triptan: 10, ergot: 10, opioid: 10, combo: 10, simple: 15 };

export interface MedNote {
  kind: MedKind;
  days: number;
  level: number;
}

/** The kinds whose day count reached its level, most days first. */
export function medNotes(medDays: Partial<Record<MedKind, number>>): MedNote[] {
  const out: MedNote[] = [];
  for (const kind of ACUTE_KINDS) {
    const level = WATCH_DAYS[kind];
    const days = medDays[kind] ?? 0;
    if (level != null && days >= level) out.push({ kind, days, level });
  }
  return out.sort((a, b) => b.days - a.days);
}

/** The calm note under a count that reached its level. No diagnosis, no advice to change anything. */
export function medNoteText(days: number, scope: 'month' | 'rolling'): string {
  const when = scope === 'month' ? 'this month' : 'in the last 30 days';
  return `You logged medication on ${days} days ${when}. Doctors watch this number. Consider sharing this report at your next visit.`;
}

export interface Window {
  from: string;
  to: string;
}

/** The last `n` days, today included. */
export function rollingWindow(now: number, n = 30): Window {
  const to = dayKey(now);
  return { from: addDays(to, -(n - 1)), to };
}

/** A calendar month, cut at today while it is still going (later days have nothing to count). */
export function monthWindow(y: number, m: number, now: number): Window & { complete: boolean } {
  const from = firstOfMonth(y, m);
  const last = lastOfMonth(y, m);
  const today = dayKey(now);
  const to = daysBetween(today, last) > 0 ? today : last;
  return { from, to, complete: to === last };
}

export interface Numbers {
  from: string;
  to: string;
  /** Days in the window. */
  dayCount: number;
  /** Days with an attack or a headache-free mark. */
  loggedDays: number;
  headacheDays: number;
  migraineDays: number;
  /** Days covered by an attack of 4 hours or more. */
  longDays: number;
  /** Attacks that started in the window. */
  attackCount: number;
  /** Of those, how many lasted 4 hours or more. */
  longAttacks: number;
  /** Average length of the finished attacks that started in the window, or null when there are none. */
  averageMs: number | null;
  /** Days with a dose, by kind (preventives included; the screens show acute kinds). */
  medDays: Partial<Record<MedKind, number>>;
  /** Days with any acute dose. */
  acuteMedDays: number;
  /** Triggers on the attacks that started in the window, most common first. */
  triggers: { id: string; count: number }[];
  missedDays: number;
  /** Reduced but not missed. */
  reducedDays: number;
}

/** Everything counted for one window. */
export function numbersFor(attacks: Attack[], freeDays: Iterable<string>, w: Window, now: number): Numbers {
  const days = buildDays(attacks, freeDays, w.from, w.to, now);
  const n: Numbers = {
    from: w.from,
    to: w.to,
    dayCount: days.size,
    loggedDays: 0,
    headacheDays: 0,
    migraineDays: 0,
    longDays: 0,
    attackCount: 0,
    longAttacks: 0,
    averageMs: null,
    medDays: {},
    acuteMedDays: 0,
    triggers: [],
    missedDays: 0,
    reducedDays: 0,
  };
  for (const info of days.values()) {
    if (info.status !== 'none') n.loggedDays++;
    if (info.status === 'headache' || info.status === 'migraine') n.headacheDays++;
    if (info.status === 'migraine') n.migraineDays++;
    if (info.long) n.longDays++;
    for (const k of info.medKinds) n.medDays[k] = (n.medDays[k] ?? 0) + 1;
    if (hasAcuteMed(info)) n.acuteMedDays++;
    if (info.missed) n.missedDays++;
    else if (info.reduced) n.reducedDays++;
  }
  const started = attacks.filter((a) => {
    const d = dayKey(a.startedAt);
    return d >= w.from && d <= w.to;
  });
  n.attackCount = started.length;
  n.longAttacks = started.filter((a) => isLong(a, now)).length;
  const finished = started.filter((a) => a.endedAt != null);
  if (finished.length > 0) n.averageMs = finished.reduce((s, a) => s + durationMs(a, now), 0) / finished.length;
  const counts = new Map<string, number>();
  for (const a of started) for (const t of new Set(a.triggers)) counts.set(t, (counts.get(t) ?? 0) + 1);
  n.triggers = [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  return n;
}

/** Per 30 days, rounded to one decimal, for windows longer than a month. */
export function per30(count: number, dayCount: number): number {
  if (dayCount <= 0) return 0;
  return Math.round((count / dayCount) * 30 * 10) / 10;
}

// ---------- preventives ----------

/** Days a preventive was taken: start to stop, or to today while still taken. Never negative. */
export function courseDays(startedOn: string, stoppedOn: string | null, today: string): number {
  return Math.max(0, daysBetween(startedOn, stoppedOn ?? today));
}

/** "12 days", "8 weeks", "5 months". Weeks from 2 weeks, months from 3 months (91 days). */
export function courseLabel(days: number): string {
  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'}`;
  if (days < 91) {
    const w = Math.floor(days / 7);
    return `${w} weeks`;
  }
  return `${Math.round(days / 30.44)} months`;
}
