import { normalizeArabicText, nowIso, uid } from '../lib/normalize';
import { store } from '../store';
import type { PromotionRecord, Student, StudentStatus } from '../types/core';

export const studentService = {
  getAll(): Student[] {
    return store.getState().students;
  },

  getByGrade(gradeId: string): Student[] {
    return store.getState().students.filter((s) => s.gradeId === gradeId && s.status === 'active');
  },

  getBySection(sectionId: string): Student[] {
    return store.getState().students.filter((s) => s.sectionId === sectionId && s.status === 'active');
  },

  getById(id: string): Student | undefined {
    return store.getState().students.find((s) => s.id === id);
  },

  add(input: { fullName: string; gradeId: string; sectionId: string; notes?: string }) {
    const t = nowIso();
    const student: Student = {
      id: uid('stu'),
      fullName: input.fullName.trim(),
      normalizedName: normalizeArabicText(input.fullName),
      gradeId: input.gradeId,
      sectionId: input.sectionId,
      status: 'active',
      promotionHistory: [],
      notes: input.notes,
      createdAt: t,
      updatedAt: t,
    };
    store.setState((s) => ({ ...s, students: [...s.students, student] }));
    return student;
  },

  update(id: string, patch: Partial<Pick<Student, 'fullName' | 'gradeId' | 'sectionId' | 'status' | 'notes'>>) {
    store.setState((s) => ({
      ...s,
      students: s.students.map((st) =>
        st.id === id
          ? {
              ...st,
              ...patch,
              fullName: patch.fullName?.trim() ?? st.fullName,
              normalizedName: patch.fullName ? normalizeArabicText(patch.fullName) : st.normalizedName,
              updatedAt: nowIso(),
            }
          : st,
      ),
    }));
  },

  remove(id: string) {
    store.setState((s) => ({
      ...s,
      students: s.students.filter((st) => st.id !== id),
      scores: s.scores.filter((sc) => sc.studentId !== id),
    }));
  },

  moveToSection(studentId: string, sectionId: string) {
    this.update(studentId, { sectionId });
  },

  moveToGrade(studentId: string, gradeId: string, sectionId: string, record: PromotionRecord) {
    store.setState((s) => ({
      ...s,
      students: s.students.map((st) =>
        st.id === studentId
          ? {
              ...st,
              gradeId,
              sectionId,
              promotionHistory: [...st.promotionHistory, record],
              updatedAt: nowIso(),
            }
          : st,
      ),
    }));
  },

  setStatus(id: string, status: StudentStatus) {
    this.update(id, { status });
  },

  search(query: string): Student[] {
    const q = normalizeArabicText(query);
    if (!q) return store.getState().students;
    return store.getState().students.filter((s) => s.normalizedName.includes(q) || s.fullName.includes(query));
  },
};
