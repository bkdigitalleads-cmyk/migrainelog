import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, fonts, tabular, Theme } from '../theme';
import { useApp } from '../state';
import { deleteAttack, endAttack, saveAttack, setFreeDay, setSeverity, startAttack } from '../db';
import { dayKey, dayLabel, timeLabel } from '../days';
import { coveredDays, durationMs, formatDuration, severityOf } from '../insights';
import { visibleAttacks } from '../gates';
import { eveningDue } from '../rules';
import { overLabel, plural, SEVERITIES, severityLabel, startLabel, noun } from '../labels';
import type { Attack, Severity } from '../model';
import { BigAction, Button, Card, IconButton, Label, Press, ScreenTitle, Segment, TextLink } from '../ui/Kit';
import Glyph from '../ui/Glyph';
import { doneHaptic, startHaptic } from '../ui/motion';

/**
 * Home. One huge button, low on the screen where the thumb is: one tap
 * saves an attack with the time, nothing else asked. While it is open the
 * same place says "Attack over", with Mild, Moderate, Severe as three big
 * optional targets under it. Details wait for later.
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
  const { settings, attacks, freeDays, openAttack, refresh, isPro, eveningAnswered, answerEvening, say } = useApp();
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

  const recent = visibleAttacks(attacks.filter((a) => a.endedAt != null), now, isPro).shown.slice(0, 3);
  const closed = justClosed != null ? attacks.find((a) => a.id === justClosed && a.endedAt != null) : undefined;

  if (openAttack) {
    const sev = openAttack.severity;
    return (
      <View style={styles.fill}>
        <ScreenTitle theme={theme} title="Migraine Log" right={<SettingsButton theme={theme} onPress={onSettings} />} />
        <ScrollView contentContainerStyle={styles.openTop}>
          <Text style={[styles.since, { color: theme.inkSoft }]} maxFontSizeMultiplier={1.6}>
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
          <Text style={[styles.soFar, { color: theme.inkFaint }]}>so far</Text>
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
      <ScrollView contentContainerStyle={styles.scroll}>
        {closed ? (
          <Card theme={theme} style={styles.saved}>
            <Text style={[styles.savedText, { color: theme.ink }]} accessibilityLiveRegion="polite">
              Saved. Add details when you feel better.
            </Text>
            <Text style={[styles.savedSub, { color: theme.inkSoft }, tabular]}>
              {`${formatDuration(durationMs(closed, now))}, ${timeLabel(closed.startedAt)} to ${timeLabel(closed.endedAt ?? now)}`}
            </Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button theme={theme} compact label="Add details" onPress={() => onDetails(closed.id)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button theme={theme} compact label="Not over yet" onPress={notOverYet} hint={`Opens the ${noun(track)} again`} />
              </View>
            </View>
          </Card>
        ) : null}

        {showEvening ? (
          <Card theme={theme} style={styles.evening}>
            <View style={styles.eveningTop}>
              <Glyph name="moon" size={24} color={theme.inkSoft} />
              <Text style={[styles.eveningTitle, { color: theme.ink }]} accessibilityRole="header">
                Headache today?
              </Text>
              <IconButton theme={theme} glyph="close" label="Not now" color={theme.inkFaint} onPress={() => answerEvening(today)} />
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
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
              <View style={{ flex: 1 }}>
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

        <Recent theme={theme} attacks={recent} now={now} onOpen={onDetails} track={track} />
        {attacks.length > 0 ? <TextLink theme={theme} label={`All ${plural(track, 2)}`} onPress={onHistory} /> : null}
      </ScrollView>

      <View style={styles.dock}>
        <BigAction theme={theme} label={startLabel(track)} onPress={onStart} hint="Saves the time now. Nothing else is needed." disabled={busy} />
        <View style={styles.past}>
          <TextLink theme={theme} label={`Add a past ${noun(track)}`} color={theme.inkSoft} onPress={() => onAddPast()} />
        </View>
      </View>
    </View>
  );
}

function SettingsButton({ theme, onPress }: { theme: Theme; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel="Settings" style={styles.settings} pressedStyle={{ backgroundColor: theme.raised }}>
      <Glyph name="tune" size={22} color={theme.inkSoft} />
      <Text style={[styles.settingsLabel, { color: theme.inkSoft }]} maxFontSizeMultiplier={1.3}>
        Settings
      </Text>
    </Press>
  );
}

/** The last few attacks, with "Add details" on the ones that have none yet. */
function Recent({ theme, attacks, now, onOpen, track }: { theme: Theme; attacks: Attack[]; now: number; onOpen: (id: number) => void; track: 'migraine' | 'tension' | 'cluster' | 'unsure' }) {
  if (attacks.length === 0) {
    return (
      <View style={styles.empty}>
        <Glyph name="wave" size={34} color={theme.inkFaint} />
        <Text style={[styles.emptyText, { color: theme.inkSoft }]}>
          {`When one starts, tap the button below. That is all. Details can wait until you feel better.`}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ marginTop: 6 }}>
      <Label theme={theme}>{`Recent ${plural(track, 2)}`}</Label>
      {attacks.map((a) => {
        const sev = severityLabel(severityOf(a));
        const line = `${formatDuration(durationMs(a, now))}${sev ? `, ${sev.toLowerCase()}` : ''}`;
        const needs = a.detailsAt == null;
        return (
          <Press
            key={a.id}
            onPress={() => onOpen(a.id)}
            style={[styles.recent, { borderBottomColor: theme.rule }]}
            pressedStyle={{ backgroundColor: theme.raised }}
            accessibilityRole="button"
            accessibilityLabel={`${dayLabel(dayKey(a.startedAt))}, ${timeLabel(a.startedAt)}, ${line}${needs ? '. Add details' : ''}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.recentDay, { color: theme.ink }]}>{`${dayLabel(dayKey(a.startedAt))}, ${timeLabel(a.startedAt)}`}</Text>
              <Text style={[styles.recentLine, { color: theme.inkSoft }, tabular]}>{line}</Text>
            </View>
            {needs ? (
              <View style={[styles.addPill, { borderColor: theme.rule, backgroundColor: theme.surface }]}>
                <Text style={[styles.addPillText, { color: theme.ink }]}>Add details</Text>
              </View>
            ) : (
              <Glyph name="chevron" size={18} color={theme.inkFaint} />
            )}
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16, gap: 14 },
  settings: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 10, borderRadius: 999 },
  settingsLabel: { fontSize: 16 },
  dock: { paddingHorizontal: 16, paddingBottom: 10, paddingTop: 8, gap: 6 },
  past: { alignItems: 'center' },
  howBad: { marginTop: 10, marginBottom: 2, textAlign: 'center' },
  openTop: { paddingHorizontal: 20, paddingTop: 18, alignItems: 'center' },
  since: { fontSize: 18, textAlign: 'center' },
  clock: { fontFamily: fonts.number, fontSize: 60, lineHeight: 70, marginTop: 10, textAlign: 'center' },
  soFar: { fontSize: 16, marginTop: -2 },
  openActions: { marginTop: 26, alignSelf: 'stretch', alignItems: 'center', gap: 6 },
  saved: { gap: 6 },
  savedText: { fontFamily: fonts.display, fontSize: 19, lineHeight: 25 },
  savedSub: { fontSize: 15 },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  evening: { gap: 4 },
  eveningTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eveningTitle: { flex: 1, fontFamily: fonts.display, fontSize: 21 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 28, paddingRight: 10 },
  emptyText: { flex: 1, fontSize: 17, lineHeight: 24 },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  recentDay: { fontSize: 17 },
  recentLine: { fontSize: 15, marginTop: 2 },
  addPill: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  addPillText: { fontSize: 15, fontWeight: fonts.weight.semibold },
});
