/**
 * Small behavior rules, as pure functions checked by `npm test`: which
 * theme shows, when the evening question appears, when a rating prompt may
 * ask, and the home-screen quick action.
 */
import type { Track } from './model';
import { startLabel, overLabel } from './labels.ts';

/**
 * Dark by default. The light theme only when the person asked to follow the
 * phone, and never while an attack is open. 'unspecified' hands the choice
 * to iOS (which then follows the system).
 */
export function schemeFor(opts: { followSystem: boolean; attackOpen: boolean }): 'dark' | 'unspecified' {
  return opts.followSystem && !opts.attackOpen ? 'unspecified' : 'dark';
}

/** The evening question shows from this local hour. */
export const EVENING_HOUR = 18;

/**
 * "Headache today?" on Home: once per evening, from 6 pm, only while the
 * day has nothing logged (no attack and no headache-free mark) and only
 * when it was not already answered or put away today.
 */
export function eveningDue(opts: {
  hour: number;
  enabled: boolean;
  today: string;
  answeredDay: string | null;
  dayLogged: boolean;
  attackOpen: boolean;
}): boolean {
  return opts.enabled && !opts.attackOpen && opts.hour >= EVENING_HOUR && opts.answeredDay !== opts.today && !opts.dayLogged;
}

/**
 * A rating prompt: never while an attack is open, at most one per launch,
 * each trigger once ever.
 */
export function reviewAllowed(opts: { attackOpen: boolean; askedThisLaunch: boolean; triggerUsed: boolean }): boolean {
  return !opts.attackOpen && !opts.askedThisLaunch && !opts.triggerUsed;
}

/** The one home-screen quick action: start an attack, or end the open one. */
export function quickActionFor(track: Track, attackOpen: boolean): { id: 'start' | 'end'; title: string } {
  return attackOpen ? { id: 'end', title: overLabel(track) } : { id: 'start', title: startLabel(track) };
}

/** The quick lengths on the details screen, in hours: short, the 4 hours that counts as long, all day. Anything else is Custom. */
export const LENGTH_HOURS = [2, 4, 24];

/** Attack over this soon after Attack started is probably a mistake (a double tap, the quick action twice). */
export const MISTAKE_MS = 60_000;

/** True when an attack ended less than a minute after it started: ask "Started by mistake?" before keeping it. */
export function looksLikeMistake(startedAt: number, endedAt: number): boolean {
  return endedAt - startedAt < MISTAKE_MS;
}
