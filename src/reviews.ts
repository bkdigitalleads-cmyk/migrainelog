import * as StoreReview from 'expo-store-review';
import { kvGet, kvSet } from './db';
import { dayKey } from './days';
import { reviewAllowed } from './rules';

/**
 * App Store rating asks, at moments of value. Each trigger fires at most
 * once ever, at most one prompt per launch, never while an attack is open,
 * and StoreKit still decides whether the prompt is actually shown (it caps
 * it at 3 a year).
 *   firstDetails - the first attack closed with details added
 *   firstReport  - the first time the report preview opens
 *   laterDay     - the first launch on a later calendar day than install
 * Same engine as Image to Text, Pumping and Odo 1.0.6.
 */
export type ReviewTrigger = 'firstDetails' | 'firstReport' | 'laterDay';

const triggerKey = (t: ReviewTrigger) => `review.${t}`;
const INSTALL_DAY_KEY = 'review.installDay';

let launchState: 'idle' | 'checking' | 'asked' = 'idle';
let launchChecked = false;
let attackOpen: () => boolean = () => false;

/** state.tsx tells this module whether an attack is open. */
export function setReviewGuard(isOpen: () => boolean): void {
  attackOpen = isOpen;
}

export async function maybeRequestReview(trigger: ReviewTrigger): Promise<void> {
  if (launchState !== 'idle' || attackOpen()) return;
  launchState = 'checking';
  try {
    const used = (await kvGet(triggerKey(trigger))) != null;
    if (!reviewAllowed({ attackOpen: attackOpen(), askedThisLaunch: false, triggerUsed: used })) return;
    if (!(await StoreReview.hasAction())) return;
    await kvSet(triggerKey(trigger), '1');
    launchState = 'asked';
    setTimeout(() => {
      // One last look: an attack started in the meantime wins.
      if (!attackOpen()) StoreReview.requestReview().catch(() => {});
    }, 1200);
  } catch {
    // never let review plumbing get in the way
  } finally {
    if (launchState === 'checking') launchState = 'idle';
  }
}

/** Once per cold launch, from Home: records the install day, and asks on the first later day. */
export async function maybeRequestReviewOnLaunch(): Promise<void> {
  if (launchChecked) return;
  launchChecked = true;
  try {
    const today = dayKey(Date.now());
    const installDay = await kvGet(INSTALL_DAY_KEY);
    if (!installDay) {
      await kvSet(INSTALL_DAY_KEY, today);
      return;
    }
    if (installDay !== today) await maybeRequestReview('laterDay');
  } catch {
    // never let review plumbing get in the way
  }
}
