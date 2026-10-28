import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts, radius, tabular, Theme } from '../theme';
import { useApp } from '../state';
import { addAttack, AttackFields, deleteAttack, DoseFields, getAttack, saveAttack } from '../db';
import { atTime, dayKey, dayLabel, timeLabel, HOUR_MS } from '../days';
import { durationMs, formatDuration } from '../insights';
import { BACKFILL_HOURS } from '../rules';
import { CUSTOM_PREFIX, IMPACTS, medKindShort, noun, RELIEFS, SEVERITIES, SIDES, SYMPTOMS, TRIGGERS } from '../labels';
import type { Impact, Relief, Severity, Side } from '../model';
import { maybeRequestReview } from '../reviews';
import { Button, Card, Chip, Chips, Header, IconButton, Label, Segment, TextLink } from '../ui/Kit';
import PainScale from '../ui/PainScale';
import When from '../ui/When';
import { MedEditor } from './Meds';

type DoseDraft = DoseFields & { key: string };
type Draft = AttackFields & { doses: DoseDraft[] };

let keySeq = 0;
const newKey = () => `d${++keySeq}`;

const YES_NO: { id: 'yes' | 'no'; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
];

/** Anything beyond the start, end and severity. */
function hasDetails(d: Draft): boolean {
  return (
    d.pain != null ||
    d.locations.length > 0 ||
    d.aura != null ||
    d.symptoms.length > 0 ||
    d.triggers.length > 0 ||
    d.doses.length > 0 ||
    d.impact != null ||
    d.migraine != null ||
    d.note.trim().length > 0
  );
}

function blankDraft(day: string | undefined, now: number): Draft {
  const today = dayKey(now);
  // Today (the evening question): two hours ago. Another day: 9 am that day.
  const start = !day || day === today ? Math.max(atTime(today, 0), now - 2 * HOUR_MS) : atTime(day, 9);
  return {
    startedAt: start - (start % (5 * 60_000)),
    endedAt: null,
    severity: null,
    pain: null,
    locations: [],
    aura: null,
    symptoms: [],
    triggers: [],
    impact: null,
    migraine: null,
    note: '',
    detailsAt: null,
    backfilled: true,
    doses: [],
  };
}

/**
 * Details, all optional and tap-first, for an attack already saved (saved
 * as you go) or for a past one entered from memory (saved with Save).
 */
