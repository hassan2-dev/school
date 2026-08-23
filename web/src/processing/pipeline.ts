import { sha256File } from '../lib/hash';
import { normalizeArabicText, uid } from '../lib/normalize';
import type { DetectedStudentRow, FileProcessingResult, ImportIssueDraft } from '../types/models';
import {
  detectAssessmentComponents,
  extractHeaderFields,
  extractStudentRows,
} from './extract';
import { matchStudentsAcrossFiles } from './matching';
import { parseFile } from './parsers';
import { overallConfidence, validateProcessingResults } from './validate';

export interface PipelineProgress {
  fileName: string;
  step: string;
  done: boolean;
  error?: string;
}

export interface PipelineOutput {
  results: FileProcessingResult[];
  matchSuggestions: ReturnType<typeof matchStudentsAcrossFiles>['suggestions'];
  issues: ImportIssueDraft[];
  hashes: Record<string, string>;
}

export async function runImportPipeline(
  files: File[],
  options: {
    maxScoreByGradeName: Record<string, number>;
    knownHashes?: Set<string>;
    onProgress?: (p: PipelineProgress) => void;
  },
): Promise<PipelineOutput> {
  const results: FileProcessingResult[] = [];
  const hashes: Record<string, string> = {};
  const earlyIssues: ImportIssueDraft[] = [];

  for (const file of files) {
    const documentId = uid('doc');
    options.onProgress?.({ fileName: file.name, step: 'جاري حساب بصمة الملف...', done: false });

    try {
      const hash = await sha256File(file);
      hashes[documentId] = hash;

      if (options.knownHashes?.has(hash)) {
        earlyIssues.push({
          code: 'DUPLICATE_DOCUMENT',
          severity: 'warning',
          message: `الملف ${file.name} مستورد مسبقاً`,
          documentId,
        });
      }

      options.onProgress?.({ fileName: file.name, step: 'جاري قراءة الملف...', done: false });
      const parsed = await parseFile(file);

      options.onProgress?.({ fileName: file.name, step: 'استخراج الترويسة...', done: false });
      const header = extractHeaderFields(parsed);

      options.onProgress?.({ fileName: file.name, step: 'تحليل الجداول...', done: false });
      const bestTable = pickBestTable(parsed.tables);
      const components = bestTable ? detectAssessmentComponents(bestTable.headers) : [];
      const extracted = bestTable ? extractStudentRows(bestTable, components) : [];

      const rows: DetectedStudentRow[] = extracted.map((r) => ({
        rowIndex: r.rowIndex,
        fullName: r.fullName,
        normalizedName: normalizeArabicText(r.fullName),
        values: r.values,
        issues: r.issues,
      }));

      const result: FileProcessingResult = {
        documentId,
        fileName: file.name,
        school: header.school,
        academicYear: header.academicYear,
        grade: header.grade,
        section: header.section,
        subject: header.subject,
        studentsDetected: rows.length,
        assessmentComponents: components,
        rows,
        confidence: 0,
        issues: [
          ...header.issues.map((i) => ({ ...i, documentId })),
          ...(bestTable
            ? []
            : [
                {
                  code: 'TABLE_UNCLEAR',
                  severity: 'warning' as const,
                  message: 'تعذر التعرف على بنية الجدول بوضوح',
                  documentId,
                },
              ]),
        ],
      };
      result.confidence = overallConfidence(result);
      results.push(result);

      options.onProgress?.({
        fileName: file.name,
        step: `✓ ${result.subject.value || 'مادة؟'} — ${rows.length} طالب`,
        done: true,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'فشل قراءة الملف';
      earlyIssues.push({
        code: 'PARSE_FAILED',
        severity: 'error',
        message: `${file.name}: ${message}`,
        documentId,
      });
      options.onProgress?.({ fileName: file.name, step: message, done: true, error: message });
    }
  }

  options.onProgress?.({ fileName: '', step: 'مطابقة الطلاب بين الملفات...', done: false });
  const { suggestions } = matchStudentsAcrossFiles(
    results.map((r) => ({ documentId: r.documentId, rows: r.rows })),
  );

  const issues = [
    ...earlyIssues,
    ...validateProcessingResults(results, { maxScoreByGradeName: options.maxScoreByGradeName }),
  ];

  options.onProgress?.({ fileName: '', step: 'اكتمل التحليل', done: true });
  return { results, matchSuggestions: suggestions, issues, hashes };
}

function pickBestTable(tables: { headers: string[]; rows: string[][] }[]) {
  if (!tables.length) return null;
  return [...tables].sort((a, b) => b.rows.length - a.rows.length || b.headers.length - a.headers.length)[0];
}
