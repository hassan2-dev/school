import { uid } from '../lib/normalize';
import { store } from '../store';
import type { Section } from '../types/core';

export const sectionService = {
  getByGrade(gradeId: string): Section[] {
    return store.getState().sections.filter((s) => s.gradeId === gradeId);
  },

  getById(id: string): Section | undefined {
    return store.getState().sections.find((s) => s.id === id);
  },

  add(gradeId: string, name: string) {
    const trimmed = name.trim();
    const exists = store.getState().sections.some((s) => s.gradeId === gradeId && s.name === trimmed);
    if (exists) throw new Error('الشعبة موجودة مسبقاً');

    const section: Section = { id: uid('sec'), gradeId, name: trimmed };
    store.setState((s) => ({ ...s, sections: [...s.sections, section] }));
    return section;
  },

  rename(id: string, name: string) {
    store.setState((s) => ({
      ...s,
      sections: s.sections.map((sec) => (sec.id === id ? { ...sec, name: name.trim() } : sec)),
    }));
  },

  remove(id: string) {
    const hasStudents = store.getState().students.some((st) => st.sectionId === id);
    if (hasStudents) throw new Error('لا يمكن حذف شعبة فيها طلاب — انقل الطلاب أولاً');
    store.setState((s) => ({ ...s, sections: s.sections.filter((sec) => sec.id !== id) }));
  },
};
