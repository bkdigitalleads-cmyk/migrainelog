/**
 * The one drawing left: a month of shaded days, on the Pro notes of the
 * calendar and the numbers. Onboarding, the report screen and the paywalls
 * have no drawings; type and space carry them.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import { Theme } from '../theme';

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

/** A month of days: a few shaded by pain, a few ringed as headache-free, dots for medication. */
export function MonthAtAGlance({ theme, size = 240 }: { theme: Theme; size?: number }) {
  // 5 weeks x 7 days; values: -1 free, 0 nothing, 1..3 pain shade; m = medication.
  const days = [
    [0, -1, -1, 2, 0, -1, -1],
    [3, 1, -1, -1, 0, 0, -1],
    [-1, -1, 2, 0, -1, -1, 1],
    [-1, 3, 3, -1, -1, 0, -1],
    [-1, -1, 1, -1, 2, -1, -1],
  ];
  const med = new Set(['0-3', '1-0', '2-2', '3-1', '3-2', '4-4']);
  const cell = 28;
  return (
    <View accessible accessibilityLabel="A month calendar with some days shaded, some ringed as headache-free" accessibilityRole="image">
      <Svg width={size} height={size} viewBox="0 0 240 240" {...hidden}>
        <Rect x={10} y={16} width={220} height={208} rx={18} fill={theme.surface} stroke={theme.rule} strokeWidth={2} />
        <Rect x={28} y={32} width={70} height={8} rx={4} fill={theme.inkFaint} opacity={0.6} />
        <G>
          {days.map((row, r) =>
            row.map((v, c) => {
              const x = 22 + c * (cell + 1.5);
              const y = 56 + r * (cell + 4);
              return (
                <G key={`${r}-${c}`}>
                  {v > 0 ? <Rect x={x} y={y} width={cell} height={cell} rx={7} fill={theme.pain[v]} /> : null}
                  {v === -1 ? <Circle cx={x + cell / 2} cy={y + cell / 2} r={5} fill="none" stroke={theme.inkSoft} strokeWidth={1.6} /> : null}
                  {v === 0 ? <Circle cx={x + cell / 2} cy={y + cell / 2} r={1.6} fill={theme.inkFaint} opacity={0.5} /> : null}
                  {med.has(`${r}-${c}`) ? <Circle cx={x + cell / 2} cy={y + cell - 5} r={2.2} fill={theme.ink} /> : null}
                </G>
              );
            })
          )}
        </G>
      </Svg>
    </View>
  );
}
