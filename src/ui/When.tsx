import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Theme, space, type } from '../theme';

/**
 * A date and a time, as the phone's own compact pickers (two small buttons
 * that open the system wheel), in the app's theme. Used for when an attack
 * started and ended, and when a dose was taken.
 */
export default function When({
  theme,
  label,
  value,
  onChange,
  max,
  min,
  dateOnly = false,
}: {
  theme: Theme;
  label: string;
  value: number;
  onChange: (ms: number) => void;
  max?: number;
  min?: number;
  dateOnly?: boolean;
}) {
  const variant = theme.isDark ? 'dark' : 'light';
  const pick = (_: DateTimePickerEvent, d?: Date) => {
    if (d) onChange(d.getTime());
  };
  return (
    <View style={styles.row} accessibilityLabel={label}>
      <Text style={[styles.label, { color: theme.inkSoft }]} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
      <View style={styles.pickers}>
        <DateTimePicker
          value={new Date(value)}
          mode="date"
          display="compact"
          onChange={pick}
          maximumDate={max != null ? new Date(max) : undefined}
          minimumDate={min != null ? new Date(min) : undefined}
          themeVariant={variant}
          accentColor={theme.live}
          accessibilityLabel={`${label}, date`}
        />
        {!dateOnly && (
          <DateTimePicker
            value={new Date(value)}
            mode="time"
            display="compact"
            onChange={pick}
            minuteInterval={5}
            themeVariant={variant}
            accentColor={theme.live}
            accessibilityLabel={`${label}, time`}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m, minHeight: 52, flexWrap: 'wrap' },
  label: { ...type.body, flexShrink: 1 },
  pickers: { flexDirection: 'row', alignItems: 'center', gap: space.s },
});
