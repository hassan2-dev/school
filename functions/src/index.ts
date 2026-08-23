import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { logger } from 'firebase-functions';

admin.initializeApp();
const db = admin.firestore();

/**
 * Heavy / secret-backed processing stays here:
 * - AI fallback when client confidence is low
 * - Large batch imports
 * - Server-side PDF/OCR later
 */
export const analyzeDocumentFallback = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const { documentId, textExcerpt, lowConfidenceFields } = request.data as {
    documentId?: string;
    textExcerpt?: string;
    lowConfidenceFields?: string[];
  };

  if (!documentId) {
    throw new HttpsError('invalid-argument', 'documentId is required');
  }

  // Placeholder: plug Gemini/OpenAI with secrets via functions config / Secret Manager.
  logger.info('AI fallback requested', {
    uid: request.auth.uid,
    documentId,
    fields: lowConfidenceFields,
    excerptLength: textExcerpt?.length ?? 0,
  });

  return {
    ok: true,
    message: 'AI fallback stub — connect provider secrets before production use',
    suggestions: {},
  };
});

/** Optional: react when a grade file lands in Storage. */
export const onGradeFileUploaded = onObjectFinalized(async (event) => {
  const name = event.data.name || '';
  if (!name.includes('/documents/')) return;
  logger.info('Grade document uploaded', { name, size: event.data.size });
  // Future: enqueue server-side parse job and update documents/{id}.status
});

export const finalizeLargeImport = onCall({ cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }
  const { importId } = request.data as { importId?: string };
  if (!importId) throw new HttpsError('invalid-argument', 'importId required');

  const ref = db.collection('imports').doc(importId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Import not found');

  await ref.set(
    {
      status: 'completed',
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      serverFinalized: true,
    },
    { merge: true },
  );

  return { ok: true };
});
