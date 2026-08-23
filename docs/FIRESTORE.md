# Firestore Data Model

All domain data is Dynamic. Defaults (grades 1–6, max scores) are **seeded once**, then edited from Admin UI.

## Collections

| Collection | Key fields |
|------------|------------|
| `users` | email, role, schoolIds[] |
| `schools` | name, nameNormalized |
| `academicYears` | schoolId, label, isActive |
| `grades` | schoolId, academicYearId, name, order, **defaultMaxScore** |
| `sections` | schoolId, gradeId, name |
| `subjects` | schoolId, gradeId, name, nameNormalized, assessmentTemplateId? |
| `students` | schoolId, fullName, normalizedName |
| `enrollments` | studentId, academicYearId, gradeId, sectionId |
| `assessmentTemplates` | schoolId, components[], defaultMaxScore? |
| `assessments` | sectionId, subjectId, templateId, maxScore |
| `scores` | assessmentId, studentId, values{}, finalNumeric?, finalWritten? |
| `documents` | schoolId, storagePath, fileHash, status |
| `imports` | schoolId, results[], matchSuggestions[], status |

## Hierarchy (logical)

```
School → AcademicYear → Grade → Section
                              ├─ Enrollments → Students
                              └─ Subjects → Assessments → Scores
```

## Grade scale

Stored on `grades.defaultMaxScore` (and optionally on templates/components).

Typical seed (editable):

- الأول…الرابع → 10
- الخامس…السادس → 100

## Subject uniqueness

Lookup by `schoolId + gradeId + nameNormalized` before CREATE SUBJECT.
