import { Link, useParams } from 'react-router-dom';
import { IndividualGradeSheet, buildBlankIndividual } from '../components/print/GradeSheets';
import { Btn, PageHeader, Panel } from '../components/ui';
import { useStore } from '../hooks/useStore';
import { scoreService } from '../services/scores';
import { templateService } from '../services/templates';

export function StudentPage() {
  const { studentId } = useParams();
  const { students, grades, sections, config } = useStore();
  const student = students.find((s) => s.id === studentId);
  const grade = grades.find((g) => g.id === student?.gradeId);
  const section = sections.find((s) => s.id === student?.sectionId);
  const template = student ? templateService.getByGrade(student.gradeId) : null;
  const studentScores = student ? scoreService.getForStudent(student.id) : [];

  if (!student || !grade || !section) return <p>الطالب غير موجود</p>;

  const sheet = buildBlankIndividual({
    schoolName: config.name,
    yearLabel: config.academicYear,
    gradeName: grade.name,
    sectionName: section.name,
    maxScore: grade.maxScore,
    subjectNames: template?.subjects.map((s) => s.name) ?? [],
    studentName: student.fullName,
  });

  // Fill with actual scores
  const filledSheet = {
    ...sheet,
    mode: 'filled' as const,
    rows: (template?.subjects ?? []).map((sub) => {
      const sc = studentScores.find((s) => s.subjectId === sub.id);
      return {
        subjectName: sub.name,
        score: sc?.finalScore ?? '',
        notes: sc?.status === 'pass' ? 'ناجح' : sc?.status === 'fail' ? 'راسب' : '',
      };
    }),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={student.fullName}
        subtitle={`${grade.name} · شعبة ${section.name} · ${config.academicYear}`}
        actions={
          <>
            <Btn variant="ghost" className="no-print" onClick={() => window.print()}>
              طباعة انفرادية
            </Btn>
            <Link to={`/section/${section.id}`}>
              <Btn variant="ghost">← الشعبة</Btn>
            </Link>
          </>
        }
      />

      <Panel title="الدرجات حسب المادة" className="no-print">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-right text-[var(--color-slate)]/50">
              <th className="py-2">المادة</th>
              <th className="py-2">النهائية</th>
              <th className="py-2">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {(template?.subjects ?? []).map((sub) => {
              const sc = studentScores.find((s) => s.subjectId === sub.id);
              return (
                <tr key={sub.id} className="border-b border-[var(--color-line)]/50">
                  <td className="py-2">
                    <Link
                      to={`/subject/${sub.id}?sectionId=${section.id}`}
                      className="hover:text-[var(--color-teal)]"
                    >
                      {sub.name}
                    </Link>
                  </td>
                  <td className="py-2">{sc?.finalScore ?? '—'}</td>
                  <td className="py-2">
                    {sc?.status === 'pass' ? 'ناجح' : sc?.status === 'fail' ? 'راسب' : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      {student.promotionHistory.length > 0 && (
        <Panel title="سجل الترقية" className="no-print">
          <ul className="space-y-1 text-sm">
            {student.promotionHistory.map((h, i) => (
              <li key={i}>
                {h.academicYear}: {h.result} — معدل {h.averageScore ?? '—'}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div>
        <p className="no-print mb-3 text-sm font-semibold text-[var(--color-teal)]">معاينة الانفرادية</p>
        <IndividualGradeSheet data={filledSheet} />
      </div>
    </div>
  );
}
