import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { defaultSyncMeta, readSyncMeta, schoolDb, type SyncMeta } from '../db/schoolDb';
import type { AppState } from '../types/core';
import { store } from '../store';

/** مستند واحد في Firestore يحفظ لقطة المدرسة كاملة */
const SNAPSHOT_PATH = ['schoolData', 'main'] as const;

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

export const syncService = {
  isCloudReady(): boolean {
    return isFirebaseConfigured;
  },

  async getMeta(): Promise<SyncMeta> {
    return readSyncMeta();
  },

  /** رفع البيانات المحلية إلى Firebase */
  async pushToCloud(state?: AppState): Promise<{ ok: boolean; message: string }> {
    if (!isFirebaseConfigured || !db) {
      return {
        ok: false,
        message: 'Firebase غير مضبوط — تأكد من ملف .env وأعد تشغيل السيرفر',
      };
    }

    const payload = state ?? store.getState();
    const updatedAt = new Date().toISOString();

    try {
      await setDoc(doc(db, ...SNAPSHOT_PATH), {
        state: payload,
        updatedAt,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      });
      await this.markSynced();
      return { ok: true, message: 'تم رفع البيانات إلى Firebase بنجاح' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل الرفع';
      return {
        ok: false,
        message: `${msg} — تأكد أنك أنشأت Firestore (Test mode)`,
      };
    }
  },

  /** جلب البيانات من Firebase إلى هذا المتصفح */
  async pullFromCloud(): Promise<{ ok: boolean; message: string }> {
    if (!isFirebaseConfigured || !db) {
      return {
        ok: false,
        message: 'Firebase غير مضبوط — تأكد من ملف .env وأعد تشغيل السيرفر',
      };
    }

    try {
      const snap = await getDoc(doc(db, ...SNAPSHOT_PATH));
      if (!snap.exists()) {
        return {
          ok: false,
          message: 'لا توجد بيانات في السحابة بعد — ارفع من المتصفح اللي فيه البيانات أولاً',
        };
      }

      const data = snap.data();
      if (!isAppState(data.state)) {
        return { ok: false, message: 'بيانات السحابة تالفة أو غير متوافقة' };
      }

      store.replaceState(data.state);
      await this.markSynced();
      return { ok: true, message: 'تم جلب البيانات من Firebase إلى هذا المتصفح' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل الجلب';
      return {
        ok: false,
        message: `${msg} — تأكد أنك أنشأت Firestore (Test mode)`,
      };
    }
  },

  async markSynced(): Promise<void> {
    const meta = (await schoolDb.syncMeta.get('sync')) ?? defaultSyncMeta();
    await schoolDb.syncMeta.put({
      ...meta,
      lastSyncedAt: new Date().toISOString(),
      pendingSync: false,
    });
  },

  statusLabel(meta: SyncMeta): string {
    if (!isFirebaseConfigured) {
      return 'محلي (IndexedDB) — أضف مفاتيح Firebase في .env';
    }
    if (meta.lastSyncedAt) {
      return `Firebase متصل · آخر مزامنة: ${new Date(meta.lastSyncedAt).toLocaleString('ar-IQ')}`;
    }
    if (meta.pendingSync) return 'Firebase متصل · يوجد بيانات محلية بانتظار الرفع';
    return 'Firebase متصل · جاهز للمزامنة';
  },
};
