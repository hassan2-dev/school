import { isFirebaseConfigured } from '../lib/firebase';
import { defaultSyncMeta, readSyncMeta, schoolDb, type SyncMeta } from '../db/schoolDb';
import type { AppState } from '../types/core';

/**
 * طبقة المزامنة السحابية.
 * حالياً: IndexedDB محلي فقط.
 * لاحقاً: عند ضبط VITE_FIREBASE_* تُرفع/تُجلب اللقطة من Firestore.
 */
export const syncService = {
  isCloudReady(): boolean {
    return isFirebaseConfigured;
  },

  async getMeta(): Promise<SyncMeta> {
    return readSyncMeta();
  },

  /**
   * رفع البيانات للسحابة — جاهزة للتفعيل عند إعداد Firebase.
   * لا تفعل شيئاً حالياً إن لم تُضبط المفاتيح.
   */
  async pushToCloud(_state: AppState): Promise<{ ok: boolean; message: string }> {
    if (!isFirebaseConfigured) {
      return {
        ok: false,
        message: 'المزامنة السحابية غير مفعّلة بعد — البيانات محفوظة محلياً في IndexedDB',
      };
    }

    // مكان الربط لاحقاً: كتابة لقطة AppState إلى Firestore
    // مثال: await setDoc(doc(db, 'schools', schoolId, 'snapshots', 'app'), { state, updatedAt })
    return {
      ok: false,
      message: 'Firebase مضبوط لكن رفع اللقطة لم يُفعَّل بعد — قريباً',
    };
  },

  /** بعد مزامنة ناجحة — حدّث الوسم المحلي */
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
      return 'محلي (IndexedDB) — المزامنة السحابية جاهزة للتفعيل لاحقاً';
    }
    if (meta.pendingSync) return 'محلي + تغييرات بانتظار المزامنة';
    if (meta.lastSyncedAt) return `متزامن آخر مرة: ${new Date(meta.lastSyncedAt).toLocaleString('ar-IQ')}`;
    return 'سحابة جاهزة — لم تتم مزامنة بعد';
  },
};
