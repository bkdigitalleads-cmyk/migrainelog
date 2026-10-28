import Constants from 'expo-constants';
import React, { useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts, radius } from '../theme';
import { useApp, EVENING_KEY } from '../state';
import { deleteAllData, kvSet } from '../db';
import { restorePurchases, isBillingAvailable } from '../purchases';
import { cancelTrialReminder } from '../reminder';
import { gate } from '../gates';
import { shareCsv } from '../exporting';
import { TRACKS } from '../labels';
import { PRIVACY_URL, SUPPORT_EMAIL, SUPPORT_URL, TERMS_URL } from '../links';
import { Button, Chip, Chips, Header, Press } from '../ui/Kit';
import { Line, PickLine, Section, SwitchLine } from '../ui/Lines';
import Glyph from '../ui/Glyph';

/** The medical line, the same here, in the App Review note and on the website. */
export const ABOUT_LINE =
  'Migraine Log is a personal log. It does not diagnose, treat, or give medical or dosing advice, and it does not predict attacks. Talk to your doctor about your headaches and your medications.';

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, isPro, setIsPro, showPaywall, refresh, attacks, testBuild, actFree, setActFree, answerEvening, say } = useApp();
  const [busy, setBusy] = useState(false);
  const [newTrigger, setNewTrigger] = useState('');
  // Test builds only: seven taps on the version line open the Testing tools.
  const [testing, setTesting] = useState(false);
  const taps = useRef<{ count: number; at: number }>({ count: 0, at: 0 });
  const onVersionTap = () => {
    if (!testBuild) return;
    const now = Date.now();
    taps.current = { count: now - taps.current.at < 1500 ? taps.current.count + 1 : 1, at: now };
    if (taps.current.count >= 7) setTesting(true);
  };

  const onRestore = async () => {
    if (!isBillingAvailable()) {
      Alert.alert('The App Store is not answering', 'Try again in a minute.');
      return;
    }
    setBusy(true);
    const res = await restorePurchases();
    setBusy(false);
    if (res.ok) {
      cancelTrialReminder();
      setIsPro(res.isPro);
      Alert.alert(res.isPro ? 'Pro is back on' : 'Nothing to restore', res.isPro ? 'Everything is open again.' : 'This Apple ID has no Migraine Log Pro purchase.');
    } else {
      Alert.alert('Restore did not work', res.error ?? 'Try once more.');
    }
  };

  const onCsv = async () => {
    const locked = gate('csv', isPro);
    if (locked) return showPaywall(locked);
    try {
      await shareCsv(attacks);
    } catch {
      Alert.alert('That did not work', 'Try once more.');
    }
  };

  const onDeleteAll = () =>
    Alert.alert('Delete everything you logged?', 'Every attack, medication and headache-free day comes off this iPhone and cannot be brought back.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete everything',
        style: 'destructive',
        onPress: async () => {
          await deleteAllData();
          await refresh();
        },
      },
    ]);

  const addTrigger = () => {
    const t = newTrigger.trim().slice(0, 40);
    if (!t || settings.customTriggers.includes(t)) return setNewTrigger('');
    updateSettings({ customTriggers: [...settings.customTriggers, t] });
    setNewTrigger('');
  };

  return (
    <View style={{ flex: 1 }}>
      <Header theme={theme} title="Settings" back={{ label: 'Log', onPress: onBack }} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 48 }} keyboardShouldPersistTaps="handled">
        {isPro ? (
          <Section theme={theme} first title="Pro is on" note="The monthly numbers, the report to share and print, your whole history and the CSV." />
        ) : (
          <Press
            onPress={() => showPaywall('pro')}
            accessibilityRole="button"
            style={[styles.band, { backgroundColor: theme.surface, borderColor: theme.rule }]}
            pressedStyle={{ backgroundColor: theme.raised }}
          >
            <Text style={[styles.bandText, { color: theme.ink }]}>
              <Text style={{ fontFamily: fonts.display }}>Migraine Log Pro </Text>
              adds the monthly numbers, the doctor report to share and print, and your whole history.
            </Text>
            <Glyph name="chevron" size={20} color={theme.ink} />
          </Press>
        )}

        <Section theme={theme} title="What you mostly track" note="This changes words only, like Attack or Headache.">
          {TRACKS.map((t) => (
            <PickLine key={t.id} theme={theme} radio label={t.label} sub={t.sub} on={settings.track === t.id} onPress={() => updateSettings({ track: t.id })} />
          ))}
        </Section>

        <Section theme={theme} title="Evening question">
          <SwitchLine
            theme={theme}
            label="Ask “Headache today?”"
            sub="On Home after 6 pm, when nothing is logged for the day. One tap marks a headache-free day."
            value={settings.eveningCheck}
            onChange={(v) => updateSettings({ eveningCheck: v })}
          />
        </Section>

        <Section theme={theme} title="Light">
          <SwitchLine
            theme={theme}
            label="Follow the phone’s light mode"
            sub="Off, the app stays dark. On, it turns light when the phone is light, but never during an attack."
            value={settings.followSystem}
            onChange={(v) => updateSettings({ followSystem: v })}
          />
        </Section>

        <Section theme={theme} title="Your own triggers" note="They show next to the usual ones when you add details.">
          <View style={styles.triggers}>
            {settings.customTriggers.length > 0 ? (
              <Chips>
                {settings.customTriggers.map((t) => (
                  <Chip
                    key={t}
                    theme={theme}
                    label={t}
                    on
                    hint="Tap to remove from the list"
                    onPress={() => updateSettings({ customTriggers: settings.customTriggers.filter((x) => x !== t) })}
                  />
                ))}
              </Chips>
            ) : null}
            <View style={styles.addRow}>
              <TextInput
                value={newTrigger}
                onChangeText={setNewTrigger}
                onSubmitEditing={addTrigger}
                placeholder="Add a trigger"
                placeholderTextColor={theme.inkFaint}
                style={[styles.input, { color: theme.ink, backgroundColor: theme.raised, borderColor: theme.rule }]}
                keyboardAppearance={theme.isDark ? 'dark' : 'light'}
                returnKeyType="done"
                maxLength={40}
                accessibilityLabel="Add a trigger"
              />
              <Button theme={theme} compact label="Add" onPress={addTrigger} disabled={!newTrigger.trim()} />
            </View>
          </View>
        </Section>

        <Section theme={theme} title="Your data" note="Everything stays on this iPhone. No account, nothing uploaded, works offline.">
          <Line theme={theme} label="All attacks as a spreadsheet (CSV)" sub={isPro ? undefined : 'Pro'} onPress={onCsv} />
        </Section>

        <Section theme={theme} title="Purchases and help">
          <Line theme={theme} label={busy ? 'Restoring' : 'Restore purchases'} onPress={busy ? undefined : onRestore} />
          <Line theme={theme} label="Terms of Use (EULA)" onPress={() => Linking.openURL(TERMS_URL)} />
          <Line theme={theme} label="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Line theme={theme} label="Help" onPress={() => Linking.openURL(SUPPORT_URL)} />
          <Line theme={theme} label="Email support" sub={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Migraine%20Log`)} />
        </Section>

        <Section theme={theme} title="About" note={ABOUT_LINE} />

        <Section theme={theme} title="Start over">
          <Line theme={theme} label="Delete everything I logged" danger onPress={onDeleteAll} />
        </Section>

        {testBuild && (testing || actFree) && (
          <Section theme={theme} title="Testing" note="Only in test builds. The App Store version never shows this.">
            <SwitchLine theme={theme} label="Act as a free user" sub="Pro is ignored on this phone until this is off." value={actFree} onChange={(v) => setActFree(v)} />
            <Line
              theme={theme}
              label="Ask the evening question again"
              onPress={async () => {
                await kvSet(EVENING_KEY, '');
                await answerEvening('');
                say('The evening question will show again after 6 pm.');
              }}
            />
          </Section>
        )}

        <Text style={[styles.version, { color: theme.inkFaint }]} onPress={onVersionTap} suppressHighlighting>
          Migraine Log {Constants.expoConfig?.version ?? ''}. Made in NYC.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { marginTop: 10, marginHorizontal: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card },
  bandText: { flex: 1, fontSize: 16, lineHeight: 22 },
  triggers: { paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, minHeight: 48, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, fontSize: 17 },
  version: { textAlign: 'center', marginTop: 32, fontSize: 13, paddingVertical: 8 },
});
