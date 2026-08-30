import { store } from '../store';
import type { PrintHeader, SchoolConfig } from '../types/core';

export const configService = {
  get(): SchoolConfig {
    return store.getState().config;
  },

  update(patch: Partial<SchoolConfig>) {
    store.setState((s) => ({
      ...s,
      config: { ...s.config, ...patch },
    }));
  },

  /** حفظ رأس الطباعة بالكامل مع بيانات المدرسة */
  savePrintHeader(header: PrintHeader) {
    this.update({
      name: header.schoolName.trim() || this.get().name,
      academicYear: header.academicYear.trim() || this.get().academicYear,
      republicTitle: header.republicTitle.trim(),
      ministryTitle: header.ministryTitle.trim(),
      directorate: header.directorate.trim(),
      documentTitle: header.documentTitle.trim(),
      examLabel: header.examLabel.trim(),
      teacherName: header.teacherName.trim(),
      printStyle: header.style,
    });
  },

  toPrintHeader(config?: SchoolConfig): PrintHeader {
    const c = config ?? this.get();
    return {
      republicTitle: c.republicTitle || 'جمهورية العراق',
      ministryTitle: c.ministryTitle || 'وزارة التربية',
      directorate: c.directorate || '',
      schoolName: c.name,
      academicYear: c.academicYear,
      documentTitle: c.documentTitle || 'كشف درجات المادة',
      examLabel: c.examLabel || 'امتحان نهاية السنة',
      teacherName: c.teacherName || '',
      style: c.printStyle || 'formal',
    };
  },
};
