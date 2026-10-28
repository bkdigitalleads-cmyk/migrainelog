import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, AppState as RNAppState } from 'react-native';
import { initPurchases, getIsPro, checkPro, onProChange } from './purchases';
import { getAttacks, getFreeDays, getMeds, kvAll, kvGet, kvSet } from './db';
import { syncTrialReminder } from './reminder';
import { hasSandboxPro } from './testing';
import { setReviewGuard } from './reviews';
import { schemeFor } from './rules';
import { isDayKey } from './days';
import type { Attack, Med, Track } from './model';
import type { ProFeature } from './gates';

export interface Settings {
  /** "What do you mostly track?" Words only. */
  track: Track;
  /** Show the light theme when the phone is in light mode (never during an attack). Off: always dark. */
  followSystem: boolean;
  /** "Headache today?" on Home in the evening. */
  eveningCheck: boolean;
  /** Printed on the report; optional. */
  patientName: string;
  /** The person's own triggers, as typed. */
  customTriggers: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  track: 'migraine',
  followSystem: false,
  eveningCheck: true,
  patientName: '',
  customTriggers: [],
};

const SETTING_PREFIX = 'setting.';
export const ONBOARDED_KEY = 'flag.onboarded';
export const EVENING_KEY = 'evening.answered';
/** Test builds only: Pro is ignored on this phone while this is on. */
const ACT_FREE_KEY = 'test.actFree';

/** Settings from their stored rows, with defaults for anything missing or unreadable. */
export function parseSettings(rows: Record<string, string>): Settings {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rows)) {
    try {
      raw[k] = JSON.parse(v);
    } catch {
      // one bad row falls back to its default
    }
  }
  const track = raw.track === 'tension' || raw.track === 'cluster' || raw.track === 'unsure' || raw.track === 'migraine' ? raw.track : DEFAULT_SETTINGS.track;
  return {
    track,
    followSystem: raw.followSystem === true,
    eveningCheck: raw.eveningCheck !== false,
    patientName: typeof raw.patientName === 'string' ? raw.patientName.slice(0, 80) : '',
    customTriggers: Array.isArray(raw.customTriggers)
      ? raw.customTriggers.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim().slice(0, 40)).slice(0, 30)
      : [],
  };
}

/** Why the in-app paywall opened; it changes one line on it. */
export type PaywallReason = ProFeature | 'pro';

interface AppState {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  /** Development, or Pro from a sandbox (TestFlight) purchase. */
  testBuild: boolean;
  actFree: boolean;
  setActFree: (v: boolean) => Promise<void>;
  paywall: PaywallReason | null;
  showPaywall: (reason: PaywallReason) => void;
  hidePaywall: () => void;
  ready: boolean;
  /** Everything logged, newest attack first. */
  attacks: Attack[];
  freeDays: string[];
  meds: Med[];
  /** The attack still going, if any. */
  openAttack: Attack | null;
  /** Reloads attacks, days and medications after a change. */
  refresh: () => Promise<void>;
  /** The day the evening question was last answered or put away. */
  eveningAnswered: string | null;
  answerEvening: (day: string) => Promise<void>;
  /** A one-line note at the bottom of the screen for a few seconds. */
  notice: string | null;
  say: (text: string) => void;
}

const Ctx = createContext<AppState | null>(null);

// Dark before the first frame: the room is dark until settings say otherwise.
Appearance.setColorScheme?.('dark');

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  // What the store says; isPro below is this unless a test build is acting as a free user.
  const [storePro, setIsPro] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  const [actFree, setActFreeState] = useState(false);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const [ready, setReady] = useState(false);
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [freeDays, setFreeDays] = useState<string[]>([]);
  const [meds, setMeds] = useState<Med[]>([]);
  const [eveningAnswered, setEveningAnswered] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => setNotice(null), 4200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [a, f, m] = await Promise.all([getAttacks(), getFreeDays(), getMeds()]);
      setAttacks(a);
      setFreeDays(f);
      setMeds(m);
    } catch {
      // keep what is on screen
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = parseSettings(await kvAll(SETTING_PREFIX));
        settingsRef.current = s;
        setSettings(s);
        const ev = await kvGet(EVENING_KEY);
        setEveningAnswered(isDayKey(ev) ? ev : null);
        setActFreeState((await kvGet(ACT_FREE_KEY)) === '1');
        await refresh();
      } catch {
        // unreadable storage -> defaults
      }
      try {
        await initPurchases();
        setIsPro(await getIsPro());
        setSandbox(await hasSandboxPro());
      } catch {
        setIsPro(false);
      }
      setReady(true);
    })();
  }, [refresh]);

  // Keep Pro in step with the store without a relaunch (renewals, expiries,
  // refunds), and re-check after a real trip to the background. The same
  // foreground check drops the trial reminder once the trial is over, and
  // reloads the data so a new day shows.
  useEffect(() => {
    if (!ready) return;
    syncTrialReminder();
    const unsubscribe = onProChange((v) => {
      setIsPro(v);
      hasSandboxPro().then(setSandbox);
    });
    let wasBackground = false;
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'background') wasBackground = true;
      if (s !== 'active' || !wasBackground) return;
      wasBackground = false;
      checkPro().then((v) => {
        if (v !== null) setIsPro(v);
      });
      syncTrialReminder();
      refresh();
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [ready, refresh]);

  const openAttack = useMemo(() => attacks.find((a) => a.endedAt == null) ?? null, [attacks]);

  // The room stays dark during an attack whatever the phone says; alerts and sheets follow.
  useEffect(() => {
    Appearance.setColorScheme?.(schemeFor({ followSystem: settings.followSystem, attackOpen: openAttack != null }));
  }, [settings.followSystem, openAttack]);

  // A rating prompt never interrupts an open attack.
  const openRef = useRef(false);
  openRef.current = openAttack != null;
  useEffect(() => setReviewGuard(() => openRef.current), []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    try {
      for (const [k, v] of Object.entries(patch)) await kvSet(SETTING_PREFIX + k, JSON.stringify(v));
    } catch {
      // non-fatal: the value still applies for this launch
    }
  }, []);

  const testBuild = __DEV__ || sandbox;

  const setActFree = useCallback(
    async (v: boolean) => {
      if (!testBuild) return;
      setActFreeState(v);
      await kvSet(ACT_FREE_KEY, v ? '1' : '0').catch(() => {});
    },
    [testBuild]
  );

  const answerEvening = useCallback(async (day: string) => {
    setEveningAnswered(day);
    await kvSet(EVENING_KEY, day).catch(() => {});
  }, []);

  const isPro = storePro && !(testBuild && actFree);

  const value = useMemo<AppState>(
    () => ({
      settings,
      updateSettings,
      isPro,
      setIsPro,
      testBuild,
      actFree: testBuild && actFree,
      setActFree,
      paywall,
      showPaywall: (reason) => setPaywall(reason),
      hidePaywall: () => setPaywall(null),
      ready,
      attacks,
      freeDays,
      meds,
      openAttack,
      refresh,
      eveningAnswered,
      answerEvening,
      notice,
      say,
    }),
    [settings, updateSettings, isPro, testBuild, actFree, setActFree, paywall, ready, attacks, freeDays, meds, openAttack, refresh, eveningAnswered, answerEvening, notice, say]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
