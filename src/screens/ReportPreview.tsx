import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts, radius } from '../theme';
import { REPORT_FOOTER, rangeText, ReportModel } from '../report';
import { medKindLabel } from '../labels';
import { shortDate } from '../days';
import { formatDuration } from '../insights';
import { Button, IconButton } from '../ui/Kit';
import { MODAL_ANIMATION } from '../ui/motion';

/**
 * The report as its first pages look, drawn from the same model as the
 * PDF. For free users it carries a large SAMPLE watermark and has no share
 * or print: the one button opens the paywall (same approach as Odo). The
 * page is dimmed paper, never a white flash in the dark room.
 */
const PAGE = { bg: '#D9D4CC', ink: '#232026', soft: '#5C5862', rule: '#B9B3AC', shade: '#C4BCC3', shadeLight: '#CEC8C9' };

export default function ReportPreview({
  visible,
  model,
  sample,
  onClose,
  onShare,
  onPrint,
  onLocked,
}: {
  visible: boolean;
  model: ReportModel | null;
  sample: boolean;
  onClose: () => void;
  onShare: () => void;
  onPrint: () => void;
  /** Free users: the parent closes this and opens the paywall. */
  onLocked: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (!model) return null;
  const t = model.totals;
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

  return (
    <Modal visible={visible} animationType={MODAL_ANIMATION} presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.rule }]}>
          <Text style={[styles.headerTitle, { color: theme.ink }]} accessibilityRole="header">
            {sample ? 'Report preview' : 'Your report'}
          </Text>
          <IconButton theme={theme} glyph="close" label="Close the preview" onPress={onClose} color={theme.inkSoft} />
        </View>
        {sample ? <Text style={[styles.note, { color: theme.inkSoft }]}>Your own numbers, laid out the way your doctor sees them. Pro shares and prints the clean copy.</Text> : null}

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.page}>
            <Text style={styles.h1}>Headache diary</Text>
            <Text style={styles.meta}>{`Patient: ${model.patient || '____________'}   Dates: ${rangeText(model)}`}</Text>
            <View style={styles.boxes}>
              <Box n={t.headacheDays} l={`Headache days${model.per30 ? ` (${model.per30.headache} per 30 days)` : ''}`} />
              <Box n={t.migraineDays} l={`Migraine days${model.per30 ? ` (${model.per30.migraine} per 30 days)` : ''}`} />
              <Box n={t.longAttacks} l={`${cap(model.noun)}s of 4 h or more`} />
              <Box n={t.acuteMedDays} l="Days with acute medication" />
            </View>
            <Text style={styles.small}>
              {`${t.loggedDays} of ${t.dayCount} days have an entry. ${t.attackCount} ${t.attackCount === 1 ? model.noun : `${model.noun}s`}${t.averageMs != null ? `, average ${formatDuration(t.averageMs)}` : ''}.`}
            </Text>

            <Text style={styles.h2}>By month</Text>
            <Row cells={['Month', 'Headache', 'Migraine', '4 h+', 'Med days']} head />
            {model.months.map((mo) => (
              <Row key={mo.label} cells={[`${mo.label.slice(0, 3)}${mo.partial ? ' (part)' : ''}`, mo.headache, mo.migraine, mo.longAttacks, mo.acuteMedDays]} />
            ))}

            <Text style={styles.h2}>Acute medication days by type</Text>
            {model.kinds.length === 0 ? (
              <Text style={styles.small}>None logged in this period.</Text>
            ) : (
              <>
                <Row cells={['Month', ...model.kinds.map((k) => medKindLabel(k).split(' ')[0])]} head />
                {model.months.map((mo) => (
                  <Row key={mo.label} cells={[mo.label.slice(0, 3), ...model.kinds.map((k) => mo.medDays[k] ?? 0)]} />
                ))}
              </>
            )}

            <Text style={styles.h2}>Preventive treatments tried</Text>
            {model.preventives.length === 0 ? (
              <Text style={styles.small}>None listed.</Text>
            ) : (
              model.preventives.map((p) => (
                <Text key={p.name + p.started} style={styles.line}>
                  <Text style={{ fontWeight: '700' }}>{p.name}</Text>
                  {`  ${p.started}${p.stopped ? ` to ${p.stopped}` : ''}${p.length ? `, ${p.length}` : ''}${p.reason ? `. Stopped: ${p.reason.toLowerCase()}` : ''}`}
                </Text>
              ))
            )}

            {model.triggers.length > 0 ? (
              <>
                <Text style={styles.h2}>Most common triggers</Text>
                <Text style={styles.line}>{model.triggers.map((x) => `${x.label} (${x.count})`).join(', ')}</Text>
              </>
            ) : null}

            <Text style={[styles.h2, { marginTop: 22 }]}>{`Then: a day-by-day calendar and every ${model.noun} (${model.attacks.length}).`}</Text>
            {model.attacks.slice(-3).map((a) => (
              <Text key={a.id} style={styles.line}>{`${a.date}, ${a.start}: ${a.length}${a.severity ? `, ${a.severity.toLowerCase()}` : ''}${a.meds ? `. ${a.meds}` : ''}`}</Text>
            ))}
            <Text style={styles.footer}>{REPORT_FOOTER}</Text>
            <Text style={styles.footerSmall}>{`Made ${shortDate(model.generated, true)}`}</Text>

            {sample ? (
              <View style={styles.watermarkLayer} pointerEvents="none">
                {[0, 1, 2].map((i) => (
                  <Text key={i} style={styles.watermark} accessibilityElementsHidden importantForAccessibility="no">
                    SAMPLE
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={[styles.bar, { borderTopColor: theme.rule, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {sample ? (
            <Button theme={theme} live label="Share and print it with Pro" onPress={onLocked} />
          ) : (
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Button theme={theme} live glyph="share" label="Share PDF" onPress={onShare} />
              </View>
              <View style={{ flex: 1 }}>
                <Button theme={theme} glyph="print" label="Print" onPress={onPrint} />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Box({ n, l }: { n: number; l: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.boxN}>{n}</Text>
      <Text style={styles.boxL}>{l}</Text>
    </View>
  );
}

function Row({ cells, head = false }: { cells: (string | number)[]; head?: boolean }) {
  return (
    <View style={[styles.tr, head && styles.trHead]}>
      {cells.map((c, i) => (
        <Text key={i} style={[styles.td, i === 0 ? styles.tdFirst : styles.tdNum, head && styles.th]} numberOfLines={1}>
          {c}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontFamily: fonts.display, fontSize: 20 },
  note: { fontSize: 15, lineHeight: 21, textAlign: 'center', paddingHorizontal: 24, paddingTop: 12 },
  scroll: { padding: 14, paddingBottom: 30 },
  page: { backgroundColor: PAGE.bg, borderRadius: radius.chip / 2, paddingHorizontal: 18, paddingVertical: 22, overflow: 'hidden' },
  h1: { fontSize: 17, fontWeight: '700', color: PAGE.ink },
  meta: { fontSize: 10, color: PAGE.soft, marginTop: 2 },
  boxes: { flexDirection: 'row', gap: 6, marginTop: 12 },
  box: { flex: 1, borderWidth: 1, borderColor: PAGE.rule, borderRadius: 5, padding: 6 },
  boxN: { fontSize: 20, fontWeight: '700', color: PAGE.ink, fontVariant: ['tabular-nums'] },
  boxL: { fontSize: 8, lineHeight: 10, color: PAGE.soft, marginTop: 2 },
  small: { fontSize: 9, lineHeight: 13, color: PAGE.soft, marginTop: 6 },
  h2: { fontSize: 11, fontWeight: '700', color: PAGE.ink, marginTop: 14, marginBottom: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PAGE.rule, paddingVertical: 3 },
  trHead: { borderBottomColor: PAGE.soft },
  td: { fontSize: 9.5, color: PAGE.ink, fontVariant: ['tabular-nums'] },
  tdFirst: { flex: 1.6 },
  tdNum: { flex: 1, textAlign: 'right' },
  th: { color: PAGE.soft, fontWeight: '600', fontSize: 8.5 },
  line: { fontSize: 9.5, lineHeight: 14, color: PAGE.ink, marginTop: 2 },
  footer: { fontSize: 8.5, color: PAGE.soft, textAlign: 'center', marginTop: 20 },
  footerSmall: { fontSize: 8, color: PAGE.soft, textAlign: 'center', marginTop: 2 },
  watermarkLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'space-around' },
  watermark: { fontFamily: fonts.display, fontSize: 78, letterSpacing: 6, color: 'rgba(35, 32, 38, 0.13)', transform: [{ rotate: '-28deg' }] },
  bar: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  pair: { flexDirection: 'row', gap: 10 },
});
