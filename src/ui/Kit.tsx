/**
 * The component kit. Everything tappable goes through Press, so everything
 * shows it was pressed; targets are at least 44 points, and the two main
 * buttons fill the width and stand at least 96 points tall.
 *
 * Built on the theme's three type sizes (display, body, small), its
 * spacing scale and its two corners: large for cards and the main
 * buttons, small for chips, segments, inputs and plain buttons. Surfaces
 * that sit on the room get the second tone and a 1 px edge.
 */
import React from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { BIG_BUTTON, Theme, radius, space, tabular, type } from '../theme';
import Glyph, { GlyphName } from './Glyph';
import { tick } from './motion';

export function Press({
  style,
  pressedStyle,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; pressedStyle?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <Pressable {...rest} style={({ pressed }) => [style, pressed && (pressedStyle ?? { opacity: 0.6 })]}>
      {children}
    </Pressable>
  );
}

/**
 * One of the two main buttons. `live` is the warm accent: the one thing to
 * do now. `quiet` is the same size in the second surface tone.
 */
export function BigAction({
  theme,
  label,
  sub,
  onPress,
  tone = 'live',
  hint,
  disabled = false,
  height = BIG_BUTTON,
}: {
  theme: Theme;
  label: string;
  sub?: string;
  onPress: () => void;
  tone?: 'live' | 'quiet';
  hint?: string;
  disabled?: boolean;
  height?: number;
}) {
  const live = tone === 'live';
  const fg = live ? theme.onLive : theme.ink;
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      style={[
        styles.big,
        { minHeight: height, backgroundColor: live ? theme.live : theme.surface, borderColor: live ? theme.live : theme.edge, opacity: disabled ? 0.45 : 1 },
      ]}
      pressedStyle={{ opacity: 0.82, transform: [{ scale: 0.99 }] }}
    >
      <Text style={[type.display, styles.center, { color: fg }]} maxFontSizeMultiplier={1.4} numberOfLines={2}>
        {label}
      </Text>
      {sub ? (
        <Text style={[type.small, styles.center, { color: fg, marginTop: space.xs }, tabular]} maxFontSizeMultiplier={1.4} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </Press>
  );
}

/** A plain button in the second tone with a 1 px edge. `live` lays it in the accent (Continue, Save). */
export function Button({
  theme,
  label,
  onPress,
  glyph,
  live = false,
  disabled = false,
  hint,
  compact = false,
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
  glyph?: GlyphName;
  live?: boolean;
  disabled?: boolean;
  hint?: string;
  compact?: boolean;
}) {
  const fg = live ? theme.onLive : theme.ink;
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: live ? theme.live : theme.surface, borderColor: live ? theme.live : theme.edge, opacity: disabled ? 0.45 : 1 },
      ]}
      pressedStyle={{ opacity: 0.75 }}
    >
      {glyph && <Glyph name={glyph} size={22} color={fg} />}
      <Text style={[type.heading, styles.center, { color: fg }]} maxFontSizeMultiplier={1.5} numberOfLines={2}>
        {label}
      </Text>
    </Press>
  );
}

/** A round glyph button. At least 44 points. */
export function IconButton({
  theme,
  glyph,
  label,
  onPress,
  size = 44,
  color,
  disabled = false,
}: {
  theme: Theme;
  glyph: GlyphName;
  label: string;
  onPress: () => void;
  size?: number;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ width: size, height: size, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}
      pressedStyle={{ backgroundColor: theme.raised }}
    >
      <Glyph name={glyph} size={size * 0.56} color={color ?? theme.ink} />
    </Press>
  );
}

/** A word you can tap, underlined. At least 44 points tall. */
export function TextLink({ theme, label, onPress, color, hint }: { theme: Theme; label: string; onPress: () => void; color?: string; hint?: string }) {
  return (
    <Press onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} style={styles.link}>
      <Text style={[type.body, styles.underline, { color: color ?? theme.ink }]}>{label}</Text>
    </Press>
  );
}

