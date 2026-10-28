import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts, radius } from '../theme';
import { useApp } from '../state';
import { buildReport, REPORT_RANGES, ReportRange } from '../report';
import { gate, reportAccess } from '../gates';
import { printReport, shareCsv, shareReport } from '../exporting';
import { maybeRequestReview } from '../reviews';
import { Button, Label, ProTag, ScreenTitle, Segment } from '../ui/Kit';
import { ReportPage } from '../ui/Drawings';
import ReportPreview from './ReportPreview';

const RANGES = REPORT_RANGES.map((n) => ({ id: String(n) as `${ReportRange}`, label: `${n} days` }));

/**
 * The doctor and insurance report. Pick 30, 90 or 180 days, add a name if
 * you like, and preview it. Everyone can preview; sharing, printing and
 * the CSV are Pro.
 */
export default function ReportScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { attacks, freeDays, meds, isPro, showPaywall, settings, updateSettings } = useApp();
  const [range, setRange] = useState<`${ReportRange}`>('90');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const access = reportAccess(isPro);

  const model = useMemo(
    () => (preview || busy ? buildReport({ attacks, freeDays, meds, rangeDays: Number(range), now: Date.now(), patientName: settings.patientName, track: settings.track }) : null),
    [preview, busy, attacks, freeDays, meds, range, settings.patientName, settings.track]
  );

  const fresh = () => buildReport({ attacks, freeDays, meds, rangeDays: Number(range), now: Date.now(), patientName: settings.patientName, track: settings.track });

  const run = async (what: 'share' | 'print' | 'csv') => {
    const locked = gate(what === 'csv' ? 'csv' : 'report', isPro);
    if (locked) return showPaywall(locked);
    setBusy(true);
    try {
      if (what === 'share') await shareReport(fresh());
      else if (what === 'print') await printReport(fresh());
      else await shareCsv(attacks);
    } catch {
      Alert.alert('That did not work', 'Try once more. Nothing left the phone.');
    } finally {
      setBusy(false);
    }
  };

  const openPreview = () => {
    setPreview(true);
    maybeRequestReview('firstReport');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenTitle theme={theme} title="Report" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <ReportPage theme={theme} size={170} compact />
        </View>
        <Text style={[styles.lead, { color: theme.ink }]}>A report your doctor or insurer can read in 20 seconds.</Text>
        <Text style={[styles.sub, { color: theme.inkSoft }]}>
          Headache days and migraine days per month, attacks of 4 hours or more, medication days by type, preventives you tried and why they stopped, then a day-by-day calendar and every attack.
        </Text>

        <Label theme={theme} style={styles.label}>
          Days to include
        </Label>
        <Segment theme={theme} label="Days to include" options={RANGES} value={range} onChange={(v) => v && setRange(v)} />

        <Label theme={theme} style={styles.label}>
          Name on the report, optional
        </Label>
        <TextInput
          value={settings.patientName}
          onChangeText={(patientName) => updateSettings({ patientName })}
          placeholder="Left blank, there is a line to write it"
          placeholderTextColor={theme.inkFaint}
          style={[styles.input, { color: theme.ink, backgroundColor: theme.raised, borderColor: theme.rule }]}
          keyboardAppearance={theme.isDark ? 'dark' : 'light'}
          autoCorrect={false}
          maxLength={80}
          accessibilityLabel="Name on the report"
        />

        <View style={styles.actions}>
          <Button theme={theme} live glyph="document" label="Preview the report" onPress={openPreview} />
          <View style={styles.pair}>
            <View style={{ flex: 1 }}>
              <Button theme={theme} glyph="share" label="Share PDF" onPress={() => run('share')} disabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button theme={theme} glyph="print" label="Print" onPress={() => run('print')} disabled={busy} />
            </View>
          </View>
          <Button theme={theme} glyph="table" label="All attacks as a spreadsheet (CSV)" onPress={() => run('csv')} disabled={busy} />
          {!isPro ? (
            <View style={styles.proLine}>
              <ProTag theme={theme} />
              <Text style={[styles.proText, { color: theme.inkSoft }]}>Sharing, printing and the CSV are part of Pro. The preview is free.</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.foot, { color: theme.inkFaint }]}>
          The report says what you logged. It is not a diagnosis. Made on this iPhone; it goes only where you send it.
        </Text>
      </ScrollView>
      <ReportPreview
        visible={preview}
        model={model}
        sample={access.sample}
        onClose={() => setPreview(false)}
        onShare={() => run('share')}
        onPrint={() => run('print')}
        onLocked={() => {
          setPreview(false);
          // One sheet at a time: iOS will not show the paywall while the preview is still closing.
          setTimeout(() => showPaywall('report'), 400);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: 4 },
  lead: { fontFamily: fonts.display, fontSize: 21, lineHeight: 27, marginTop: 6 },
  sub: { fontSize: 16, lineHeight: 22, marginTop: 6 },
  label: { marginTop: 22 },
  input: { minHeight: 50, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, fontSize: 17 },
  actions: { gap: 10, marginTop: 24 },
  pair: { flexDirection: 'row', gap: 10 },
  proLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  proText: { flex: 1, fontSize: 14, lineHeight: 19 },
  foot: { fontSize: 13, lineHeight: 18, marginTop: 24 },
});