export default function DetailsScreen({ attackId, day, onClose }: { attackId: number | null; day?: string; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { refresh, meds, settings, updateSettings, say } = useApp();
  const track = settings.track;
  const isNew = attackId == null;
  const [draft, setDraft] = useState<Draft | null>(isNew ? blankDraft(day, Date.now()) : null);
  // A new past attack needs a length (or "Still going") before it can be saved.
  const [lengthSet, setLengthSet] = useState(!isNew);
  const [medSheet, setMedSheet] = useState(false);
  const [customText, setCustomText] = useState('');
  const [now] = useState(Date.now());
  const latest = useRef<Draft | null>(draft);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touched = useRef(false);
  // A medication added to the list from here goes straight onto this attack once the list has it.
  const [pendingMed, setPendingMed] = useState<number | null>(null);

  useEffect(() => {
    if (isNew) return;
    getAttack(attackId).then((a) => {
      if (!a) return onClose();
      const d: Draft = { ...a, doses: a.doses.map((x) => ({ ...x, key: newKey() })) };
      latest.current = d;
      setDraft(d);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackId]);

  useEffect(() => {
    if (pendingMed == null) return;
    const m = meds.find((x) => x.id === pendingMed);
    const d = latest.current;
    if (!m || !d) return;
    setPendingMed(null);
    update({ doses: [...d.doses, { key: newKey(), medId: m.id, medName: m.name, medKind: m.kind, takenAt: doseTime(d), amount: '', relief: null }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meds, pendingMed]);

  const persist = async () => {
    const d = latest.current;
    if (!d || isNew || attackId == null) return;
    const fields: AttackFields = { ...d, detailsAt: d.detailsAt ?? (hasDetails(d) ? Date.now() : null) };
    await saveAttack(attackId, fields, d.doses);
    await refresh();
  };

  const update = (patch: Partial<Draft>) => {
    setDraft((cur) => {
      if (!cur) return cur;
      const next = { ...cur, ...patch };
      latest.current = next;
      return next;
    });
    touched.current = true;
    if (!isNew) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => persist().catch(() => {}), 350);
    }
  };

  // Leaving saves what is pending; a rating prompt may follow the first closed attack with details.
  const close = async () => {
    if (isNew) {
      if (touched.current) {
        Alert.alert(`Save this ${noun(track)}?`, undefined, [
          { text: 'Discard', style: 'destructive', onPress: onClose },
          { text: 'Save', onPress: () => saveNew() },
        ]);
        return;
      }
      return onClose();
    }
    if (timer.current) clearTimeout(timer.current);
    await persist().catch(() => {});
    const d = latest.current;
    onClose();
    if (d && d.endedAt != null && hasDetails(d)) maybeRequestReview('firstDetails');
  };

  const saveNew = async () => {
    const d = latest.current;
    if (!d || !lengthSet) return;
    await addAttack({ ...d, detailsAt: hasDetails(d) ? Date.now() : null }, d.doses);
    await refresh();
    say('Saved.');
    onClose();
  };

  const remove = () =>
    Alert.alert(`Delete this ${noun(track)}?`, 'It comes off this iPhone and cannot be brought back.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (timer.current) clearTimeout(timer.current);
          if (attackId != null) await deleteAttack(attackId);
          await refresh();
          onClose();
        },
      },
    ]);

  if (!draft) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const toggle = <T extends string>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const setSide = (s: Side) => {
    let next = toggle(draft.locations, s);
    // "Both sides" and one side are not both true.
    if (s === 'both' && next.includes('both')) next = next.filter((x) => x !== 'left' && x !== 'right');
    if ((s === 'left' || s === 'right') && next.includes(s)) next = next.filter((x) => x !== 'both');
    update({ locations: next });
  };

  const setStart = (ms: number) => {
    const startedAt = Math.min(ms, Date.now());
    const endedAt = draft.endedAt != null && draft.endedAt < startedAt ? startedAt : draft.endedAt;
    update({ startedAt, endedAt });
  };
  const setLength = (h: number | 'going') => {
    setLengthSet(true);
    if (h === 'going') return update({ endedAt: null });
    update({ endedAt: Math.min(draft.startedAt + h * HOUR_MS, Date.now()) });
  };

  const customs = [...new Set([...settings.customTriggers.map((t) => CUSTOM_PREFIX + t), ...draft.triggers.filter((t) => t.startsWith(CUSTOM_PREFIX))])];
  const addCustom = () => {
    const t = customText.trim().slice(0, 40);
    if (!t) return;
    if (!settings.customTriggers.includes(t)) updateSettings({ customTriggers: [...settings.customTriggers, t] });
    if (!draft.triggers.includes(CUSTOM_PREFIX + t)) update({ triggers: [...draft.triggers, CUSTOM_PREFIX + t] });
    setCustomText('');
  };

  const addDose = (medId: number) => {
    const m = meds.find((x) => x.id === medId);
    if (!m) return;
    update({ doses: [...draft.doses, { key: newKey(), medId: m.id, medName: m.name, medKind: m.kind, takenAt: doseTime(draft), amount: '', relief: null }] });
  };
  const setDose = (key: string, patch: Partial<DoseDraft>) => update({ doses: draft.doses.map((d) => (d.key === key ? { ...d, ...patch } : d)) });
  const removeDose = (key: string) => update({ doses: draft.doses.filter((d) => d.key !== key) });

  const open = draft.endedAt == null;
  const length = durationMs(draft, Date.now());
  const pickable = [...meds].sort((a, b) => Number(a.kind === 'preventive') - Number(b.kind === 'preventive'));
  const input = [styles.input, { color: theme.ink, backgroundColor: theme.raised, borderColor: theme.rule }];
  const kb = theme.isDark ? ('dark' as const) : ('light' as const);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header
        theme={theme}
        title={isNew ? `A past ${noun(track)}` : 'Details'}
        back={{ label: isNew ? 'Cancel' : 'Done', onPress: close }}
        right={isNew ? <TextLink theme={theme} label="Save" onPress={saveNew} color={lengthSet ? theme.ink : theme.inkFaint} /> : undefined}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.lead, { color: theme.inkSoft }]}>
          {isNew ? 'Everything here is optional except how long it lasted.' : `Saved as you go. Everything is optional; add what you remember.`}
        </Text>

        <Block theme={theme} title="When">
          <When theme={theme} label="Started" value={draft.startedAt} max={Date.now()} onChange={setStart} />
          {!isNew && open ? (
            <View style={styles.going}>
              <Text style={[styles.goingText, { color: theme.ink }, tabular]}>{`Still going, ${formatDuration(length)} so far`}</Text>
              <Button theme={theme} compact label="Over now" onPress={() => update({ endedAt: Date.now() })} />
            </View>
          ) : null}
          {!open ? <When theme={theme} label="Ended" value={draft.endedAt ?? now} min={draft.startedAt} max={Date.now()} onChange={(ms) => update({ endedAt: Math.max(ms, draft.startedAt) })} /> : null}
          {isNew || !open ? (
            <>
              <Label theme={theme} style={{ marginTop: 8 }}>
                {isNew && !lengthSet ? 'How long did it last?' : `Length: ${open ? 'still going' : formatDuration(length)}`}
              </Label>
              <Chips>
                {BACKFILL_HOURS.map((h) => (
                  <Chip
                    key={h}
                    theme={theme}
                    label={h < 24 ? `${h} h` : `${h / 24} ${h === 24 ? 'day' : 'days'}`}
                    on={lengthSet && !open && length === h * HOUR_MS}
                    onPress={() => setLength(h)}
                  />
                ))}
                {isNew && Date.now() - draft.startedAt < 72 * HOUR_MS ? <Chip theme={theme} label="Still going" on={lengthSet && open} onPress={() => setLength('going')} /> : null}
              </Chips>
            </>
          ) : null}
        </Block>

        <Block theme={theme} title="How bad">
          <Segment<Severity> theme={theme} label="Severity" options={SEVERITIES} value={draft.severity} onChange={(severity) => update({ severity })} />
          <Label theme={theme} style={{ marginTop: 14 }}>
            Pain, 0 to 10
          </Label>
          <PainScale theme={theme} value={draft.pain} onChange={(pain) => update({ pain })} />
          <Label theme={theme} style={{ marginTop: 14 }}>
            Was it a migraine?
          </Label>
          <Segment
            theme={theme}
            label="Was it a migraine"
            options={YES_NO}
            value={draft.migraine == null ? null : draft.migraine ? 'yes' : 'no'}
            onChange={(v) => update({ migraine: v == null ? null : v === 'yes' })}
          />
          <Text style={[styles.hint, { color: theme.inkFaint }]}>Left empty, moderate and severe ones count as migraine days.</Text>
        </Block>

        <Block theme={theme} title="Where">
          <Chips>
            {SIDES.map((s) => (
              <Chip key={s.id} theme={theme} label={s.label} on={draft.locations.includes(s.id)} onPress={() => setSide(s.id)} />
            ))}
          </Chips>
          <Label theme={theme} style={{ marginTop: 14 }}>
            Aura
          </Label>
          <Segment
            theme={theme}
            label="Aura"
            options={YES_NO}
            value={draft.aura == null ? null : draft.aura ? 'yes' : 'no'}
            onChange={(v) => update({ aura: v == null ? null : v === 'yes' })}
          />
        </Block>

        <Block theme={theme} title="Symptoms">
          <Chips>
            {SYMPTOMS.map((s) => (
              <Chip key={s.id} theme={theme} label={s.label} on={draft.symptoms.includes(s.id)} onPress={() => update({ symptoms: toggle(draft.symptoms, s.id) })} />
            ))}
          </Chips>
        </Block>

        <Block theme={theme} title="Triggers you noticed">
          <Chips>
            {TRIGGERS.map((t) => (
              <Chip key={t.id} theme={theme} label={t.label} on={draft.triggers.includes(t.id)} onPress={() => update({ triggers: toggle(draft.triggers, t.id) })} />
            ))}
            {customs.map((t) => (
              <Chip key={t} theme={theme} label={t.slice(CUSTOM_PREFIX.length)} on={draft.triggers.includes(t)} onPress={() => update({ triggers: toggle(draft.triggers, t) })} />
            ))}
          </Chips>
          <View style={styles.customRow}>
            <TextInput
              value={customText}
              onChangeText={setCustomText}
              onSubmitEditing={addCustom}
              placeholder="Your own trigger"
              placeholderTextColor={theme.inkFaint}
              style={[input, { flex: 1 }]}
              keyboardAppearance={kb}
              returnKeyType="done"
              maxLength={40}
              accessibilityLabel="Your own trigger"
            />
            <Button theme={theme} compact label="Add" onPress={addCustom} disabled={!customText.trim()} />
          </View>
        </Block>

        <Block theme={theme} title="Medication taken">
          {draft.doses.map((d) => (
            <Card key={d.key} theme={theme} style={[styles.dose, { backgroundColor: theme.bg }]}>
              <View style={styles.doseTop}>
                <Text style={[styles.doseName, { color: theme.ink }]} numberOfLines={2}>
                  {d.medName}
                  <Text style={{ color: theme.inkFaint, fontFamily: undefined, fontSize: 15 }}>{`  ${medKindShort(d.medKind)}`}</Text>
                </Text>
                <IconButton theme={theme} glyph="trash" label={`Remove ${d.medName}`} color={theme.inkSoft} onPress={() => removeDose(d.key)} />
              </View>
              <When theme={theme} label="Taken" value={d.takenAt} max={Date.now()} onChange={(ms) => setDose(d.key, { takenAt: ms })} />
              <TextInput
                value={d.amount}
                onChangeText={(amount) => setDose(d.key, { amount })}
                placeholder="Dose, as you would write it"
                placeholderTextColor={theme.inkFaint}
                style={input}
                keyboardAppearance={kb}
                maxLength={40}
                accessibilityLabel={`Dose of ${d.medName}`}
              />
              <Label theme={theme} style={{ marginTop: 6 }}>
                Relief
              </Label>
              <Segment<Relief> theme={theme} label="Relief" options={RELIEFS} value={d.relief} onChange={(relief) => setDose(d.key, { relief })} />
            </Card>
          ))}
          {pickable.length > 0 ? (
            <>
              <Text style={[styles.hint, { color: theme.inkFaint, marginTop: draft.doses.length > 0 ? 8 : 0 }]}>Tap one to add it.</Text>
              <Chips>
                {pickable.map((m) => (
                  <Chip key={m.id} theme={theme} label={m.name} on={false} onPress={() => addDose(m.id)} hint={`Adds a dose of ${m.name}`} />
                ))}
              </Chips>
            </>
          ) : (
            <Text style={[styles.hint, { color: theme.inkFaint }]}>Your list is empty. Add what you take once, then it is one tap here.</Text>
          )}
          <TextLink theme={theme} label="Add a medication to my list" onPress={() => setMedSheet(true)} />
        </Block>

        <Block theme={theme} title="Did it stop you working or studying?">
          <Segment<Impact> theme={theme} label="Did it stop you working or studying" options={IMPACTS} value={draft.impact} onChange={(impact) => update({ impact })} />
        </Block>

        <Block theme={theme} title="Note">
          <TextInput
            value={draft.note}
            onChangeText={(note) => update({ note })}
            placeholder="Anything else"
            placeholderTextColor={theme.inkFaint}
            style={[input, styles.note]}
            keyboardAppearance={kb}
            multiline
            maxLength={2000}
            accessibilityLabel="Note"
          />
        </Block>

        {isNew ? (
          <View style={{ marginTop: 10 }}>
            <Button theme={theme} live label={lengthSet ? 'Save' : 'Choose how long it lasted'} onPress={saveNew} disabled={!lengthSet} />
          </View>
        ) : (
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={[styles.hint, { color: theme.inkFaint }]}>{`${dayLabel(dayKey(draft.startedAt))}, ${timeLabel(draft.startedAt)}`}</Text>
            <TextLink theme={theme} label={`Delete this ${noun(track)}`} color={theme.danger} onPress={remove} />
          </View>
        )}
      </ScrollView>
      <MedEditor
        theme={theme}
        med={medSheet ? 'new' : null}
        onClose={() => setMedSheet(false)}
        onSaved={setPendingMed}
      />
    </KeyboardAvoidingView>
  );
}

/** A new dose: now while the attack is going, else when it started. */
function doseTime(d: Draft): number {
  return d.endedAt == null ? Date.now() : d.startedAt;
}

/** A titled block of the details screen. */
function Block({ theme, title, children }: { theme: Theme; title: string; children: React.ReactNode }) {
  return (
    <View style={[styles.block, { borderTopColor: theme.rule }]}>
      <Text style={[styles.blockTitle, { color: theme.ink }]} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
        {title}
      </Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}


const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  lead: { fontSize: 15, lineHeight: 21, marginBottom: 6 },
  block: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, paddingBottom: 18 },
  blockTitle: { fontFamily: fonts.display, fontSize: 19, marginBottom: 10 },
  going: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 52 },
  goingText: { fontSize: 16, flexShrink: 1 },
  hint: { fontSize: 14, lineHeight: 19, marginTop: 4 },
  input: { minHeight: 48, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, fontSize: 17 },
  note: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 },
  dose: { gap: 6, padding: 12 },
  doseTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doseName: { flex: 1, fontFamily: fonts.display, fontSize: 18 },
});
