import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts, radius, space, tabular, type, Theme } from '../theme';
import { useApp } from '../state';
import { deleteAttack, endAttack, saveAttack, setFreeDay, setSeverity, startAttack } from '../db';
import { dayKey, parseDay, timeLabel, whenShort } from '../days';
import { coveredDays, durationMs, formatDuration, monthWindow, numbersFor } from '../insights';
import { eveningDue } from '../rules';
import { overLabel, plural, SEVERITIES, startLabel, noun } from '../labels';
import type { Severity } from '../model';
import { BigAction, Button, Card, IconButton, Label, Press, ScreenTitle, Segment, TextLink } from '../ui/Kit';
import Glyph from '../ui/Glyph';
import { doneHaptic, startHaptic } from '../ui/motion';

/**
 * Home. The attack button is the hero: centered in the free space, with a
 * quiet two-line "this month" summary above it and the links to past
 * attacks below. One tap saves an attack with the time, nothing else
 * asked. While it is open the screen becomes the running clock, with
 * "Attack over" and Mild, Moderate, Severe as three big optional targets.
 * Details wait for later; recent attacks live under All attacks.
 */
export default function HomeScreen({
  onDetails,
  onAddPast,
  onHistory,
  onSettings,
}: {
  onDetails: (id: number) => void;
  /** A past attack, entered from memory (`day` when it was today's evening question). */
  onAddPast: (day?: string) => void;
  onHistory: () => void;
  onSettings: () => void;
}) {
  const theme = useTheme();
  const { settings, attacks, freeDays, openAttack, refresh, eveningAnswered, answerEvening, say } = useApp();
  const track = settings.track;
  const [now, setNow] = useState(Date.now());
  // The attack just closed here, for "Saved. Add details when you feel better."
  const [justClosed, setJustClosed] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // The clock moves once a minute: calm, and enough to read the length.
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [openAttack?.id]);

  const onStart = async () => {
    if (busy || openAttack) return;
    setBusy(true);
    startHaptic();
    try {
      await startAttack(Date.now());
      setJustClosed(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onOver = async () => {
    if (busy || !openAttack) return;
    setBusy(true);
    doneHaptic();
    try {
      await endAttack(openAttack.id, Date.now());
      setJustClosed(openAttack.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onSeverity = async (s: Severity | null) => {
    if (!openAttack) return;
    await setSeverity(openAttack.id, s);
    await refresh();
  };

  const notOverYet = async () => {
    // Reopens the attack just closed by mistake: it simply has no end again.
    const a = attacks.find((x) => x.id === justClosed);
    if (!a) return;
    await saveAttack(a.id, { ...a, endedAt: null }, a.doses);
    setJustClosed(null);
    await refresh();
  };

  const removeMistake = () => {
    if (!openAttack) return;
    Alert.alert(`Remove this ${noun(track)}?`, `It started at ${timeLabel(openAttack.startedAt)}. It comes off this iPhone.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteAttack(openAttack.id);
          await refresh();
        },
      },
    ]);
  };

  const today = dayKey(now);
  const dayLogged = freeDays.includes(today) || attacks.some((a) => coveredDays(a, now).includes(today));
  const showEvening = eveningDue({
    hour: new Date(now).getHours(),
    enabled: settings.eveningCheck,
    today,
    answeredDay: eveningAnswered,
    dayLogged,
    attackOpen: openAttack != null,
  });

  const closed = justClosed != null ? attacks.find((a) => a.id === justClosed && a.endedAt != null) : undefined;

  // "6 headache days this month, 2 with medication" and "Last attack Sun, 3 pm". This month is free to see.
  const month = useMemo(() => {
    const { y, m } = parseDay(dayKey(now));
    return numbersFor(attacks, freeDays, monthWindow(y, m, now), now);
  }, [attacks, freeDays, now]);
  const last = attacks.find((a) => a.endedAt != null);
  const summary =
    month.headacheDays === 0
      ? 'No headache days logged this month'
      : `${month.headacheDays} headache ${month.headacheDays === 1 ? 'day' : 'days'} this month${month.acuteMedDays > 0 ? `, ${month.acuteMedDays} with medication` : ''}`;
  const empty = attacks.length === 0 && freeDays.length === 0;

  if (openAttack) {
    const sev = openAttack.severity;
    return (
      <View style={styles.fill}>
        <ScreenTitle theme={theme} title="Migraine Log" right={<SettingsButton theme={theme} onPress={onSettings} />} />
        <ScrollView contentContainerStyle={styles.openTop}>
          <Text style={[type.body, styles.center, { color: theme.inkSoft }]} maxFontSizeMultiplier={1.6}>
            {`${startLabel(track)} at ${timeLabel(openAttack.startedAt)}`}
          </Text>
          <Text
            style={[styles.clock, { color: theme.ink }]}
            accessibilityLabel={`${formatDuration(durationMs(openAttack, now))} so far`}
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={1.3}
          >
            {formatDuration(durationMs(openAttack, now))}
          </Text>
          <Text style={[type.small, { color: theme.inkFaint }]}>so far</Text>
          <View style={styles.openActions}>
            <Button theme={theme} label="Add details" glyph="pencil" onPress={() => onDetails(openAttack.id)} hint="Pain, medication, triggers. All optional." />
            <TextLink theme={theme} label="Started by mistake" color={theme.inkFaint} onPress={removeMistake} />
          </View>
        </ScrollView>
        <View style={styles.dock}>
          <BigAction theme={theme} label={overLabel(track)} onPress={onOver} hint="Saves the end time. The length is worked out for you." disabled={busy} />
          <Label theme={theme} style={styles.howBad}>
            How bad is it? Optional
          </Label>
          <Segment theme={theme} tall label="How bad is it" options={SEVERITIES} value={sev} onChange={onSeverity} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <ScreenTitle theme={theme} title="Migraine Log" right={<SettingsButton theme={theme} onPress={onSettings} />} />
      <ScrollView contentContainerStyle={styles.page}>
        {closed ? (
          <Card theme={theme} style={styles.card}>
            <Text style={[type.heading, { color: theme.ink }]} accessibilityLiveRegion="polite">
              Saved. Add details when you feel better.
            </Text>
            <Text style={[type.small, { color: theme.inkSoft }, tabular]}>
              {`${formatDuration(durationMs(closed, now))}, ${timeLabel(closed.startedAt)} to ${timeLabel(closed.endedAt ?? now)}`}
            </Text>
            <View style={styles.pair}>
              <View style={styles.half}>
                <Button theme={theme} compact label="Add details" onPress={() => onDetails(closed.id)} />
              </View>
              <View style={styles.half}>
                <Button theme={theme} compact label="Not over yet" onPress={notOverYet} hint={`Opens the ${noun(track)} again`} />
              </View>
            </View>
          </Card>
        ) : null}

        {showEvening ? (
          <Card theme={theme} style={styles.card}>
            <View style={styles.eveningTop}>
              <Glyph name="moon" size={22} color={theme.inkSoft} />
              <Text style={[type.heading, styles.grow, { color: theme.ink }]} accessibilityRole="header">
                Headache today?
              </Text>
              <IconButton theme={theme} glyph="close" label="Not now" color={theme.inkFaint} onPress={() => answerEvening(today)} />
            </View>
            <View style={styles.pair}>
              <View style={styles.half}>
                <Button
                  theme={theme}
                  label="No"
                  hint="Marks today as headache-free"
                  onPress={async () => {
                    await setFreeDay(today, true);
                    await answerEvening(today);
                    await refresh();
                    say('Marked as a headache-free day.');
                  }}
                />
              </View>
              <View style={styles.half}>
                <Button
                  theme={theme}
                  label="Yes"
                  hint={`Adds a ${noun(track)} for today`}
                  onPress={async () => {
                    await answerEvening(today);
                    onAddPast(today);
                  }}
                />
              </View>
            </View>
          </Card>
        ) : null}

        <View style={styles.hero}>
          {empty ? (
            <Text style={[type.body, styles.center, styles.above, { color: theme.inkSoft }]}>Tap once when one starts. Details can wait.</Text>
          ) : (
            <View style={styles.above} accessible accessibilityLabel={`This month: ${summary}.${last ? ` Last ${noun(track)} ${whenShort(last.startedAt, now)}.` : ''}`}>
              <Text style={[type.small, styles.center, { color: theme.inkSoft }, tabular]}>{summary}</Text>
              {last ? (
                <Text style={[type.small, styles.center, { color: theme.inkFaint }, tabular]}>{`Last ${noun(track)} ${whenShort(last.startedAt, now)}`}</Text>
              ) : null}
            </View>
          )}
          <BigAction theme={theme} label={startLabel(track)} onPress={onStart} hint="Saves the time now. Nothing else is needed." disabled={busy} />
          {!empty ? (
            <View style={styles.links}>
              <TextLink theme={theme} label={`Add a past ${noun(track)}`} color={theme.inkSoft} onPress={() => onAddPast()} />
              {attacks.length > 0 ? <TextLink theme={theme} label={`All ${plural(track, 2)}`} color={theme.inkSoft} onPress={onHistory} /> : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsButton({ theme, onPress }: { theme: Theme; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel="Settings" style={styles.settings} pressedStyle={{ backgroundColor: theme.raised }}>
      <Glyph name="tune" size={22} color={theme.inkSoft} />
      <Text style={[type.body, { color: theme.inkSoft }]} maxFontSizeMultiplier={1.3}>
        Settings
      </Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: 'center' },
  grow: { flex: 1 },
  page: { flexGrow: 1, paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: space.xl, gap: space.m },
  hero: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.xxl },
  above: { marginBottom: space.xl, gap: space.xs },
  links: { flexDirection: 'row', justifyContent: 'center', gap: space.xl, marginTop: space.m },
  settings: { flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 44, paddingHorizontal: space.s, borderRadius: radius.round },
  dock: { paddingHorizontal: space.l, paddingBottom: space.m, paddingTop: space.s, gap: space.s },
  howBad: { marginTop: space.s, marginBottom: 0, textAlign: 'center' },
  openTop: { paddingHorizontal: space.l, paddingTop: space.l, alignItems: 'center' },
  clock: { fontFamily: fonts.number, fontSize: 60, lineHeight: 70, marginTop: space.s, textAlign: 'center' },
  openActions: { marginTop: space.xl, alignSelf: 'stretch', alignItems: 'center', gap: space.s },
  card: { gap: space.s },
  pair: { flexDirection: 'row', gap: space.m, marginTop: space.s },
  half: { flex: 1 },
  eveningTop: { flexDirection: 'row', alignItems: 'center', gap: space.m },
});
