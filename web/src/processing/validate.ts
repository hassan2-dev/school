import type { FileProcessingResult, ImportIssueDraft } from '../types/models';

export interface ValidationContext {
  maxScoreByGradeName: Record<string, number>;
}

export function validateProcessingResults(
  results: FileProcessingResult[],
  ctx: ValidationContext,
): ImportIssueDraft[] {
  const issues: ImportIssueDraft[] = [];

  for (const r of results) {
    issues.push(...r.issues);

    if (!r.grade.value) {
      issues.push({
        code: 'GRADE_REQUIRED',
        severity: 'error',
        message: `الملف ${r.fileName}: الصف مطلوب`,
        documentId: r.documentId,
      });
    }
    if (!r.section.value) {
      issues.push({
        code: 'SECTION_REQUIRED',
        severity: 'error',
        message: `الملف ${r.fileName}: الشعبة مطلوبة`,
        documentId: r.documentId,
      });
    }
    if (!r.subject.value) {
      issues.push({
        code: 'SUBJECT_REQUIRED',
        severity: 'error',
        message: `الملف ${r.fileName}: المادة مطلوبة`,
        documentId: r.documentId,
      });
    }

    const maxScore =
      (r.grade.value && ctx.maxScoreByGradeName[r.grade.value]) ||
      (r.grade.value && ['الخامس', 'السادس'].includes(r.grade.value) ? 100 : 10);

    for (const row of r.rows) {
      for (const [key, val] of Object.entries(row.values)) {
        if (typeof val !== 'number') continue;
        if (val < 0) {
          issues.push({
            code: 'SCORE_NEGATIVE',
            severity: 'error',
            message: `${row.fullName}: درجة سالبة في ${key}`,
            documentId: r.documentId,
            studentName: row.fullName,
            field: key,
          });
        }
        if (val > maxScore) {
          issues.push({
            code: 'SCORE_EXCEEDS_MAX',
            severity: 'error',
            message: `${row.fullName}: ${val} / ${maxScore} تتجاوز الحد الأعلى (${key})`,
            documentId: r.documentId,
            studentName: row.fullName,
            field: key,
            meta: { value: val, maxScore },
          });
        }
      }
      for (const msg of row.issues) {
        issues.push({
          code: 'ROW_ISSUE',
          severity: 'warning',
          message: `${row.fullName}: ${msg}`,
          documentId: r.documentId,
          studentName: row.fullName,
        });
      }
    }
  }

  // Student count mismatch across files with same grade+section
  const groups = new Map<string, number[]>();
  for (const r of results) {
    const key = `${r.grade.value}|${r.section.value}`;
    if (!r.grade.value || !r.section.value) continue;
    const arr = groups.get(key) || [];
    arr.push(r.studentsDetected);
    groups.set(key, arr);
  }
  for (const [key, counts] of groups) {
    const uniq = [...new Set(counts)];
    if (uniq.length > 1) {
      issues.push({
        code: 'STUDENT_COUNT_MISMATCH',
        severity: 'warning',
        message: `اختلاف عدد الطلاب بين ملفات ${key.replace('|', ' / ')}: ${uniq.join(', ')}`,
        meta: { counts: uniq },
      });
    }
  }

  return dedupeIssues(issues);
}

function dedupeIssues(issues: ImportIssueDraft[]): ImportIssueDraft[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const k = `${i.code}|${i.message}|${i.documentId || ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function overallConfidence(result: FileProcessingResult): number {
  const fields = [result.school, result.academicYear, result.grade, result.section, result.subject];
  const avg = fields.reduce((s, f) => s + f.confidence, 0) / fields.length;
  const studentFactor = result.studentsDetected > 0 ? 0.97 : 0.4;
  const colFactor = result.assessmentComponents.length > 0 ? 0.95 : 0.5;
  return Math.round(((avg + studentFactor + colFactor) / 3) * 1000) / 1000;
}
