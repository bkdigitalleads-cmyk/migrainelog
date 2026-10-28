import React from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, radius, space, tabular, type } from '../theme';
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
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}
        ListHeaderComponent={
          <View style={styles.top}>
            <Button theme={theme} glyph="plus" label={`Add a past ${noun(track)}`} onPress={onAddPast} />
          </View>
        }
        ListEmptyComponent={<Text style={[type.body, styles.empty, { color: theme.inkSoft }]}>{`Nothing logged yet. ${plural(track, 2)[0].toUpperCase()}${plural(track, 2).slice(1)} you log show up here.`}</Text>}
        renderSectionHeader={({ section }) => (
          <Text style={[type.heading, styles.section, { color: theme.ink, backgroundColor: theme.bg }]} accessibilityRole="header">
            {section.title}
          </Text>
        )}
        renderItem={({ item: a, index, section }) => {
          const sev = severityLabel(severityOf(a));
          const len = a.endedAt == null ? `Still going, ${formatDuration(durationMs(a, now))}` : formatDuration(durationMs(a, now));
          const meds = a.doses.length > 0 ? `, ${a.doses.length} ${a.doses.length === 1 ? 'dose' : 'doses'}` : '';
          const first = index === 0;
          const lastRow = index === section.data.length - 1;
          const needs = a.detailsAt == null && a.endedAt != null;
          return (
            <Press
              onPress={() => onOpen(a.id)}
              style={[
                styles.row,
                { backgroundColor: theme.surface, borderColor: theme.edge },
                first && styles.rowFirst,
                lastRow && styles.rowLast,
                !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule },
              ]}
              pressedStyle={{ backgroundColor: theme.raised }}
              accessibilityRole="button"
              accessibilityLabel={`${dayLabel(dayKey(a.startedAt))}, ${timeLabel(a.startedAt)}, ${len}${sev ? `, ${sev}` : ''}${meds}${needs ? '. Add details' : ''}`}
            >
              <View style={styles.grow}>
                <Text style={[type.body, { color: theme.ink }]}>{`${dayLabel(dayKey(a.startedAt))}, ${timeLabel(a.startedAt)}`}</Text>
                <Text style={[type.small, { color: theme.inkSoft }, tabular]}>{`${len}${sev ? `, ${sev.toLowerCase()}` : ''}${meds}${a.backfilled ? ', added later' : ''}`}</Text>
              </View>
              {needs ? (
                <View style={[styles.pill, { borderColor: theme.edge, backgroundColor: theme.raised }]}>
                  <Text style={[type.small, { color: theme.ink }]}>Add details</Text>
                </View>
              ) : (
                <Glyph name="chevron" size={18} color={theme.inkFaint} />
              )}
            </Press>
          );
        }}
        ListFooterComponent={
          hidden > 0 ? (
            <Card theme={theme} style={styles.more}>
              <Text style={[type.heading, { color: theme.ink }]}>{`${hidden} older ${plural(track, hidden)} are kept on this iPhone.`}</Text>
              <Text style={[type.small, { color: theme.inkSoft }]}>Free shows the last 30 days. Pro shows your whole history.</Text>
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
  top: { paddingHorizontal: space.l, paddingTop: space.l },
  empty: { paddingHorizontal: space.l, paddingTop: space.xl },
  section: { paddingHorizontal: space.l, paddingTop: space.xl, paddingBottom: space.s },
  grow: { flex: 1, gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 64, marginHorizontal: space.l, paddingHorizontal: space.l, paddingVertical: space.m, borderLeftWidth: 1, borderRightWidth: 1 },
  rowFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.large, borderTopRightRadius: radius.large },
  rowLast: { borderBottomWidth: 1, borderBottomLeftRadius: radius.large, borderBottomRightRadius: radius.large },
  pill: { borderWidth: 1, borderRadius: radius.small, paddingHorizontal: space.m, minHeight: 36, justifyContent: 'center' },
  more: { margin: space.l, marginTop: space.xl, gap: space.m },
});
