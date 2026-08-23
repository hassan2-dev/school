import { Link } from 'react-router-dom';
import { Btn, PageHeader, Panel } from '../components/ui';
import { dataService } from '../services/dataService';
import { localStore } from '../services/localStore';

export function SchoolPage() {
  const school = localStore.schools[0];
  const year = localStore.academicYears.find((y) => y.schoolId === school?.id && y.isActive);
  const tree = school && year ? dataService.getTree(school.id, year.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={school?.name || 'المدرسة'}
        subtitle={`العام الدراسي ${year?.label || '—'} · اختر صف وشعبة لإدارة الطلاب والدرجات والطباعة`}
        actions={
          <Link to="/forms">
            <Btn>طباعة نماذج لهذه المدرسة</Btn>
          </Link>
        }
      />

      <div className="grid gap-4">
        {tree.map(({ grade, sections }) => (
          <Panel key={grade.id}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-[var(--color-teal-deep)]">
                  الصف {grade.name}
                </h2>
                <p className="text-sm text-[var(--color-slate)]/60">
                  نظام الدرجة من {grade.defaultMaxScore} · {sections.length} شعب
                </p>
              </div>
              <Link
                to={`/forms`}
                className="text-sm font-semibold text-[var(--color-teal)]"
              >
                طباعة انفرادية / كشف
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {sections.map((sec) => {
                const count = localStore.enrollments.filter((e) => e.sectionId === sec.id).length;
                return (
                  <Link
                    key={sec.id}
                    to={`/section/${sec.id}`}
                    className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 transition hover:border-[var(--color-teal)] hover:shadow-md"
                  >
                    <p className="font-display text-xl font-bold">شعبة {sec.name}</p>
                    <p className="mt-1 text-sm text-[var(--color-slate)]/60">{count} طالب</p>
                  </Link>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
