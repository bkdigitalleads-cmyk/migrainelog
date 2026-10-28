import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, radius, space, type } from '../theme';
import { IconButton } from './Kit';
import { MODAL_ANIMATION } from './motion';

/**
 * A sheet that rises from the bottom over a dimmed room. It fades in
 * (reduced motion), its own color is the room's surface, and the scrim
 * only ever darkens: no white flash, in either theme.
 */
export function Sheet({
  theme,
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  theme: Theme;
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType={MODAL_ANIMATION} onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Pressable style={[styles.fill, { backgroundColor: theme.scrim }]} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.edge, paddingBottom: Math.max(insets.bottom, space.l) }]} accessibilityViewIsModal>
          <View style={styles.top}>
            <Text style={[type.heading, styles.title, { color: theme.ink }]} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
              {title}
            </Text>
            <IconButton theme={theme} glyph="close" label="Close" onPress={onClose} color={theme.inkSoft} />
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: { maxHeight: '88%', borderTopLeftRadius: radius.large, borderTopRightRadius: radius.large, borderWidth: 1, borderBottomWidth: 0 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.l, paddingRight: space.s, paddingTop: space.s, minHeight: 56 },
  title: { flexShrink: 1 },
  body: { paddingHorizontal: space.l, paddingBottom: space.m, gap: space.l },
  footer: { paddingHorizontal: space.l, paddingTop: space.s, gap: space.s },
});
