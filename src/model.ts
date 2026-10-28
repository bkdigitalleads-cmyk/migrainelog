/**
 * The shapes of what the app stores, shared by the database, the screens and
 * the pure logic. Types only: nothing here runs.
 */

export type Severity = 'mild' | 'moderate' | 'severe';
export type Relief = 'none' | 'some' | 'full';
/** Did it stop you working or studying: yes (missed), partly (reduced), no. */
export type Impact = 'yes' | 'partly' | 'no';
export type Side = 'left' | 'right' | 'both' | 'front' | 'back';

/** What a medication is, picked by the person. Used for counting days only, never for advice. */
export type MedKind = 'triptan' | 'gepant' | 'ergot' | 'opioid' | 'combo' | 'simple' | 'preventive' | 'other';
export type StopReason = 'not_working' | 'side_effects' | 'other';

/** "What do you mostly track?" It changes words only. */
export type Track = 'migraine' | 'tension' | 'cluster' | 'unsure';

export interface Dose {
  id: number;
  attackId: number;
  /** The medication in the person's list, or null when it has since been deleted. */
  medId: number | null;
  /** Name and kind as they were when logged; the list's current values win when the medication still exists. */
  medName: string;
  medKind: MedKind;
  takenAt: number;
  /** Free text, exactly as typed. The app never suggests or checks a dose. */
  amount: string;
  relief: Relief | null;
}

export interface Attack {
  id: number;
  startedAt: number;
  /** null while the attack is still going. */
  endedAt: number | null;
  severity: Severity | null;
  /** 0 to 10, or null when not given. */
  pain: number | null;
  locations: Side[];
  aura: boolean | null;
  symptoms: string[];
  /** Built-in trigger ids, and the person's own as "custom:Name". */
  triggers: string[];
  impact: Impact | null;
  /** The person's own call: true "this was a migraine", false "it was not", null to go by severity. */
  migraine: boolean | null;
  note: string;
  /** When details were first added, or null. */
  detailsAt: number | null;
  /** Entered after the fact (from memory), not live. */
  backfilled: boolean;
  doses: Dose[];
  createdAt: number;
  updatedAt: number;
}

export interface Med {
  id: number;
  name: string;
  kind: MedKind;
  /** Preventives: local days, YYYY-MM-DD. */
  startedOn: string | null;
  stoppedOn: string | null;
  stopReason: StopReason | null;
  position: number;
  createdAt: number;
}
