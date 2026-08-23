import type { FieldConfidence, ImportIssueDraft } from '../types/models';
import { normalizeArabicText } from '../lib/normalize';

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export interface ParsedDocument {
  text: string;
  tables: ParsedTable[];
  fileName: string;
}

const YEAR_RE = /(20\d{2})\s*[\/\\-]\s*(20\d{2})/;
const GRADE_SECTION_RE =
  /(?:الصف|صف)?\s*(الأول|الثاني|الثالث|الرابع|الخامس|السادس|اول|ثاني|ثالث|رابع|خامس|سادس)\s*([أبجدهوزحطيكلمنسعفصقرشتثخذضظغ]|[اأ]?)\b/u;
const SUBJECT_RE = /(?:المادة|ماده)\s*[:：]?\s*([^\n\r]+)/;
const SCHOOL_RE = /(مدرسة\s+[^\n\r]+)/;

function conf(value: string | null, confidence: number, source: FieldConfidence['source']): FieldConfidence {
  return {
    value,
    confidence,
    source,
    needsReview: value == null || confidence < 0.85,
  };
}

export function extractHeaderFields(doc: ParsedDocument): {
  school: FieldConfidence;
  academicYear: FieldConfidence;
  grade: FieldConfidence;
  section: FieldConfidence;
  subject: FieldConfidence;
  issues: ImportIssueDraft[];
} {
  const blob = `${doc.fileName}\n${doc.text}`;
  const issues: ImportIssueDraft[] = [];

  let school: FieldConfidence = conf(null, 0, 'header');
  const schoolMatch = blob.match(SCHOOL_RE);
  if (schoolMatch) {
    school = conf(schoolMatch[1].trim(), 0.95, 'header');
  } else {
    issues.push({ code: 'SCHOOL_UNKNOWN', severity: 'warning', message: 'تعذر التعرف على اسم المدرسة' });
  }

  let academicYear: FieldConfidence = conf(null, 0, 'header');
  const yearMatch = blob.match(YEAR_RE);
  if (yearMatch) {
    academicYear = conf(`${yearMatch[1]}/${yearMatch[2]}`, 0.98, 'header');
  } else {
    issues.push({ code: 'YEAR_UNKNOWN', severity: 'warning', message: 'تعذر التعرف على العام الدراسي' });
  }

  let grade: FieldConfidence = conf(null, 0, 'header');
  let section: FieldConfidence = conf(null, 0, 'header');

  const gs = blob.match(GRADE_SECTION_RE);
  if (gs) {
    grade = conf(normalizeGradeName(gs[1]), 0.97, 'header');
    const sec = (gs[2] || '').trim();
    if (sec) {
      section = conf(sec, 0.95, 'header');
    } else {
      issues.push({ code: 'SECTION_UNKNOWN', severity: 'warning', message: 'تعذر التعرف على الشعبة' });
    }
  } else {
    // filename fallback e.g. رياضيات الخامس ب.docx
    const fromName = doc.fileName.match(
      /(الأول|الثاني|الثالث|الرابع|الخامس|السادس)\s*([أبجدهوزحت])/u,
    );
    if (fromName) {
      grade = conf(normalizeGradeName(fromName[1]), 0.9, 'filename');
      section = conf(fromName[2], 0.88, 'filename');
    } else {
      issues.push({ code: 'GRADE_UNKNOWN', severity: 'warning', message: 'تعذر التعرف على الصف' });
      issues.push({ code: 'SECTION_UNKNOWN', severity: 'warning', message: 'تعذر التعرف على الشعبة' });
    }
  }

  let subject: FieldConfidence = conf(null, 0, 'header');
  const subMatch = blob.match(SUBJECT_RE);
  if (subMatch) {
    subject = conf(cleanSubject(subMatch[1]), 0.98, 'header');
  } else {
    const guessed = guessSubjectFromFileName(doc.fileName);
    if (guessed) {
      subject = conf(guessed, 0.86, 'filename');
    } else {
      issues.push({ code: 'SUBJECT_UNKNOWN', severity: 'warning', message: 'تعذر التعرف على المادة' });
    }
  }

  return { school, academicYear, grade, section, subject, issues };
}

