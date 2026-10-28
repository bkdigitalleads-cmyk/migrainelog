import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, radius, Theme } from '../theme';
import { useApp } from '../state';
import { addMed, deleteMed, updateMed, MedFields } from '../db';
import { atTime, dayKey, shortDate } from '../days';
import { courseDays, courseLabel } from '../insights';
import { MED_KINDS, medKindLabel, STOP_REASONS, stopReasonLabel } from '../labels';
import type { Med, MedKind, StopReason } from '../model';
import { Button, Chip, Chips, Label, ScreenTitle, Segment } from '../ui/Kit';
import { Line, Section, SwitchLine } from '../ui/Lines';
import { Sheet } from '../ui/Sheet';
import When from '../ui/When';

/**
 * My medications: the person's own list, each with a type they pick, so
 * medication days can be counted by type. Preventives keep when they were
 * started and stopped, and why. No doses are suggested and nothing is
 * worked out from a dose: the app only counts days.
 */
export default function MedsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { meds } = useApp();
  const [editing, setEditing] = useState<Med | 'new' | null>(null);
  const acute = meds.filter((m) => m.kind !== 'preventive');
  const prev = meds.filter((m) => m.kind === 'preventive');
  const today = dayKey(Date.now());

  return (
    <View style={{ flex: 1 }}>
      <ScreenTitle theme={theme} title="Medications" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <Text style={[styles.intro, { color: theme.inkSoft }]}>
          The ones you take for an attack and the preventives you have tried. They show up when you log an attack, and the report counts the days by type.
        </Text>
        <View style={styles.add}>
          <Button theme={theme} glyph="plus" label="Add a medication" onPress={() => setEditing('new')} />
        </View>

        <Section theme={theme} title="For attacks" note={acute.length === 0 ? 'None yet.' : undefined}>
          {acute.length > 0
            ? acute.map((m) => <Line key={m.id} theme={theme} label={m.name} sub={medKindLabel(m.kind)} onPress={() => setEditing(m)} />)
            : null}
        </Section>

        <Section theme={theme} title="Preventives" note={prev.length === 0 ? 'None yet. Add the ones you take or have tried, with the dates, for the report.' : undefined}>
          {prev.length > 0
            ? prev.map((m) => <Line key={m.id} theme={theme} label={m.name} sub={preventiveLine(m, today)} onPress={() => setEditing(m)} />)
            : null}
        </Section>

        <Text style={[styles.foot, { color: theme.inkFaint }]}>
          Migraine Log is a personal log. It does not give medical or dosing advice. Talk to your doctor about your medications.
        </Text>
      </ScrollView>
      <MedEditor theme={theme} med={editing} onClose={() => setEditing(null)} />
    </View>
  );
}

/** "Since Jun 1, 2026, 21 weeks" or "Mar 2 to May 25, 2026, 12 weeks. Stopped: side effects". */
export function preventiveLine(m: Med, today: string): string {
  if (!m.startedOn) return m.stoppedOn ? `Stopped ${shortDate(m.stoppedOn, true)}` : 'Preventive';
  const len = courseLabel(courseDays(m.startedOn, m.stoppedOn, today));
  if (!m.stoppedOn) return `Since ${shortDate(m.startedOn, true)}, ${len}`;
  const reason = m.stopReason ? `. Stopped: ${stopReasonLabel(m.stopReason).toLowerCase()}` : '';
  return `${shortDate(m.startedOn, true)} to ${shortDate(m.stoppedOn, true)}, ${len}${reason}`;
}

const empty: MedFields = { name: '', kind: 'triptan', startedOn: null, stoppedOn: null, stopReason: null };

