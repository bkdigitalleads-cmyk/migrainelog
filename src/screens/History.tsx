import React from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts, tabular } from '../theme';
import { useApp } from '../state';
import { dayKey, dayLabel, monthLabel, parseDay, timeLabel } from '../days';
import { durationMs, formatDuration, severityOf } from '../insights';
import { visibleAttacks } from '../gates';
import { noun, plural, severityLabel } from '../labels';
import type { Attack } from '../model';
import { Button, Card, Header, Press } from '../ui/Kit';
import Glyph from '../ui/Glyph';

/**
 * Every attack, newest first, by month. Free shows the last 30 days and
 * says how many older ones Pro keeps in view; nothing is ever deleted.
 */
export default function HistoryScreen({ onBack, onOpen, onAddPast }: { onBack: () => void; onOpen: (id: number) => void; onAddPast: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { attacks, isPro, showPaywall, settings } = useApp();
  const now = Date.now();
  const { shown, hidden } = visibleAttacks(attacks, now, isPro);
  const track = settings.track;

  const sections: { title: string; data: Attack[] }[] = [];
  for (const a of shown) {
    const { y, m } = parseDay(dayKey(a.startedAt));
    const title = monthLabel(y, m);
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(a);
    else sections.push({ title, data: [a] });
  }

  return (
    <View style={{ flex: 1 }}>
      <Header theme={theme} title={`All ${plural(track, 2)}`} back={{ label: 'Log', onPress: onBack }} />
      <SectionList
        sections={sections}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View style={styles.top}>
            <Button theme={theme} glyph="plus" label={`Add a past ${noun(track)}`} onPress={onAddPast} />
          </View>
        }
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.inkSoft }]}>{`Nothing logged yet. ${plural(track, 2)[0].toUpperCase()}${plural(track, 2).slice(1)} you log show up here.`}</Text>}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.section, { color: theme.inkSoft, backgroundColor: theme.bg, borderBottomColor: theme.rule }]} accessibilityRole="header">
            {section.title}
          </Text>
        )}
        renderItem={({ item: a }) => {
          const sev = severityLabel(severityOf(a));
          const len = a.endedAt == null ? `Still going, ${formatDuration(durationMs(a, now))}` : formatDuration(durationMs(a, now));
          const meds = a.doses.length > 0 ? `, ${a.doses.length} ${a.doses.length === 1 ? 'dose' : 'doses'}` : '';
          return (
            <Press
              onPress={() => onOpen(a.id)}
              style={[styles.row, { borderBottomColor: theme.rule }]}
              pressedStyle={{ backgroundColor: theme.raised }}
              accessibilityRole="button"
              accessibilityLabel={`${dayLabel(dayKey(a.startedAt))}, ${timeLabel(a.startedAt)}, ${len}${sev ? `, ${sev}` : ''}${meds}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.day, { color: theme.ink }]}>{`${dayLabel(dayKey(a.startedAt))}, ${timeLabel(a.startedAt)}`}</Text>
                <Text style={[styles.line, { color: theme.inkSoft }, tabular]}>{`${len}${sev ? `, ${sev.toLowerCase()}` : ''}${meds}${a.backfilled ? ', added later' : ''}`}</Text>
              </View>
              <Glyph name="chevron" size={18} color={theme.inkFaint} />
            </Press>
          );
        }}
        ListFooterComponent={
          hidden > 0 ? (
            <Card theme={theme} style={styles.more}>
              <Text style={[styles.moreText, { color: theme.ink }]}>{`${hidden} older ${plural(track, hidden)} are kept on this iPhone.`}</Text>
              <Text style={[styles.moreSub, { color: theme.inkSoft }]}>Free shows the last 30 days. Pro shows your whole history.</Text>
              <Button theme={theme} live label="See my whole history" onPress={() => showPaywall('history')} />
            </Card>
          ) : null
        }
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  empty: { fontSize: 17, lineHeight: 24, paddingHorizontal: 20, paddingTop: 20 },
  section: { fontFamily: fonts.display, fontSize: 15, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  day: { fontSize: 17 },
  line: { fontSize: 15, marginTop: 2 },
  more: { margin: 16, gap: 8 },
  moreText: { fontFamily: fonts.display, fontSize: 18 },
  moreSub: { fontSize: 15, lineHeight: 21, marginBottom: 6 },
});
