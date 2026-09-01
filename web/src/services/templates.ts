import {
  cloneColumns,
  convertColumnToGroup,
  ensureColumns,
  insertColumn,
  makeLeaf,
  removeColumnById,
  updateColumnLabel,
} from '../lib/columns';
import { uid } from '../lib/normalize';
import { store } from '../store';
import type { ColumnDef, GradeTemplate, SubjectTemplate } from '../types/core';

function getSubject(gradeId: string, subjectId: string): SubjectTemplate | undefined {
  return store.getState().templates.find((t) => t.gradeId === gradeId)?.subjects.find((s) => s.id === subjectId);
}

function cloneSubject(sub: SubjectTemplate, nameOverride?: string): SubjectTemplate {
  return {
    id: uid('sub'),
    name: (nameOverride ?? sub.name).trim(),
    columns: cloneColumns(ensureColumns(sub)),
  };
}

export const templateService = {
  getByGrade(gradeId: string): GradeTemplate | undefined {
    return store.getState().templates.find((t) => t.gradeId === gradeId);
  },

  getSubjects(gradeId: string): SubjectTemplate[] {
    return this.getByGrade(gradeId)?.subjects ?? [];
  },

  addSubject(gradeId: string, name: string, columns?: ColumnDef[]) {
    store.setState((s) => ({
      ...s,
      templates: s.templates.map((t) =>
        t.gradeId === gradeId
          ? {
              ...t,
              subjects: [
                ...t.subjects,
                {
                  id: uid('sub'),
                  name: name.trim(),
                  columns: columns ?? [makeLeaf('الدرجة النهائية')],
                },
              ],
            }
          : t,
      ),
    }));
  },

  updateSubject(gradeId: string, subjectId: string, patch: Partial<SubjectTemplate>) {
    store.setState((s) => ({
      ...s,
      templates: s.templates.map((t) =>
        t.gradeId === gradeId
          ? {
              ...t,
              subjects: t.subjects.map((sub) => (sub.id === subjectId ? { ...sub, ...patch } : sub)),
            }
          : t,
      ),
    }));
  },

  renameSubject(gradeId: string, subjectId: string, name: string) {
    this.updateSubject(gradeId, subjectId, { name: name.trim() });
  },

  setColumns(gradeId: string, subjectId: string, columns: ColumnDef[]) {
    this.updateSubject(gradeId, subjectId, { columns, components: undefined });
  },

  addColumn(gradeId: string, subjectId: string, parentId: string | null, label: string) {
    const subject = getSubject(gradeId, subjectId);
    if (!subject || !label.trim()) return;
    const columns = ensureColumns(subject);
    this.setColumns(gradeId, subjectId, insertColumn(columns, parentId, makeLeaf(label)));
  },

  renameColumn(gradeId: string, subjectId: string, columnId: string, label: string) {
    const subject = getSubject(gradeId, subjectId);
    if (!subject || !label.trim()) return;
    this.setColumns(gradeId, subjectId, updateColumnLabel(ensureColumns(subject), columnId, label));
  },

  removeColumn(gradeId: string, subjectId: string, columnId: string) {
    const subject = getSubject(gradeId, subjectId);
    if (!subject) return;
    this.setColumns(gradeId, subjectId, removeColumnById(ensureColumns(subject), columnId));
  },

  convertToGroup(gradeId: string, subjectId: string, columnId: string) {
    const subject = getSubject(gradeId, subjectId);
    if (!subject) return;
    this.setColumns(gradeId, subjectId, convertColumnToGroup(ensureColumns(subject), columnId));
  },

  removeSubject(gradeId: string, subjectId: string) {
    store.setState((s) => ({
      ...s,
      templates: s.templates.map((t) =>
        t.gradeId === gradeId ? { ...t, subjects: t.subjects.filter((sub) => sub.id !== subjectId) } : t,
      ),
      scores: s.scores.filter((sc) => sc.subjectId !== subjectId),
    }));
  },

  applyDefaultSections(gradeId: string) {
    const template = this.getByGrade(gradeId);
    if (!template) return;
    const existing = store
      .getState()
      .sections.filter((s) => s.gradeId === gradeId)
      .map((s) => s.name);
    for (const name of template.defaultSections) {
      if (!existing.includes(name)) {
        store.setState((s) => ({
          ...s,
          sections: [...s.sections, { id: uid('sec'), gradeId, name }],
        }));
      }
    }
  },

  /** نسخ مادة واحدة إلى صف آخر (مع أعمدة جديدة) */
  copySubject(
    sourceGradeId: string,
    subjectId: string,
    targetGradeId: string,
    newName?: string,
  ): { ok: true; subject: SubjectTemplate } | { ok: false; reason: string } {
    const source = getSubject(sourceGradeId, subjectId);
    if (!source) return { ok: false, reason: 'المادة غير موجودة' };

    const name = (newName ?? source.name).trim();
    if (!name) return { ok: false, reason: 'أدخل اسم المادة' };

    const target = this.getByGrade(targetGradeId);
    if (!target) return { ok: false, reason: 'الصف الهدف غير موجود' };

    if (target.subjects.some((s) => s.name.trim() === name)) {
      return { ok: false, reason: `يوجد مادة باسم "${name}" في الصف الهدف — غيّر الاسم` };
    }

    const copy = cloneSubject(source, name);
    store.setState((s) => ({
      ...s,
      templates: s.templates.map((t) =>
        t.gradeId === targetGradeId ? { ...t, subjects: [...t.subjects, copy] } : t,
      ),
    }));
    return { ok: true, subject: copy };
  },

  /**
   * نسخ قالب صف كامل إلى صف آخر
   * replace = يستبدل مواد الصف الهدف
   * merge = يضيف المواد (يتخطى الأسماء المكررة)
   */
  copyGradeTemplate(
    sourceGradeId: string,
    targetGradeId: string,
    mode: 'replace' | 'merge' = 'replace',
  ): { ok: true; added: number; skipped: number } | { ok: false; reason: string } {
    if (sourceGradeId === targetGradeId) {
      return { ok: false, reason: 'اختر صفاً مختلفاً عن الصف المصدر' };
    }

    const source = this.getByGrade(sourceGradeId);
    if (!source) return { ok: false, reason: 'الصف المصدر غير موجود' };

    const target = this.getByGrade(targetGradeId);
    if (!target) return { ok: false, reason: 'الصف الهدف غير موجود' };

    const copies = source.subjects.map((sub) => cloneSubject(sub));
    const removedSubjectIds = mode === 'replace' ? target.subjects.map((s) => s.id) : [];

    let added = 0;
    let skipped = 0;

    store.setState((s) => ({
      ...s,
      templates: s.templates.map((t) => {
        if (t.gradeId !== targetGradeId) return t;

        if (mode === 'replace') {
          added = copies.length;
          skipped = 0;
          return {
            ...t,
            subjects: copies,
            defaultSections: [...source.defaultSections],
          };
        }

        const existingNames = new Set(t.subjects.map((sub) => sub.name.trim()));
        const toAdd = copies.filter((sub) => {
          const name = sub.name.trim();
          if (existingNames.has(name)) {
            skipped += 1;
            return false;
          }
          existingNames.add(name);
          added += 1;
          return true;
        });

        return {
          ...t,
          subjects: [...t.subjects, ...toAdd],
          defaultSections: t.defaultSections.length ? t.defaultSections : [...source.defaultSections],
        };
      }),
      scores:
        mode === 'replace' && removedSubjectIds.length
          ? s.scores.filter((sc) => !removedSubjectIds.includes(sc.subjectId))
          : s.scores,
    }));

    return { ok: true, added, skipped };
  },
};
