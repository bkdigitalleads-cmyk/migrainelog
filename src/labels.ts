/**
 * The words the app uses for things it stores, in one place (no imports
 * at runtime), so the screens, the report and the CSV say the same thing.
 */
import type { Impact, MedKind, Relief, Severity, Side, StopReason, Track } from './model';

export const SEVERITIES: { id: Severity; label: string }[] = [
  { id: 'mild', label: 'Mild' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'severe', label: 'Severe' },
];

export const SIDES: { id: Side; label: string }[] = [
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'both', label: 'Both sides' },
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
];

export const SYMPTOMS: { id: string; label: string }[] = [
  { id: 'nausea', label: 'Nausea' },
  { id: 'light', label: 'Light' },
  { id: 'sound', label: 'Sound' },
  { id: 'smell', label: 'Smell' },
  { id: 'dizziness', label: 'Dizziness' },
  { id: 'neck', label: 'Neck pain' },
  { id: 'fatigue', label: 'Fatigue' },
];

export const TRIGGERS: { id: string; label: string }[] = [
  { id: 'sleep', label: 'Sleep' },
  { id: 'stress', label: 'Stress' },
  { id: 'skipped_meal', label: 'Skipped meal' },
  { id: 'alcohol', label: 'Alcohol' },
  { id: 'caffeine', label: 'Caffeine' },
  { id: 'weather', label: 'Weather' },
  { id: 'screen', label: 'Screen time' },
  { id: 'period', label: 'Period' },
  { id: 'dehydration', label: 'Dehydration' },
];

export const CUSTOM_PREFIX = 'custom:';

export const MED_KINDS: { id: MedKind; label: string; short: string; sub?: string }[] = [
  { id: 'triptan', label: 'Triptan', short: 'Triptan' },
  { id: 'gepant', label: 'Gepant or ditan', short: 'Gepant/ditan' },
  { id: 'ergot', label: 'Ergot', short: 'Ergot' },
  { id: 'opioid', label: 'Opioid', short: 'Opioid' },
  { id: 'combo', label: 'Combination painkiller', short: 'Combination' },
  { id: 'simple', label: 'Simple painkiller', short: 'Simple', sub: 'Ibuprofen, acetaminophen, aspirin, naproxen' },
  { id: 'preventive', label: 'Preventive', short: 'Preventive' },
  { id: 'other', label: 'Other', short: 'Other' },
];

/** Kinds taken for an attack (everything but preventives), in the order the app lists them. */
export const ACUTE_KINDS: MedKind[] = ['triptan', 'gepant', 'ergot', 'opioid', 'combo', 'simple', 'other'];

export const RELIEFS: { id: Relief; label: string }[] = [
  { id: 'none', label: 'No relief' },
  { id: 'some', label: 'Some' },
  { id: 'full', label: 'Full' },
];

export const IMPACTS: { id: Impact; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'partly', label: 'Partly' },
  { id: 'no', label: 'No' },
];

export const STOP_REASONS: { id: StopReason; label: string }[] = [
  { id: 'not_working', label: 'Not working' },
  { id: 'side_effects', label: 'Side effects' },
  { id: 'other', label: 'Other' },
];

export const TRACKS: { id: Track; label: string; sub: string }[] = [
  { id: 'migraine', label: 'Migraine', sub: 'Attacks, with or without aura' },
  { id: 'tension', label: 'Tension headache', sub: 'Pressing, band-like headaches' },
  { id: 'cluster', label: 'Cluster headache', sub: 'Short, severe attacks around one eye' },
  { id: 'unsure', label: 'Not sure', sub: 'Headaches of any kind' },
];

const find = <T extends string>(list: { id: T; label: string }[], id: T | null | undefined) => list.find((x) => x.id === id)?.label ?? '';

export const severityLabel = (s: Severity | null | undefined) => find(SEVERITIES, s);
export const reliefLabel = (r: Relief | null | undefined) => find(RELIEFS, r);
export const impactLabel = (i: Impact | null | undefined) => find(IMPACTS, i);
export const sideLabel = (s: Side) => find(SIDES, s);
export const stopReasonLabel = (r: StopReason | null | undefined) => find(STOP_REASONS, r);
export const medKindLabel = (k: MedKind) => find(MED_KINDS, k);
export const medKindShort = (k: MedKind) => MED_KINDS.find((x) => x.id === k)?.short ?? '';
export const symptomLabel = (id: string) => find(SYMPTOMS, id) || id;

/** A trigger id to its words: built-ins by name, the person's own as typed. */
export function triggerLabel(id: string): string {
  if (id.startsWith(CUSTOM_PREFIX)) return id.slice(CUSTOM_PREFIX.length);
  return find(TRIGGERS, id) || id;
}

/** What one episode is called: "attack", or "headache" for tension headaches. */
export function noun(track: Track): 'attack' | 'headache' {
  return track === 'tension' ? 'headache' : 'attack';
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** The two buttons on Home: "Attack started" and "Attack over". */
export function startLabel(track: Track): string {
  return `${cap(noun(track))} started`;
}

export function overLabel(track: Track): string {
  return `${cap(noun(track))} over`;
}

/** "an attack" or "a headache". */
export function aNoun(track: Track): string {
  return track === 'tension' ? 'a headache' : 'an attack';
}

/** "attack" or "attacks". */
export function plural(track: Track, n: number): string {
  return n === 1 ? noun(track) : `${noun(track)}s`;
}
