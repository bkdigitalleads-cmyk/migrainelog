import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, radius, space, tabular, type, Theme } from '../theme';
import { useApp } from '../state';
import { addAttack, AttackFields, deleteAttack, DoseFields, getAttack, saveAttack } from '../db';
import { atTime, dayKey, dayLabel, timeLabel, HOUR_MS } from '../days';
import { durationMs, formatDuration } from '../insights';
import { LENGTH_HOURS } from '../rules';
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

/** The length row: four large choices, Custom for the exact end time. */
const LENGTHS: { id: string; label: string }[] = [
  { id: '2', label: '2 h' },
  { id: '4', label: '4 h' },
  { id: '24', label: '1 day' },
  { id: 'custom', label: 'Custom' },
];

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
  // "Custom" length: the exact end time picker shows. Also on for an attack whose length is not one of the chips.
  const [custom, setCustom] = useState(false);
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
      if (a.endedAt != null && !LENGTH_HOURS.includes((a.endedAt - a.startedAt) / HOUR_MS)) setCustom(true);
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
  const setLength = (h: number | 'going' | 'custom') => {
    setLengthSet(true);
    setCustom(h === 'custom');
    if (h === 'going') return update({ endedAt: null });
    if (h === 'custom') {
      // Keep the end already there; a new one starts two hours after the start.
      if (draft.endedAt == null) update({ endedAt: Math.min(draft.startedAt + 2 * HOUR_MS, Date.now()) });
      return;
    }
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
  const input = [styles.input, { color: theme.ink, backgroundColor: theme.raised, borderColor: theme.edge }];
  const kb = theme.isDark ? ('dark' as const) : ('light' as const);
  const lengthId = !lengthSet || open ? null : custom ? 'custom' : LENGTH_HOURS.includes(length / HOUR_MS) ? String(length / HOUR_MS) : 'custom';
  const small = [type.small, { color: theme.inkFaint }];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header
        theme={theme}
        title={isNew ? `A past ${noun(track)}` : 'Details'}
        back={{ label: isNew ? 'Cancel' : 'Done', onPress: close }}
        right={isNew ? <TextLink theme={theme} label="Save" onPress={saveNew} color={lengthSet ? theme.ink : theme.inkFaint} /> : undefined}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        <Text style={[type.small, { color: theme.inkSoft }]}>
          {isNew ? 'Everything here is optional except how long it lasted.' : 'Saved as you go. Everything is optional; add what you remember.'}
        </Text>

        <Group theme={theme} title="When">
          <When theme={theme} label="Started" value={draft.startedAt} max={Date.now()} onChange={setStart} />
          {!isNew && open ? (
            <View style={styles.going}>
              <Text style={[type.body, styles.grow, { color: theme.ink }, tabular]}>{`Still going, ${formatDuration(length)} so far`}</Text>
              <Button theme={theme} compact label="Over now" onPress={() => update({ endedAt: Date.now() })} />
            </View>
          ) : (
            <View>
              <Label theme={theme}>{isNew && !lengthSet ? 'How long did it last?' : open ? 'How long: still going' : `How long: ${formatDuration(length)}`}</Label>
              <Segment
                theme={theme}
                required
                label="How long it lasted"
                options={LENGTHS}
                value={lengthId}
                onChange={(v) => v && setLength(v === 'custom' ? 'custom' : Number(v))}
              />
              {isNew && Date.now() - draft.startedAt < 72 * HOUR_MS ? (
                <View style={styles.going}>
                  <Chip theme={theme} label="Still going" on={lengthSet && open} onPress={() => setLength('going')} />
                </View>
              ) : null}
            </View>
          )}
          {!open && lengthId === 'custom' ? (
            <When theme={theme} label="Ended" value={draft.endedAt ?? now} min={draft.startedAt} max={Date.now()} onChange={(ms) => update({ endedAt: Math.max(ms, draft.startedAt) })} />
          ) : null}
        </Group>

        <Group theme={theme} title="How bad">
          <Segment<Severity> theme={theme} label="Severity" options={SEVERITIES} value={draft.severity} onChange={(severity) => update({ severity })} />
          <PainScale theme={theme} value={draft.pain} onChange={(pain) => update({ pain })} />
          <View>
            <Label theme={theme}>Was it a migraine?</Label>
            <Segment
              theme={theme}
              label="Was it a migraine"
              options={YES_NO}
              value={draft.migraine == null ? null : draft.migraine ? 'yes' : 'no'}
              onChange={(v) => update({ migraine: v == null ? null : v === 'yes' })}
            />
            <Text style={[small, styles.hint]}>Left empty, moderate and severe ones count as migraine days.</Text>
          </View>
        </Group>

        <Group theme={theme} title="What you noticed">
          <View>
            <Label theme={theme}>Where</Label>
            <Chips>
              {SIDES.map((x) => (
                <Chip key={x.id} theme={theme} label={x.label} on={draft.locations.includes(x.id)} onPress={() => setSide(x.id)} />
              ))}
            </Chips>
          </View>
          <View>
            <Label theme={theme}>Aura</Label>
            <Segment
              theme={theme}
              label="Aura"
              options={YES_NO}
              value={draft.aura == null ? null : draft.aura ? 'yes' : 'no'}
              onChange={(v) => update({ aura: v == null ? null : v === 'yes' })}
            />
          </View>
          <View>
            <Label theme={theme}>Symptoms</Label>
            <Chips>
              {SYMPTOMS.map((x) => (
                <Chip key={x.id} theme={theme} label={x.label} on={draft.symptoms.includes(x.id)} onPress={() => update({ symptoms: toggle(draft.symptoms, x.id) })} />
              ))}
            </Chips>
          </View>
          <View>
            <Label theme={theme}>Triggers</Label>
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
                style={[input, styles.grow]}
                keyboardAppearance={kb}
                returnKeyType="done"
                maxLength={40}
                accessibilityLabel="Your own trigger"
              />
              <Button theme={theme} compact label="Add" onPress={addCustom} disabled={!customText.trim()} />
            </View>
          </View>
        </Group>

        <Group theme={theme} title="Medication">
          {draft.doses.map((d, i) => (
            <View key={d.key} style={[styles.dose, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule, paddingTop: space.l }]}>
              <View style={styles.doseTop}>
                <Text style={[type.heading, styles.grow, { color: theme.ink }]} numberOfLines={2}>
                  {d.medName}
                  <Text style={[type.small, { color: theme.inkFaint }]}>{`  ${medKindShort(d.medKind)}`}</Text>
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
              <Segment<Relief> theme={theme} label="Relief" options={RELIEFS} value={d.relief} onChange={(relief) => setDose(d.key, { relief })} />
            </View>
          ))}
          <View style={draft.doses.length > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule, paddingTop: space.l } : undefined}>
            {pickable.length > 0 ? (
              <>
                <Label theme={theme}>{draft.doses.length > 0 ? 'Add another' : 'Tap one to add it'}</Label>
                <Chips>
                  {pickable.map((m) => (
                    <Chip key={m.id} theme={theme} label={m.name} sub={medKindShort(m.kind)} on={false} onPress={() => addDose(m.id)} hint={`Adds a dose of ${m.name}`} />
                  ))}
                </Chips>
              </>
            ) : (
              <Text style={small}>Your list is empty. Add what you take once, then it is one tap here.</Text>
            )}
            <TextLink theme={theme} label="Add a medication to my list" color={theme.inkSoft} onPress={() => setMedSheet(true)} />
          </View>
        </Group>

        <Group theme={theme} title="Afterwards">
          <View>
            <Label theme={theme}>Did it stop you working or studying?</Label>
            <Segment<Impact> theme={theme} label="Did it stop you working or studying" options={IMPACTS} value={draft.impact} onChange={(impact) => update({ impact })} />
          </View>
          <TextInput
            value={draft.note}
            onChangeText={(note) => update({ note })}
            placeholder="A note, if you like"
            placeholderTextColor={theme.inkFaint}
            style={[input, styles.note]}
            keyboardAppearance={kb}
            multiline
            maxLength={2000}
            accessibilityLabel="Note"
          />
        </Group>

        {isNew ? (
          <View style={styles.end}>
            <Button theme={theme} live label={lengthSet ? 'Save' : 'Choose how long it lasted'} onPress={saveNew} disabled={!lengthSet} />
          </View>
        ) : (
          <View style={[styles.end, styles.centered]}>
            <Text style={small}>{`${dayLabel(dayKey(draft.startedAt))}, ${timeLabel(draft.startedAt)}`}</Text>
            <TextLink theme={theme} label={`Delete this ${noun(track)}`} color={theme.danger} onPress={remove} />
          </View>
        )}
      </ScrollView>
      <MedEditor theme={theme} med={medSheet ? 'new' : null} onClose={() => setMedSheet(false)} onSaved={setPendingMed} />
    </KeyboardAvoidingView>
  );
}

/** A new dose: now while the attack is going, else when it started. */
function doseTime(d: Draft): number {
  return d.endedAt == null ? Date.now() : d.startedAt;
}

/** One of the five groups: a heading, then a card holding its controls with room between them. */
function Group({ theme, title, children }: { theme: Theme; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={[type.heading, styles.groupTitle, { color: theme.ink }]} accessibilityRole="header" maxFontSizeMultiplier={1.5}>
        {title}
      </Text>
      <Card theme={theme} style={styles.groupCard}>
        {children}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.l, paddingTop: space.l },
  grow: { flex: 1, minWidth: 0 },
  centered: { alignItems: 'center' },
  group: { marginTop: space.xxl },
  groupTitle: { marginBottom: space.s },
  groupCard: { gap: space.xl },
  going: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.m },
  hint: { marginTop: space.s },
  input: { minHeight: 48, borderRadius: radius.small, borderWidth: 1, paddingHorizontal: space.m, fontSize: type.body.fontSize },
  note: { minHeight: 112, paddingTop: space.m, textAlignVertical: 'top' },
  customRow: { flexDirection: 'row', gap: space.s, alignItems: 'center', marginTop: space.m },
  dose: { gap: space.m },
  doseTop: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  end: { marginTop: space.xxl },
});
