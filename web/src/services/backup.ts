import type { AppState } from '../types/core';
import { store } from '../store';

const BACKUP_KIND = 'school-grades-backup';
const BACKUP_VERSION = 1;

export interface BackupFile {
  kind: typeof BACKUP_KIND;
  version: number;
  exportedAt: string;
  state: AppState;
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<AppState>;
  return (
    Array.isArray(v.grades) &&
    Array.isArray(v.sections) &&
    Array.isArray(v.templates) &&
    Array.isArray(v.students) &&
    Array.isArray(v.scores) &&
    typeof v.config === 'object' &&
    v.config !== null
  );
}

export function buildBackup(): BackupFile {
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state: store.getState(),
  };
}

/** تنزيل كل بيانات المتصفح الحالي كملف JSON */
export function downloadBackup() {
  const backup = buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `نسخة-مدرسة-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** قراءة ملف JSON ورفعه إلى قاعدة البيانات المحلية */
export async function importBackupFile(file: File): Promise<{ ok: true } | { ok: false; reason: string }> {
  let parsed: unknown;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'الملف تالف أو ليس JSON صالحاً' };
  }

  let state: AppState | null = null;

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Partial<BackupFile> & Partial<AppState>;
    if (obj.kind === BACKUP_KIND && isAppState(obj.state)) {
      state = obj.state;
    } else if (isAppState(obj)) {
      // دعم استيراد لقطة AppState مباشرة
      state = obj;
    }
  }

  if (!state) {
    return { ok: false, reason: 'هذا الملف ليس نسخة احتياطية للنظام' };
  }

  store.replaceState(state);
  return { ok: true };
}
