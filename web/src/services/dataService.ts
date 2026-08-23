import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { normalizeArabicText, nowIso, uid } from '../lib/normalize';
import type {
  AcademicYear,
  Grade,
  ImportBatch,
  School,
  Section,
  Student,
  Subject,
} from '../types/models';
import { localStore, maxScoreMapFromStore } from './localStore';

async function listCollection<T>(name: string, schoolId?: string): Promise<T[]> {
  if (!isFirebaseConfigured || !db) {
    const store = localStore as unknown as Record<string, T[]>;
    const keyMap: Record<string, string> = {
      schools: 'schools',
      academicYears: 'academicYears',
      grades: 'grades',
      sections: 'sections',
      subjects: 'subjects',
      students: 'students',
      enrollments: 'enrollments',
      assessmentTemplates: 'templates',
      imports: 'imports',
      documents: 'documents',
      scores: 'scores',
    };
    let rows = (store[keyMap[name]] || []) as T[];
    if (schoolId) {
      rows = rows.filter((r) => (r as { schoolId?: string }).schoolId === schoolId || name === 'schools');
    }
    return rows;
  }

  const col = collection(db, name);
  const q = schoolId ? query(col, where('schoolId', '==', schoolId)) : col;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export const dataService = {
  isDemo: !isFirebaseConfigured,

  async getSchools(): Promise<School[]> {
    if (!isFirebaseConfigured) return localStore.schools;
    return listCollection<School>('schools');
  },

  async getAcademicYears(schoolId: string): Promise<AcademicYear[]> {
    if (!isFirebaseConfigured) {
      return localStore.academicYears.filter((y) => y.schoolId === schoolId);
    }
    return listCollection<AcademicYear>('academicYears', schoolId);
  },

  async getGrades(schoolId: string, academicYearId: string): Promise<Grade[]> {
    if (!isFirebaseConfigured) {
      return localStore.grades
        .filter((g) => g.schoolId === schoolId && g.academicYearId === academicYearId)
        .sort((a, b) => a.order - b.order);
    }
    const all = await listCollection<Grade>('grades', schoolId);
    return all.filter((g) => g.academicYearId === academicYearId).sort((a, b) => a.order - b.order);
  },

  async getSections(gradeId: string): Promise<Section[]> {
    if (!isFirebaseConfigured) {
      return localStore.sections.filter((s) => s.gradeId === gradeId);
    }
    if (!db) return [];
    const q = query(collection(db, 'sections'), where('gradeId', '==', gradeId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Section);
  },

  async getSubjects(gradeId: string): Promise<Subject[]> {
    if (!isFirebaseConfigured) {
      return localStore.subjects.filter((s) => s.gradeId === gradeId);
    }
    if (!db) return [];
    const q = query(collection(db, 'subjects'), where('gradeId', '==', gradeId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Subject);
  },

  async getDashboardStats(schoolId?: string) {
    const schools = await this.getSchools();
    const school = schoolId ? schools.find((s) => s.id === schoolId) : schools[0];
    if (!school) {
      return { schools: 0, students: 0, grades: 0, sections: 0, subjects: 0, documents: 0, imports: 0 };
    }
    if (!isFirebaseConfigured) {
      return {
        schools: localStore.schools.length,
        students: localStore.students.length,
        grades: localStore.grades.filter((g) => g.schoolId === school.id).length,
        sections: localStore.sections.filter((s) => s.schoolId === school.id).length,
        subjects: localStore.subjects.filter((s) => s.schoolId === school.id).length,
        documents: localStore.documents.filter((d) => d.schoolId === school.id).length,
        imports: localStore.imports.filter((i) => i.schoolId === school.id).length,
      };
    }
    const [students, grades, sections, subjects, documents, imports] = await Promise.all([
      listCollection('students', school.id),
      listCollection('grades', school.id),
      listCollection('sections', school.id),
      listCollection('subjects', school.id),
      listCollection('documents', school.id),
      listCollection('imports', school.id),
    ]);
    return {
      schools: schools.length,
      students: students.length,
      grades: grades.length,
      sections: sections.length,
      subjects: subjects.length,
      documents: documents.length,
      imports: imports.length,
    };
  },

  getMaxScoreMap(): Record<string, number> {
    return maxScoreMapFromStore();
  },

  async findOrCreateSubject(input: {
    schoolId: string;
    academicYearId: string;
    gradeId: string;
    name: string;
  }): Promise<Subject> {
    const nameNormalized = normalizeArabicText(input.name);
    if (!isFirebaseConfigured) {
      const existing = localStore.subjects.find(
        (s) =>
          s.schoolId === input.schoolId &&
          s.gradeId === input.gradeId &&
          s.nameNormalized === nameNormalized,
      );
      if (existing) return existing;
      const t = nowIso();
      const subject: Subject = {
        id: uid('sub'),
        ...input,
        nameNormalized,
        createdAt: t,
        updatedAt: t,
      };
      localStore.subjects.push(subject);
      return subject;
    }
    if (!db) throw new Error('Firestore not ready');
    const q = query(
      collection(db, 'subjects'),
      where('schoolId', '==', input.schoolId),
      where('gradeId', '==', input.gradeId),
      where('nameNormalized', '==', nameNormalized),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as Subject;
    }
    const id = uid('sub');
    const t = nowIso();
    const subject: Subject = { id, ...input, nameNormalized, createdAt: t, updatedAt: t };
    await setDoc(doc(db, 'subjects', id), subject as DocumentData);
    return subject;
  },

  async findOrCreateStudent(schoolId: string, fullName: string): Promise<Student> {
    const normalizedName = normalizeArabicText(fullName);
    if (!isFirebaseConfigured) {
      const existing = localStore.students.find(
        (s) => s.schoolId === schoolId && s.normalizedName === normalizedName,
      );
      if (existing) return existing;
      const t = nowIso();
      const student: Student = {
        id: uid('stu'),
        schoolId,
        fullName,
        normalizedName,
        createdAt: t,
        updatedAt: t,
      };
      localStore.students.push(student);
      return student;
    }
    if (!db) throw new Error('Firestore not ready');
    const q = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId),
      where('normalizedName', '==', normalizedName),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as Student;
    }
    const id = uid('stu');
    const t = nowIso();
    const student: Student = { id, schoolId, fullName, normalizedName, createdAt: t, updatedAt: t };
    await setDoc(doc(db, 'students', id), student as DocumentData);
    return student;
  },

  async saveImport(batch: ImportBatch): Promise<void> {
    if (!isFirebaseConfigured) {
      const idx = localStore.imports.findIndex((i) => i.id === batch.id);
      if (idx >= 0) localStore.imports[idx] = batch;
      else localStore.imports.unshift(batch);
      return;
    }
    if (!db) throw new Error('Firestore not ready');
    await setDoc(doc(db, 'imports', batch.id), batch as DocumentData);
  },

  async getImports(schoolId: string): Promise<ImportBatch[]> {
    if (!isFirebaseConfigured) {
      return localStore.imports.filter((i) => i.schoolId === schoolId);
    }
    return listCollection<ImportBatch>('imports', schoolId);
  },

  async getKnownHashes(schoolId: string): Promise<Set<string>> {
    if (!isFirebaseConfigured) {
      return new Set(localStore.documents.filter((d) => d.schoolId === schoolId).map((d) => d.fileHash));
    }
    const docs = await listCollection<{ fileHash: string }>('documents', schoolId);
    return new Set(docs.map((d) => d.fileHash));
  },

  getTree(schoolId: string, academicYearId: string) {
    const grades = localStore.grades
      .filter((g) => g.schoolId === schoolId && g.academicYearId === academicYearId)
      .sort((a, b) => a.order - b.order);
    return grades.map((g) => ({
      grade: g,
      sections: localStore.sections.filter((s) => s.gradeId === g.id),
    }));
  },
};
