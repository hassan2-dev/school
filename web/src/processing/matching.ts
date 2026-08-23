import { normalizeArabicText, similarityRatio, uid } from '../lib/normalize';
import type { DetectedStudentRow, StudentMatchSuggestion } from '../types/models';

export interface NamedStudentRef {
  documentId: string;
  fullName: string;
  normalizedName: string;
}

/** Cross-file student matching with configurable thresholds. */
export function matchStudentsAcrossFiles(
  byDocument: { documentId: string; rows: DetectedStudentRow[] }[],
  autoMergeThreshold = 0.98,
  reviewThreshold = 0.85,
): { canonical: Map<string, string>; suggestions: StudentMatchSuggestion[] } {
  const all: NamedStudentRef[] = [];
  for (const doc of byDocument) {
    for (const row of doc.rows) {
      all.push({
        documentId: doc.documentId,
        fullName: row.fullName,
        normalizedName: row.normalizedName || normalizeArabicText(row.fullName),
      });
    }
  }

  const canonical = new Map<string, string>(); // normalizedName -> groupKey
  const suggestions: StudentMatchSuggestion[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (all[i].documentId === all[j].documentId) continue;
      const sim = similarityRatio(all[i].fullName, all[j].fullName);
      if (sim < reviewThreshold) continue;

      const a = all[i].normalizedName;
      const b = all[j].normalizedName;
      const pairKey = [a, b].sort().join('|');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      if (sim >= autoMergeThreshold) {
        const key = canonical.get(a) || canonical.get(b) || uid('stu');
        canonical.set(a, key);
        canonical.set(b, key);
      } else {
        suggestions.push({
          id: uid('match'),
          leftName: all[i].fullName,
          rightName: all[j].fullName,
          leftDocumentId: all[i].documentId,
          rightDocumentId: all[j].documentId,
          similarity: Math.round(sim * 1000) / 1000,
          decision: 'pending',
        });
      }
    }
  }

  return { canonical, suggestions };
}
