import React, { useRef, useState } from 'react';
import { AccessibilityActionEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Theme, radius, space, type } from '../theme';
import { tick } from './motion';
import { TextLink } from './Kit';

const THUMB = 28;

/**
 * Pain from 0 to 10: one slider, with the value large above it ("6",
 * "of 10" small) and "No pain" and "Worst" at the ends. Touch anywhere on
 * the track or drag; it settles on whole numbers with a tick each. VoiceOver
 * swipes up and down to change it. "Clear" puts it back to not given.
 */
export default function PainScale({ theme, value, onChange }: { theme: Theme; value: number | null; onChange: (v: number | null) => void }) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const last = useRef<number | null>(value);
  last.current = value;
  const change = useRef(onChange);
  change.current = onChange;

  const at = (x: number) => {
    const usable = Math.max(1, widthRef.current - THUMB);
    return Math.max(0, Math.min(10, Math.round(((x - THUMB / 2) / usable) * 10)));
  };
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
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => set(at(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => set(at(e.nativeEvent.locationX)),
    })
  ).current;

  const onAction = (e: AccessibilityActionEvent) => {
    const v = last.current ?? -1;
    if (e.nativeEvent.actionName === 'increment') set(Math.min(10, v + 1));
    if (e.nativeEvent.actionName === 'decrement') set(v <= 0 ? null : v - 1);
  };

  const left = value == null ? 0 : (value / 10) * Math.max(0, width - THUMB);

  return (
    <View>
      <View style={styles.readout} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text style={[type.display, { color: value == null ? theme.inkFaint : theme.ink }]} maxFontSizeMultiplier={1.3}>
          {value == null ? '\u2013' : value}
        </Text>
        <Text style={[type.small, { color: theme.inkSoft }]}>{value == null ? 'Pain not given. Touch the line to set it.' : 'of 10'}</Text>
        <View style={{ flex: 1 }} />
        {value != null ? <TextLink theme={theme} label="Clear" color={theme.inkSoft} onPress={() => set(null)} /> : null}
      </View>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Pain, 0 to 10"
        accessibilityValue={value == null ? { text: 'Not given' } : { min: 0, max: 10, now: value, text: `${value} out of 10` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAction}
        style={styles.hit}
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width;
          setWidth(e.nativeEvent.layout.width);
        }}
        {...pan.panHandlers}
      >
        <View pointerEvents="none" style={[styles.track, { backgroundColor: theme.raised, borderColor: theme.edge }]}>
          {value != null ? <View style={[styles.fill, { width: left, backgroundColor: theme.pickedEdge }]} /> : null}
        </View>
        {value != null ? <View pointerEvents="none" style={[styles.thumb, { left, backgroundColor: theme.ink, borderColor: theme.bg }]} /> : null}
      </View>
      <View style={styles.ends} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text style={[type.small, { color: theme.inkSoft }]}>No pain</Text>
        <Text style={[type.small, { color: theme.inkSoft }]}>Worst</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: space.s, minHeight: 44 },
  hit: { height: 48, justifyContent: 'center', marginTop: space.s },
  track: { height: space.s, borderRadius: radius.round, borderWidth: 1, overflow: 'hidden', marginHorizontal: THUMB / 2 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.round },
  thumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: radius.round, borderWidth: 2 },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
});
