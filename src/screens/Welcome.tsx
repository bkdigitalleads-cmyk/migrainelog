import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts, radius, space, type, Theme } from '../theme';
import { useApp } from '../state';
import { getOffering } from '../purchases';
import { getTrialEligibleIds, trialLabel } from '../trial';
import { requestReminderPermission } from '../reminder';
import { trialLength } from '../offer';
import { medKindLabel, TRACKS } from '../labels';
import type { Med, Track } from '../model';
import Glyph from '../ui/Glyph';
import { Button } from '../ui/Kit';
import { Line, PickLine, Section } from '../ui/Lines';
import { MedEditor } from './Meds';

/**
 * First launch, in this order (App.tsx runs it):
 *   1-3. three value screens, each one drawing and one short headline
 *   4.   "What do you mostly track?" (words only)
 *   5.   "Add the medications you take" (optional, skippable)
 *   a.   TrialSteps "Try it free"                      } only when RevenueCat says this
 *   b.   TrialSteps "We'll remind you the day before"  } Apple ID can get the free trial
 *   then the onboarding paywall (close button after 3 seconds).
 */
const PAGES = [
  { title: 'Log an attack in two seconds.', line: 'One big button. The time is saved, and the details can wait until you feel better.' },
  { title: 'See your headache days at a glance.', line: 'A calendar shaded by pain, with headache-free days and medication days marked.' },
  { title: 'Bring your doctor a report they can use.', line: 'Headache days, migraine days, long attacks and medication days, on one page.' },
];

interface TrialOffer {
  /** "3 days" */
  length: string;
  /** "$4.99 a week" */
  then: string;
}

let offerPromise: Promise<TrialOffer | null> | null = null;

/** The trial to offer, or null when not eligible or the store can't answer. */
async function loadTrialOffer(): Promise<TrialOffer | null> {
  const off = await getOffering();
  const pkg = off?.weekly;
  if (!pkg) return null;
  if (!trialLabel(pkg, await getTrialEligibleIds([pkg]))) return null;
  const length = trialLength(pkg.product.introPrice);
  if (!length) return null;
  return { length, then: `${pkg.product.priceString} a week` };
}

/** Starts the eligibility check early; it is ready long before the trial screen. */
function trialOffer(): Promise<TrialOffer | null> {
  if (!offerPromise) offerPromise = loadTrialOffer().catch(() => null);
  return offerPromise;
}

export default function Welcome({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [step, setStep] = useState(0);

  useEffect(() => {
    trialOffer();
  }, []);

  const next = () => (step < PAGES.length - 1 ? setStep(step + 1) : onDone());

  return (
    <Page theme={theme} title={PAGES[step].title} line={PAGES[step].line} dots={{ count: PAGES.length, active: step }} button="Continue" onPress={next} />
  );
}

/** "What do you mostly track?" Sets the words (attack or headache); nothing else changes. */
export function TrackStep({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useApp();
  const [picked, setPicked] = useState<Track>(settings.track);
  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, space.l) }]}>
      <ScrollView contentContainerStyle={styles.listPage}>
        <Text style={[type.display, styles.padded, { color: theme.ink }]} accessibilityRole="header">
          What do you mostly track?
        </Text>
        <Text style={[type.body, styles.padded, styles.line, { color: theme.inkSoft }]}>It only changes the words the app uses. You can change it later in Settings.</Text>
        <Section theme={theme}>
          {TRACKS.map((t) => (
            <PickLine key={t.id} theme={theme} radio label={t.label} sub={t.sub} on={picked === t.id} onPress={() => setPicked(t.id)} />
          ))}
        </Section>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          theme={theme}
          live
          label="Continue"
          onPress={() => {
            updateSettings({ track: picked });
            onDone();
          }}
        />
      </View>
    </View>
  );
}

