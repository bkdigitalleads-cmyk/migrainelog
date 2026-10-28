/**
 * On-device SQLite store. Times are epoch ms; days are local "YYYY-MM-DD".
 * Nothing here ever leaves the phone: no account, no sync, no network.
 *
 * After launch the schema only grows: never drop or rename a column or
 * table. A new column goes in as a new step in migrate() below, guarded by
 * PRAGMA user_version, so it runs once on every existing install.
 */
import * as SQLite from 'expo-sqlite';
import type { Attack, Dose, Impact, Med, MedKind, Relief, Severity, Side, StopReason } from './model';

const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('migrainelog.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS attacks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          severity TEXT NOT NULL DEFAULT '',
          pain INTEGER,
          locations TEXT NOT NULL DEFAULT '[]',
          aura INTEGER,
          symptoms TEXT NOT NULL DEFAULT '[]',
          triggers TEXT NOT NULL DEFAULT '[]',
          impact TEXT NOT NULL DEFAULT '',
          migraine INTEGER,
          note TEXT NOT NULL DEFAULT '',
          details_at INTEGER,
          backfilled INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_attacks_start ON attacks(started_at);
        CREATE TABLE IF NOT EXISTS doses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          attack_id INTEGER NOT NULL,
          med_id INTEGER,
          med_name TEXT NOT NULL DEFAULT '',
          med_kind TEXT NOT NULL DEFAULT 'other',
          taken_at INTEGER NOT NULL,
          amount TEXT NOT NULL DEFAULT '',
          relief TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_doses_attack ON doses(attack_id);
        CREATE TABLE IF NOT EXISTS meds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          kind TEXT NOT NULL DEFAULT 'other',
          started_on TEXT,
          stopped_on TEXT,
          stop_reason TEXT NOT NULL DEFAULT '',
          position INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS days (
          day TEXT PRIMARY KEY NOT NULL,
          status TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      await migrate(db);
      return db;
    })();
    // A failed open is retried on the next call instead of failing forever.
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= SCHEMA_VERSION) return;
  // Version 1 is the tables above. Each later step goes here, runs once on existing installs,
  // and only adds (ALTER TABLE ... ADD COLUMN after a PRAGMA table_info check).
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

// ---------- settings (key/value) ----------

export async function kvGet(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

/** Every stored key with this prefix, prefix removed. */
export async function kvAll(prefix: string): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings WHERE key LIKE ?', [prefix + '%']);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key.slice(prefix.length)] = r.value;
  return out;
}

// ---------- reading rows ----------

const SEVERITIES = ['mild', 'moderate', 'severe'];
const SIDES = ['left', 'right', 'both', 'front', 'back'];
const KINDS = ['triptan', 'gepant', 'ergot', 'opioid', 'combo', 'simple', 'preventive', 'other'];

