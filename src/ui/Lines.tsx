import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Theme, radius, space, type } from '../theme';
import Glyph from './Glyph';
import { Press } from './Kit';

/**
 * Lists: a heading, then a card in the second surface tone with a 1 px
 * edge, its lines split by hairlines. The card lifts the rows off the
 * room so a screen reads as layers, not one flat gray.
 */
export function Section({
  theme,
  title,
  note,
  children,
  first = false,
}: {
  theme: Theme;
  title?: string;
  note?: string;
  children?: React.ReactNode;
  first?: boolean;
}) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ paddingTop: first ? space.s : space.xxl }}>
      {title ? (
        <Text style={[type.heading, styles.pad, { color: theme.ink }]} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
          {title}
        </Text>
      ) : null}
      {note ? <Text style={[type.small, styles.pad, styles.note, { color: theme.inkSoft }]}>{note}</Text> : null}
      {rows.length > 0 ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.edge }]}>
          {rows.map((row, i) => (
            <View key={i} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule } : undefined}>
              {row}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** One line: a label (and a line under it) on the left, a value or anything on the right. */
export function Line({
  theme,
  label,
  sub,
  value,
  onPress,
  danger = false,
  chevron,
  children,
  a11y,
  hint,
}: {
  theme: Theme;
  label: string;
  sub?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
  children?: React.ReactNode;
  a11y?: string;
  hint?: string;
}) {
  const body = (
    <>
      <View style={styles.words}>
        <Text style={[type.body, { color: danger ? theme.danger : theme.ink }]}>{label}</Text>
        {sub ? <Text style={[type.small, styles.sub, { color: theme.inkSoft }]}>{sub}</Text> : null}
      </View>
      {value ? <Text style={[type.body, styles.value, { color: theme.inkSoft }]}>{value}</Text> : null}
      {children}
      {(chevron ?? (onPress != null && !danger)) ? <Glyph name="chevron" size={18} color={theme.inkFaint} /> : null}
    </>
  );
  return onPress ? (
    <Press
      onPress={onPress}
      style={styles.row}
      pressedStyle={{ backgroundColor: theme.raised }}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? [label, value, sub].filter(Boolean).join(', ')}
      accessibilityHint={hint}
    >
      {body}
    </Press>
  ) : (
    <View style={styles.row} accessible={!children} accessibilityLabel={a11y}>
      {body}
    </View>
  );
}

/** A line with an on/off switch. */
export function SwitchLine({ theme, label, sub, value, onChange }: { theme: Theme; label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Line theme={theme} label={label} sub={sub}>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.pickedEdge, false: theme.raised }}
        thumbColor={theme.thumb}
        ios_backgroundColor={theme.raised}
        accessibilityLabel={label}
        accessibilityHint={sub}
      />
    </Line>
  );
}

/** A choice in a list, ticked when on. */
export function PickLine({ theme, label, sub, on, onPress, radio = false }: { theme: Theme; label: string; sub?: string; on: boolean; onPress: () => void; radio?: boolean }) {
  return (
    <Press
      onPress={onPress}
      style={styles.row}
      pressedStyle={{ backgroundColor: theme.raised }}
      accessibilityRole={radio ? 'radio' : 'checkbox'}
      accessibilityState={radio ? { selected: on } : { checked: on }}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
    >
      <View style={styles.words}>
        <Text style={[type.body, { color: theme.ink }]}>{label}</Text>
        {sub ? <Text style={[type.small, styles.sub, { color: theme.inkSoft }]}>{sub}</Text> : null}
      </View>
      <View style={styles.tick}>{on ? <Glyph name="check" size={24} color={theme.ink} weight={2.2} /> : null}</View>
    </Press>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l },
  note: { marginTop: space.xs },
  card: { marginHorizontal: space.l, marginTop: space.m, borderRadius: radius.large, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 56, paddingHorizontal: space.l },
  words: { flex: 1, paddingVertical: space.m },
  sub: { marginTop: space.xs },
  value: { flexShrink: 1, textAlign: 'right' },
  tick: { width: space.xxl, alignItems: 'center' },
});