/** Add or change one medication. Used here, in onboarding and from the details of an attack. */
export function MedEditor({
  theme,
  med,
  onClose,
  onSaved,
  defaultKind,
}: {
  theme: Theme;
  med: Med | 'new' | null;
  onClose: () => void;
  onSaved?: (id: number) => void;
  defaultKind?: MedKind;
}) {
  const { refresh } = useApp();
  const [f, setF] = useState<MedFields>(empty);
  const today = dayKey(Date.now());

  useEffect(() => {
    if (med === 'new') setF({ ...empty, kind: defaultKind ?? empty.kind });
    else if (med) setF({ name: med.name, kind: med.kind, startedOn: med.startedOn, stoppedOn: med.stoppedOn, stopReason: med.stopReason });
  }, [med, defaultKind]);

  const set = (patch: Partial<MedFields>) => setF((x) => ({ ...x, ...patch }));
  const prev = f.kind === 'preventive';
  const canSave = f.name.trim().length > 0;

  const save = async () => {
    if (!canSave) return;
    const clean: MedFields = prev
      ? {
          ...f,
          stoppedOn: f.stoppedOn && f.startedOn && f.stoppedOn < f.startedOn ? f.startedOn : f.stoppedOn,
          stopReason: f.stoppedOn ? f.stopReason : null,
        }
      : { ...f, startedOn: null, stoppedOn: null, stopReason: null };
    let id: number;
    if (med === 'new') id = await addMed(clean);
    else if (med) {
      id = med.id;
      await updateMed(med.id, clean);
    } else return;
    await refresh();
    onSaved?.(id);
    onClose();
  };

  const remove = () => {
    if (!med || med === 'new') return;
    Alert.alert(`Remove ${med.name}?`, 'It comes off your list. Attacks where you logged it keep it.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteMed(med.id);
          await refresh();
          onClose();
        },
      },
    ]);
  };

  return (
    <Sheet
      theme={theme}
      visible={med != null}
      onClose={onClose}
      title={med === 'new' ? 'Add a medication' : 'Medication'}
      footer={
        <>
          <Button theme={theme} live label="Save" onPress={save} disabled={!canSave} />
          {med && med !== 'new' ? <Button theme={theme} label="Remove from my list" onPress={remove} /> : null}
        </>
      }
    >
      <View>
        <Label theme={theme}>Name</Label>
        <TextInput
          value={f.name}
          onChangeText={(name) => set({ name })}
          placeholder="As it is on the box"
          placeholderTextColor={theme.inkFaint}
          style={[styles.input, { color: theme.ink, backgroundColor: theme.raised, borderColor: theme.rule }]}
          keyboardAppearance={theme.isDark ? 'dark' : 'light'}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel="Medication name"
          maxLength={60}
        />
      </View>
      <View>
        <Label theme={theme}>Type</Label>
        <Chips>
          {MED_KINDS.map((k) => (
            <Chip key={k.id} theme={theme} label={k.label} on={f.kind === k.id} onPress={() => set({ kind: k.id })} hint={k.sub} />
          ))}
        </Chips>
        {f.kind === 'simple' ? <Text style={[styles.sub, { color: theme.inkFaint }]}>Ibuprofen, acetaminophen, aspirin, naproxen.</Text> : null}
      </View>
      {prev ? (
        <View style={{ gap: 4 }}>
          <SwitchLine
            theme={theme}
            label="I know when I started it"
            value={f.startedOn != null}
            onChange={(v) => set({ startedOn: v ? f.startedOn ?? today : null })}
          />
          {f.startedOn ? (
            <When theme={theme} label="Started" dateOnly value={atTime(f.startedOn, 12)} max={Date.now()} onChange={(ms) => set({ startedOn: dayKey(ms) })} />
          ) : null}
          <SwitchLine theme={theme} label="I have stopped it" value={f.stoppedOn != null} onChange={(v) => set({ stoppedOn: v ? f.stoppedOn ?? today : null })} />
          {f.stoppedOn ? (
            <>
              <When theme={theme} label="Stopped" dateOnly value={atTime(f.stoppedOn, 12)} max={Date.now()} onChange={(ms) => set({ stoppedOn: dayKey(ms) })} />
              <Label theme={theme} style={{ marginTop: 10 }}>
                Why it stopped
              </Label>
              <Segment<StopReason> theme={theme} label="Why it stopped" options={STOP_REASONS} value={f.stopReason} onChange={(stopReason) => set({ stopReason })} />
            </>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 16, lineHeight: 22, paddingHorizontal: 20, marginTop: 2 },
  add: { paddingHorizontal: 16, marginTop: 16 },
  foot: { fontSize: 13, lineHeight: 18, paddingHorizontal: 20, marginTop: 28 },
  input: { minHeight: 52, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, fontSize: 18 },
  sub: { fontSize: 14, marginTop: 8 },
});

