import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, space, tabular, type, Theme } from '../theme';
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
        <ScrollView contentContainerStyle={[styles.lockedWrap, { paddingBottom: insets.bottom + space.xl }]}>
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.l, paddingBottom: insets.bottom + space.xxl }}>
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
          <Numeral theme={theme} value={n.averageMs != null ? formatDuration(n.averageMs) : 'None'} label="Average length" sub={`over ${n.attackCount} ${n.attackCount === 1 ? noun(track) : `${noun(track)}s`}`} />
        </View>
        <Text style={[styles.logged, { color: theme.inkFaint }, tabular]}>
          {`${n.loggedDays} of ${n.dayCount} days have an entry. Days without one are not counted as headache-free.`}
        </Text>

        <Section theme={theme} title="Days with medication">
          {kinds.length === 0 ? (
            <Text style={[styles.none, { color: theme.inkSoft }]}>No medication logged.</Text>
          ) : (
            kinds.map((k, i) => {
              const note = notes.find((x) => x.kind === k);
              return (
                <View key={k} style={[styles.medRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }]}>
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
            <Text style={[styles.total, { color: theme.inkSoft, borderTopColor: theme.rule }, tabular]}>{`Any acute medication: ${n.acuteMedDays} ${n.acuteMedDays === 1 ? 'day' : 'days'}`}</Text>
          ) : null}
        </Section>

        <Section theme={theme} title="Most common triggers">
          {n.triggers.length === 0 ? (
            <Text style={[styles.none, { color: theme.inkSoft }]}>None noted.</Text>
          ) : (
            n.triggers.slice(0, 5).map((t, i) => (
              <View key={t.id} style={[styles.trigRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }]} accessible accessibilityLabel={`${triggerLabel(t.id)}, ${t.count}`}>
                <Text style={[styles.trigName, { color: theme.ink }]}>{triggerLabel(t.id)}</Text>
                <Text style={[styles.trigCount, { color: theme.inkSoft }, tabular]}>{`${t.count} of ${n.attackCount}`}</Text>
              </View>
            ))
          )}
        </Section>

        <Section theme={theme} title="Work or study">
          <Text style={[styles.none, { color: theme.ink }, tabular]}>{`Missed ${n.missedDays} ${n.missedDays === 1 ? 'day' : 'days'}, reduced ${n.reducedDays} ${n.reducedDays === 1 ? 'day' : 'days'}.`}</Text>
        </Section>

        <Card theme={theme} style={styles.bring}>
          <Text style={[styles.cardText, { color: theme.ink }]}>Bring these to your next visit.</Text>
          <Button theme={theme} glyph="document" label="Make the report" onPress={onReport} />
        </Card>
        <Text style={[styles.foot, { color: theme.inkFaint }]}>These are counts of what you logged, not a diagnosis.</Text>
      </ScrollView>
    </View>
  );
}

/** A heading, then the rows in a card. */
function Section({ theme, title, children }: { theme: Theme; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[type.heading, styles.sectionTitle, { color: theme.ink }]} accessibilityRole="header">
        {title}
      </Text>
      <Card theme={theme} style={styles.sectionCard}>
        {children}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  lockedWrap: { alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.l, gap: space.l },
  lockedTitle: { ...type.heading, textAlign: 'center' },
  lockedLine: { ...type.body, textAlign: 'center', marginBottom: space.s },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s },
  month: { ...type.heading },
  range: { ...type.small, marginTop: space.m },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m, marginTop: space.m },
  logged: { ...type.small, marginTop: space.m },
  section: { marginTop: space.xxl },
  sectionTitle: { marginBottom: space.s },
  sectionCard: { paddingVertical: space.xs },
  none: { ...type.body, paddingVertical: space.m },
  medRow: { paddingVertical: space.m },
  medTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  medName: { ...type.body },
  medDays: { ...type.heading },
  note: { ...type.small, marginTop: space.s, paddingLeft: space.m, borderLeftWidth: 2 },
  total: { ...type.small, paddingVertical: space.m, borderTopWidth: StyleSheet.hairlineWidth },
  trigRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.m },
  trigName: { ...type.body },
  trigCount: { ...type.body },
  bring: { marginTop: space.xxl, gap: space.m },
  cardText: { ...type.heading },
  foot: { ...type.small, textAlign: 'center', marginTop: space.l },
});
