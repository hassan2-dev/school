import { makeGroup, makeLeaf } from '../lib/columns';
import { normalizeArabicText, nowIso, uid } from '../lib/normalize';
import type {
  AppState,
  ColumnDef,
  GradeLevel,
  GradeTemplate,
  SchoolConfig,
  Section,
  Student,
} from '../types/core';
import { DEFAULT_GRADES, SUBJECTS_LOWER, SUBJECTS_UPPER } from '../types/core';

const G1_STUDENTS = [
  'حسن علي غالب مردان',
  'محمد علي رشيد',
  'أحمد محمد جاسم',
  'علي حسين كاظم',
  'يوسف عبد الله أحمد',
  'مصطفى كريم عباس',
  'حسين جبار محمد',
  'عمر سعدون إبراهيم',
  'زيد فراس محمود',
  'كريم نوري صالح',
  'باسم عادل جواد',
  'سيف الدين حاتم',
  'عبد الرحمن قاسم',
  'نور الدين طارق',
  'رسول عباس فيصل',
  'جاسم محمد علي',
  'فهد سلام كريم',
  'رائد خليل حسن',
  'سامر وليد جاسم',
  'طارق نعيم رشيد',
  'وليد صباح كاظم',
  'هيثم جميل عواد',
  'إياد موفق سعد',
  'مازن حيدر لطيف',
  'قصي أمين جابر',
  'أنس فؤاد ناجي',
  'بلال رعد سامي',
  'حارث موفق كريم',
  'ذياب علاء حسين',
  'سعد نبيل جاسم',
  'علاء فوزي محمد',
  'غسان راضي كريم',
  'لؤي سمير عباس',
  'مهند طلال حسن',
  'نادر وائل جاسم',
  'ياسر كمال علي',
  'أيمن سعد محمد',
];

const G5_STUDENTS = [
  'حسن أحمد جبير',
  'محمد كاظم علي',
  'علي جاسم محمد',
  'أحمد حسين رشيد',
  'يوسف كريم عباس',
  'مصطفى علي جابر',
  'حسين محمد كاظم',
  'عمر فؤاد سعد',
  'زيد نوري حسن',
  'كريم عادل جواد',
  'باسم طارق محمد',
  'سيف قاسم علي',
  'عبد الله حاتم',
  'نور جبار كريم',
  'رسول وليد جاسم',
  'جاسم سعدون إبراهيم',
  'فهد فراس محمود',
  'رائد نبيل صالح',
  'سامر أمين جابر',
  'طارق موفق كريم',
  'وليد علاء حسين',
  'هيثم صباح كاظم',
  'إياد جميل عواد',
  'مازن حيدر لطيف',
  'قصي رعد سامي',
  'أنس فوزي محمد',
  'بلال راضي كريم',
  'حارث سمير عباس',
  'ذياب طلال حسن',
  'سعد وائل جاسم',
  'علاء كمال علي',
  'غسان سعد محمد',
];

function simpleColumns(labels: string[]): ColumnDef[] {
  return labels.map((l) => makeLeaf(l));
}

function buildGradeTemplates(grades: GradeLevel[]): GradeTemplate[] {
  return grades.map((g) => {
    const isLower = g.order <= 4;
    const subjectNames = isLower ? SUBJECTS_LOWER : SUBJECTS_UPPER;
    const subjects = subjectNames.map((name) => {
      let columns: ColumnDef[];

      if (name === 'القراءة') {
        columns = [
          makeGroup('المهارات القرائية', ['القراءة', 'محفوظات']),
          makeGroup('المحادثة', ['محادثة للحفظ', 'محادثة للمناقشة']),
          makeGroup('الكتابة', ['إملاء على السبورة', 'حسن الخط']),
          makeLeaf('الدرجة النهائية'),
        ];
      } else if (name === 'اللغة الإنكليزية') {
        columns = [
          makeGroup('Skills', ['Listening', 'Speaking', 'Reading', 'Writing']),
          makeLeaf('Participation'),
          makeLeaf('Final Score'),
        ];
      } else if (!isLower && g.order >= 5) {
        columns =
          name === 'الرياضيات'
            ? [
                makeLeaf('السعي'),
                makeGroup('الامتحان', ['تحريري', 'شفهي']),
                makeLeaf('الدرجة النهائية'),
                makeLeaf('الدرجة النهائية كتابة'),
              ]
            : [
                makeLeaf('السعي'),
                makeLeaf('درجة الامتحان'),
                makeLeaf('الدرجة النهائية'),
              ];
      } else {
        columns = simpleColumns(['الدرجة النهائية']);
      }

      return { id: uid('sub'), name, columns };
    });

    return {
      gradeId: g.id,
      subjects,
      defaultSections: g.order <= 2 ? ['أ', 'ب', 'ج', 'د'] : ['أ', 'ب', 'ج'],
    };
  });
}

function addStudents(
  names: string[],
  gradeId: string,
  sectionId: string,
  t: string,
): Student[] {
  return names.map((fullName) => ({
    id: uid('stu'),
    fullName,
    normalizedName: normalizeArabicText(fullName),
    gradeId,
    sectionId,
    status: 'active' as const,
    promotionHistory: [],
    createdAt: t,
    updatedAt: t,
  }));
}

export function createEmptyState(): AppState {
  const config: SchoolConfig = {
    name: 'مدرسة عبد الله الرضيع الابتدائية',
    academicYear: '2024/2025',
    republicTitle: 'جمهورية العراق',
    ministryTitle: 'وزارة التربية',
    directorate: '',
  };

  const grades: GradeLevel[] = DEFAULT_GRADES.map((g) => ({
    ...g,
    id: `grade_${g.order}`,
  }));

  const sections: Section[] = [];
  for (const g of grades) {
    const letters = g.order <= 2 ? ['أ', 'ب', 'ج', 'د'] : ['أ', 'ب', 'ج'];
    for (const name of letters) {
      sections.push({ id: uid('sec'), gradeId: g.id, name });
    }
  }

  const templates = buildGradeTemplates(grades);
  return { config, grades, sections, templates, students: [], scores: [] };
}

/** بيانات تجريبية للعرض */
export function createDemoState(): AppState {
  const base = createEmptyState();
  const t = nowIso();
  const g1 = base.grades.find((g) => g.order === 1)!;
  const g5 = base.grades.find((g) => g.order === 5)!;
  const sec1A = base.sections.find((s) => s.gradeId === g1.id && s.name === 'أ')!;
  const sec5B = base.sections.find((s) => s.gradeId === g5.id && s.name === 'ب')!;

  return {
    ...base,
    students: [
      ...addStudents(G1_STUDENTS, g1.id, sec1A.id, t),
      ...addStudents(G5_STUDENTS, g5.id, sec5B.id, t),
    ],
    scores: [],
  };
}

/** افتراضي عند أول تشغيل: فارغ بدون طلاب */
export function createInitialState(): AppState {
  return createEmptyState();
}
