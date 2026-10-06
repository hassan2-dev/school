import Dexie, { type Table } from 'dexie';
import type { AppState } from '../types/core';

/** بيانات جاهزة للمزامنة السحابية لاحقاً (Firebase) */
export interface SyncMeta {
  id: 'sync';
  /** آخر تعديل محلي */
  lastLocalChangeAt: string;
  /** آخر مزامنة ناجحة مع السحابة (null = لم تُفعَّل بعد) */
  lastSyncedAt: string | null;
  /** هل توجد تغييرات لم تُرفع بعد */
  pendingSync: boolean;
  /** مصدر التخزين الحالي */
  storage: 'indexeddb';
}

export interface AppSnapshotRow {
  id: 'app';
  state: AppState;
  updatedAt: string;
}

class SchoolDatabase extends Dexie {
  snapshots!: Table<AppSnapshotRow, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('school-grades-local');
    this.version(1).stores({
      snapshots: 'id, updatedAt',
      syncMeta: 'id',
    });
  }
}

export const schoolDb = new SchoolDatabase();

export function defaultSyncMeta(): SyncMeta {
  return {
    id: 'sync',
    lastLocalChangeAt: new Date().toISOString(),
    lastSyncedAt: null,
    pendingSync: true,
    storage: 'indexeddb',
  };
}

export async function readSnapshot(): Promise<AppState | null> {
  const row = await schoolDb.snapshots.get('app');
  return row?.state ?? null;
}

export async function writeSnapshot(state: AppState): Promise<void> {
  const now = new Date().toISOString();
  await schoolDb.transaction('rw', schoolDb.snapshots, schoolDb.syncMeta, async () => {
    await schoolDb.snapshots.put({
      id: 'app',
      state,
      updatedAt: now,
    });
    const meta = (await schoolDb.syncMeta.get('sync')) ?? defaultSyncMeta();
    await schoolDb.syncMeta.put({
      ...meta,
      lastLocalChangeAt: now,
      pendingSync: true,
      storage: 'indexeddb',
    });
  });
}

export async function readSyncMeta(): Promise<SyncMeta> {
  return (await schoolDb.syncMeta.get('sync')) ?? defaultSyncMeta();
}

export async function clearLocalDatabase(): Promise<void> {
  await schoolDb.transaction('rw', schoolDb.snapshots, schoolDb.syncMeta, async () => {
    await schoolDb.snapshots.clear();
    await schoolDb.syncMeta.clear();
  });
}
