import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme, fonts, radius } from '../theme';
import { addDays, daysInMonth, firstOfMonth, monthName, weekdayMon } from '../days';
import { DayInfo } from '../insights';
import { Press } from './Kit';

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEK_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** The shade for a day: by its worst pain, nothing for a day without an attack. */
export function shadeFor(theme: Theme, info: DayInfo | undefined): string | null {
  if (!info || (info.status !== 'headache' && info.status !== 'migraine')) return null;
  const p = info.worstPain;
  if (p == null || p === 0) return theme.pain[0];
  if (p <= 3) return theme.pain[1];
  if (p <= 6) return theme.pain[2];
  return theme.pain[3];
}

function dayWords(key: string, info: DayInfo | undefined): string {
  const d = Number(key.slice(8));
  const m = Number(key.slice(5, 7));
  const parts = [`${WEEK_NAMES[weekdayMon(key)]}, ${monthName(m)} ${d}`];
  if (!info || info.status === 'none') parts.push('nothing logged');
  else if (info.status === 'free') parts.push('no headache');
  else {
    parts.push(info.status === 'migraine' ? 'migraine' : 'headache');
    if (info.worstPain != null) parts.push(`worst pain ${info.worstPain}`);
    if (info.long) parts.push('4 hours or more');
  }
  if (info?.medKinds.some((k) => k !== 'preventive')) parts.push('medication taken');
  return parts.join(', ');
}

/**
 * A month, Monday first. Each day is shaded by its worst pain; a
 * headache-free day has a soft ring; a day with acute medication has a dot.
 */
export default function MonthGrid({
  theme,
  y,
  m,
  days,
  today,
  onPressDay,
}: {
  theme: Theme;
  y: number;
  m: number;
  days: Map<string, DayInfo>;
  today: string;
  onPressDay?: (key: string) => void;
}) {
  const first = firstOfMonth(y, m);
  const lead = weekdayMon(first);
  const cells: (string | null)[] = [...Array(lead).fill(null)];
  for (let i = 0; i < daysInMonth(y, m); i++) cells.push(addDays(first, i));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      <View style={styles.week} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {WEEK.map((w, i) => (
          <Text key={i} style={[styles.weekday, { color: theme.inkFaint }]} maxFontSizeMultiplier={1.2}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((key, i) => {
          if (!key) return <View key={`e${i}`} style={styles.cell} />;
          const info = days.get(key);
          const shade = shadeFor(theme, info);
          const future = key > today;
          const isToday = key === today;
          const med = info?.medKinds.some((k) => k !== 'preventive');
          const body = (
            <View style={[styles.inner, { backgroundColor: shade ?? 'transparent', borderColor: isToday ? theme.inkSoft : 'transparent' }]}>
              <Text style={[styles.n, { color: future ? theme.inkFaint : theme.ink, opacity: future ? 0.5 : 1 }]} maxFontSizeMultiplier={1.2}>
                {Number(key.slice(8))}
              </Text>
              <View style={styles.marks}>
                {info?.status === 'free' ? <View style={[styles.ring, { borderColor: theme.inkSoft }]} /> : null}
                {med ? <View style={[styles.dot, { backgroundColor: theme.ink }]} /> : null}
              </View>
            </View>
          );
          return onPressDay && !future ? (
            <Press
              key={key}
              onPress={() => onPressDay(key)}
              style={styles.cell}
              pressedStyle={{ opacity: 0.6 }}
              accessibilityRole="button"
              accessibilityLabel={`${dayWords(key, info)}${isToday ? ', today' : ''}`}
            >
              {body}
            </Press>
          ) : (
            <View key={key} style={styles.cell} accessible accessibilityLabel={dayWords(key, info)}>
              {body}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** The key under the calendar, drawn with the same marks. */
export function MonthKey({ theme }: { theme: Theme }) {
  const item = (mark: React.ReactNode, label: string) => (
    <View style={styles.keyItem}>
      {mark}
      <Text style={[styles.keyText, { color: theme.inkSoft }]}>{label}</Text>
    </View>
  );
  return (
    <View style={styles.key}>
      {item(
        <View style={styles.keyShades}>
          {theme.pain.slice(1).map((c) => (
            <View key={c} style={[styles.keySwatch, { backgroundColor: c }]} />
          ))}
        </View>,
        'Worst pain, low to high'
      )}
      {item(<View style={[styles.ring, { borderColor: theme.inkSoft }]} />, 'No headache')}
      {item(<View style={[styles.dot, { backgroundColor: theme.ink }]} />, 'Medication')}
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 13, paddingBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  inner: { flex: 1, borderRadius: radius.chip - 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  n: { fontFamily: fonts.number, fontSize: 17 },
  marks: { flexDirection: 'row', gap: 3, height: 8, alignItems: 'center', marginTop: 1 },
  ring: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  key: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyText: { fontSize: 13 },
  keyShades: { flexDirection: 'row', gap: 2 },
  keySwatch: { width: 12, height: 12, borderRadius: 3 },
});