/** The strip at the top of a pushed screen: back on the left, a title, actions on the right. */
export function Header({
  theme,
  title,
  back,
  right,
}: {
  theme: Theme;
  title?: string;
  back?: { label: string; onPress: () => void };
  right?: React.ReactNode;
}) {
  return (
    <View style={[styles.header, { borderBottomColor: theme.edge }]}>
      <View style={styles.headerSide}>
        {back && (
          <Press onPress={back.onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={back.label} style={styles.back}>
            <Glyph name="back" size={24} color={theme.ink} />
            <Text style={[type.body, { color: theme.ink }]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
              {back.label}
            </Text>
          </Press>
        )}
      </View>
      {title ? (
        <Text style={[type.heading, styles.headerTitle, { color: theme.ink }]} numberOfLines={1} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

/** A tab's own title, large, on the left. */
export function ScreenTitle({ theme, title, right }: { theme: Theme; title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.screenTitleRow}>
      <Text style={[type.display, styles.shrink, { color: theme.ink }]} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
        {title}
      </Text>
      {right}
    </View>
  );
}

/** A tag you tap on and off. */
export function Chip({ theme, label, sub, on, onPress, hint }: { theme: Theme; label: string; sub?: string; on: boolean; onPress: () => void; hint?: string }) {
  return (
    <Press
      onPress={() => {
        tick();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityHint={hint}
      style={[styles.chip, sub != null && styles.chipTwoLines, { backgroundColor: on ? theme.picked : theme.raised, borderColor: on ? theme.pickedEdge : theme.edge }]}
      pressedStyle={{ opacity: 0.7 }}
    >
      {on && <Glyph name="check" size={16} color={theme.ink} weight={2.2} />}
      <View>
        <Text style={[type.body, { color: on ? theme.ink : theme.inkSoft }]} maxFontSizeMultiplier={1.6}>
          {label}
        </Text>
        {sub ? (
          <Text style={[type.small, { color: theme.inkFaint }]} maxFontSizeMultiplier={1.6}>
            {sub}
          </Text>
        ) : null}
      </View>
    </Press>
  );
}

/** A row of chips that wraps. */
export function Chips({ children }: { children: React.ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

/**
 * One of a few, as big side-by-side targets (Mild, Moderate, Severe; Yes,
 * Partly, No). Tapping the chosen one again clears it, unless `required`.
 */
export function Segment<T extends string>({
  theme,
  options,
  value,
  onChange,
  tall = false,
  label,
  required = false,
}: {
  theme: Theme;
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  tall?: boolean;
  label: string;
  required?: boolean;
}) {
  return (
    <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <Press
            key={o.id}
            onPress={() => {
              tick();
              onChange(on && !required ? null : o.id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            accessibilityHint={on && !required ? 'Tap again to clear' : undefined}
            style={[
              styles.segmentItem,
              tall && styles.segmentTall,
              { backgroundColor: on ? theme.picked : theme.surface, borderColor: on ? theme.pickedEdge : theme.edge },
            ]}
            pressedStyle={{ opacity: 0.7 }}
          >
            <Text style={[type.heading, styles.center, { color: on ? theme.ink : theme.inkSoft }]} maxFontSizeMultiplier={1.4} numberOfLines={2}>
              {o.label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

/** The second surface tone with a 1 px edge and the large corner. */
export function Card({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.edge }, style]}>{children}</View>;
}

/** A small label above a control or a group. */
export function Label({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[type.small, styles.label, { color: theme.inkSoft }, style]} accessibilityRole="header" maxFontSizeMultiplier={1.6}>
      {children}
    </Text>
  );
}

/** A big number with what it counts. */
export function Numeral({ theme, value, label, sub }: { theme: Theme; value: string; label: string; sub?: string }) {
  return (
    <View style={[styles.numeral, { backgroundColor: theme.surface, borderColor: theme.edge }]} accessible accessibilityLabel={`${label}: ${value}${sub ? `. ${sub}` : ''}`}>
      <Text style={[type.display, { color: theme.ink }]} maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[type.small, { color: theme.inkSoft, marginTop: space.xs }]} maxFontSizeMultiplier={1.5}>
        {sub ? `${label} ${sub}` : label}
      </Text>
    </View>
  );
}

/** "Pro", small, next to something that needs it. */
export function ProTag({ theme }: { theme: Theme }) {
  return (
    <View style={[styles.pro, { borderColor: theme.inkFaint }]}>
      <Text style={[type.small, { color: theme.inkSoft }]} maxFontSizeMultiplier={1.3}>
        Pro
      </Text>
    </View>
  );
}

/** A one-line note at the bottom of the screen for a few seconds. */
export function Notice({ theme, text, bottom = 0 }: { theme: Theme; text: string | null; bottom?: number }) {
  if (!text) return null;
  return (
    <View pointerEvents="none" style={[styles.noticeWrap, { bottom: bottom + space.m }]}>
      <View style={[styles.notice, { backgroundColor: theme.raised, borderColor: theme.edge }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Text style={[type.body, styles.center, { color: theme.ink }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  shrink: { flexShrink: 1 },
  underline: { textDecorationLine: 'underline' },
  big: { borderRadius: radius.large, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.xl, paddingVertical: space.l, alignItems: 'center', justifyContent: 'center' },
  button: {
    minHeight: 52,
    borderRadius: radius.small,
    borderWidth: 1,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s,
  },
  buttonCompact: { minHeight: 44, paddingVertical: space.s, paddingHorizontal: space.m },
  link: { minHeight: 44, justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.s, minHeight: 52, borderBottomWidth: 1 },
  headerSide: { flex: 1, minHeight: 44, justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44, paddingRight: space.s },
  headerTitle: { textAlign: 'center', flex: 2 },
  screenTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.l, paddingRight: space.s, paddingTop: space.s, minHeight: 56 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 48, paddingHorizontal: space.l, borderRadius: radius.small, borderWidth: 1 },
  chipTwoLines: { paddingVertical: space.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  segment: { flexDirection: 'row', gap: space.s },
  segmentItem: { flex: 1, minHeight: 52, borderRadius: radius.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xs, paddingVertical: space.s },
  segmentTall: { minHeight: 72 },
  card: { borderRadius: radius.large, borderWidth: 1, padding: space.l },
  label: { marginBottom: space.s },
  numeral: { flexGrow: 1, flexBasis: '40%', borderRadius: radius.large, borderWidth: 1, paddingHorizontal: space.l, paddingVertical: space.m },
  pro: { borderWidth: 1, borderRadius: radius.small / 2, paddingHorizontal: space.xs },
  noticeWrap: { position: 'absolute', left: space.l, right: space.l, alignItems: 'center' },
  notice: { borderRadius: radius.large, borderWidth: 1, paddingHorizontal: space.l, paddingVertical: space.m, maxWidth: 520 },
});
