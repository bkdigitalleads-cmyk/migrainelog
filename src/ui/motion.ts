import * as Haptics from 'expo-haptics';

/**
 * Reduced motion by default, for everyone: nothing slides, bounces or
 * pulses. Sheets and modals fade in (MODAL_ANIMATION), and the running
 * clock on an open attack moves once a minute, not every second.
 * Feedback is by touch instead.
 */
export const MODAL_ANIMATION = 'fade' as const;

/** Attack started: one firm tap you can feel without looking. */
export const startHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
/** Attack over and saves: a soft confirmation. */
export const doneHaptic = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
/** Choosing a chip, a segment or a pain score. */
export const tick = () => Haptics.selectionAsync().catch(() => {});
