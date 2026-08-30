/** النموذج الجديد — مدرسة واحدة، قاعدة طلاب مركزية، بدون تسجيل دخول */

export type PrintSheetStyle = 'classic' | 'formal' | 'clean';

export interface SchoolConfig {
  name: string;
  academicYear: string; // 2024/2025
  /** سطر الدولة في رأس الطباعة */
  republicTitle?: string;
  /** سطر الوزارة */
  ministryTitle?: string;
  /** المديرية / المنطقة */
  directorate?: string;
  /** عنوان الكشف المحفوظ */
  documentTitle?: string;
  /** نوع الامتحان المحفوظ */
  examLabel?: string;
  /** اسم المعلم المحفوظ */
  teacherName?: string;
  /** قالب شكل الطباعة */
  printStyle?: PrintSheetStyle;
}

/** حقول رأس كشف المادة — قابلة للتعديل قبل الطباعة */
export interface PrintHeader {
  republicTitle: string;
  ministryTitle: string;
  directorate: string;
  schoolName: string;
  academicYear: string;
  documentTitle: string;
  examLabel: string;
  teacherName: string;
  style: PrintSheetStyle;
}

export interface GradeLevel {
  id: string;
  name: string; // الأول، الثاني...
  order: number;
  maxScore: number; // 10 أو 100
}

export interface Section {
  id: string;
  gradeId: string;
  name: string; // أ، ب، ج
}

/** قالب المواد لكل صف — ثابت وقابل للتعديل */
export interface GradeTemplate {
  gradeId: string;
  subjects: SubjectTemplate[];
  defaultSections: string[]; // ['أ','ب','ج']
}

/** عمود درجات — يمكن أن يحتوي أعمدة فرعية */
export interface ColumnDef {
  id: string;
  label: string;
  /** أعمدة فرعية — إذا فارغ فالعمود leaf وقابل للإدخال */
  children: ColumnDef[];
}

export interface SubjectTemplate {
  id: string;
  name: string;
  /** أعمدة الدرجات — هيكل شجري (رئيسي → فرعي → فرعي...) */
  columns: ColumnDef[];
  /**
   * @deprecated قديم — للتوافق مع الـ seed الحالي
   * سيُحوّل تلقائياً إلى columns عند القراءة
   */
  components?: string[];
}

export type StudentStatus = 'active' | 'graduated' | 'withdrawn' | 'repeated';

export interface PromotionRecord {
  academicYear: string;
  fromGradeId: string;
  toGradeId: string | null;
  sectionId: string;
  result: 'pass' | 'fail' | 'promoted' | 'repeated';
  averageScore?: number;
  date: string;
}

/** الطالب — السجل المركزي */
export interface Student {
  id: string;
  fullName: string;
  normalizedName: string;
  gradeId: string;
  sectionId: string;
  status: StudentStatus;
  promotionHistory: PromotionRecord[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreRecord {
  id: string;
  studentId: string;
  gradeId: string;
  sectionId: string;
  subjectId: string;
  academicYear: string;
  values: Record<string, number | string | null>;
  finalScore: number | null;
  status: 'pass' | 'fail' | 'incomplete';
}

export interface AppState {
  config: SchoolConfig;
  grades: GradeLevel[];
  sections: Section[];
  templates: GradeTemplate[];
  students: Student[];
  scores: ScoreRecord[];
}

export const DEFAULT_GRADES: Omit<GradeLevel, 'id'>[] = [
  { name: 'الأول', order: 1, maxScore: 10 },
  { name: 'الثاني', order: 2, maxScore: 10 },
  { name: 'الثالث', order: 3, maxScore: 10 },
  { name: 'الرابع', order: 4, maxScore: 10 },
  { name: 'الخامس', order: 5, maxScore: 100 },
  { name: 'السادس', order: 6, maxScore: 100 },
];

export const SUBJECTS_LOWER = [
  'الرياضيات',
  'العلوم',
  'القراءة',
  'التربية الإسلامية',
  'اللغة الإنكليزية',
  'التربية الرياضية',
  'الفنية والنشيد',
];

export const SUBJECTS_UPPER = [
  'الرياضيات',
  'العلوم',
  'اللغة العربية',
  'التربية الإسلامية',
  'اللغة الإنكليزية',
  'التربية الرياضية',
  'الاجتماعيات',
];

export const READING_COMPONENTS = [
  'القراءة',
  'محفوظات',
  'محادثة للحفظ',
  'محادثة للمناقشة',
  'إملاء على السبورة',
  'حسن الخط',
  'الدرجة النهائية',
];

export const MATH_UPPER_COMPONENTS = ['السعي', 'درجة الامتحان', 'الدرجة النهائية', 'الدرجة النهائية كتابة'];

export const ENGLISH_COMPONENTS = [
  'Listening',
  'Speaking',
  'Reading',
  'Writing',
  'Participation',
  'Final Score',
];
