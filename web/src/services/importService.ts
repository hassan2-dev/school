import { nowIso, uid } from '../lib/normalize';
import type { FileProcessingResult, ImportBatch, StudentMatchSuggestion } from '../types/models';
import { dataService } from './dataService';
import { localStore } from './localStore';

export async function approveAndImport(params: {
  schoolId: string;
  academicYearId: string;
  results: FileProcessingResult[];
  matchSuggestions: StudentMatchSuggestion[];
  createdBy: string;
  hashes: Record<string, string>;
}): Promise<ImportBatch> {
  const t = nowIso();
  const importId = uid('imp');

  // Resolve grade / section ids from names (dynamic DB lookup)
  const grades = await dataService.getGrades(params.schoolId, params.academicYearId);
  let subjectsCount = 0;
  let studentsCount = 0;

  for (const result of params.results) {
    const grade = grades.find((g) => g.name === result.grade.value);
    if (!grade || !result.section.value || !result.subject.value) continue;

    const sections = await dataService.getSections(grade.id);
    let section = sections.find((s) => s.name === result.section.value);
    if (!section && result.section.value) {
      // create section dynamically
      const sec = {
        id: uid('sec'),
        schoolId: params.schoolId,
        academicYearId: params.academicYearId,
        gradeId: grade.id,
        name: result.section.value,
        nameNormalized: result.section.value,
        createdAt: t,
        updatedAt: t,
      };
      localStore.sections.push(sec);
      section = sec;
    }
    if (!section) continue;

    await dataService.findOrCreateSubject({
      schoolId: params.schoolId,
      academicYearId: params.academicYearId,
      gradeId: grade.id,
      name: result.subject.value,
    });
    subjectsCount += 1;

    for (const row of result.rows) {
      const student = await dataService.findOrCreateStudent(params.schoolId, row.fullName);
      const existingEnroll = localStore.enrollments.find(
        (e) =>
          e.studentId === student.id &&
          e.academicYearId === params.academicYearId &&
          e.sectionId === section!.id,
      );
      if (!existingEnroll) {
        localStore.enrollments.push({
          id: uid('enr'),
          schoolId: params.schoolId,
          studentId: student.id,
          academicYearId: params.academicYearId,
          gradeId: grade.id,
          sectionId: section.id,
          status: 'active',
          createdAt: t,
          updatedAt: t,
        });
      }

      const assessmentId = uid('asmt');
      localStore.scores.push({
        id: uid('score'),
        schoolId: params.schoolId,
        academicYearId: params.academicYearId,
        gradeId: grade.id,
        sectionId: section.id,
        subjectId: (await dataService.findOrCreateSubject({
          schoolId: params.schoolId,
          academicYearId: params.academicYearId,
          gradeId: grade.id,
          name: result.subject.value!,
        })).id,
        assessmentId,
        studentId: student.id,
        enrollmentId: existingEnroll?.id || localStore.enrollments.at(-1)!.id,
        values: row.values,
        finalNumeric:
          typeof row.values['الدرجة النهائية'] === 'number'
            ? (row.values['الدرجة النهائية'] as number)
            : typeof row.values['الدرجة'] === 'number'
              ? (row.values['الدرجة'] as number)
              : null,
        finalWritten:
          typeof row.values['الدرجة النهائية كتابة'] === 'string'
            ? String(row.values['الدرجة النهائية كتابة'])
            : null,
        sourceDocumentId: result.documentId,
        createdAt: t,
        updatedAt: t,
      });
      studentsCount += 1;
    }

    localStore.documents.push({
      id: result.documentId,
      schoolId: params.schoolId,
      academicYearId: params.academicYearId,
      fileName: result.fileName,
      mimeType: 'application/octet-stream',
      storagePath: `schools/${params.schoolId}/academic-years/${params.academicYearId}/documents/${result.documentId}/${result.fileName}`,
      fileHash: params.hashes[result.documentId] || '',
      sizeBytes: 0,
      status: 'imported',
      createdAt: t,
      updatedAt: t,
      createdBy: params.createdBy,
    });
  }

  const batch: ImportBatch = {
    id: importId,
    schoolId: params.schoolId,
    academicYearId: params.academicYearId,
    status: 'completed',
    documentIds: params.results.map((r) => r.documentId),
    fileCount: params.results.length,
    studentsCount,
    subjectsCount,
    warningsCount: 0,
    errorsCount: 0,
    results: params.results,
    matchSuggestions: params.matchSuggestions,
    createdAt: t,
    updatedAt: t,
    createdBy: params.createdBy,
    completedAt: t,
  };

  await dataService.saveImport(batch);
  return batch;
}
