import * as XLSX from 'xlsx';
import { normalizeArabicText } from '../lib/normalize';
import { store } from '../store';
import { studentService } from './students';

export interface ParsedStudentRow {
  rowNumber: number;
  fullName: string;
  gradeHint?: string;
  sectionHint?: string;
  notes?: string;
  status: 'ok' | 'empty' | 'duplicate' | 'invalid';
  message?: string;
}

export interface StudentImportPreview {
  fileName: string;
  rows: ParsedStudentRow[];
  okCount: number;
}

const NAME_HEADERS = [
  'اسم الطالب',
  'اسم الطالب الثلاثي',
  'الاسم',
  'اسم',
  'الطالب',
  'name',
  'student',
  'student name',
  'fullname',
];

const GRADE_HEADERS = ['الصف', 'صف', 'grade'];
const SECTION_HEADERS = ['الشعبة', 'شعبة', 'section'];
const NOTES_HEADERS = ['ملاحظات', 'ملاحظة', 'notes'];

function normHeader(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findCol(headers: string[], candidates: string[]): number {
  const lower = candidates.map((c) => c.toLowerCase());
  return headers.findIndex((h) => lower.some((c) => h === c || h.includes(c)));
}

function cellStr(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function isLikelyName(s: string): boolean {
  if (!s) return false;
  if (/^\d+$/.test(s)) return false;
  if (s.length < 2) return false;
  // skip common header leftovers
  if (NAME_HEADERS.some((h) => normalizeArabicText(h) === normalizeArabicText(s))) return false;
  return true;
}

/** Download a blank Excel template for student lists */
export function downloadStudentTemplate() {
  const rows = [
    ['ت', 'اسم الطالب', 'الصف', 'الشعبة', 'ملاحظات'],
    [1, 'حسن علي غالب مردان', 'الأول', 'أ', ''],
    [2, 'محمد علي رشيد', 'الأول', 'أ', ''],
    [3, 'أحمد محمد جاسم', '', '', ''],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 20 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'طلاب');
  XLSX.writeFile(book, 'قالب_استيراد_الطلاب.xlsx');
}

/** Parse XLSX/XLS into student rows (preview only) */
export async function parseStudentsExcel(file: File): Promise<StudentImportPreview> {
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: 'array' });
  const sheetName = book.SheetNames[0];
  if (!sheetName) {
    return { fileName: file.name, rows: [], okCount: 0 };
  }
  const sheet = book.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  if (!matrix.length) {
    return { fileName: file.name, rows: [], okCount: 0 };
  }

  const first = matrix[0].map((c) => normHeader(c));
  const nameCol = findCol(first, NAME_HEADERS);
  const hasHeader = nameCol >= 0;
  const gradeCol = hasHeader ? findCol(first, GRADE_HEADERS) : -1;
  const sectionCol = hasHeader ? findCol(first, SECTION_HEADERS) : -1;
  const notesCol = hasHeader ? findCol(first, NOTES_HEADERS) : -1;

  // If no name header: use first non-numeric column, or column 1 if col0 looks like serial
  let fallbackNameCol = 0;
  if (!hasHeader && matrix[0]?.length) {
    const c0 = cellStr(matrix[0][0]);
    if (/^\d+$/.test(c0) && matrix[0].length > 1) fallbackNameCol = 1;
  }

  const dataStart = hasHeader ? 1 : 0;
  const nameIdx = hasHeader ? nameCol : fallbackNameCol;
  const seen = new Set<string>();
  const rows: ParsedStudentRow[] = [];

  for (let i = dataStart; i < matrix.length; i++) {
    const line = matrix[i] || [];
    const fullName = cellStr(line[nameIdx]);
    const rowNumber = i + 1;

    if (!fullName) {
      rows.push({ rowNumber, fullName: '', status: 'empty', message: 'صف فارغ' });
      continue;
    }
    if (!isLikelyName(fullName)) {
      rows.push({ rowNumber, fullName, status: 'invalid', message: 'ليس اسماً صالحاً' });
      continue;
    }

    const key = normalizeArabicText(fullName);
    if (seen.has(key)) {
      rows.push({
        rowNumber,
        fullName,
        gradeHint: gradeCol >= 0 ? cellStr(line[gradeCol]) : undefined,
        sectionHint: sectionCol >= 0 ? cellStr(line[sectionCol]) : undefined,
        notes: notesCol >= 0 ? cellStr(line[notesCol]) : undefined,
        status: 'duplicate',
        message: 'مكرر داخل الملف',
      });
      continue;
    }
    seen.add(key);

    rows.push({
      rowNumber,
      fullName,
      gradeHint: gradeCol >= 0 ? cellStr(line[gradeCol]) || undefined : undefined,
      sectionHint: sectionCol >= 0 ? cellStr(line[sectionCol]) || undefined : undefined,
      notes: notesCol >= 0 ? cellStr(line[notesCol]) || undefined : undefined,
      status: 'ok',
    });
  }

  return {
    fileName: file.name,
    rows,
    okCount: rows.filter((r) => r.status === 'ok').length,
  };
}

export interface ImportResult {
  added: number;
  skippedExisting: number;
  skippedInvalid: number;
}

/**
 * Import previewed rows into a target grade/section.
 * Skips students already in the same section (by normalized name).
 */
export function importStudentsToSection(
  preview: StudentImportPreview,
  gradeId: string,
  sectionId: string,
  options?: { skipExisting?: boolean },
): ImportResult {
  const skipExisting = options?.skipExisting !== false;
  const existing = store
    .getState()
    .students.filter((s) => s.sectionId === sectionId)
    .map((s) => s.normalizedName);

  const existingSet = new Set(existing);
  let added = 0;
  let skippedExisting = 0;
  let skippedInvalid = 0;

  for (const row of preview.rows) {
    if (row.status !== 'ok') {
      skippedInvalid += 1;
      continue;
    }
    const key = normalizeArabicText(row.fullName);
    if (skipExisting && existingSet.has(key)) {
      skippedExisting += 1;
      continue;
    }
    studentService.add({
      fullName: row.fullName,
      gradeId,
      sectionId,
      notes: row.notes,
    });
    existingSet.add(key);
    added += 1;
  }

  return { added, skippedExisting, skippedInvalid };
}
