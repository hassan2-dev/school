import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { Btn, PageHeader, Panel } from '../components/ui';
import { localStore } from '../services/localStore';

export function ReportsPage() {
  const school = localStore.schools[0];
  const scores = localStore.scores.filter((s) => s.schoolId === school?.id);

  function exportExcel() {
    const rows = scores.map((sc) => {
      const student = localStore.students.find((s) => s.id === sc.studentId);
      const subject = localStore.subjects.find((s) => s.id === sc.subjectId);
      const grade = localStore.grades.find((g) => g.id === sc.gradeId);
      const section = localStore.sections.find((s) => s.id === sc.sectionId);
      return {
        الطالب: student?.fullName,
        الصف: grade?.name,
        الشعبة: section?.name,
        المادة: subject?.name,
        النهائية: sc.finalNumeric ?? '',
        كتابة: sc.finalWritten ?? '',
        الحالة: sc.status === 'pass' ? 'ناجح' : sc.status === 'fail' ? 'راسب' : '',
      };
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'درجات');
    XLSX.writeFile(book, 'grades-report.xlsx');
  }

  const graded = scores.filter((s) => s.finalNumeric != null);
  const pass = graded.filter((s) => {
    const grade = localStore.grades.find((g) => g.id === s.gradeId);
    const max = grade?.defaultMaxScore ?? 100;
    return (s.finalNumeric ?? -1) >= (max >= 100 ? 50 : 5);
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقارير"
        subtitle={school?.name}
        actions={
          <>
            <Btn className="no-print" onClick={exportExcel}>
              تصدير Excel
            </Btn>
            <Btn className="no-print" variant="ghost" onClick={() => window.print()}>
              طباعة التقرير
            </Btn>
            <Link to="/forms" className="no-print">
              <Btn variant="ghost">انفرادية وكشوف</Btn>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Mini label="سجلات الدرجات" value={scores.length} />
        <Mini label="ناجحون (تقديري)" value={pass} />
        <Mini label="راسبون (تقديري)" value={Math.max(graded.length - pass, 0)} />
      </div>

      <Panel title="كشف درجات مختصر">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-right text-[var(--color-slate)]/50">
                <th className="py-2">الطالب</th>
                <th className="py-2">المادة</th>
                <th className="py-2">الدرجة</th>
              </tr>
            </thead>
            <tbody>
              {scores.slice(0, 80).map((sc) => {
                const student = localStore.students.find((s) => s.id === sc.studentId);
                const subject = localStore.subjects.find((s) => s.id === sc.subjectId);
                return (
                  <tr key={sc.id} className="border-b border-[var(--color-line)]/70">
                    <td className="py-2">{student?.fullName}</td>
                    <td className="py-2">{subject?.name}</td>
                    <td className="py-2">{sc.finalNumeric ?? '—'}</td>
                  </tr>
                );
              })}
              {!scores.length && (
                <tr>
                  <td colSpan={3} className="py-8 text-[var(--color-slate)]/45">
                    لا بيانات — استخدم الطباعة الفارغة من صفحة النماذج
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-white p-5">
      <p className="text-sm text-[var(--color-slate)]/50">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-[var(--color-teal-deep)]">{value}</p>
    </div>
  );
}
