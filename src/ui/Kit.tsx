/**
 * The component kit. Everything tappable goes through Press, so everything
 * shows it was pressed; targets are at least 44 points, and the two main
 * buttons fill the width and stand at least 96 points tall.
 */
import React from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { BIG_BUTTON, Theme, fonts, radius, tabular } from '../theme';
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
 * do now. `quiet` is the same size in the room's own colors.
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
        { minHeight: height, backgroundColor: live ? theme.live : theme.surface, borderColor: live ? theme.live : theme.rule, opacity: disabled ? 0.45 : 1 },
      ]}
      pressedStyle={{ opacity: 0.82, transform: [{ scale: 0.99 }] }}
    >
      <Text style={[styles.bigLabel, { color: fg }]} maxFontSizeMultiplier={1.4} numberOfLines={2}>
        {label}
      </Text>
      {sub ? (
        <Text style={[styles.bigSub, { color: fg }, tabular]} maxFontSizeMultiplier={1.4} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </Press>
  );
}

/** A plain button: the room's surface with a hairline. `live` lays it in the accent (Continue). */
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
        { backgroundColor: live ? theme.live : theme.surface, borderColor: live ? theme.live : theme.rule, opacity: disabled ? 0.45 : 1 },
      ]}
      pressedStyle={{ opacity: 0.75 }}
    >
      {glyph && <Glyph name={glyph} size={22} color={fg} />}
      <Text style={[styles.buttonLabel, { color: fg }]} maxFontSizeMultiplier={1.5} numberOfLines={2}>
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
      <Text style={[styles.linkLabel, { color: color ?? theme.ink }]}>{label}</Text>
    </Press>
  );
}

