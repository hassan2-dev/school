import { nowIso } from '../lib/normalize';
import { store } from '../store';
import type { PromotionRecord, ScoreRecord } from '../types/core';
import { gradeService } from './grades';
import { studentService } from './students';

export interface PromotionPreview {
  studentId: string;
  fullName: string;
  gradeName: string;
  sectionName: string;
  average: number | null;
  willPromote: boolean;
  nextGradeName: string | null;
  reason: string;
}

function calcAverage(scores: ScoreRecord[], studentId: string): number | null {
  const mine = scores.filter((s) => s.studentId === studentId && s.finalScore != null);
  if (!mine.length) return null;
  const avg = mine.reduce((sum, s) => sum + (s.finalScore ?? 0), 0) / mine.length;
  return Math.round(avg * 10) / 10;
}

export const promotionService = {
  preview(gradeId?: string): PromotionPreview[] {
    const state = store.getState();
    const students = gradeId
      ? state.students.filter((s) => s.gradeId === gradeId && s.status === 'active')
      : state.students.filter((s) => s.status === 'active');

    return students.map((st) => {
      const grade = gradeService.getById(st.gradeId)!;
      const section = state.sections.find((s) => s.id === st.sectionId);
      const next = gradeService.getNext(st.gradeId);
      const avg = calcAverage(state.scores, st.id);
      const threshold = gradeService.getPassThreshold(grade);
      const willPromote = avg != null && avg >= threshold && next != null;
      const isLast = !next;

      let reason = '';
      if (avg == null) reason = 'لا توجد درجات كافية';
      else if (avg < threshold) reason = `معدل ${avg} أقل من ${threshold}`;
      else if (isLast) reason = 'تخرج من المرحلة الابتدائية';
      else reason = `ناجح — ينتقل إلى ${next.name}`;

      return {
        studentId: st.id,
        fullName: st.fullName,
        gradeName: grade.name,
        sectionName: section?.name ?? '—',
        average: avg,
        willPromote: willPromote || (avg != null && avg >= threshold && isLast),
        nextGradeName: next?.name ?? (isLast && avg != null && avg >= threshold ? 'تخرج' : null),
        reason,
      };
    });
  },

  /** ترقية الطلاب الناجحين تلقائياً */
  promotePassing(gradeId?: string, targetSectionName?: string) {
    const previews = this.preview(gradeId);
    const toPromote = previews.filter((p) => p.willPromote);
    const state = store.getState();
    const t = nowIso();
    let promoted = 0;
    let graduated = 0;

    for (const p of toPromote) {
      const student = studentService.getById(p.studentId)!;
      const next = gradeService.getNext(student.gradeId);

      if (!next) {
        studentService.setStatus(student.id, 'graduated');
        const record: PromotionRecord = {
          academicYear: state.config.academicYear,
          fromGradeId: student.gradeId,
          toGradeId: null,
          sectionId: student.sectionId,
          result: 'promoted',
          averageScore: p.average ?? undefined,
          date: t,
        };
        studentService.moveToGrade(student.id, student.gradeId, student.sectionId, record);
        graduated++;
        continue;
      }

      // ابحث عن شعبة بنفس الاسم في الصف التالي أو أول شعبة
      const nextSections = state.sections.filter((s) => s.gradeId === next.id);
      const currentSection = state.sections.find((s) => s.id === student.sectionId);
      const targetSection =
        nextSections.find((s) => s.name === (targetSectionName || currentSection?.name)) ||
        nextSections[0];

      if (!targetSection) continue;

      const record: PromotionRecord = {
        academicYear: state.config.academicYear,
        fromGradeId: student.gradeId,
        toGradeId: next.id,
        sectionId: targetSection.id,
        result: 'promoted',
        averageScore: p.average ?? undefined,
        date: t,
      };

      studentService.moveToGrade(student.id, next.id, targetSection.id, record);
      promoted++;
    }

    return { promoted, graduated, total: toPromote.length };
  },

  /** ترقية طالب واحد يدوياً */
  promoteOne(studentId: string, toGradeId: string, toSectionId: string) {
    const state = store.getState();
    const student = studentService.getById(studentId);
    if (!student) throw new Error('الطالب غير موجود');

    const record: PromotionRecord = {
      academicYear: state.config.academicYear,
      fromGradeId: student.gradeId,
      toGradeId,
      sectionId: toSectionId,
      result: 'promoted',
      date: nowIso(),
    };

    studentService.moveToGrade(studentId, toGradeId, toSectionId, record);
  },

  repeatStudent(studentId: string) {
    const state = store.getState();
    const student = studentService.getById(studentId);
    if (!student) return;

    const record: PromotionRecord = {
      academicYear: state.config.academicYear,
      fromGradeId: student.gradeId,
      toGradeId: student.gradeId,
      sectionId: student.sectionId,
      result: 'repeated',
      date: nowIso(),
    };

    studentService.setStatus(studentId, 'repeated');
    store.setState((s) => ({
      ...s,
      students: s.students.map((st) =>
        st.id === studentId
          ? { ...st, status: 'active', promotionHistory: [...st.promotionHistory, record] }
          : st,
      ),
    }));
  },
};
