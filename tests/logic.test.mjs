// Unit checks for the pure logic: attack length, headache and migraine days
// on the rolling window and on calendar months, attacks across midnight and
// daylight saving, 4-hour attack days, medication days by type and the
// watch notes, headache-free days, preventive course lengths, free versus
// Pro, the report and the CSV, the theme and evening rules, and the trial
// and plan rules. Run with `npm test` (Node 22+ strips the TypeScript types
// itself). Times are on the New York clock, which has a daylight saving
// change on Nov 1, 2026.
process.env.TZ = 'America/New_York';

import { test } from 'node:test';
import assert from 'node:assert/strict';

const D = await import('../src/days.ts');
const I = await import('../src/insights.ts');
const G = await import('../src/gates.ts');
const L = await import('../src/labels.ts');
const R = await import('../src/report.ts');
const U = await import('../src/rules.ts');
const O = await import('../src/offer.ts');

const H = 3_600_000;
/** Local time on a day: at('2026-10-27', 14, 30). */
const at = (day, h = 12, m = 0) => D.atTime(day, h, m);
// "Now" for most checks: Tuesday Oct 27, 2026, 8 pm in New York.
const NOW = at('2026-10-27', 20);

let nextId = 1;
const attack = (start, end, o = {}) => ({
  id: nextId++,
  startedAt: start,
  endedAt: end,
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
  backfilled: false,
  doses: [],
  createdAt: start,
  updatedAt: start,
  ...o,
});
const dose = (kind, takenAt, o = {}) => ({ id: nextId++, attackId: 0, medId: null, medName: o.name ?? kind, medKind: kind, takenAt, amount: o.amount ?? '', relief: o.relief ?? null });
const W30 = I.rollingWindow(NOW);

// ---------- days ----------

