import React, { useRef } from 'react';
import { AccessibilityActionEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Theme, fonts, radius } from '../theme';
import { tick } from './motion';

/**
 * Pain from 0 to 10: a slider made of eleven cells. Tap a number, or drag
 * across; VoiceOver swipes up and down to change it. Tapping the chosen
 * number again clears it (pain not given).
 */
export default function PainScale({ theme, value, onChange }: { theme: Theme; value: number | null; onChange: (v: number | null) => void }) {
  const width = useRef(0);
  const last = useRef<number | null>(value);
  last.current = value;
  const change = useRef(onChange);
  change.current = onChange;
  const startedOn = useRef<number | null>(null);
  const moved = useRef(false);

  const at = (x: number) => Math.max(0, Math.min(10, Math.floor((x / Math.max(1, width.current)) * 11)));
  const set = (v: number | null) => {
    if (v !== last.current) {
      tick();
      last.current = v;
      change.current(v);
    }
  };

  // Made once, so a drag in progress keeps its handlers across renders.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        moved.current = false;
        startedOn.current = at(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e, g) => {
        if (Math.abs(g.dx) > 4) moved.current = true;
        if (moved.current) set(at(e.nativeEvent.locationX));
      },
      onPanResponderRelease: (e) => {
        const v = at(e.nativeEvent.locationX);
        if (!moved.current) set(v === last.current && startedOn.current === v ? null : v);
      },
    })
  ).current;

  const onAction = (e: AccessibilityActionEvent) => {
    const v = last.current ?? -1;
    if (e.nativeEvent.actionName === 'increment') set(Math.min(10, v + 1));
    if (e.nativeEvent.actionName === 'decrement') set(v <= 0 ? null : v - 1);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Pain, 0 to 10"
      accessibilityValue={value == null ? { text: 'Not given' } : { min: 0, max: 10, now: value, text: `${value} out of 10` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAction}
    >
      <View style={styles.row} onLayout={(e) => (width.current = e.nativeEvent.layout.width)} {...pan.panHandlers}>
        {Array.from({ length: 11 }, (_, i) => {
          const filled = value != null && i <= value;
          const chosen = value === i;
          return (
            <View
              key={i}
              pointerEvents="none"
              style={[
                styles.cell,
                { backgroundColor: filled ? theme.picked : theme.surface, borderColor: chosen ? theme.pickedEdge : theme.rule },
                chosen && styles.chosen,
              ]}
            >
              <Text style={[styles.n, { color: filled ? theme.ink : theme.inkFaint }]} maxFontSizeMultiplier={1.2}>
                {i}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.ends} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text style={[styles.end, { color: theme.inkFaint }]}>No pain</Text>
        <Text style={[styles.value, { color: theme.ink }]}>{value == null ? ' ' : `${value} of 10`}</Text>
        <Text style={[styles.end, { color: theme.inkFaint }]}>Worst</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  cell: { flex: 1, height: 54, borderRadius: radius.chip / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chosen: { borderWidth: 2 },
  n: { fontFamily: fonts.number, fontSize: 17 },
  ends: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  end: { fontSize: 13 },
  value: { fontFamily: fonts.display, fontSize: 15 },
});
