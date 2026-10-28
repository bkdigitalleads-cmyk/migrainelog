import { useColorScheme } from 'react-native';

/**
 * "A dark room." The app is opened by someone in pain, often with light
 * sensitivity, so the default is a dim charcoal room (never pure black,
 * which makes text glow and smear), soft warm text at a lower contrast
 * than white, and one warm, low-saturation amber. The amber means one
 * thing only: the live action on a screen (Attack started, Attack over,
 * Continue). Everything else is quiet.
 *
 * A light theme exists for people who ask for it (Settings, follow the
 * phone), and it never shows while an attack is open. App.tsx sets the
 * scheme through Appearance, so alerts, sheets and the keyboard match too.
 */
export interface Theme {
  /** The room: the screen background. */
  bg: string;
  /** The second tone: cards, grouped rows and sheets, one step lighter than the room. */
  surface: string;
  /** One step up: wells, unselected chips, pressed rows. */
  raised: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  /** Hairlines between rows inside a card. */
  rule: string;
  /** The 1 px edge around cards, rows and sheets, at low opacity, so surfaces read as layers. */
  edge: string;
  /** The live action. Nothing else uses it. */
  live: string;
  /** Text and glyphs on the live action. */
  onLive: string;
  /** A selected chip or segment: a lighter well with an outline, not the accent. */
  picked: string;
  pickedEdge: string;
  /** Calendar shading by the day's worst pain: logged without pain, mild, moderate, severe. */
  pain: [string, string, string, string];
  danger: string;
  /** The switch thumb: iOS draws it pure white otherwise. */
  thumb: string;
  /** Behind sheets: dims the room, never lightens it. */
  scrim: string;
  isDark: boolean;
}

export const darkTheme: Theme = {
  bg: '#1A191C',
  surface: '#222125',
  raised: '#2B2A2F',
  ink: '#D6D1C9',
  inkSoft: '#A7A29B',
  inkFaint: '#7D7973',
  rule: '#333137',
  edge: 'rgba(255, 255, 255, 0.07)',
  live: '#B98B5E',
  onLive: '#19181B',
  picked: '#3A3740',
  pickedEdge: '#8C8693',
  pain: ['#34313A', '#433B47', '#5A4655', '#74505F'],
  danger: '#CC8E84',
  thumb: '#BDB8B0',
  scrim: 'rgba(8, 8, 10, 0.62)',
  isDark: true,
};

export const lightTheme: Theme = {
  bg: '#ECE8E2',
  surface: '#F4F1EC',
  raised: '#E2DDD5',
  ink: '#2A2730',
  inkSoft: '#57535D',
  inkFaint: '#85808A',
  rule: '#D4CEC5',
  edge: 'rgba(42, 39, 48, 0.10)',
  live: '#9A6C40',
  onLive: '#F8F4EE',
  picked: '#DDD5DA',
  pickedEdge: '#6E6774',
  pain: ['#DCD6D0', '#D5C8CE', '#C2AAB8', '#A5849B'],
  danger: '#9E3F33',
  thumb: '#F4F1EC',
  scrim: 'rgba(20, 18, 22, 0.42)',
  isDark: false,
};

/** The theme for the scheme App.tsx set (dark unless the person follows a light phone). */
export function useTheme(): Theme {
  return useColorScheme() === 'light' ? lightTheme : darkTheme;
}

/**
 * Two corners, on purpose:
 *  - large: cards, sheets and the two main buttons
 *  - small: chips, segments, inputs and the plain buttons
 * (round is only for circles: icon buttons, radio dots, the slider thumb.)
 */
export const radius = { large: 20, small: 10, round: 999 };

/** The spacing scale. Every margin, padding and gap in the app is one of these. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

export const fonts = {
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  /**
   * Nunito (SIL OFL, assets/fonts/OFL-Nunito.txt): rounded ends, open
   * shapes, and figures that are all the same width, so counts and the
   * running clock never jitter. SemiBold (display) for headings, buttons
   * and the big numbers; Regular only for the running clock of an open
   * attack. Never combine with fontWeight: the weight is in the file.
   */
  display: 'Nunito-SemiBold',
  number: 'Nunito-Regular',
};

/**
 * Three type sizes, and a screen never shows more than these three:
 *  - display 30: screen titles, the big numbers, the two main buttons,
 *    onboarding headlines (Nunito SemiBold)
 *  - heading and body 17: headings and buttons in Nunito SemiBold, body
 *    text in the lighter system font
 *  - small 13: secondary lines, labels above controls, the tab bar
 * The one exception is the running clock of an open attack (60, Nunito
 * Regular). The report preview draws the printed page at its own small
 * sizes, and the paywall's plan rows and legal lines keep the engine's.
 */
export const type = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  heading: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22 },
  body: { fontSize: 17, lineHeight: 24 },
  small: { fontSize: 13, lineHeight: 18 },
};

/** Spread into a Text style for counts. Nunito's figures are already even; this keeps the system font's too. */
export const tabular = { fontVariant: ['tabular-nums' as const] };

/** The two main buttons are at least this tall. */
export const BIG_BUTTON = 96;

/** Font files for useFonts in App.tsx. */
export const FONT_FILES = {
  [fonts.display]: require('../assets/fonts/Nunito_600SemiBold.ttf'),
  [fonts.number]: require('../assets/fonts/Nunito_400Regular.ttf'),
};