test('days: local keys, adding days and ranges never slip on the daylight saving change', () => {
  assert.equal(D.dayKey(at('2026-10-27', 0, 0)), '2026-10-27');
  assert.equal(D.dayKey(at('2026-10-27', 23, 59)), '2026-10-27');
  assert.equal(D.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(D.addDays('2026-11-01', 1), '2026-11-02'); // 25-hour day
  assert.equal(D.addDays('2026-03-08', 1), '2026-03-09'); // 23-hour day
  assert.equal(D.addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(D.daysBetween('2026-10-01', '2026-11-30'), 60);
  assert.deepEqual(D.dayRange('2026-10-30', '2026-11-02'), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  assert.deepEqual(D.dayRange('2026-11-02', '2026-11-01'), []);
  assert.equal(D.weekdayMon('2026-10-26'), 0); // a Monday
  assert.equal(D.weekdayMon('2026-11-01'), 6); // a Sunday
  assert.equal(D.isDayKey('2026-02-29'), false);
  assert.equal(D.isDayKey('2028-02-29'), true);
  assert.equal(D.timeLabel(at('2026-10-27', 0, 5)), '12:05 am');
  assert.equal(D.timeLabel(at('2026-10-27', 14, 41)), '2:41 pm');
  assert.deepEqual(D.shiftMonth(2026, 1, -1), { y: 2025, m: 12 });
  assert.deepEqual(D.shiftMonth(2026, 12, 1), { y: 2027, m: 1 });
});

test('days: short "when" lines for the Home summary', () => {
  assert.equal(D.hourLabel(at('2026-10-25', 15)), '3 pm');
  assert.equal(D.hourLabel(at('2026-10-25', 9, 30)), '9:30 am');
  assert.equal(D.hourLabel(at('2026-10-25', 0, 0)), '12 am');
  assert.equal(D.whenShort(at('2026-10-27', 8), NOW), 'today, 8 am');
  assert.equal(D.whenShort(at('2026-10-26', 21, 15), NOW), 'yesterday, 9:15 pm');
  assert.equal(D.whenShort(at('2026-10-25', 15), NOW), 'Sun, 3 pm');
  assert.equal(D.whenShort(at('2026-10-20', 15), NOW), 'Oct 20, 3 pm');
  assert.equal(D.whenShort(at('2025-12-30', 15), NOW), 'Dec 30, 2025, 3 pm');
});

// ---------- duration ----------

test('duration: closed attacks, open attacks run to now, never negative; the words for it', () => {
  assert.equal(I.durationMs(attack(at('2026-10-27', 9), at('2026-10-27', 13, 30)), NOW), 4.5 * H);
  assert.equal(I.durationMs(attack(at('2026-10-27', 18), null), NOW), 2 * H);
  assert.equal(I.durationMs(attack(at('2026-10-27', 18), at('2026-10-27', 17)), NOW), 0);
  // Across the fall-back night the clock repeats an hour: 10 pm to 2 am is 5 real hours.
  assert.equal(I.durationMs(attack(at('2026-10-31', 22), at('2026-11-01', 2)), NOW), 5 * H);
  assert.equal(I.formatDuration(45 * 60_000), '45 min');
  assert.equal(I.formatDuration(4 * H), '4 h');
  assert.equal(I.formatDuration(4 * H + 10 * 60_000), '4 h 10 min');
  assert.equal(I.formatDuration(27 * H), '1 day 3 h');
  assert.equal(I.formatDuration(48 * H), '2 days');
  assert.equal(I.formatDuration(-5), '0 min');
});

// ---------- days covered ----------

test('midnight: an attack across midnight covers both days; one ending at exactly midnight does not reach the next', () => {
  assert.deepEqual(I.coveredDays(attack(at('2026-10-20', 22), at('2026-10-21', 3)), NOW), ['2026-10-20', '2026-10-21']);
  assert.deepEqual(I.coveredDays(attack(at('2026-10-20', 22), at('2026-10-21', 0)), NOW), ['2026-10-20']);
  assert.deepEqual(I.coveredDays(attack(at('2026-10-20', 22), at('2026-10-22', 1)), NOW), ['2026-10-20', '2026-10-21', '2026-10-22']);
  assert.deepEqual(I.coveredDays(attack(at('2026-10-26', 23), null), NOW), ['2026-10-26', '2026-10-27']);
  // A zero-length attack still covers its day.
  assert.deepEqual(I.coveredDays(attack(at('2026-10-20', 9), at('2026-10-20', 9)), NOW), ['2026-10-20']);
});

// ---------- headache and migraine days ----------

test('migraine: moderate or severe, or the pain score when no severity; the person’s own call wins', () => {
  assert.equal(I.isMigraine({ severity: 'mild', pain: null, migraine: null }), false);
  assert.equal(I.isMigraine({ severity: 'moderate', pain: null, migraine: null }), true);
  assert.equal(I.isMigraine({ severity: 'severe', pain: null, migraine: null }), true);
  assert.equal(I.isMigraine({ severity: null, pain: 3, migraine: null }), false);
  assert.equal(I.isMigraine({ severity: null, pain: 4, migraine: null }), true);
  assert.equal(I.isMigraine({ severity: null, pain: null, migraine: null }), false);
  assert.equal(I.isMigraine({ severity: 'mild', pain: 2, migraine: true }), true);
  assert.equal(I.isMigraine({ severity: 'severe', pain: 9, migraine: false }), false);
  // Severity picked wins over the pain score.
  assert.equal(I.severityOf({ severity: 'mild', pain: 8 }), 'mild');
  assert.equal(I.severityOf({ severity: null, pain: 0 }), null);
  assert.equal(I.severityOf({ severity: null, pain: 7 }), 'severe');
  assert.equal(I.painLevel({ severity: 'moderate', pain: null }), 6);
  assert.equal(I.painLevel({ severity: 'moderate', pain: 2 }), 2);
});

test('rolling window: the last 30 days, today included; day 30 back is outside; an attack reaching in counts only its days inside', () => {
  assert.deepEqual(W30, { from: '2026-09-28', to: '2026-10-27' });
  const attacks = [
    attack(at('2026-09-27', 10), at('2026-09-27', 12), { severity: 'severe' }), // outside
    attack(at('2026-09-27', 22), at('2026-09-28', 2), { severity: 'severe' }), // reaches in: Sep 28 only
    attack(at('2026-10-05', 9), at('2026-10-05', 11), { severity: 'mild' }),
    attack(at('2026-10-05', 15), at('2026-10-05', 18), { severity: 'moderate' }), // same day: one day, a migraine day
    attack(at('2026-10-10', 23), at('2026-10-11', 1), { pain: 2 }), // two headache days
    attack(at('2026-10-27', 18), null, { severity: 'severe' }), // open, today
  ];
  const n = I.numbersFor(attacks, [], W30, NOW);
  assert.equal(n.dayCount, 30);
  assert.equal(n.headacheDays, 5); // Sep 28, Oct 5, Oct 10, Oct 11, Oct 27
  assert.equal(n.migraineDays, 3); // Sep 28, Oct 5, Oct 27
  assert.equal(n.attackCount, 4); // started inside: not the two from Sep 27
  assert.equal(n.loggedDays, 5);
});

test('calendar months: cut at today while the month runs; an attack across the month end counts in both months', () => {
  const oct = I.monthWindow(2026, 10, NOW);
  assert.deepEqual(oct, { from: '2026-10-01', to: '2026-10-27', complete: false });
  assert.deepEqual(I.monthWindow(2026, 9, NOW), { from: '2026-09-01', to: '2026-09-30', complete: true });
  const attacks = [
    attack(at('2026-09-30', 21), at('2026-10-01', 4), { severity: 'moderate' }),
    attack(at('2026-09-12', 8), at('2026-09-12', 9), { severity: 'mild' }),
    attack(at('2026-10-14', 8), at('2026-10-14', 20), { migraine: true }),
  ];
  const sep = I.numbersFor(attacks, [], I.monthWindow(2026, 9, NOW), NOW);
  const octN = I.numbersFor(attacks, [], oct, NOW);
  assert.equal(sep.dayCount, 30);
  assert.equal(sep.headacheDays, 2);
  assert.equal(sep.migraineDays, 1);
  assert.equal(octN.dayCount, 27);
  assert.equal(octN.headacheDays, 2);
  assert.equal(octN.migraineDays, 2);
  // The attack is counted where it started.
  assert.equal(sep.attackCount, 2);
  assert.equal(octN.attackCount, 1);
});

test('4-hour attacks: 3 h 59 is not long, 4 h is; a long attack across midnight makes two long days', () => {
  const attacks = [
    attack(at('2026-10-02', 9), at('2026-10-02', 12, 59)),
    attack(at('2026-10-03', 9), at('2026-10-03', 13)),
    attack(at('2026-10-06', 22), at('2026-10-07', 4)),
    attack(at('2026-10-27', 15), null), // open 5 hours so far: long
  ];
  const n = I.numbersFor(attacks, [], W30, NOW);
  assert.equal(n.longDays, 4); // Oct 3, Oct 6, Oct 7, Oct 27
  assert.equal(n.longAttacks, 3);
  assert.equal(I.isLong(attacks[0], NOW), false);
  assert.equal(I.isLong(attacks[1], NOW), true);
});

test('average length: finished attacks that started in the window; open ones are left out; none gives null', () => {
  const attacks = [attack(at('2026-10-02', 9), at('2026-10-02', 11)), attack(at('2026-10-03', 9), at('2026-10-03', 15)), attack(at('2026-10-27', 19), null)];
  assert.equal(I.numbersFor(attacks, [], W30, NOW).averageMs, 4 * H);
  assert.equal(I.numbersFor([attacks[2]], [], W30, NOW).averageMs, null);
});

test('headache-free days: marked days count as logged, never as headache days; an attack that day wins', () => {
  const attacks = [attack(at('2026-10-05', 9), at('2026-10-05', 11))];
  const n = I.numbersFor(attacks, ['2026-10-04', '2026-10-05', '2026-10-06', '2026-08-01'], W30, NOW);
  assert.equal(n.loggedDays, 3);
  assert.equal(n.headacheDays, 1);
  const days = I.buildDays(attacks, ['2026-10-04', '2026-10-05'], '2026-10-03', '2026-10-06', NOW);
  assert.deepEqual([...days.values()].map((d) => d.status), ['none', 'free', 'headache', 'none']);
});

// ---------- medication days ----------

test('medication days: by type, one per day however many doses; acute days are the union; preventives are not acute', () => {
  const a1 = attack(at('2026-10-05', 9), at('2026-10-05', 20), {
    doses: [dose('triptan', at('2026-10-05', 9, 30)), dose('triptan', at('2026-10-05', 15)), dose('simple', at('2026-10-05', 10))],
  });
  // Across midnight: the second dose is on the next day.
  const a2 = attack(at('2026-10-08', 21), at('2026-10-09', 6), { doses: [dose('triptan', at('2026-10-08', 22)), dose('simple', at('2026-10-09', 1))] });
  const a3 = attack(at('2026-10-12', 9), at('2026-10-12', 10), { doses: [dose('preventive', at('2026-10-12', 9))] });
  const n = I.numbersFor([a1, a2, a3], [], W30, NOW);
  assert.deepEqual(n.medDays, { triptan: 2, simple: 2, preventive: 1 });
  assert.equal(n.acuteMedDays, 3); // Oct 5, Oct 8, Oct 9
});

const triptanDays = (count) =>
  Array.from({ length: count }, (_, i) => {
    const day = D.addDays('2026-10-01', i);
    return attack(at(day, 9), at(day, 12), { doses: [dose('triptan', at(day, 9, 15))] });
  });

test('watch notes: 10 days for triptans, ergots, opioids and combinations, 15 for simple painkillers; none for the rest', () => {
  assert.deepEqual(I.medNotes({ triptan: 9, simple: 14, ergot: 9, opioid: 9, combo: 9 }), []);
  assert.deepEqual(I.medNotes({ triptan: 10 }), [{ kind: 'triptan', days: 10, level: 10 }]);
  assert.deepEqual(I.medNotes({ simple: 15 }), [{ kind: 'simple', days: 15, level: 15 }]);
  assert.deepEqual(
    I.medNotes({ ergot: 10, opioid: 12, combo: 11, simple: 20 }).map((x) => x.kind),
    ['simple', 'opioid', 'combo', 'ergot']
  );
  // Gepants, ditans, other and preventives have no level in the classification here.
  assert.deepEqual(I.medNotes({ gepant: 25, other: 30, preventive: 30 }), []);
  // From logged attacks: 10 triptan days this month reach it, 9 do not.
  const ten = I.numbersFor(triptanDays(10), [], I.monthWindow(2026, 10, NOW), NOW);
  assert.equal(I.medNotes(ten.medDays).length, 1);
  const nine = I.numbersFor(triptanDays(9), [], I.monthWindow(2026, 10, NOW), NOW);
  assert.equal(I.medNotes(nine.medDays).length, 0);
});

test('watch note words: calm and neutral, the count, no advice', () => {
  assert.equal(I.medNoteText(11, 'month'), 'You logged medication on 11 days this month. Doctors watch this number. Consider sharing this report at your next visit.');
  assert.equal(I.medNoteText(15, 'rolling'), 'You logged medication on 15 days in the last 30 days. Doctors watch this number. Consider sharing this report at your next visit.');
  assert.doesNotMatch(I.medNoteText(11, 'month'), /stop|reduce|overuse|too many|!/i);
});

test('triggers and days lost: most common first; a day both missed and reduced counts as missed', () => {
  const attacks = [
    attack(at('2026-10-02', 9), at('2026-10-02', 11), { triggers: ['sleep', 'stress'], impact: 'partly' }),
    attack(at('2026-10-02', 15), at('2026-10-02', 18), { triggers: ['stress'], impact: 'yes' }),
    attack(at('2026-10-09', 9), at('2026-10-09', 11), { triggers: ['stress', 'custom:Perfume', 'stress'], impact: 'partly' }),
    attack(at('2026-10-11', 9), at('2026-10-11', 11), { impact: 'no' }),
  ];
  const n = I.numbersFor(attacks, [], W30, NOW);
  assert.deepEqual(n.triggers, [
    { id: 'stress', count: 3 },
    { id: 'custom:Perfume', count: 1 },
    { id: 'sleep', count: 1 },
  ]);
  assert.equal(n.missedDays, 1);
  assert.equal(n.reducedDays, 1);
  assert.equal(L.triggerLabel('custom:Perfume'), 'Perfume');
  assert.equal(L.triggerLabel('skipped_meal'), 'Skipped meal');
  assert.equal(I.per30(12, 90), 4);
  assert.equal(I.per30(5, 0), 0);
});

// ---------- preventives ----------

test('preventive courses: start to stop, or to today; days, then weeks, then months', () => {
  assert.equal(I.courseDays('2026-07-01', '2026-09-23', '2026-10-27'), 84);
  assert.equal(I.courseDays('2026-07-01', null, '2026-10-27'), 118);
  assert.equal(I.courseDays('2026-10-27', '2026-10-01', '2026-10-27'), 0);
  assert.equal(I.courseLabel(1), '1 day');
  assert.equal(I.courseLabel(13), '13 days');
  assert.equal(I.courseLabel(14), '2 weeks');
  assert.equal(I.courseLabel(84), '12 weeks');
  assert.equal(I.courseLabel(90), '12 weeks');
  assert.equal(I.courseLabel(91), '3 months');
  assert.equal(I.courseLabel(183), '6 months');
});

// ---------- free and Pro ----------

test('gates: free lists show attacks touching the last 30 days; older ones are counted for Pro', () => {
  const cutoff = G.historyCutoff(NOW);
  assert.equal(cutoff, at('2026-09-28', 0));
  const old = attack(at('2026-09-27', 10), at('2026-09-27', 12));
  const crossing = attack(at('2026-09-27', 22), at('2026-09-28', 1));
  const recent = attack(at('2026-10-20', 10), at('2026-10-20', 12));
  assert.equal(G.canSeeAttack(old, NOW, false), false);
  assert.equal(G.canSeeAttack(old, NOW, true), true);
  assert.equal(G.canSeeAttack(crossing, NOW, false), true);
  const v = G.visibleAttacks([recent, crossing, old], NOW, false);
  assert.deepEqual(v.shown.map((a) => a.id), [recent.id, crossing.id]);
  assert.equal(v.hidden, 1);
  assert.equal(G.visibleAttacks([recent, crossing, old], NOW, true).hidden, 0);
});

test('gates: the current month is free, other months, numbers, report sharing and CSV are Pro; logging never waits', () => {
  assert.equal(G.canSeeMonth(2026, 10, NOW, false), true);
  assert.equal(G.canSeeMonth(2026, 9, NOW, false), false);
  assert.equal(G.canSeeMonth(2025, 10, NOW, false), false);
  assert.equal(G.canSeeMonth(2026, 9, NOW, true), true);
  for (const f of ['report', 'numbers', 'history', 'csv']) {
    assert.equal(G.gate(f, false), f);
    assert.equal(G.gate(f, true), null);
  }
  assert.equal(G.canLog(false), true);
  assert.deepEqual(G.reportAccess(false), { preview: true, share: false, sample: true });
  assert.deepEqual(G.reportAccess(true), { preview: true, share: true, sample: false });
});

// ---------- rules ----------

test('theme: dark by default and always during an open attack; light only when following the phone', () => {
  assert.equal(U.schemeFor({ followSystem: false, attackOpen: false }), 'dark');
  assert.equal(U.schemeFor({ followSystem: true, attackOpen: false }), 'unspecified');
  assert.equal(U.schemeFor({ followSystem: true, attackOpen: true }), 'dark');
  assert.equal(U.schemeFor({ followSystem: false, attackOpen: true }), 'dark');
});

test('evening question: from 6 pm, once a day, only while the day has nothing logged and no attack is open', () => {
  const base = { hour: 19, enabled: true, today: '2026-10-27', answeredDay: null, dayLogged: false, attackOpen: false };
  assert.equal(U.eveningDue(base), true);
  assert.equal(U.eveningDue({ ...base, hour: 17 }), false);
  assert.equal(U.eveningDue({ ...base, hour: 18 }), true);
  assert.equal(U.eveningDue({ ...base, answeredDay: '2026-10-27' }), false);
  assert.equal(U.eveningDue({ ...base, answeredDay: '2026-10-26' }), true);
  assert.equal(U.eveningDue({ ...base, dayLogged: true }), false);
  assert.equal(U.eveningDue({ ...base, attackOpen: true }), false);
  assert.equal(U.eveningDue({ ...base, enabled: false }), false);
});

test('rating prompt: never while an attack is open, once per launch, each trigger once', () => {
  assert.equal(U.reviewAllowed({ attackOpen: false, askedThisLaunch: false, triggerUsed: false }), true);
  assert.equal(U.reviewAllowed({ attackOpen: true, askedThisLaunch: false, triggerUsed: false }), false);
  assert.equal(U.reviewAllowed({ attackOpen: false, askedThisLaunch: true, triggerUsed: false }), false);
  assert.equal(U.reviewAllowed({ attackOpen: false, askedThisLaunch: false, triggerUsed: true }), false);
});

test('labels: the track choice changes words only; the quick action follows the open attack', () => {
  assert.equal(L.startLabel('migraine'), 'Attack started');
  assert.equal(L.overLabel('migraine'), 'Attack over');
  assert.equal(L.startLabel('tension'), 'Headache started');
  assert.equal(L.startLabel('cluster'), 'Attack started');
  assert.equal(L.startLabel('unsure'), 'Attack started');
  assert.equal(L.plural('tension', 2), 'headaches');
  assert.deepEqual(U.quickActionFor('migraine', false), { id: 'start', title: 'Attack started' });
  assert.deepEqual(U.quickActionFor('tension', true), { id: 'end', title: 'Headache over' });
});

test('quick action: one dynamic item only, no static Info.plist item', async () => {
  const { readFile } = await import('node:fs/promises');
  const app = JSON.parse(await readFile(new URL('../app.json', import.meta.url), 'utf8'));
  const qa = app.expo.plugins.find((p) => p === 'expo-quick-actions' || (Array.isArray(p) && p[0] === 'expo-quick-actions'));
  assert.equal(qa, 'expo-quick-actions');
  assert.deepEqual(U.quickActionFor('migraine', true), { id: 'end', title: 'Attack over' });
});

test('started by mistake: Attack over less than 60 seconds after Attack started asks first', () => {
  const t = Date.UTC(2026, 9, 28, 15, 23, 0);
  assert.equal(U.MISTAKE_MS, 60_000);
  assert.equal(U.looksLikeMistake(t, t), true); // the quick action twice: 0 min
  assert.equal(U.looksLikeMistake(t, t + 1_000), true);
  assert.equal(U.looksLikeMistake(t, t + 59_999), true);
  assert.equal(U.looksLikeMistake(t, t + 60_000), false); // a full minute is a real attack
  assert.equal(U.looksLikeMistake(t, t + 3 * 60_000), false); // 11:23 to 11:26
  assert.equal(U.looksLikeMistake(t, t - 5_000), true); // an end before the start is never kept silently
});

// ---------- report ----------

const meds = [
  { id: 1, name: 'Topiramate', kind: 'preventive', startedOn: '2026-03-02', stoppedOn: '2026-05-25', stopReason: 'side_effects', position: 0, createdAt: 0 },
  { id: 2, name: 'Propranolol', kind: 'preventive', startedOn: '2026-06-01', stoppedOn: null, stopReason: null, position: 1, createdAt: 0 },
  { id: 3, name: 'Sumatriptan', kind: 'triptan', startedOn: null, stoppedOn: null, stopReason: null, position: 2, createdAt: 0 },
];

test('report: 90 days by calendar month, part months marked, per 30 days, preventives with length and reason', () => {
  const attacks = [
    attack(at('2026-08-01', 9), at('2026-08-01', 15), { severity: 'severe', doses: [dose('triptan', at('2026-08-01', 9, 20), { name: 'Sumatriptan', amount: '50 mg', relief: 'some' })] }),
    attack(at('2026-09-30', 21), at('2026-10-01', 4), { severity: 'moderate', triggers: ['sleep'], impact: 'yes' }),
    attack(at('2026-10-20', 9), at('2026-10-20', 10), { severity: 'mild', backfilled: true, doses: [dose('simple', at('2026-10-20', 9, 5), { name: 'Ibuprofen' })] }),
  ];
  const r = R.buildReport({ attacks, freeDays: ['2026-10-21'], meds, rangeDays: 90, now: NOW, patientName: '  Ana  ', track: 'migraine' });
  assert.equal(r.from, '2026-07-30');
  assert.equal(r.to, '2026-10-27');
  assert.equal(r.patient, 'Ana');
  assert.deepEqual(
    r.months.map((m) => [m.label, m.days, m.partial, m.headache, m.migraine, m.acuteMedDays]),
    [
      ['July 2026', 2, true, 0, 0, 0],
      ['August 2026', 31, false, 1, 1, 1],
      ['September 2026', 30, false, 1, 1, 0],
      ['October 2026', 27, true, 2, 1, 1],
    ]
  );
  assert.equal(r.totals.headacheDays, 4);
  assert.equal(r.totals.longAttacks, 2);
  assert.deepEqual(r.per30, { headache: 1.3, migraine: 1, acuteMed: 0.7 });
  assert.deepEqual(r.kinds, ['triptan', 'simple']);
  assert.deepEqual(r.preventives, [
    { name: 'Topiramate', started: 'Mar 2, 2026', stopped: 'May 25, 2026', length: '12 weeks', reason: 'Side effects' },
    { name: 'Propranolol', started: 'Jun 1, 2026', stopped: 'Still taking', length: '5 months', reason: '' },
  ]);
  assert.deepEqual(r.triggers, [{ label: 'Sleep', count: 1 }]);
  assert.equal(r.attacks.length, 3);
  assert.match(r.attacks[0].meds, /^Sumatriptan 50 mg at 9:20 am \(triptan\), some relief$/);
  assert.equal(r.attacks[1].impact, 'Missed work or study');
  assert.equal(r.attacks[2].backfilled, true);
  // A 30-day report has no per-30 line.
  assert.equal(R.buildReport({ attacks, freeDays: [], meds, rangeDays: 30, now: NOW, patientName: '', track: 'migraine' }).per30, null);
});

test('report calendar: weeks start on Monday, days outside the range are greyed, the day codes', () => {
  const attacks = [attack(at('2026-10-05', 9), at('2026-10-05', 14), { severity: 'severe', pain: 8, doses: [dose('triptan', at('2026-10-05', 9))] })];
  const r = R.buildReport({ attacks, freeDays: ['2026-10-06'], meds: [], rangeDays: 30, now: NOW, patientName: '', track: 'migraine' });
  const sep = r.calendar[0];
  const oct = r.calendar[1];
  assert.equal(sep.label, 'September 2026');
  assert.equal(sep.weeks[0][0], null); // Sep 1, 2026 is a Tuesday
  assert.equal(sep.weeks[0][1].day, 1);
  assert.equal(sep.weeks[0][1].inRange, false);
  assert.equal(oct.weeks[0].slice(0, 3).every((c) => c === null), true); // Oct 1 is a Thursday
  const cell = (d) => oct.weeks.flat().find((c) => c && c.day === d);
  assert.deepEqual([cell(5).status, cell(5).pain, cell(5).med, cell(5).long], ['migraine', 8, true, true]);
  assert.equal(cell(6).status, 'free');
  assert.equal(cell(7).status, 'none');
  assert.equal(cell(28).inRange, false);
});

test('report HTML: the footer, escaped names, SAMPLE only on the sample, no medication advice', () => {
  const attacks = [attack(at('2026-10-05', 9), at('2026-10-05', 14), { severity: 'severe' })];
  const r = R.buildReport({ attacks, freeDays: [], meds, rangeDays: 30, now: NOW, patientName: 'Ana <b>&', track: 'migraine' });
  const html = R.reportHtml(r);
  // After the summary page, after the calendar, and after the attack list.
  assert.equal(html.split(R.REPORT_FOOTER).length - 1, 3);
  assert.match(html, /Ana &lt;b&gt;&amp;/);
  assert.doesNotMatch(html, /SAMPLE/);
  assert.match(R.reportHtml(r, { sample: true }), /SAMPLE/);
  assert.match(html, /Sep 28 to Oct 27, 2026 \(30 days\)/);
  assert.doesNotMatch(html, /overuse|diagnos(e|is) of|you should/i);
  assert.equal(R.REPORT_FOOTER, 'Logged by the patient with Migraine Log. Not a diagnosis.');
  assert.equal(R.rangeText({ from: '2025-12-15', to: '2026-01-13', rangeDays: 30 }), 'Dec 15, 2025 to Jan 13, 2026 (30 days)');
});

test('CSV: every attack oldest first, quoted where needed, UTF-8 mark, open attacks without an end', () => {
  const attacks = [
    attack(at('2026-10-20', 9), null, { note: 'Bright "office" lights, then, nausea\nlater' }),
    attack(at('2026-10-02', 21), at('2026-10-03', 1, 30), {
      severity: 'moderate',
      pain: 6,
      locations: ['left', 'front'],
      aura: true,
      symptoms: ['nausea', 'light'],
      triggers: ['sleep', 'custom:Red wine'],
      impact: 'partly',
      backfilled: true,
      doses: [dose('triptan', at('2026-10-02', 21, 15), { name: 'Rizatriptan', amount: '10 mg', relief: 'full' })],
    }),
  ];
  const csv = R.attacksCsv(attacks, NOW);
  assert.equal(csv[0], '﻿');
  const lines = csv.slice(1).split('\r\n');
  assert.equal(lines[0], R.CSV_HEADER.join(','));
  assert.equal(
    lines[1],
    '2026-10-02,21:00,2026-10-03,01:30,270,Moderate,6,yes,"Left, Front",yes,"Nausea, Light","Sleep, Red wine",Rizatriptan 10 mg 21:15 full relief,partly,yes,'
  );
  // A line break inside a note stays inside its quotes; rows end with CRLF.
  assert.equal(lines[2], '2026-10-20,09:00,,,,,,no,,,,,,,no,"Bright ""office"" lights, then, nausea\nlater"');
  assert.equal(lines[3], '');
  assert.equal(R.csvField('plain'), 'plain');
  assert.equal(R.csvField('a,b'), '"a,b"');
  assert.equal(R.csvField(null), '');
  assert.equal(R.exportName('attacks', NOW), 'migraine-log-attacks-2026-10-27');
});

// ---------- trial and plans (offer.ts, from the engine) ----------

test('trial: "3 days free" only for a free intro offer this Apple ID can still get', () => {
  const intro = { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' };
  assert.equal(O.trialLength(intro), '3 days');
  assert.equal(O.trialLength({ price: 0, periodNumberOfUnits: 1, periodUnit: 'WEEK' }), '1 week');
  assert.equal(O.trialLength({ price: 0.99, periodNumberOfUnits: 1, periodUnit: 'WEEK' }), null);
  assert.equal(O.trialLength(null), null);
  assert.equal(O.trialLabelFrom(intro, true), '3 days free');
  assert.equal(O.trialLabelFrom(intro, false), null);
});

test('trial reminder: a day before the trial ends; sandbox-short or unknown ends fall back to 2 days out', () => {
  const now = Date.UTC(2026, 9, 27, 12);
  const DAY = 24 * H;
  assert.equal(O.trialReminderAt(now + 3 * DAY, now), now + 2 * DAY);
  assert.equal(O.trialReminderAt(now + 5 * 60_000, now), now + 2 * DAY);
  assert.equal(O.trialReminderAt(null, now), now + 2 * DAY);
});

test('plans: weekly first and preselected on the onboarding paywall, yearly in the app', () => {
  assert.deepEqual(O.planOrder(true), ['WEEKLY', 'ANNUAL']);
  assert.deepEqual(O.planOrder(false), ['ANNUAL', 'WEEKLY']);
  assert.equal(O.preselect(['ANNUAL', 'WEEKLY'], true), 'WEEKLY');
  assert.equal(O.preselect(['WEEKLY', 'ANNUAL'], false), 'ANNUAL');
  assert.equal(O.preselect(['ANNUAL'], true), 'ANNUAL');
  assert.equal(O.preselect([], false), null);
  assert.equal(O.yearlySavingPct(4.99, 29.99), 88);
  assert.equal(O.yearlySavingPct(0, 29.99), null);
});
