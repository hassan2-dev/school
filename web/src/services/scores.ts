import { uid } from '../lib/normalize';
import { store } from '../store';
import type { ScoreRecord } from '../types/core';
import { gradeService } from './grades';

export const scoreService = {
  getForStudent(studentId: string): ScoreRecord[] {
    return store.getState().scores.filter((s) => s.studentId === studentId);
  },

  getForSectionSubject(sectionId: string, subjectId: string): ScoreRecord[] {
    return store.getState().scores.filter(
      (s) => s.sectionId === sectionId && s.subjectId === subjectId,
    );
  },

  upsert(input: {
    studentId: string;
    gradeId: string;
    sectionId: string;
    subjectId: string;
    values: Record<string, number | string | null>;
    finalScore?: number | null;
  }) {
    const state = store.getState();
    const grade = gradeService.getById(input.gradeId)!;
    const threshold = gradeService.getPassThreshold(grade);
    const final = input.finalScore ?? extractFinal(input.values);
    const status =
      final == null ? 'incomplete' : final >= threshold ? 'pass' : 'fail';

    const existing = state.scores.find(
      (s) =>
        s.studentId === input.studentId &&
        s.subjectId === input.subjectId &&
        s.academicYear === state.config.academicYear,
    );

    if (existing) {
      store.setState((s) => ({
        ...s,
        scores: s.scores.map((sc) =>
          sc.id === existing.id
            ? { ...sc, values: input.values, finalScore: final, status }
            : sc,
        ),
      }));
      return existing;
    }

    const record: ScoreRecord = {
      id: uid('score'),
      studentId: input.studentId,
      gradeId: input.gradeId,
      sectionId: input.sectionId,
      subjectId: input.subjectId,
      academicYear: state.config.academicYear,
      values: input.values,
      finalScore: final,
      status,
    };
    store.setState((s) => ({ ...s, scores: [...s.scores, record] }));
    return record;
  },
};

function extractFinal(values: Record<string, number | string | null>): number | null {
  const keys = ['الدرجة النهائية', 'Final Score', 'الدرجة', 'النهائية'];
  for (const k of keys) {
    const v = values[k];
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && !isNaN(Number(v))) return Number(v);
  }
  const nums = Object.values(values).filter((v) => typeof v === 'number') as number[];
  return nums.length ? nums[nums.length - 1] : null;
}
