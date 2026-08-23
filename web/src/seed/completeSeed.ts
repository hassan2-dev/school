import {
  DEFAULT_GRADE_SEEDS,
  type AcademicYear,
  type AppUser,
  type AssessmentTemplate,
  type DocumentMeta,
  type Enrollment,
  type Grade,
  type ImportBatch,
  type School,
  type Score,
  type Section,
  type Student,
  type Subject,
} from '../types/models';
import { normalizeArabicText, nowIso } from '../lib/normalize';

/** Stable IDs so demos and screenshots stay consistent for handoff. */
export const SEED_IDS = {
  school: 'school_abdullah_alradee',
  year2425: 'year_2024_2025',
  year2526: 'year_2025_2026',
  admin: 'demo-admin',
} as const;

const SUBJECTS_LOWER = [
  'الرياضيات',
  'العلوم',
  'القراءة',
  'التربية الإسلامية',
  'اللغة الإنكليزية',
  'التربية الرياضية',
  'الفنية والنشيد',
] as const;

const SUBJECTS_UPPER = [
  'الرياضيات',
  'العلوم',
  'اللغة العربية',
  'التربية الإسلامية',
  'اللغة الإنكليزية',
  'التربية الرياضية',
  'الاجتماعيات',
] as const;

export const DEMO_STUDENTS_G1 = [
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

export const DEMO_STUDENTS_G5 = [
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

const WRITTEN: Record<number, string> = {
  95: 'خمسة وتسعون',
  88: 'ثمانية وثمانون',
  91: 'واحد وتسعون',
  76: 'ستة وسبعون',
  82: 'اثنان وثمانون',
  70: 'سبعون',
  64: 'أربعة وستون',
  58: 'ثمانية وخمسون',
  100: 'مائة',
  50: 'خمسون',
};

function score10(i: number): number {
  return Math.min(10, Math.max(4, 5 + ((i * 3) % 6)));
}

function score100(i: number): { coursework: number; exam: number; final: number } {
  const coursework = 25 + ((i * 5) % 16);
  const exam = 30 + ((i * 7) % 31);
  const final = Math.min(100, coursework + exam);
  return { coursework, exam, final };
}

export interface SeedBundle {
  users: AppUser[];
  schools: School[];
  academicYears: AcademicYear[];
  grades: Grade[];
  sections: Section[];
  subjects: Subject[];
  students: Student[];
  enrollments: Enrollment[];
  templates: AssessmentTemplate[];
  scores: Score[];
  documents: DocumentMeta[];
  imports: ImportBatch[];
}

export function buildCompleteSeed(now = nowIso()): SeedBundle {
  const school: School = {
    id: SEED_IDS.school,
    name: 'مدرسة عبد الله الرضيع الابتدائية',
    nameNormalized: normalizeArabicText('مدرسة عبد الله الرضيع الابتدائية'),
    address: 'بغداد — العراق',
    phone: '07xx-xxx-xxxx',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const yearActive: AcademicYear = {
    id: SEED_IDS.year2425,
    schoolId: school.id,
    label: '2024/2025',
    startDate: '2024-09-01',
    endDate: '2025-06-30',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const yearNext: AcademicYear = {
    id: SEED_IDS.year2526,
    schoolId: school.id,
    label: '2025/2026',
    isActive: false,
    createdAt: now,
    updatedAt: now,
  };

  const grades: Grade[] = [];
  const sections: Section[] = [];
  const subjects: Subject[] = [];
  const templates: AssessmentTemplate[] = [];

  const sectionLetters = ['أ', 'ب', 'ج', 'د'];

  for (const g of DEFAULT_GRADE_SEEDS) {
    const gradeId = `grade_${g.order}_${SEED_IDS.year2425}`;
    grades.push({
      id: gradeId,
      schoolId: school.id,
      academicYearId: yearActive.id,
      name: g.name,
      nameNormalized: normalizeArabicText(g.name),
      order: g.order,
      defaultMaxScore: g.defaultMaxScore,
      createdAt: now,
      updatedAt: now,
    });

    const letters = g.order <= 2 ? sectionLetters : ['أ', 'ب', 'ج'];
    for (const letter of letters) {
      sections.push({
        id: `sec_${g.order}_${letter}_${SEED_IDS.year2425}`,
        schoolId: school.id,
        academicYearId: yearActive.id,
        gradeId,
        name: letter,
        nameNormalized: normalizeArabicText(letter),
        createdAt: now,
        updatedAt: now,
      });
    }

    const subjectNames = g.order <= 4 ? SUBJECTS_LOWER : SUBJECTS_UPPER;
    for (const name of subjectNames) {
      const subId = `sub_${g.order}_${normalizeArabicText(name).replace(/\s+/g, '_')}`;
      subjects.push({
        id: subId,
        schoolId: school.id,
        academicYearId: yearActive.id,
        gradeId,
        name,
        nameNormalized: normalizeArabicText(name),
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const g1 = grades.find((x) => x.order === 1)!;
  const g5 = grades.find((x) => x.order === 5)!;
  const sec1A = sections.find((s) => s.gradeId === g1.id && s.name === 'أ')!;
  const sec5B = sections.find((s) => s.gradeId === g5.id && s.name === 'ب')!;

  templates.push(
    {
      id: 'tpl_g5_math',
      schoolId: school.id,
      academicYearId: yearActive.id,
      gradeId: g5.id,
      name: 'الخامس - الرياضيات',
      components: [
        { id: 'c_cw', key: 'coursework', label: 'السعي', order: 1, valueType: 'numeric', maxScore: 40 },
        { id: 'c_ex', key: 'exam', label: 'درجة الامتحان', order: 2, valueType: 'numeric', maxScore: 60 },
        {
          id: 'c_fn',
          key: 'final',
          label: 'الدرجة النهائية',
          order: 3,
          valueType: 'both',
          maxScore: 100,
          isFinal: true,
        },
      ],
      defaultMaxScore: 100,
      passScore: 50,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tpl_g1_reading',
      schoolId: school.id,
      academicYearId: yearActive.id,
      gradeId: g1.id,
      name: 'الأول - القراءة',
      components: [
        'القراءة',
        'محفوظات',
        'محادثة للحفظ',
        'محادثة للمناقشة',
        'إملاء على السبورة',
        'حسن الخط',
        'الدرجة النهائية',
      ].map((label, i) => ({
        id: `c_r_${i}`,
        key: `c${i + 1}`,
        label,
        order: i + 1,
        valueType: 'numeric' as const,
        maxScore: 10,
        isFinal: label === 'الدرجة النهائية',
      })),
      defaultMaxScore: 10,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tpl_english',
      schoolId: school.id,
      academicYearId: yearActive.id,
      name: 'اللغة الإنكليزية - مكونات',
      components: [
        'Listening comprehension',
        'Speaking / pronunciation',
        'Reading',
        'Writing',
        'Participation',
        'Final Score',
      ].map((label, i) => ({
        id: `c_en_${i}`,
        key: `en${i + 1}`,
        label,
        order: i + 1,
        valueType: 'numeric' as const,
        maxScore: 10,
        isFinal: label === 'Final Score',
      })),
      defaultMaxScore: 10,
      createdAt: now,
      updatedAt: now,
    },
  );

  const students: Student[] = [];
  const enrollments: Enrollment[] = [];
  const scores: Score[] = [];

  function addClass(
    names: string[],
    grade: Grade,
    section: Section,
    prefix: string,
    fillScores: boolean,
  ) {
    names.forEach((fullName, i) => {
      const studentId = `${prefix}_stu_${i + 1}`;
      students.push({
        id: studentId,
        schoolId: school.id,
        fullName,
        normalizedName: normalizeArabicText(fullName),
        createdAt: now,
        updatedAt: now,
      });
      const enrollmentId = `${prefix}_enr_${i + 1}`;
      enrollments.push({
        id: enrollmentId,
        schoolId: school.id,
        studentId,
        academicYearId: yearActive.id,
        gradeId: grade.id,
        sectionId: section.id,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      if (!fillScores) return;

      const gradeSubjects = subjects.filter((s) => s.gradeId === grade.id);
      for (const subject of gradeSubjects) {
        const assessmentId = `${prefix}_asmt_${subject.id}_${i + 1}`;
        if (grade.defaultMaxScore >= 100) {
          const sc = score100(i);
          scores.push({
            id: `${prefix}_score_${subject.id}_${i + 1}`,
            schoolId: school.id,
            academicYearId: yearActive.id,
            gradeId: grade.id,
            sectionId: section.id,
            subjectId: subject.id,
            assessmentId,
            studentId,
            enrollmentId,
            values: {
              السعي: sc.coursework,
              'درجة الامتحان': sc.exam,
              'الدرجة النهائية': sc.final,
              'الدرجة النهائية كتابة': WRITTEN[sc.final] || String(sc.final),
            },
            finalNumeric: sc.final,
            finalWritten: WRITTEN[sc.final] || undefined,
            status: sc.final >= 50 ? 'pass' : 'fail',
            createdAt: now,
            updatedAt: now,
          });
        } else {
          const final = score10(i);
          const values: Record<string, number> = { 'الدرجة النهائية': final };
          if (subject.name === 'القراءة') {
            values['القراءة'] = score10(i);
            values['محفوظات'] = score10(i + 1);
            values['محادثة للحفظ'] = score10(i + 2);
            values['محادثة للمناقشة'] = score10(i + 3);
            values['إملاء على السبورة'] = score10(i + 4);
            values['حسن الخط'] = score10(i + 5);
          } else if (subject.name === 'اللغة الإنكليزية') {
            values['Listening comprehension'] = score10(i);
            values['Speaking / pronunciation'] = score10(i + 1);
            values['Reading'] = score10(i + 2);
            values['Writing'] = score10(i + 3);
            values['Participation'] = score10(i + 4);
            values['Final Score'] = final;
          } else {
            values['الدرجة'] = final;
          }
          scores.push({
            id: `${prefix}_score_${subject.id}_${i + 1}`,
            schoolId: school.id,
            academicYearId: yearActive.id,
            gradeId: grade.id,
            sectionId: section.id,
            subjectId: subject.id,
            assessmentId,
            studentId,
            enrollmentId,
            values,
            finalNumeric: final,
            status: final >= 5 ? 'pass' : 'fail',
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    });
  }

  addClass(DEMO_STUDENTS_G1, g1, sec1A, 'g1a', true);
  addClass(DEMO_STUDENTS_G5, g5, sec5B, 'g5b', true);

  const documents: DocumentMeta[] = [
    {
      id: 'doc_seed_math_g5b',
      schoolId: school.id,
      academicYearId: yearActive.id,
      fileName: 'رياضيات الخامس ب.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      storagePath: `schools/${school.id}/academic-years/${yearActive.id}/documents/doc_seed_math_g5b/رياضيات الخامس ب.xlsx`,
      fileHash: 'seedhash_math_g5b_demo',
      sizeBytes: 12400,
      status: 'imported',
      createdAt: now,
      updatedAt: now,
      createdBy: SEED_IDS.admin,
    },
    {
      id: 'doc_seed_reading_g1a',
      schoolId: school.id,
      academicYearId: yearActive.id,
      fileName: 'القراءة الأول أ.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      storagePath: `schools/${school.id}/academic-years/${yearActive.id}/documents/doc_seed_reading_g1a/القراءة الأول أ.xlsx`,
      fileHash: 'seedhash_reading_g1a_demo',
      sizeBytes: 9800,
      status: 'imported',
      createdAt: now,
      updatedAt: now,
      createdBy: SEED_IDS.admin,
    },
  ];

  const imports: ImportBatch[] = [
    {
      id: 'imp_seed_001',
      schoolId: school.id,
      academicYearId: yearActive.id,
      status: 'completed',
      documentIds: documents.map((d) => d.id),
      fileCount: 2,
      studentsCount: DEMO_STUDENTS_G1.length + DEMO_STUDENTS_G5.length,
      subjectsCount: 2,
      warningsCount: 0,
      errorsCount: 0,
      results: [],
      matchSuggestions: [],
      createdAt: now,
      updatedAt: now,
      createdBy: SEED_IDS.admin,
      completedAt: now,
    },
  ];

  const users: AppUser[] = [
    {
      id: SEED_IDS.admin,
      email: 'admin@school.local',
      displayName: 'مدير النظام',
      role: 'admin',
      schoolIds: [school.id],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-school-admin',
      email: 'school@alradee.local',
      displayName: 'مدير المدرسة',
      role: 'schoolAdmin',
      schoolIds: [school.id],
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    users,
    schools: [school],
    academicYears: [yearActive, yearNext],
    grades,
    sections,
    subjects,
    students,
    enrollments,
    templates,
    scores,
    documents,
    imports,
  };
}