/** The strip at the top of a screen: back on the left, a title, actions on the right. */
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
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {back && (
          <Press onPress={back.onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={back.label} style={styles.back}>
            <Glyph name="back" size={24} color={theme.ink} />
            <Text style={[styles.backLabel, { color: theme.ink }]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
              {back.label}
            </Text>
          </Press>
        )}
      </View>
      {title ? (
        <Text style={[styles.headerTitle, { color: theme.ink }]} numberOfLines={1} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

/** A screen's own title, large, on the left. */
export function ScreenTitle({ theme, title, right }: { theme: Theme; title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.screenTitleRow}>
      <Text style={[styles.screenTitle, { color: theme.ink }]} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
        {title}
      </Text>
      {right}
    </View>
  );
}

/** A tag you tap on and off. */
export function Chip({ theme, label, on, onPress, hint }: { theme: Theme; label: string; on: boolean; onPress: () => void; hint?: string }) {
  return (
    <Press
      onPress={() => {
        tick();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={[styles.chip, { backgroundColor: on ? theme.picked : theme.raised, borderColor: on ? theme.pickedEdge : 'transparent' }]}
      pressedStyle={{ opacity: 0.7 }}
    >
      {on && <Glyph name="check" size={16} color={theme.ink} weight={2.2} />}
      <Text style={[styles.chipLabel, { color: on ? theme.ink : theme.inkSoft }]} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
    </Press>
  );
}

/** A row of chips that wraps. */
export function Chips({ children }: { children: React.ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

/**
 * One of a few, as big side-by-side targets (Mild, Moderate, Severe; Yes,
 * Partly, No). Tapping the chosen one again clears it.
 */
export function Segment<T extends string>({
  theme,
  options,
  value,
  onChange,
  tall = false,
  label,
}: {
  theme: Theme;
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  tall?: boolean;
  label: string;
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
              onChange(on ? null : o.id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            accessibilityHint={on ? 'Tap again to clear' : undefined}
            style={[
              styles.segmentItem,
              tall && styles.segmentTall,
              { backgroundColor: on ? theme.picked : theme.surface, borderColor: on ? theme.pickedEdge : theme.rule },
            ]}
            pressedStyle={{ opacity: 0.7 }}
          >
            <Text style={[styles.segmentLabel, tall && styles.segmentLabelTall, { color: on ? theme.ink : theme.inkSoft }]} maxFontSizeMultiplier={1.4} numberOfLines={2}>
              {o.label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

export function Card({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.rule }, style]}>{children}</View>;
}

/** A small heading inside a screen. */
export function Label({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[styles.label, { color: theme.inkSoft }, style]} accessibilityRole="header" maxFontSizeMultiplier={1.6}>
      {children}
    </Text>
  );
}

/** A big number with what it counts. */
export function Numeral({ theme, value, label, sub }: { theme: Theme; value: string; label: string; sub?: string }) {
  return (
    <View style={styles.numeral} accessible accessibilityLabel={`${label}: ${value}${sub ? `. ${sub}` : ''}`}>
      <Text style={[styles.numeralValue, value.length > 5 && styles.numeralLong, { color: theme.ink }]} maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.numeralLabel, { color: theme.inkSoft }]} maxFontSizeMultiplier={1.5}>
        {label}
      </Text>
      {sub ? (
        <Text style={[styles.numeralSub, { color: theme.inkFaint }]} maxFontSizeMultiplier={1.5}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** "Pro", small, next to something that needs it. */
export function ProTag({ theme }: { theme: Theme }) {
  return (
    <View style={[styles.pro, { borderColor: theme.inkFaint }]}>
      <Text style={[styles.proText, { color: theme.inkSoft }]} maxFontSizeMultiplier={1.3}>
        Pro
      </Text>
    </View>
  );
}

/** A one-line note at the bottom of the screen for a few seconds. */
export function Notice({ theme, text, bottom = 0 }: { theme: Theme; text: string | null; bottom?: number }) {
  if (!text) return null;
  return (
    <View pointerEvents="none" style={[styles.noticeWrap, { bottom: bottom + 12 }]}>
      <View style={[styles.notice, { backgroundColor: theme.raised, borderColor: theme.rule }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Text style={[styles.noticeText, { color: theme.ink }]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { borderRadius: radius.big, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 24, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  bigLabel: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, textAlign: 'center' },
  bigSub: { fontSize: 16, marginTop: 4, opacity: 0.85, textAlign: 'center' },
  button: {
    minHeight: 54,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonCompact: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 14 },
  buttonLabel: { fontFamily: fonts.display, fontSize: 18, textAlign: 'center' },
  link: { minHeight: 44, justifyContent: 'center' },
  linkLabel: { fontSize: 17, textDecorationLine: 'underline', fontWeight: fonts.weight.medium },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, minHeight: 52 },
  headerSide: { flex: 1, minHeight: 44, justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingRight: 8 },
  backLabel: { fontSize: 17 },
  headerTitle: { fontFamily: fonts.display, fontSize: 18, textAlign: 'center', flex: 2 },
  screenTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 10, paddingTop: 8, minHeight: 56 },
  screenTitle: { fontFamily: fonts.display, fontSize: 28, lineHeight: 36, flexShrink: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: radius.chip, borderWidth: 1.5 },
  chipLabel: { fontSize: 16, fontWeight: fonts.weight.medium },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentItem: { flex: 1, minHeight: 56, borderRadius: radius.card, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 8 },
  segmentTall: { minHeight: 72 },
  segmentLabel: { fontSize: 17, fontWeight: fonts.weight.semibold, textAlign: 'center' },
  segmentLabelTall: { fontFamily: fonts.display, fontSize: 19, fontWeight: undefined },
  card: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  label: { fontSize: 15, fontWeight: fonts.weight.semibold, letterSpacing: 0.2, marginBottom: 10 },
  numeral: { flex: 1, minWidth: 140, paddingVertical: 10 },
  numeralValue: { fontFamily: fonts.number, fontSize: 44, lineHeight: 50 },
  numeralLong: { fontSize: 32, lineHeight: 50 },
  numeralLabel: { fontSize: 15, lineHeight: 20, marginTop: 2 },
  numeralSub: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  pro: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  proText: { fontSize: 12, fontWeight: fonts.weight.semibold, letterSpacing: 0.4 },
  noticeWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  notice: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, paddingVertical: 14, maxWidth: 520 },
  noticeText: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
});
