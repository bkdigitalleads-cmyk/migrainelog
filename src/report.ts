/**
 * The doctor and insurance report and the CSV, as pure functions checked by
 * `npm test`. buildReport() makes one model; the PDF (reportHtml, printed
 * by expo-print) and the in-app preview (screens/ReportPreview) both draw
 * that model, so they always show the same numbers.
 *
 * Page 1 is what a doctor or insurer reads in 20 seconds: the date range,
 * headache days and migraine days per month, attacks of 4 hours or more,
 * acute medication days per month by type, the preventives tried with
 * start and stop dates and why they stopped, and the top triggers. Then a
 * day-by-day calendar and the attack list. Every page ends with
 * "Logged by the patient with Migraine Log. Not a diagnosis."
 */
import type { Attack, Med, MedKind, Track } from './model';
import { ACUTE_KINDS, impactLabel, medKindLabel, medKindShort, reliefLabel, severityLabel, sideLabel, symptomLabel, triggerLabel } from './labels.ts';
import {
  addDays,
  dayKey,
  daysInMonth,
  firstOfMonth,
  lastOfMonth,
  monthLabel,
  parseDay,
  shortDate,
  time24,
  timeLabel,
  weekdayMon,
} from './days.ts';
import {
  buildDays,
  courseDays,
  courseLabel,
  coveredDays,
  type DayInfo,
  type DayStatus,
  durationMs,
  formatDuration,
  isMigraine,
  numbersFor,
  type Numbers,
  per30,
  severityOf,
} from './insights.ts';

export const REPORT_RANGES = [30, 90, 180] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export const REPORT_FOOTER = 'Logged by the patient with Migraine Log. Not a diagnosis.';

export interface MonthRow {
  label: string;
  /** Days of this month inside the range. */
  days: number;
  /** Not the whole month (the range starts or ends inside it). */
  partial: boolean;
  logged: number;
  headache: number;
  migraine: number;
  longAttacks: number;
  acuteMedDays: number;
  medDays: Partial<Record<MedKind, number>>;
}

export interface CalendarCell {
  key: string;
  day: number;
  inRange: boolean;
  status: DayStatus;
  pain: number | null;
  med: boolean;
  long: boolean;
}

export interface AttackRow {
  id: number;
  date: string;
  start: string;
  length: string;
  severity: string;
  pain: string;
  migraine: boolean;
  aura: string;
  where: string;
  symptoms: string;
  meds: string;
  triggers: string;
  impact: string;
  backfilled: boolean;
}

export interface PreventiveRow {
  name: string;
  started: string;
  stopped: string;
  length: string;
  reason: string;
}

export interface ReportModel {
  patient: string;
  from: string;
  to: string;
  rangeDays: number;
  generated: string;
  totals: Numbers;
  /** Per 30 days, for ranges longer than 30 days. */
  per30: { headache: number; migraine: number; acuteMed: number } | null;
  months: MonthRow[];
  /** Acute kinds with at least one day in the range, in the app's order. */
  kinds: MedKind[];
  preventives: PreventiveRow[];
  triggers: { label: string; count: number }[];
  calendar: { label: string; weeks: (CalendarCell | null)[][] }[];
  attacks: AttackRow[];
  /** "attack" or "headache". */
  noun: string;
}

