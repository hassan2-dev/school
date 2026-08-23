import { Link, useParams } from 'react-router-dom';
import { PageHeader, Panel } from '../components/ui';
import { useStore } from '../hooks/useStore';
import { ensureColumns, flatLeaves } from '../lib/columns';
import { templateService } from '../services/templates';

export function GradeDetailPage() {
  const { gradeId } = useParams();
  const { grades, sections, students } = useStore();
  const grade = grades.find((g) => g.id === gradeId);
  const gradeSections = sections.filter((s) => s.gradeId === gradeId);
  const template = gradeId ? templateService.getByGrade(gradeId) : null;

  if (!grade) return <p>الصف غير موجود</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`الصف ${grade.name}`}
        subtitle={`من ${grade.maxScore} · ${gradeSections.length} شعب · ${template?.subjects.length ?? 0} مواد`}
        actions={
          <Link to="/grades" className="text-sm text-[var(--color-teal)]">
            ← كل الصفوف
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="الشعب">
          <div className="grid gap-2 sm:grid-cols-2">
            {gradeSections.map((sec) => {
              const count = students.filter((s) => s.sectionId === sec.id && s.status === 'active').length;
              return (
                <Link
                  key={sec.id}
                  to={`/section/${sec.id}`}
                  className="rounded-xl border border-[var(--color-line)] p-4 hover:border-[var(--color-teal)]"
                >
                  <p className="font-display text-xl font-bold">شعبة {sec.name}</p>
                  <p className="text-sm text-[var(--color-slate)]/55">{count} طالب</p>
                </Link>
              );
            })}
          </div>
        </Panel>

        <Panel title="مواد الصف (من القالب)">
          <ul className="space-y-1 text-sm">
            {template?.subjects.map((sub) => (
              <li key={sub.id} className="flex justify-between border-b border-[var(--color-line)]/50 py-2">
                <span>{sub.name}</span>
                <span className="text-[var(--color-slate)]/45">
                  {flatLeaves(ensureColumns(sub)).length} أعمدة
                </span>
              </li>
            ))}
          </ul>
          <Link to="/templates" className="mt-3 inline-block text-sm text-[var(--color-teal)]">
            تعديل القالب
          </Link>
        </Panel>
      </div>
    </div>
  );
}