function strings(json: string | null | undefined): string[] {
  try {
    const v = JSON.parse(json ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

const bool = (v: unknown): boolean | null => (v === 1 ? true : v === 0 ? false : null);
const kind = (v: unknown): MedKind => (KINDS.includes(v as string) ? (v as MedKind) : 'other');

function rowToDose(r: any, medsById: Map<number, Med>): Dose {
  const med = r.med_id != null ? medsById.get(r.med_id) : undefined;
  return {
    id: r.id,
    attackId: r.attack_id,
    medId: med ? med.id : null,
    medName: med?.name ?? r.med_name ?? '',
    medKind: med?.kind ?? kind(r.med_kind),
    takenAt: r.taken_at,
    amount: r.amount ?? '',
    relief: r.relief === 'none' || r.relief === 'some' || r.relief === 'full' ? (r.relief as Relief) : null,
  };
}

function rowToAttack(r: any, doses: Dose[]): Attack {
  return {
    id: r.id,
    startedAt: r.started_at,
    endedAt: typeof r.ended_at === 'number' ? r.ended_at : null,
    severity: SEVERITIES.includes(r.severity) ? (r.severity as Severity) : null,
    pain: typeof r.pain === 'number' ? Math.max(0, Math.min(10, r.pain)) : null,
    locations: strings(r.locations).filter((s) => SIDES.includes(s)) as Side[],
    aura: bool(r.aura),
    symptoms: strings(r.symptoms),
    triggers: strings(r.triggers),
    impact: r.impact === 'yes' || r.impact === 'partly' || r.impact === 'no' ? (r.impact as Impact) : null,
    migraine: bool(r.migraine),
    note: r.note ?? '',
    detailsAt: typeof r.details_at === 'number' ? r.details_at : null,
    backfilled: r.backfilled === 1,
    doses,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToMed(r: any): Med {
  return {
    id: r.id,
    name: r.name ?? '',
    kind: kind(r.kind),
    startedOn: r.started_on || null,
    stoppedOn: r.stopped_on || null,
    stopReason: r.stop_reason === 'not_working' || r.stop_reason === 'side_effects' || r.stop_reason === 'other' ? (r.stop_reason as StopReason) : null,
    position: r.position ?? 0,
    createdAt: r.created_at,
  };
}

// ---------- attacks ----------

/** Every attack with its doses, newest first. Medication names and kinds come from the list when the medication still exists. */
export async function getAttacks(): Promise<Attack[]> {
  const db = await getDb();
  const [rows, doseRows, meds] = await Promise.all([
    db.getAllAsync<any>('SELECT * FROM attacks ORDER BY started_at DESC, id DESC'),
    db.getAllAsync<any>('SELECT * FROM doses ORDER BY taken_at ASC, id ASC'),
    getMeds(),
  ]);
  const medsById = new Map(meds.map((m) => [m.id, m]));
  const byAttack = new Map<number, Dose[]>();
  for (const d of doseRows) {
    const list = byAttack.get(d.attack_id) ?? [];
    list.push(rowToDose(d, medsById));
    byAttack.set(d.attack_id, list);
  }
  return rows.map((r) => rowToAttack(r, byAttack.get(r.id) ?? []));
}

export async function getAttack(id: number): Promise<Attack | null> {
  return (await getAttacks()).find((a) => a.id === id) ?? null;
}

/** The attack still going, if any (the newest one without an end). */
export async function getOpenAttack(): Promise<Attack | null> {
  return (await getAttacks()).find((a) => a.endedAt == null) ?? null;
}

/** One tap on "Attack started": saved at once with the time, nothing else needed. */
export async function startAttack(at: number): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const res = await db.runAsync('INSERT INTO attacks (started_at, created_at, updated_at) VALUES (?, ?, ?)', [at, now, now]);
  return res.lastInsertRowId;
}

export async function endAttack(id: number, at: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE attacks SET ended_at = ?, updated_at = ? WHERE id = ? AND ended_at IS NULL', [at, Date.now(), id]);
}

export async function setSeverity(id: number, severity: Severity | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE attacks SET severity = ?, updated_at = ? WHERE id = ?', [severity ?? '', Date.now(), id]);
}

/** Everything the details screen edits. */
export type AttackFields = Omit<Attack, 'id' | 'doses' | 'createdAt' | 'updatedAt'>;
export type DoseFields = Omit<Dose, 'id' | 'attackId'>;

function fieldParams(f: AttackFields): (string | number | null)[] {
  return [
    f.startedAt,
    f.endedAt,
    f.severity ?? '',
    f.pain,
    JSON.stringify(f.locations),
    f.aura == null ? null : f.aura ? 1 : 0,
    JSON.stringify(f.symptoms),
    JSON.stringify(f.triggers),
    f.impact ?? '',
    f.migraine == null ? null : f.migraine ? 1 : 0,
    f.note,
    f.detailsAt,
    f.backfilled ? 1 : 0,
  ];
}

async function writeDoses(db: SQLite.SQLiteDatabase, attackId: number, doses: DoseFields[]): Promise<void> {
  await db.runAsync('DELETE FROM doses WHERE attack_id = ?', [attackId]);
  const now = Date.now();
  for (const d of doses) {
    await db.runAsync(
      'INSERT INTO doses (attack_id, med_id, med_name, med_kind, taken_at, amount, relief, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [attackId, d.medId, d.medName, d.medKind, d.takenAt, d.amount, d.relief ?? '', now]
    );
  }
}

/** Saves the details of an existing attack, doses included. */
export async function saveAttack(id: number, f: AttackFields, doses: DoseFields[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE attacks SET started_at = ?, ended_at = ?, severity = ?, pain = ?, locations = ?, aura = ?, symptoms = ?, triggers = ?,
         impact = ?, migraine = ?, note = ?, details_at = ?, backfilled = ?, updated_at = ? WHERE id = ?`,
      [...fieldParams(f), Date.now(), id]
    );
    await writeDoses(db, id, doses);
  });
}

/** A past attack entered from memory, or any attack added from the calendar. */
export async function addAttack(f: AttackFields, doses: DoseFields[]): Promise<number> {
  const db = await getDb();
  let id = 0;
  await db.withTransactionAsync(async () => {
    const now = Date.now();
    const res = await db.runAsync(
      `INSERT INTO attacks (started_at, ended_at, severity, pain, locations, aura, symptoms, triggers, impact, migraine, note, details_at, backfilled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...fieldParams(f), now, now]
    );
    id = res.lastInsertRowId;
    await writeDoses(db, id, doses);
  });
  return id;
}

export async function deleteAttack(id: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM doses WHERE attack_id = ?', [id]);
    await db.runAsync('DELETE FROM attacks WHERE id = ?', [id]);
  });
}

