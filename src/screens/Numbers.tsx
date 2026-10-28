import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts, tabular, Theme } from '../theme';
import { useApp } from '../state';
import { dayKey, monthLabel, parseDay, shiftMonth, shortDate } from '../days';
import { formatDuration, medNotes, medNoteText, monthWindow, numbersFor, rollingWindow } from '../insights';
import { ACUTE_KINDS, medKindLabel, noun, triggerLabel } from '../labels';
import { Button, Card, IconButton, Label, Numeral, ScreenTitle, Segment } from '../ui/Kit';
import { MonthAtAGlance } from '../ui/Drawings';

type Scope = 'rolling' | 'month';
const SCOPES: { id: Scope; label: string }[] = [
  { id: 'rolling', label: 'Last 30 days' },
  { id: 'month', label: 'By month' },
];

/**
 * The monthly numbers (Pro): headache days, migraine days, days with
 * attacks of 4 hours or more, average length, medication days by type with
 * the calm note at the levels doctors watch, triggers, and days lost to
 * work or study. On the last 30 days or by calendar month.
 */
export default function NumbersScreen({ onReport }: { onReport: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { attacks, freeDays, isPro, showPaywall, settings } = useApp();
  const now = Date.now();
  const [scope, setScope] = useState<Scope>('rolling');
  const [{ y, m }, setMonth] = useState<{ y: number; m: number }>(() => parseDay(dayKey(now)));
  const thisMonth = dayKey(now).slice(0, 7) === `${y}-${String(m).padStart(2, '0')}`;
  const w = scope === 'rolling' ? rollingWindow(now) : monthWindow(y, m, now);
  const n = useMemo(() => numbersFor(attacks, freeDays, w, now), [attacks, freeDays, w.from, w.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const track = settings.track;

  if (!isPro) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenTitle theme={theme} title="Numbers" />
        <ScrollView contentContainerStyle={[styles.lockedWrap, { paddingBottom: insets.bottom + 24 }]}>
          <MonthAtAGlance theme={theme} size={190} />
          <Text style={[styles.lockedTitle, { color: theme.ink }]}>Your month in numbers.</Text>
          <Text style={[styles.lockedLine, { color: theme.inkSoft }]}>
            Headache days, migraine days, long attacks, average length and medication days by type, on the last 30 days or by month. The counts a doctor asks for, ready before the visit.
          </Text>
          <View style={{ alignSelf: 'stretch' }}>
            <Button theme={theme} live label="See my numbers" onPress={() => showPaywall('numbers')} />
          </View>
        </ScrollView>
      </View>
    );
  }

  const notes = medNotes(n.medDays);
  const kinds = ACUTE_KINDS.filter((k) => (n.medDays[k] ?? 0) > 0);
  const range = `${shortDate(w.from)} to ${shortDate(w.to)}`;

  return (
    <View style={{ flex: 1 }}>
      <ScreenTitle theme={theme} title="Numbers" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}>
        <Segment<Scope> theme={theme} label="Which days" options={SCOPES} value={scope} onChange={(v) => v && setScope(v)} />
        {scope === 'month' ? (
          <View style={styles.monthRow}>
            <IconButton theme={theme} glyph="back" label="Earlier month" onPress={() => setMonth(shiftMonth(y, m, -1))} />
            <Text style={[styles.month, { color: theme.ink }]} accessibilityRole="header">
              {monthLabel(y, m)}
            </Text>
            <IconButton theme={theme} glyph="chevron" label="Later month" disabled={thisMonth} onPress={() => setMonth(shiftMonth(y, m, 1))} />
          </View>
        ) : (
          <Text style={[styles.range, { color: theme.inkSoft }, tabular]}>{range}</Text>
        )}

        <View style={styles.grid}>
          <Numeral theme={theme} value={String(n.headacheDays)} label="Headache days" sub={`of ${n.dayCount}`} />
          <Numeral theme={theme} value={String(n.migraineDays)} label="Migraine days" />
          <Numeral theme={theme} value={String(n.longDays)} label={`Days with ${noun(track)}s of 4\u00a0hours or more`} />
          <Numeral theme={theme} value={n.averageMs != null ? formatDuration(n.averageMs) : 'None'} label="Average length" sub={`${n.attackCount} ${n.attackCount === 1 ? noun(track) : `${noun(track)}s`}`} />
        </View>
        <Text style={[styles.logged, { color: theme.inkFaint }, tabular]}>
          {`${n.loggedDays} of ${n.dayCount} days have an entry. Days without one are not counted as headache-free.`}
        </Text>

        <Section theme={theme} title="Days with medication">
          {kinds.length === 0 ? (
            <Text style={[styles.none, { color: theme.inkSoft }]}>No medication logged.</Text>
          ) : (
            kinds.map((k) => {
              const note = notes.find((x) => x.kind === k);
              return (
                <View key={k} style={[styles.medRow, { borderBottomColor: theme.rule }]}>
                  <View style={styles.medTop} accessible accessibilityLabel={`${medKindLabel(k)}: ${n.medDays[k]} days`}>
                    <Text style={[styles.medName, { color: theme.ink }]}>{medKindLabel(k)}</Text>
                    <Text style={[styles.medDays, { color: theme.ink }, tabular]}>{`${n.medDays[k]} ${n.medDays[k] === 1 ? 'day' : 'days'}`}</Text>
                  </View>
                  {note ? (
                    <Text style={[styles.note, { color: theme.inkSoft, borderLeftColor: theme.pickedEdge }]} accessibilityLiveRegion="polite">
                      {medNoteText(note.days, scope === 'month' ? 'month' : 'rolling')}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
          {kinds.length > 0 ? (
            <Text style={[styles.total, { color: theme.inkSoft }, tabular]}>{`Any acute medication: ${n.acuteMedDays} ${n.acuteMedDays === 1 ? 'day' : 'days'}`}</Text>
          ) : null}
        </Section>

        <Section theme={theme} title="Most common triggers">
          {n.triggers.length === 0 ? (
            <Text style={[styles.none, { color: theme.inkSoft }]}>None noted.</Text>
          ) : (
            n.triggers.slice(0, 5).map((t) => (
              <View key={t.id} style={[styles.trigRow, { borderBottomColor: theme.rule }]} accessible accessibilityLabel={`${triggerLabel(t.id)}, ${t.count}`}>
                <Text style={[styles.trigName, { color: theme.ink }]}>{triggerLabel(t.id)}</Text>
                <Text style={[styles.trigCount, { color: theme.inkSoft }, tabular]}>{`${t.count} of ${n.attackCount}`}</Text>
              </View>
            ))
          )}
        </Section>

        <Section theme={theme} title="Work or study">
          <Text style={[styles.none, { color: theme.ink }, tabular]}>{`Missed ${n.missedDays} ${n.missedDays === 1 ? 'day' : 'days'}, reduced ${n.reducedDays} ${n.reducedDays === 1 ? 'day' : 'days'}.`}</Text>
        </Section>

        <Card theme={theme} style={{ marginTop: 26, gap: 10 }}>
          <Text style={[styles.cardText, { color: theme.ink }]}>Bring these to your next visit.</Text>
          <Button theme={theme} glyph="document" label="Make the report" onPress={onReport} />
        </Card>
        <Text style={[styles.foot, { color: theme.inkFaint }]}>These are counts of what you logged, not a diagnosis.</Text>
      </ScrollView>
    </View>
  );
}

function Section({ theme, title, children }: { theme: Theme; title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 26 }}>
      <Label theme={theme}>{title}</Label>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  lockedWrap: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, gap: 14 },
  lockedTitle: { fontFamily: fonts.display, fontSize: 24, textAlign: 'center' },
  lockedLine: { fontSize: 17, lineHeight: 24, textAlign: 'center', marginBottom: 6 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  month: { fontFamily: fonts.display, fontSize: 19 },
  range: { fontSize: 15, marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, marginTop: 10 },
  logged: { fontSize: 14, lineHeight: 19, marginTop: 6 },
  none: { fontSize: 16 },
  medRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  medTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  medName: { fontSize: 17 },
  medDays: { fontFamily: fonts.number, fontSize: 22 },
  note: { fontSize: 15, lineHeight: 21, marginTop: 8, paddingLeft: 10, borderLeftWidth: 2 },
  total: { fontSize: 15, marginTop: 10 },
  trigRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  trigName: { fontSize: 17 },
  trigCount: { fontSize: 16 },
  cardText: { fontFamily: fonts.display, fontSize: 18 },
  foot: { fontSize: 13, textAlign: 'center', marginTop: 16 },
});
