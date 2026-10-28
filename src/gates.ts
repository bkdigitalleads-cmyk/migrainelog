/**
 * What is free and what is Pro, as pure functions checked by `npm test`.
 *
 * Free forever: logging and editing attacks (backfilled ones too), the
 * headache-free days, the current month's calendar and the last 30 days of
 * attacks. Pro: the monthly numbers and the medication-day counter, the
 * doctor report (free users can look at a SAMPLE preview that cannot be
 * shared or printed), history older than 30 days, earlier months in the
 * calendar, and the CSV export. Logging is never behind the paywall.
 */
import { addDays, dayKey, dayStart } from './days.ts';

export const FREE_HISTORY_DAYS = 30;

/** The start of the free history: local midnight 29 days before today. */
export function historyCutoff(now: number): number {
  return dayStart(addDays(dayKey(now), -(FREE_HISTORY_DAYS - 1)));
}

/** An attack shows in a free user's lists while any part of it is in the last 30 days. */
export function canSeeAttack(a: { startedAt: number; endedAt: number | null }, now: number, isPro: boolean): boolean {
  return isPro || (a.endedAt ?? now) >= historyCutoff(now);
}

/** The attacks to list, and how many older ones Pro would show. */
export function visibleAttacks<T extends { startedAt: number; endedAt: number | null }>(
  attacks: T[],
  now: number,
  isPro: boolean
): { shown: T[]; hidden: number } {
  const shown = attacks.filter((a) => canSeeAttack(a, now, isPro));
  return { shown, hidden: attacks.length - shown.length };
}

/** Free users see this month in the calendar; other months open the paywall. */
export function canSeeMonth(y: number, m: number, now: number, isPro: boolean): boolean {
  if (isPro) return true;
  const d = new Date(now);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}

export type ProFeature = 'report' | 'numbers' | 'history' | 'csv';

/** Null when it can be used now, else the feature, which is also why the paywall opens. */
export function gate(feature: ProFeature, isPro: boolean): ProFeature | null {
  return isPro ? null : feature;
}

/** Logging and editing never wait on Pro. Kept as a function so a check guards the promise. */
export function canLog(_isPro: boolean): true {
  return true;
}

/** The report preview opens for everyone; sharing and printing are Pro. */
export function reportAccess(isPro: boolean): { preview: true; share: boolean; sample: boolean } {
  return { preview: true, share: isPro, sample: !isPro };
}