export function buildReport(input: {
  attacks: Attack[];
  freeDays: string[];
  meds: Med[];
  rangeDays: number;
  now: number;
  patientName: string;
  track: Track;
}): ReportModel {
  const { attacks, freeDays, meds, rangeDays, now } = input;
  const to = dayKey(now);
  const from = addDays(to, -(rangeDays - 1));
  const totals = numbersFor(attacks, freeDays, { from, to }, now);
  const days = buildDays(attacks, freeDays, from, to, now);

  const months: MonthRow[] = [];
  const calendar: ReportModel['calendar'] = [];
  let { y, m } = parseDay(from);
  const end = parseDay(to);
  while (y < end.y || (y === end.y && m <= end.m)) {
    const mFrom = firstOfMonth(y, m) < from ? from : firstOfMonth(y, m);
    const mTo = lastOfMonth(y, m) > to ? to : lastOfMonth(y, m);
    const n = numbersFor(attacks, freeDays, { from: mFrom, to: mTo }, now);
    months.push({
      label: monthLabel(y, m),
      days: n.dayCount,
      partial: n.dayCount < daysInMonth(y, m),
      logged: n.loggedDays,
      headache: n.headacheDays,
      migraine: n.migraineDays,
      longAttacks: n.longAttacks,
      acuteMedDays: n.acuteMedDays,
      medDays: n.medDays,
    });
    calendar.push({ label: monthLabel(y, m), weeks: monthWeeks(y, m, (key) => days.get(key) ?? null) });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  const kinds = ACUTE_KINDS.filter((k) => (totals.medDays[k] ?? 0) > 0);

  const preventives: PreventiveRow[] = meds
    .filter((md) => md.kind === 'preventive')
    .sort((a, b) => (a.startedOn ?? '9999').localeCompare(b.startedOn ?? '9999') || a.name.localeCompare(b.name))
    .map((md) => ({
      name: md.name,
      started: md.startedOn ? shortDate(md.startedOn, true) : 'Not given',
      stopped: md.stoppedOn ? shortDate(md.stoppedOn, true) : md.startedOn ? 'Still taking' : '',
      length: md.startedOn ? courseLabel(courseDays(md.startedOn, md.stoppedOn, to)) : '',
      reason: md.stoppedOn ? stopText(md) : '',
    }));

  const inRange = attacks
    .filter((a) => coveredDays(a, now).some((d) => d >= from && d <= to))
    .sort((a, b) => a.startedAt - b.startedAt);

  return {
    patient: input.patientName.trim(),
    from,
    to,
    rangeDays,
    generated: to,
    totals,
    per30:
      rangeDays > 30
        ? {
            headache: per30(totals.headacheDays, totals.dayCount),
            migraine: per30(totals.migraineDays, totals.dayCount),
            acuteMed: per30(totals.acuteMedDays, totals.dayCount),
          }
        : null,
    months,
    kinds,
    preventives,
    triggers: totals.triggers.slice(0, 5).map((t) => ({ label: triggerLabel(t.id), count: t.count })),
    calendar,
    attacks: inRange.map((a) => attackRow(a, now)),
    noun: input.track === 'tension' ? 'headache' : 'attack',
  };
}

function stopText(md: Med): string {
  const r = md.stopReason === 'not_working' ? 'Not working' : md.stopReason === 'side_effects' ? 'Side effects' : md.stopReason === 'other' ? 'Other' : 'Not given';
  return r;
}

/** A month as weeks of 7 cells, Monday first, with null outside the month. */
function monthWeeks(y: number, m: number, info: (key: string) => DayInfo | null) {
  const weeks: (CalendarCell | null)[][] = [];
  let week: (CalendarCell | null)[] = Array(weekdayMon(firstOfMonth(y, m))).fill(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const i = info(key);
    week.push({
      key,
      day: d,
      inRange: i != null,
      status: i?.status ?? 'none',
      pain: i?.worstPain ?? null,
      med: i ? i.medKinds.some((k) => k !== 'preventive') : false,
      long: i?.long ?? false,
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push([...week, ...Array(7 - week.length).fill(null)]);
  return weeks;
}

function attackRow(a: Attack, now: number): AttackRow {
  const sev = severityOf(a);
  return {
    id: a.id,
    date: shortDate(dayKey(a.startedAt), true),
    start: timeLabel(a.startedAt),
    length: a.endedAt == null ? `Ongoing, ${formatDuration(durationMs(a, now))} so far` : formatDuration(durationMs(a, now)),
    severity: severityLabel(sev),
    pain: a.pain != null ? `${a.pain}/10` : '',
    migraine: isMigraine(a),
    aura: a.aura == null ? '' : a.aura ? 'Aura' : 'No aura',
    where: a.locations.map(sideLabel).join(', '),
    symptoms: a.symptoms.map(symptomLabel).join(', '),
    meds: a.doses
      .slice()
      .sort((x, y) => x.takenAt - y.takenAt)
      .map((d) => {
        const parts = [d.medName || medKindLabel(d.medKind)];
        if (d.amount.trim()) parts.push(d.amount.trim());
        parts.push(`at ${timeLabel(d.takenAt)}`);
        const rel = d.relief ? `, ${d.relief === 'none' ? 'no relief' : `${reliefLabel(d.relief).toLowerCase()} relief`}` : '';
        return `${parts.join(' ')} (${medKindShort(d.medKind).toLowerCase()})${rel}`;
      })
      .join('; '),
    triggers: a.triggers.map(triggerLabel).join(', '),
    impact: a.impact === 'yes' ? 'Missed work or study' : a.impact === 'partly' ? 'Reduced work or study' : a.impact === 'no' ? 'No' : '',
    backfilled: a.backfilled,
  };
}

// ---------- the PDF ----------

export function htmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const STATUS_MARK: Record<DayStatus, string> = { migraine: 'M', headache: 'H', free: '&#9675;', none: '' };

/** Range in words: "Jul 30 to Oct 27, 2026 (90 days)". */
export function rangeText(r: { from: string; to: string; rangeDays: number }): string {
  const sameYear = r.from.slice(0, 4) === r.to.slice(0, 4);
  return `${shortDate(r.from, !sameYear)} to ${shortDate(r.to, true)} (${r.rangeDays} days)`;
}

const CSS = `
  @page { margin: 40px 44px 56px; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1f1d22; font-size: 11px; line-height: 1.45; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 2px; font-weight: 700; }
  h2 { font-size: 13px; margin: 18px 0 6px; font-weight: 700; }
  .meta { color: #55525a; font-size: 11px; }
  .meta b { color: #1f1d22; }
  .boxes { display: flex; gap: 8px; margin: 14px 0 4px; }
  .box { flex: 1; border: 1px solid #cfcbd2; border-radius: 6px; padding: 8px 10px; }
  .box .n { font-size: 24px; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
  .box .l { font-size: 10px; color: #55525a; }
  table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #e2dfe5; vertical-align: top; }
  th { font-size: 10px; color: #55525a; font-weight: 600; border-bottom: 1px solid #b9b5bd; }
  td.num, th.num { text-align: right; }
  .note { color: #55525a; font-size: 10px; margin-top: 4px; }
  .break { page-break-before: always; }
  .cal { display: flex; flex-wrap: wrap; gap: 14px; }
  .cal .month { width: 46%; }
  .cal table td { text-align: center; padding: 2px 0; height: 26px; width: 14%; border: 1px solid #e2dfe5; font-size: 9px; }
  .cal table th { text-align: center; border: none; }
  .cal .d { color: #8a8690; font-size: 8px; display: block; }
  .cal .k { font-weight: 700; font-size: 11px; }
  .cal .out { background: #f7f6f8; }
  .cal .M { background: #d9d2dc; }
  .cal .H { background: #ece8ee; }
  .legend { font-size: 10px; color: #55525a; margin: 6px 0 10px; }
  .att td { font-size: 10px; }
  .end { margin-top: 18px; font-size: 9px; color: #6f6b74; text-align: center; }
  .nw { white-space: nowrap; }
  .sample { position: fixed; top: 38%; left: 0; right: 0; text-align: center; font-size: 110px; font-weight: 800; color: rgba(31,29,34,0.10); transform: rotate(-28deg); letter-spacing: 8px; }
`;

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** The report as HTML for expo-print. */
export function reportHtml(r: ReportModel, opts: { sample?: boolean } = {}): string {
  const e = htmlEscape;
  const t = r.totals;
  const box = (n: string | number, l: string) => `<div class="box"><div class="n">${e(String(n))}</div><div class="l">${e(l)}</div></div>`;
  const avg = r.per30 ? ` (${r.per30.headache} per 30 days)` : '';
  const head = `
    <h1>Headache diary</h1>
    <div class="meta"><b>Patient:</b> ${r.patient ? e(r.patient) : '____________________'} &nbsp; <b>Dates:</b> ${e(rangeText(r))} &nbsp; <b>Made:</b> ${e(shortDate(r.generated, true))}</div>
    <div class="boxes">
      ${box(t.headacheDays, `Headache days${avg}`)}
      ${box(t.migraineDays, `Migraine days${r.per30 ? ` (${r.per30.migraine} per 30 days)` : ''}`)}
      ${box(t.longAttacks, `${cap(r.noun)}s of 4 hours or more`)}
      ${box(t.acuteMedDays, `Days with acute medication${r.per30 ? ` (${r.per30.acuteMed} per 30 days)` : ''}`)}
    </div>
    <div class="note">${e(`${t.loggedDays} of ${t.dayCount} days have an entry (a headache or a headache-free day). Days without an entry are not counted as headache-free. ${t.attackCount} ${t.attackCount === 1 ? r.noun : `${r.noun}s`} started in this period${t.averageMs != null ? `, average length ${formatDuration(t.averageMs)}` : ''}.`)}</div>`;

  const monthTable = `
    <h2>By month</h2>
    <table><tr><th>Month</th><th class="num">Days in range</th><th class="num">Days logged</th><th class="num">Headache days</th><th class="num">Migraine days</th><th class="num">${e(cap(r.noun))}s 4 h+</th><th class="num">Acute medication days</th></tr>
    ${r.months
      .map(
        (mo) =>
          `<tr><td>${e(mo.label)}${mo.partial ? ' (part)' : ''}</td><td class="num">${mo.days}</td><td class="num">${mo.logged}</td><td class="num">${mo.headache}</td><td class="num">${mo.migraine}</td><td class="num">${mo.longAttacks}</td><td class="num">${mo.acuteMedDays}</td></tr>`
      )
      .join('')}
    </table>`;

  const medTable =
    r.kinds.length === 0
      ? `<h2>Acute medication days by type</h2><div class="note">No acute medication logged in this period.</div>`
      : `<h2>Acute medication days by type</h2>
    <table><tr><th>Month</th>${r.kinds.map((k) => `<th class="num">${e(medKindLabel(k))}</th>`).join('')}</tr>
    ${r.months
      .map((mo) => `<tr><td>${e(mo.label)}${mo.partial ? ' (part)' : ''}</td>${r.kinds.map((k) => `<td class="num">${mo.medDays[k] ?? 0}</td>`).join('')}</tr>`)
      .join('')}
    </table>`;

  const prevTable =
    r.preventives.length === 0
      ? `<h2>Preventive treatments tried</h2><div class="note">None listed.</div>`
      : `<h2>Preventive treatments tried</h2>
    <table><tr><th>Name</th><th>Started</th><th>Stopped</th><th>How long</th><th>Reason stopped</th></tr>
    ${r.preventives
      .map((p) => `<tr><td>${e(p.name)}</td><td>${e(p.started)}</td><td>${e(p.stopped)}</td><td>${e(p.length)}</td><td>${e(p.reason)}</td></tr>`)
      .join('')}
    </table>`;

  const trig =
    r.triggers.length === 0
      ? ''
      : `<h2>Most common triggers</h2><div>${r.triggers.map((x) => `${e(x.label)} (${x.count})`).join(', ')}</div>`;

  const end = `<div class="end">${e(REPORT_FOOTER)}</div>`;
  const cal = `
    ${end}
    <div class="break"></div>
    <h2>Day by day</h2>
    <div class="legend">M migraine day, H headache day, &#9675; headache-free day, blank no entry. A number is the worst pain that day (0 to 10). &#8226; acute medication taken. + an ${e(r.noun)} of 4 hours or more.</div>
    <div class="cal">
    ${r.calendar
      .map(
        (mo) => `<div class="month"><h2>${e(mo.label)}</h2><table><tr>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<th>${d}</th>`).join('')}</tr>
        ${mo.weeks
          .map(
            (w) =>
              `<tr>${w
                .map((c) => {
                  if (!c) return '<td class="out"></td>';
                  if (!c.inRange) return `<td class="out"><span class="d">${c.day}</span></td>`;
                  const k = STATUS_MARK[c.status];
                  const extra = `${c.pain != null && c.status !== 'free' ? ` ${c.pain}` : ''}${c.med ? ' &#8226;' : ''}${c.long ? ' +' : ''}`;
                  return `<td class="${k === 'M' || k === 'H' ? k : ''}"><span class="d">${c.day}</span><span class="k">${k}</span>${extra}</td>`;
                })
                .join('')}</tr>`
          )
          .join('')}
        </table></div>`
      )
      .join('')}
    </div>`;

  const list =
    r.attacks.length === 0
      ? ''
      : `<div class="break"></div><h2>${e(cap(r.noun))}s</h2>
    <table class="att"><tr><th>Date</th><th>Start</th><th>Length</th><th>Severity</th><th>Migraine</th><th>Medication</th><th>Triggers</th><th>Work or study</th></tr>
    ${r.attacks
      .map(
        (a) =>
          `<tr><td class="nw">${e(a.date)}${a.backfilled ? '*' : ''}</td><td class="nw">${e(a.start)}</td><td class="nw">${e(a.length)}</td><td>${e([a.severity, a.pain].filter(Boolean).join(', '))}${a.aura ? `<br>${e(a.aura)}` : ''}</td><td>${a.migraine ? 'Yes' : 'No'}</td><td>${e(a.meds)}</td><td>${e(a.triggers)}</td><td>${e(a.impact)}</td></tr>`
      )
      .join('')}
    </table>
    ${r.attacks.some((a) => a.backfilled) ? '<div class="note">* entered later, from memory.</div>' : ''}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${CSS}</style></head><body>
  ${opts.sample ? '<div class="sample">SAMPLE</div>' : ''}
  ${head}${monthTable}${medTable}${prevTable}${trig}${cal}${r.attacks.length > 0 ? end : ''}${list}
  ${end}
  </body></html>`;
}

// ---------- CSV ----------

/** One field, quoted when it holds a comma, a quote or a line break. */
export function csvField(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = [
  'Start date',
  'Start time',
  'End date',
  'End time',
  'Length (minutes)',
  'Severity',
  'Pain (0-10)',
  'Migraine',
  'Where',
  'Aura',
  'Symptoms',
  'Triggers',
  'Medication',
  'Stopped work or study',
  'Entered later',
  'Note',
];

/** Every attack, oldest first, one row each. A byte order mark at the start so spreadsheets read it as UTF-8. */
export function attacksCsv(attacks: Attack[], now: number): string {
  const rows = attacks
    .slice()
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((a) => {
      const meds = a.doses
        .slice()
        .sort((x, y) => x.takenAt - y.takenAt)
        .map((d) => [d.medName || medKindLabel(d.medKind), d.amount.trim(), time24(d.takenAt), d.relief ? `${reliefLabel(d.relief).toLowerCase()} relief` : ''].filter(Boolean).join(' '))
        .join('; ');
      return [
        dayKey(a.startedAt),
        time24(a.startedAt),
        a.endedAt != null ? dayKey(a.endedAt) : '',
        a.endedAt != null ? time24(a.endedAt) : '',
        a.endedAt != null ? Math.round(durationMs(a, now) / 60_000) : '',
        severityLabel(severityOf(a)),
        a.pain ?? '',
        isMigraine(a) ? 'yes' : 'no',
        a.locations.map(sideLabel).join(', '),
        a.aura == null ? '' : a.aura ? 'yes' : 'no',
        a.symptoms.map(symptomLabel).join(', '),
        a.triggers.map(triggerLabel).join(', '),
        meds,
        impactLabel(a.impact).toLowerCase(),
        a.backfilled ? 'yes' : 'no',
        a.note,
      ]
        .map(csvField)
        .join(',');
    });
  return '﻿' + [CSV_HEADER.map(csvField).join(','), ...rows].join('\r\n') + '\r\n';
}

/** "migraine-log-2026-10-27" style file names. */
export function exportName(kind: 'report' | 'attacks', now: number): string {
  return `migraine-log-${kind}-${dayKey(now)}`;
}
