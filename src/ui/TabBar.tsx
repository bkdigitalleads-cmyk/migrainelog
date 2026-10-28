import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, space, type } from '../theme';
import Glyph, { GlyphName } from './Glyph';
import { Press } from './Kit';

export type Tab = 'log' | 'calendar' | 'numbers' | 'report' | 'meds';

const TABS: { id: Tab; label: string; glyph: GlyphName }[] = [
  { id: 'log', label: 'Log', glyph: 'wave' },
  { id: 'calendar', label: 'Calendar', glyph: 'calendar' },
  { id: 'numbers', label: 'Numbers', glyph: 'tally' },
  { id: 'report', label: 'Report', glyph: 'document' },
  { id: 'meds', label: 'Medications', glyph: 'pill' },
];

/** The five places, along the bottom. The current one is in full ink, the rest are soft. */
export default function TabBar({ theme, tab, onTab, proTabs = [] }: { theme: Theme; tab: Tab; onTab: (t: Tab) => void; proTabs?: Tab[] }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: theme.bg, borderTopColor: theme.edge, paddingBottom: Math.max(insets.bottom - space.s, space.s) }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const on = t.id === tab;
        const color = on ? theme.ink : theme.inkFaint;
        return (
          <Press
            key={t.id}
            onPress={() => onTab(t.id)}
            style={styles.tab}
            pressedStyle={{ opacity: 0.6 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={proTabs.includes(t.id) ? `${t.label}, Pro` : t.label}
          >
            <Glyph name={t.glyph} size={26} color={color} weight={on ? 2.1 : 1.8} />
            <View style={styles.labelRow}>
              <Text style={[type.small, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.2} adjustsFontSizeToFit>
                {t.label}
              </Text>
            </View>
          </Press>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: space.s },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: space.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
