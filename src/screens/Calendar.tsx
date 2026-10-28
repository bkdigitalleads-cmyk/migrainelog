import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts, tabular } from '../theme';
import { useApp } from '../state';
import { setFreeDay } from '../db';
import { dayKey, dayLabel, firstOfMonth, lastOfMonth, monthLabel, parseDay, shiftMonth, timeLabel } from '../days';
import { buildDays, coveredDays, durationMs, formatDuration, severityOf } from '../insights';
import { canSeeMonth } from '../gates';
import { aNoun, severityLabel } from '../labels';
import { Button, Card, IconButton, Press, ScreenTitle } from '../ui/Kit';
import MonthGrid, { MonthKey } from '../ui/MonthGrid';
import { Sheet } from '../ui/Sheet';
import { SwitchLine } from '../ui/Lines';
import { MonthAtAGlance } from '../ui/Drawings';
import Glyph from '../ui/Glyph';

/**
 * The calendar: a month at a glance, each day shaded by its worst pain,
 * headache-free days ringed, medication days dotted. Tap a day to see it,
 * mark it headache-free, or add an attack on it. This month is free;
 * earlier months are Pro.
 */
export default function CalendarScreen({ onOpen, onAddOn }: { onOpen: (id: number) => void; onAddOn: (day: string) => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { attacks, freeDays, isPro, showPaywall, refresh, settings, say } = useApp();
  const now = Date.now();
  const today = dayKey(now);
  const [{ y, m }, setMonth] = useState<{ y: number; m: number }>(() => parseDay(today));
  const [picked, setPicked] = useState<string | null>(null);
  const visible = canSeeMonth(y, m, now, isPro);

  const days = useMemo(() => buildDays(attacks, freeDays, firstOfMonth(y, m), lastOfMonth(y, m), now), [attacks, freeDays, y, m, now]);
  const isThisMonth = today.startsWith(firstOfMonth(y, m).slice(0, 7));

  const go = (delta: number) => {
    const next = shiftMonth(y, m, delta);
    if (`${next.y}-${String(next.m).padStart(2, '0')}` > today.slice(0, 7)) return;
    setMonth(next);
  };

  const dayAttacks = picked ? attacks.filter((a) => coveredDays(a, now).includes(picked)).sort((a, b) => a.startedAt - b.startedAt) : [];
  const pickedFree = picked ? freeDays.includes(picked) : false;
  const counts = [...days.values()].reduce(
    (c, d) => ({ headache: c.headache + (d.status === 'headache' || d.status === 'migraine' ? 1 : 0), free: c.free + (d.status === 'free' ? 1 : 0) }),
    { headache: 0, free: 0 }
  );

  return (
    <View style={{ flex: 1 }}>
      <ScreenTitle theme={theme} title="Calendar" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}>
        <View style={styles.monthRow}>
          <IconButton theme={theme} glyph="back" label="Earlier month" onPress={() => go(-1)} />
          <Text style={[styles.month, { color: theme.ink }]} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
            {monthLabel(y, m)}
          </Text>
          <IconButton theme={theme} glyph="chevron" label="Later month" onPress={() => go(1)} disabled={isThisMonth} />
        </View>

        {visible ? (
          <>
            <MonthGrid theme={theme} y={y} m={m} days={days} today={today} onPressDay={setPicked} />
            <MonthKey theme={theme} />
            <Text style={[styles.summary, { color: theme.inkSoft }, tabular]}>
              {`${counts.headache} ${counts.headache === 1 ? 'day' : 'days'} with a headache, ${counts.free} marked headache-free. Tap a day to change it.`}
            </Text>
          </>
        ) : (
          <Card theme={theme} style={styles.locked}>
            <MonthAtAGlance theme={theme} size={150} />
            <Text style={[styles.lockedTitle, { color: theme.ink }]}>Earlier months are part of Pro.</Text>
            <Text style={[styles.lockedLine, { color: theme.inkSoft }]}>This month is always free. Pro keeps every month to look back on, and the report your doctor can use.</Text>
            <Button theme={theme} live label="See earlier months" onPress={() => showPaywall('history')} />
          </Card>
        )}
      </ScrollView>

      <Sheet theme={theme} visible={picked != null} onClose={() => setPicked(null)} title={picked ? dayLabel(picked) : ''}>
        {dayAttacks.length === 0 ? (
          <SwitchLine
            theme={theme}
            label="No headache this day"
            sub="Headache-free days make the counts honest."
            value={pickedFree}
            onChange={async (v) => {
              if (!picked) return;
              await setFreeDay(picked, v);
              await refresh();
              if (v) say('Marked as a headache-free day.');
            }}
          />
        ) : (
          dayAttacks.map((a) => {
            const sev = severityLabel(severityOf(a));
            const line = a.endedAt == null ? `Still going, ${formatDuration(durationMs(a, now))}` : formatDuration(durationMs(a, now));
            return (
              <Press
                key={a.id}
                onPress={() => {
                  setPicked(null);
                  onOpen(a.id);
                }}
                style={[styles.attack, { borderColor: theme.rule, backgroundColor: theme.bg }]}
                pressedStyle={{ backgroundColor: theme.raised }}
                accessibilityRole="button"
                accessibilityLabel={`${timeLabel(a.startedAt)}, ${line}${sev ? `, ${sev}` : ''}. Opens the details`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.attackTime, { color: theme.ink }]}>{`From ${timeLabel(a.startedAt)}${dayKey(a.startedAt) !== picked ? ` (${dayLabel(dayKey(a.startedAt))})` : ''}`}</Text>
                  <Text style={[styles.attackLine, { color: theme.inkSoft }, tabular]}>{`${line}${sev ? `, ${sev.toLowerCase()}` : ''}`}</Text>
                </View>
                <Glyph name="chevron" size={18} color={theme.inkFaint} />
              </Press>
            );
          })
        )}
        <Button
          theme={theme}
          glyph="plus"
          label={`Add ${aNoun(settings.track)} on this day`}
          onPress={() => {
            const d = picked;
            setPicked(null);
            if (d) onAddOn(d);
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  month: { fontFamily: fonts.display, fontSize: 20 },
  summary: { fontSize: 15, lineHeight: 21, marginTop: 14 },
  locked: { alignItems: 'center', gap: 10, paddingVertical: 22 },
  lockedTitle: { fontFamily: fonts.display, fontSize: 20, textAlign: 'center' },
  lockedLine: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginBottom: 6 },
  attack: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, minHeight: 64 },
  attackTime: { fontSize: 17 },
  attackLine: { fontSize: 15, marginTop: 2 },
});
