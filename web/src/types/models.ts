/**
 * Firestore Data Model — all entities are Dynamic (never hard-coded in UI logic).
 *
 * Collection roots (top-level for flexible querying):
 *   schools, academicYears, grades, sections, subjects, students,
 *   enrollments, assessmentTemplates, assessments, scores,
 *   documents, imports, users
 */

export type UserRole = 'admin' | 'schoolAdmin' | 'teacher' | 'viewer';

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  schoolIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface School {
  id: string;
  name: string;
  nameNormalized: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  label: string; // e.g. "2024/2025"
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Grade level — Dynamic. Default maxScore is configurable, not hard-coded. */
export interface Grade {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string; // الأول، الثاني، ...
  nameNormalized: string;
  order: number;
  defaultMaxScore: number; // 10 or 100 — from Firestore, not code constants as truth
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  schoolId: string;
  academicYearId: string;
  gradeId: string;
  name: string; // أ، ب، ج
  nameNormalized: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  schoolId: string;
  academicYearId: string;
  gradeId: string;
  name: string;
  nameNormalized: string;
  assessmentTemplateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  schoolId: string;
  fullName: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  schoolId: string;
  studentId: string;
  academicYearId: string;
  gradeId: string;
  sectionId: string;
  status: 'active' | 'transferred' | 'withdrawn';
  createdAt: string;
  updatedAt: string;
}

export type ComponentValueType = 'numeric' | 'written' | 'both';

export interface AssessmentComponentDef {
  id: string;
  key: string; // coursework, exam, final, listening, ...
  label: string; // السعي، درجة الامتحان، ...
  order: number;
  valueType: ComponentValueType;
  maxScore?: number;
  isFinal?: boolean;
  contributesToFinal?: boolean;
}

export interface AssessmentTemplate {
  id: string;
  schoolId: string;
  academicYearId?: string;
  gradeId?: string;
  subjectId?: string;
  name: string;
  components: AssessmentComponentDef[];
  defaultMaxScore?: number;
  passScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  schoolId: string;
  academicYearId: string;
  gradeId: string;
  sectionId: string;
  subjectId: string;
  templateId: string;
  name: string;
  maxScore: number;
  documentId?: string;
  importId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreValues {
  [componentKey: string]: number | string | null;
}

export interface Score {
  id: string;
  schoolId: string;
  academicYearId: string;
  gradeId: string;
  sectionId: string;
  subjectId: string;
  assessmentId: string;
  studentId: string;
  enrollmentId: string;
  values: ScoreValues;
  finalNumeric?: number | null;
  finalWritten?: string | null;
  status?: 'pass' | 'fail' | 'incomplete' | 'unknown';
  sourceDocumentId?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentMime =
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.ms-excel'
  | 'application/pdf'
  | string;

export type DocumentStatus =
  | 'uploaded'
  | 'processing'
  | 'parsed'
  | 'review_required'
  | 'approved'
  | 'imported'
  | 'failed'
  | 'duplicate';

export interface DocumentMeta {
  id: string;
  schoolId: string;
  academicYearId?: string;
  fileName: string;
  mimeType: DocumentMime;
  storagePath: string;
  fileHash: string;
  sizeBytes: number;
  status: DocumentStatus;
  previousImportId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ImportStatus =
  | 'pending'
  | 'processing'
  | 'review'
  | 'approved'
  | 'importing'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface FieldConfidence<T = string> {
  value: T | null;
  confidence: number; // 0..1
  source: 'header' | 'filename' | 'table' | 'ai' | 'user' | 'inferred';
  needsReview: boolean;
}

export interface DetectedStudentRow {
  rowIndex: number;
  fullName: string;
  normalizedName: string;
  values: ScoreValues;
  issues: string[];
}

export interface FileProcessingResult {
  documentId: string;
  fileName: string;
  school: FieldConfidence;
  academicYear: FieldConfidence;
  grade: FieldConfidence;
  section: FieldConfidence;
  subject: FieldConfidence;
  studentsDetected: number;
  assessmentComponents: string[];
  rows: DetectedStudentRow[];
  confidence: number;
  issues: ImportIssueDraft[];
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ImportIssueDraft {
  code: string;
  severity: IssueSeverity;
  message: string;
  documentId?: string;
  studentName?: string;
  field?: string;
  meta?: Record<string, unknown>;
}

export interface ImportBatch {
  id: string;
  schoolId: string;
  academicYearId?: string;
  status: ImportStatus;
  documentIds: string[];
  fileCount: number;
  studentsCount: number;
  subjectsCount: number;
  warningsCount: number;
  errorsCount: number;
  results: FileProcessingResult[];
  matchSuggestions: StudentMatchSuggestion[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  completedAt?: string;
}

export interface StudentMatchSuggestion {
  id: string;
  leftName: string;
  rightName: string;
  leftDocumentId: string;
  rightDocumentId: string;
  similarity: number;
  decision: 'pending' | 'merge' | 'keep_separate';
}

/** Seed defaults — written to Firestore on first setup; UI reads from DB only. */
export const DEFAULT_GRADE_SEEDS: Array<{
  name: string;
  order: number;
  defaultMaxScore: number;
}> = [
  { name: 'الأول', order: 1, defaultMaxScore: 10 },
  { name: 'الثاني', order: 2, defaultMaxScore: 10 },
  { name: 'الثالث', order: 3, defaultMaxScore: 10 },
  { name: 'الرابع', order: 4, defaultMaxScore: 10 },
  { name: 'الخامس', order: 5, defaultMaxScore: 100 },
  { name: 'السادس', order: 6, defaultMaxScore: 100 },
];
