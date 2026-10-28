import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Theme, fonts } from '../theme';
import Glyph from './Glyph';
import { Press } from './Kit';

/**
 * Lists: a heading, then full-bleed lines split by hairlines. No boxes
 * around groups, so a screen reads top to bottom without visual noise.
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
  return (
    <View style={{ paddingTop: first ? 8 : 30 }}>
      {title ? (
        <Text style={[styles.title, { color: theme.ink }]} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
          {title}
        </Text>
      ) : null}
      {note ? <Text style={[styles.note, { color: theme.inkSoft }]}>{note}</Text> : null}
      {children ? <View style={[styles.body, { borderTopColor: theme.rule }]}>{children}</View> : null}
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
        <Text style={[styles.label, { color: danger ? theme.danger : theme.ink }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: theme.inkFaint }]}>{sub}</Text> : null}
      </View>
      {value ? <Text style={[styles.value, { color: theme.inkSoft }]}>{value}</Text> : null}
      {children}
      {(chevron ?? (onPress != null && !danger)) ? <Glyph name="chevron" size={18} color={theme.inkFaint} /> : null}
    </>
  );
  const style = [styles.row, { borderBottomColor: theme.rule }];
  return onPress ? (
    <Press
      onPress={onPress}
      style={style}
      pressedStyle={{ backgroundColor: theme.raised }}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? [label, value, sub].filter(Boolean).join(', ')}
      accessibilityHint={hint}
    >
      {body}
    </Press>
  ) : (
    <View style={style} accessible={!children} accessibilityLabel={a11y}>
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
      style={[styles.row, { borderBottomColor: theme.rule }]}
      pressedStyle={{ backgroundColor: theme.raised }}
      accessibilityRole={radio ? 'radio' : 'checkbox'}
      accessibilityState={radio ? { selected: on } : { checked: on }}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
    >
      <View style={styles.words}>
        <Text style={[styles.label, { color: theme.ink }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: theme.inkFaint }]}>{sub}</Text> : null}
      </View>
      <View style={{ width: 26, alignItems: 'center' }}>{on ? <Glyph name="check" size={24} color={theme.ink} weight={2.2} /> : null}</View>
    </Press>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 20, paddingHorizontal: 20, marginBottom: 2 },
  note: { fontSize: 15, lineHeight: 21, paddingHorizontal: 20, marginTop: 2 },
  body: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  words: { flex: 1, paddingVertical: 12 },
  label: { fontSize: 17 },
  sub: { fontSize: 14, lineHeight: 19, marginTop: 2 },
  value: { fontSize: 16, flexShrink: 1, textAlign: 'right' },
});
