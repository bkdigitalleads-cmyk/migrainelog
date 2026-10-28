/**
 * The drawings on the onboarding screens and the paywall, in the room's
 * own colors: a hand on one big button, a month of shaded days, a report
 * a doctor can read, and the three days of a free trial. Soft shapes, no
 * clip art, no lightning.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { Theme } from '../theme';

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };

/** A phone with one big button and a thumb on it: logging in one tap. */
export function OneTap({ theme, size = 240 }: { theme: Theme; size?: number }) {
  return (
    <View accessible accessibilityLabel="A phone with one large button, tapped once" accessibilityRole="image">
      <Svg width={size} height={size} viewBox="0 0 240 240" {...hidden}>
        <Rect x={62} y={14} width={116} height={212} rx={22} fill={theme.surface} stroke={theme.rule} strokeWidth={2} />
        <Rect x={78} y={40} width={50} height={7} rx={3.5} fill={theme.inkFaint} opacity={0.6} />
        <Rect x={78} y={56} width={72} height={5} rx={2.5} fill={theme.raised} />
        <Rect x={78} y={66} width={60} height={5} rx={2.5} fill={theme.raised} />
        <Rect x={74} y={150} width={92} height={56} rx={14} fill={theme.live} />
        <Rect x={92} y={174} width={56} height={8} rx={4} fill={theme.onLive} opacity={0.85} />
        {/* one tap: soft rings spreading from the middle of the button */}
        <Circle cx={120} cy={178} r={14} fill={theme.onLive} opacity={0.35} />
        <Rect x={64} y={140} width={112} height={76} rx={20} fill="none" stroke={theme.live} strokeWidth={2} opacity={0.4} />
        <Rect x={54} y={130} width={132} height={96} rx={26} fill="none" stroke={theme.live} strokeWidth={1.5} opacity={0.18} />
      </Svg>
    </View>
  );
}

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

/** A one-page report: a title, four counts in boxes, a small table. */
export function ReportPage({ theme, size = 240, compact = false }: { theme: Theme; size?: number; compact?: boolean }) {
  const page = theme.isDark ? '#C9C4BC' : '#FBF9F6';
  const ink = '#2A2730';
  const soft = '#8C8790';
  const h = compact ? 150 : 240;
  return (
    <View accessible accessibilityLabel="A one-page report with four counts and a table" accessibilityRole="image">
      <Svg width={size} height={(size * h) / 240} viewBox={`0 0 240 ${h}`} {...hidden}>
        <G transform={compact ? 'translate(30 6) scale(0.75)' : undefined}>
          <Rect x={40} y={10} width={160} height={210} rx={8} fill={page} />
          <Rect x={56} y={28} width={74} height={9} rx={4.5} fill={ink} />
          <Rect x={56} y={43} width={110} height={5} rx={2.5} fill={soft} />
          {[0, 1, 2, 3].map((i) => (
            <G key={i}>
              <Rect x={56 + i * 33} y={60} width={28} height={36} rx={4} fill="none" stroke={soft} strokeWidth={1.4} />
              <Rect x={62 + i * 33} y={68} width={14} height={11} rx={2} fill={ink} />
              <Rect x={62 + i * 33} y={84} width={16} height={4} rx={2} fill={soft} />
            </G>
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <G key={i}>
              <Rect x={56} y={110 + i * 15} width={128} height={1.2} fill={soft} opacity={0.6} />
              <Rect x={56} y={114 + i * 15} width={38} height={5} rx={2.5} fill={i === 0 ? ink : soft} />
              <Rect x={130} y={114 + i * 15} width={12} height={5} rx={2.5} fill={i === 0 ? ink : soft} />
              <Rect x={160} y={114 + i * 15} width={12} height={5} rx={2.5} fill={i === 0 ? ink : soft} />
            </G>
          ))}
          <Rect x={86} y={204} width={68} height={4} rx={2} fill={soft} opacity={0.7} />
        </G>
      </Svg>
    </View>
  );
}

/** Three days of a trial, the second one ringed: the day the reminder comes. */
export function TrialDays({ theme, size = 260 }: { theme: Theme; size?: number }) {
  return (
    <View accessible accessibilityLabel="Three days, the second one circled: the reminder comes the day before the trial ends" accessibilityRole="image">
      <Svg width={size} height={(size * 150) / 260} viewBox="0 0 260 150" {...hidden}>
        {[0, 1, 2].map((i) => (
          <G key={i}>
            <Rect x={14 + i * 82} y={22} width={68} height={100} rx={14} fill={theme.surface} stroke={theme.rule} strokeWidth={2} />
            <Rect x={30 + i * 82} y={40} width={36} height={7} rx={3.5} fill={theme.inkFaint} opacity={0.7} />
            <Circle cx={48 + i * 82} cy={84} r={14} fill={i === 1 ? theme.picked : theme.raised} />
          </G>
        ))}
        <Path d="M110 14 C140 6 172 16 178 46 C184 80 182 118 150 134 C124 146 92 140 86 108 C80 76 82 26 110 14 Z" fill="none" stroke={theme.inkSoft} strokeWidth={2.4} strokeLinecap="round" />
      </Svg>
    </View>
  );
}