export async function countAttacks(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM attacks');
  return row?.n ?? 0;
}

// ---------- headache-free days ----------

export async function getFreeDays(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day: string }>("SELECT day FROM days WHERE status = 'free' ORDER BY day ASC");
  return rows.map((r) => r.day);
}

export async function setFreeDay(day: string, free: boolean): Promise<void> {
  const db = await getDb();
  if (free) {
    await db.runAsync(
      "INSERT INTO days (day, status, updated_at) VALUES (?, 'free', ?) ON CONFLICT(day) DO UPDATE SET status = 'free', updated_at = excluded.updated_at",
      [day, Date.now()]
    );
  } else {
    await db.runAsync('DELETE FROM days WHERE day = ?', [day]);
  }
}

// ---------- medications ----------

export async function getMeds(): Promise<Med[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM meds ORDER BY position ASC, id ASC');
  return rows.map(rowToMed);
}

export type MedFields = Omit<Med, 'id' | 'position' | 'createdAt'>;

export async function addMed(f: MedFields): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const row = await db.getFirstAsync<{ n: number | null }>('SELECT MAX(position) AS n FROM meds');
  const res = await db.runAsync(
    'INSERT INTO meds (name, kind, started_on, stopped_on, stop_reason, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [f.name.trim(), f.kind, f.startedOn, f.stoppedOn, f.stopReason ?? '', (row?.n ?? -1) + 1, now, now]
  );
  return res.lastInsertRowId;
}

export async function updateMed(id: number, f: MedFields): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE meds SET name = ?, kind = ?, started_on = ?, stopped_on = ?, stop_reason = ?, updated_at = ? WHERE id = ?', [
    f.name.trim(),
    f.kind,
    f.startedOn,
    f.stoppedOn,
    f.stopReason ?? '',
    Date.now(),
    id,
  ]);
  // Logged doses keep their own copy of the name and kind, for when the medication is deleted.
  await db.runAsync('UPDATE doses SET med_name = ?, med_kind = ? WHERE med_id = ?', [f.name.trim(), f.kind, id]);
}

/** Removes it from the list. Doses already logged keep its name and kind. */
export async function deleteMed(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE doses SET med_id = NULL WHERE med_id = ?', [id]);
  await db.runAsync('DELETE FROM meds WHERE id = ?', [id]);
}

// ---------- everything ----------

/** Every attack, dose, medication and day mark. Settings and purchases stay. */
export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM doses; DELETE FROM attacks; DELETE FROM meds; DELETE FROM days;');
}