/** "Add the medications you take." Optional; Skip goes on. */
export function MedsStep({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { meds } = useApp();
  const [editing, setEditing] = useState<Med | 'new' | null>(null);
  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, space.l) }]}>
      <ScrollView contentContainerStyle={styles.listPage}>
        <Text style={[type.display, styles.padded, { color: theme.ink }]} accessibilityRole="header">
          Add the medications you take.
        </Text>
        <Text style={[type.body, styles.padded, styles.line, { color: theme.inkSoft }]}>
          For attacks, and any preventive. Then a dose is one tap, and the report counts the days by type. You can skip this.
        </Text>
        <Section theme={theme}>
          {meds.map((m) => (
            <Line key={m.id} theme={theme} label={m.name} sub={medKindLabel(m.kind)} onPress={() => setEditing(m)} />
          ))}
        </Section>
        <View style={[styles.padded, styles.addOne]}>
          <Button theme={theme} glyph="plus" label="Add a medication" onPress={() => setEditing('new')} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button theme={theme} live label={meds.length > 0 ? 'Continue' : 'Skip for now'} onPress={onDone} />
      </View>
      <MedEditor theme={theme} med={editing} onClose={() => setEditing(null)} />
    </View>
  );
}

/** The trial and reminder screens. Calls onDone right away when no trial is on offer. */
export function TrialSteps({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [offer, setOffer] = useState<TrialOffer | null | undefined>(undefined);
  const [step, setStep] = useState<'trial' | 'remind'>('trial');
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let live = true;
    trialOffer().then((o) => {
      if (!live) return;
      if (o) setOffer(o);
      else onDone();
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!offer) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.inkSoft} />
      </View>
    );
  }

  if (step === 'trial') {
    return (
      <Page theme={theme} title={`Try it free for ${offer.length}.`} line={`Then ${offer.then}. Cancel in Settings any time before it ends.`} button="Continue" onPress={() => setStep('remind')} noPayment />
    );
  }

  return (
    <Page
      theme={theme}
      title="We’ll remind you the day before it ends."
      line="One notification, on this phone. Nothing else, ever."
      button="Continue"
      waiting={waiting}
      onPress={async () => {
        // Ask for notifications, then on to the paywall whatever the answer.
        setWaiting(true);
        await requestReminderPermission();
        setWaiting(false);
        onDone();
      }}
    />
  );
}

/**
 * One idea per screen, full-bleed: one large line, one line under it, the
 * dots and Continue. No drawings; type and space carry it.
 */
function Page({
  theme,
  title,
  line,
  dots,
  button,
  onPress,
  waiting = false,
  noPayment = false,
}: {
  theme: Theme;
  title: string;
  line?: string;
  dots?: { count: number; active: number };
  button: string;
  onPress: () => void;
  waiting?: boolean;
  noPayment?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, space.l) }]}>
      <View style={styles.words}>
        <Text style={[type.display, { color: theme.ink }]} accessibilityRole="header">
          {title}
        </Text>
        {line ? <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>{line}</Text> : null}
      </View>
      {dots && (
        <View style={styles.dots} accessible accessibilityLabel={`Page ${dots.active + 1} of ${dots.count}`}>
          {Array.from({ length: dots.count }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === dots.active ? theme.inkSoft : theme.rule }, i === dots.active && styles.dotOn]} />
          ))}
        </View>
      )}
      <View style={styles.footer}>
        {waiting ? <ActivityIndicator color={theme.inkSoft} style={styles.waiting} /> : <Button theme={theme} live label={button} onPress={onPress} />}
        {noPayment && (
          <View style={styles.noPaymentRow}>
            <Glyph name="check" size={18} color={theme.ink} weight={2.2} />
            <Text style={[type.heading, { color: theme.ink }]}>No payment now</Text>
          </View>
        )}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  words: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  padded: { paddingHorizontal: space.l },
  listPage: { paddingTop: space.xxl, paddingBottom: space.xl },
  line: { marginTop: space.m },
  addOne: { marginTop: space.l },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.s, marginBottom: space.l },
  dot: { width: space.s, height: space.s, borderRadius: radius.round },
  dotOn: { width: space.xl },
  footer: { paddingHorizontal: space.l, gap: space.m, paddingTop: space.m },
  waiting: { height: 52 },
  noPaymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
});
