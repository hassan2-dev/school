import { store } from '../store';
import type { GradeLevel } from '../types/core';

export const gradeService = {
  getAll(): GradeLevel[] {
    return [...store.getState().grades].sort((a, b) => a.order - b.order);
  },

  getById(id: string): GradeLevel | undefined {
    return store.getState().grades.find((g) => g.id === id);
  },

  getNext(gradeId: string): GradeLevel | null {
    const current = this.getById(gradeId);
    if (!current) return null;
    return store.getState().grades.find((g) => g.order === current.order + 1) ?? null;
  },

  updateMaxScore(gradeId: string, maxScore: number) {
    store.setState((s) => ({
      ...s,
      grades: s.grades.map((g) => (g.id === gradeId ? { ...g, maxScore } : g)),
    }));
  },

  getPassThreshold(grade: GradeLevel): number {
    return grade.maxScore >= 100 ? 50 : 5;
  },
};