function normalizeGradeName(raw: string): string {
  const map: Record<string, string> = {
    اول: 'الأول',
    الأول: 'الأول',
    ثاني: 'الثاني',
    الثاني: 'الثاني',
    ثالث: 'الثالث',
    الثالث: 'الثالث',
    رابع: 'الرابع',
    الرابع: 'الرابع',
    خامس: 'الخامس',
    الخامس: 'الخامس',
    سادس: 'السادس',
    السادس: 'السادس',
  };
  return map[raw] ?? raw;
}

function cleanSubject(s: string): string {
  return s.replace(/[:：]/g, '').split(/\s{2,}|\n/)[0].trim();
}

function guessSubjectFromFileName(name: string): string | null {
  const base = name.replace(/\.[^.]+$/, '');
  const known = [
    'الرياضيات',
    'رياضيات',
    'العلوم',
    'علوم',
    'القراءة',
    'قراءة',
    'التربية الإسلامية',
    'الإسلامية',
    'اسلامية',
    'اللغة الإنكليزية',
    'الإنكليزي',
    'انكليزي',
    'الإنجليزية',
    'التربية الرياضية',
    'الرياضة',
    'رياضة',
    'الفنية والنشيد',
    'الفنية',
    'فنية',
  ];
  for (const k of known) {
    if (base.includes(k)) {
      if (k.includes('رياض') && !k.includes('رياضي')) {
        if (base.includes('رياضة') || base.includes('رياضية')) return 'التربية الرياضية';
        return 'الرياضيات';
      }
      if (k.includes('علم')) return 'العلوم';
      if (k.includes('قراء')) return 'القراءة';
      if (k.includes('اسلام') || k.includes('إسلام')) return 'التربية الإسلامية';
      if (k.includes('انكل') || k.includes('إنكل') || k.includes('إنجل') || k.includes('انجل'))
        return 'اللغة الإنكليزية';
      if (k.includes('فني')) return 'الفنية والنشيد';
      return k.startsWith('ال') ? k : `ال${k}`;
    }
  }
  return null;
}

/** Detect assessment column headers from table. */
export function detectAssessmentComponents(headers: string[]): string[] {
  const skip = new Set(
    ['ت', 'ت.', 'الرقم', 'رقم', 'اسم', 'اسم الطالب', 'الطالب', 'م', 'no', 'name', 'student'].map(
      normalizeArabicText,
    ),
  );

  return headers
    .map((h) => h.trim())
    .filter((h) => h && !skip.has(normalizeArabicText(h)))
    .filter((h) => !/^ملاحظات?$/i.test(h));
}

export function extractStudentRows(
  table: ParsedTable,
  components: string[],
): { rowIndex: number; fullName: string; values: Record<string, number | string | null>; issues: string[] }[] {
  const headersNorm = table.headers.map((h) => normalizeArabicText(h));
  const nameIdx = headersNorm.findIndex(
    (h) => h.includes('اسم') || h.includes('الطالب') || h === 'name' || h === 'student',
  );
  const nameColumn = nameIdx >= 0 ? nameIdx : 1;

  const componentIndexes = components.map((c) => {
    const n = normalizeArabicText(c);
    return headersNorm.findIndex((h) => h === n || h.includes(n) || n.includes(h));
  });

  return table.rows
    .map((row, rowIndex) => {
      const fullName = (row[nameColumn] || '').trim();
      const issues: string[] = [];
      if (!fullName || /^\d+$/.test(fullName)) {
        return null;
      }

      const values: Record<string, number | string | null> = {};
      components.forEach((c, i) => {
        const idx = componentIndexes[i];
        const raw = idx >= 0 ? (row[idx] ?? '').trim() : '';
        if (!raw) {
          values[c] = null;
          return;
        }
        if (/[\u0600-\u06FF]/.test(raw) && !/\d/.test(raw)) {
          values[c] = raw;
        } else {
          const num = Number(String(raw).replace(/[^\d.]/g, ''));
          values[c] = Number.isFinite(num) ? num : raw;
        }
      });

      const hasAnyScore = Object.values(values).some((v) => v !== null && v !== '');
      if (!hasAnyScore) issues.push('طالب بدون درجة');

      return { rowIndex, fullName, values, issues };
    })
    .filter(Boolean) as {
    rowIndex: number;
    fullName: string;
    values: Record<string, number | string | null>;
    issues: string[];
  }[];
}
