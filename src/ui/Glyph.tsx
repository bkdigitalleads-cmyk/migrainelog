/**
 * The app's own glyphs, drawn for it on a 28x28 grid: soft curves, round
 * ends, one stroke weight, nothing sharp. No icon pack and no lightning
 * bolt. The four that carry the app: a soft wave (logging), a pill
 * (medications), a calendar and a document (the report).
 */
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export type GlyphName =
  | 'wave'
  | 'pill'
  | 'calendar'
  | 'document'
  | 'tally'
  | 'tune'
  | 'close'
  | 'check'
  | 'back'
  | 'chevron'
  | 'plus'
  | 'trash'
  | 'share'
  | 'print'
  | 'pencil'
  | 'clock'
  | 'moon'
  | 'ring'
  | 'table';

export default function Glyph({ name, size = 26, color, weight = 1.8 }: { name: GlyphName; size?: number; color: string; weight?: number }) {
  const s = { stroke: color, strokeWidth: weight, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {draw(name, s, color)}
    </Svg>
  );
}

function draw(name: GlyphName, s: object, color: string) {
  switch (name) {
    case 'wave':
      // A soft swell that settles: an attack rising and easing off.
      return (
        <>
          <Path {...s} d="M3.5 17.5 C6.5 17.5 7.6 16.2 9 13.4 C10.6 10.2 12 7.6 14 7.6 C16 7.6 17.2 10.6 18.6 13.8 C19.9 16.6 21.3 17.6 24.5 17.6" />
          <Path {...s} d="M5.5 21.6 Q14 20.9 22.5 21.6" opacity={0.55} />
        </>
      );
    case 'pill':
      return (
        <>
          <Path {...s} d="M9.6 22.6 C7.1 25.1 3 21 5.5 18.5 L18.4 5.6 C20.9 3.1 25 7.2 22.5 9.7 Z" />
          <Path {...s} d="M11.9 12.1 L16 16.2" />
        </>
      );
    case 'calendar':
      return (
        <>
          <Path {...s} d="M7 6.6 Q4.6 6.7 4.6 9.1 L4.7 21.4 Q4.8 23.6 7.1 23.6 L20.9 23.6 Q23.3 23.5 23.3 21.2 L23.4 9 Q23.3 6.6 20.9 6.6 Z" />
          <Path {...s} d="M4.8 11.4 Q14 11 23.3 11.4" />
          <Path {...s} d="M9.4 4.4 L9.4 8.2 M18.6 4.4 L18.6 8.2" />
          <Circle cx={10} cy={16.6} r={1.25} fill={color} />
          <Circle cx={14.4} cy={16.6} r={1.25} fill={color} />
          <Circle cx={10} cy={20.2} r={1.25} fill={color} />
        </>
      );
    case 'document':
      return (
        <>
          <Path {...s} d="M16.4 4.5 L8.6 4.6 Q6.6 4.7 6.6 6.7 L6.7 21.6 Q6.7 23.5 8.7 23.5 L19.4 23.5 Q21.4 23.4 21.4 21.4 L21.3 9.4 Z" />
          <Path {...s} d="M16.3 4.6 L16.4 9.4 L21.2 9.4" />
          <Path {...s} d="M10.2 14 Q14 13.8 17.8 14 M10.2 17.6 Q13 17.4 15.8 17.6" />
        </>
      );
    case 'tally':
      // Three soft bars on a floor line: the monthly numbers.
      return (
        <>
          <Path {...s} d="M4.6 23.3 Q14 22.8 23.4 23.3" />
          <Path {...s} d="M8.4 19.6 L8.5 13.6" />
          <Path {...s} d="M14 19.6 L14 7.8" />
          <Path {...s} d="M19.6 19.6 L19.5 11.2" />
        </>
      );
    case 'tune':
      // Settings: a soft dial with one mark.
      return (
        <>
          <Path {...s} d="M14 4.8 C19.2 4.7 23.3 8.9 23.2 14 C23.1 19.2 19 23.3 13.9 23.2 C8.8 23.1 4.8 19 4.8 13.9 C4.9 8.8 8.9 4.9 14 4.8 Z" />
          <Path {...s} d="M14 14 L18.4 9.8" />
          <Circle cx={14} cy={14} r={1.6} fill={color} />
        </>
      );
    case 'close':
      return <Path {...s} d="M7.8 7.6 Q14 13.9 20.4 20.4 M20.3 7.7 Q14.1 14 7.7 20.3" />;
    case 'check':
      return <Path {...s} d="M6 14.8 L11.4 19.8 Q11.8 20.2 12.2 19.8 L22.2 8.6" />;
    case 'back':
      return <Path {...s} d="M17 6 L9.6 13.6 Q9.2 14 9.6 14.4 L17.1 22" />;
    case 'chevron':
      return <Path {...s} d="M11 6.8 L17.4 13.6 Q17.8 14 17.4 14.4 L10.9 21.2" />;
    case 'plus':
      return <Path {...s} d="M14 6.4 Q13.8 14 14.1 21.6 M6.4 14.1 Q14 13.8 21.6 14" />;
    case 'trash':
      return (
        <>
          <Path {...s} d="M5.6 8.2 Q14 7.8 22.4 8.2 M11.2 7.9 L11.7 5.6 Q11.9 4.9 12.6 4.9 L15.4 4.9 Q16.1 5 16.3 5.6 L16.8 8" />
          <Path {...s} d="M7.6 8.4 L8.6 21.6 Q8.8 23.2 10.3 23.2 L17.7 23.2 Q19.2 23.1 19.4 21.6 L20.4 8.4" />
        </>
      );
    case 'share':
      return (
        <>
          <Path {...s} d="M10 12.2 L8 12.2 Q6.3 12.3 6.3 14 L6.4 21.4 Q6.4 23.1 8.1 23.1 L19.9 23 Q21.6 23 21.6 21.3 L21.6 14 Q21.5 12.2 19.8 12.2 L18 12.2" />
          <Path {...s} d="M14 16.4 Q13.8 10.4 14.1 4.8" />
          <Path {...s} d="M10.4 8.4 L14.1 4.6 L17.7 8.4" />
        </>
      );
    case 'print':
      return (
        <>
          <Path {...s} d="M8.6 10.4 L8.6 5.6 Q8.7 4.7 9.6 4.7 L18.4 4.7 Q19.3 4.7 19.4 5.6 L19.4 10.4" />
          <Path {...s} d="M8.4 19.4 L6.6 19.4 Q4.8 19.3 4.8 17.6 L4.9 12.2 Q5 10.4 6.8 10.4 L21.2 10.4 Q23 10.5 23.1 12.2 L23.1 17.6 Q23 19.4 21.3 19.4 L19.6 19.4" />
          <Path {...s} d="M8.6 15.6 L19.4 15.6 L19.4 23.2 L8.6 23.2 Z" />
        </>
      );
    case 'pencil':
      return (
        <>
          <Path {...s} d="M18.2 5.6 L22.4 9.8 L10.6 21.6 L5.4 22.6 L6.4 17.4 Z" />
          <Path {...s} d="M15.8 8 L20 12.2" />
        </>
      );
    case 'clock':
      return (
        <>
          <Path {...s} d="M14 4.8 C19.2 4.7 23.3 8.9 23.2 14 C23.1 19.2 19 23.3 13.9 23.2 C8.8 23.1 4.8 19 4.8 13.9 C4.9 8.8 8.9 4.9 14 4.8 Z" />
          <Path {...s} d="M14 8.6 L14 14.2 L17.6 16.4" />
        </>
      );
    case 'moon':
      return <Path {...s} d="M18.6 4.9 C13.4 5.2 9.4 9.6 9.6 14.8 C9.8 19.7 13.9 23.6 18.8 23.4 C20.4 23.4 21.8 22.9 23 22.2 C17 22.4 13.8 18 13.9 13.6 C14 9.6 16.2 6.6 18.6 4.9 Z" />;
    case 'ring':
      return <Path {...s} d="M14 7.4 C17.7 7.3 20.7 10.3 20.6 14 C20.5 17.7 17.6 20.7 13.9 20.6 C10.3 20.5 7.4 17.6 7.4 13.9 C7.5 10.3 10.4 7.5 14 7.4 Z" />;
    case 'table':
      return (
        <>
          <Path {...s} d="M6.6 5.4 Q4.6 5.5 4.6 7.5 L4.7 20.6 Q4.8 22.6 6.7 22.6 L21.3 22.6 Q23.4 22.5 23.4 20.5 L23.4 7.4 Q23.3 5.4 21.3 5.4 Z" />
          <Path {...s} d="M4.7 11.2 Q14 10.9 23.4 11.2 M4.7 16.9 Q14 16.6 23.4 16.9 M11.2 5.5 Q11 14 11.2 22.5" />
        </>
      );
  }
}
