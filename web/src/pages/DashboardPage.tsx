import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel, StatCard } from '../components/ui';
import { dataService } from '../services/dataService';
import { localStore } from '../services/localStore';

export function DashboardPage() {
  const [stats, setStats] = useState({
    schools: 0,
    students: 0,
    grades: 0,
    sections: 0,
    subjects: 0,
    documents: 0,
    imports: 0,
  });
  const [imports, setImports] = useState(localStore.imports.slice(0, 5));
  const school = localStore.schools[0];
  const year = localStore.academicYears.find((y) => y.schoolId === school?.id && y.isActive);

  useEffect(() => {
    void (async () => {
      const s = await dataService.getDashboardStats(school?.id);
      setStats(s);
      if (school) setImports(await dataService.getImports(school.id));
    })();
  }, [school?.id]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-[#0b1c24] px-6 py-10 text-white md:px-10">
        <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-[var(--color-teal)]/30 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-32 w-32 rounded-full bg-[var(--color-mint)]/20 blur-2xl" />
        <div className="relative max-w-3xl">
          <p className="text-sm text-white/55">{school?.name}</p>
          <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">سجل الدرجات المدرسي</h1>
          <p className="mt-3 text-white/70">
            ارفع الملفات، راجع الدرجات، واطبع انفرادية فارغة أو مملوءة وكشوف الصفوف — كل شيء من مكان واحد.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/forms"
              className="rounded-xl bg-[var(--color-teal)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              طباعة النماذج
            </Link>
            <Link
              to="/upload"
              className="rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold text-white"
            >
              رفع درجات
            </Link>
            <Link
              to="/school"
              className="rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold text-white"
            >
              تصفح المدرسة
            </Link>
          </div>
        </div>
        <p className="relative mt-8 text-sm text-white/45">العام الدراسي {year?.label}</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="الطلاب" value={stats.students} />
        <StatCard label="الصفوف" value={stats.grades} />
        <StatCard label="الشعب" value={stats.sections} />
        <StatCard label="المواد" value={stats.subjects} />
        <StatCard label="الملفات" value={stats.documents} />
        <StatCard label="عمليات الاستيراد" value={stats.imports} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="اختصارات العمل" className="lg:col-span-1">
          <div className="space-y-2">
            <Shortcut to="/forms" title="انفرادية فارغة" desc="اطبع نماذج جاهزة حتى بدون درجات" />
            <Shortcut to="/forms" title="انفرادية بالدرجات" desc="كشف طالب مكتمل للطباعة" />
            <Shortcut to="/upload" title="استيراد من ملف" desc="Word / Excel / PDF دفعة واحدة" />
            <Shortcut to="/reports" title="تقارير Excel" desc="تصدير وطباعة كشوف مجمّعة" />
          </div>
        </Panel>

        <Panel
          title="آخر عمليات الاستيراد"
          className="lg:col-span-2"
          actions={
            <Link to="/upload" className="text-sm font-semibold text-[var(--color-teal)]">
              رفع جديد
            </Link>
          }
        >
          {imports.length === 0 ? (
            <p className="text-sm text-[var(--color-slate)]/55">لا عمليات بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-right text-[var(--color-slate)]/50">
                    <th className="py-2 font-medium">#</th>
                    <th className="py-2 font-medium">التاريخ</th>
                    <th className="py-2 font-medium">ملفات</th>
                    <th className="py-2 font-medium">طلاب</th>
                    <th className="py-2 font-medium">مواد</th>
                    <th className="py-2 font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((imp) => (
                    <tr key={imp.id} className="border-b border-[var(--color-line)]/70">
                      <td className="py-3">{imp.id.slice(-6)}</td>
                      <td className="py-3">{new Date(imp.createdAt).toLocaleString('ar-IQ')}</td>
                      <td className="py-3">{imp.fileCount}</td>
                      <td className="py-3">{imp.studentsCount}</td>
                      <td className="py-3">{imp.subjectsCount}</td>
                      <td className="py-3">
                        <span className="rounded-md bg-[var(--color-mint)] px-2 py-0.5 text-[var(--color-ok)]">
                          {imp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Shortcut({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-[var(--color-line)] px-4 py-3 transition hover:border-[var(--color-teal)] hover:bg-[var(--color-mint)]/40"
    >
      <p className="font-semibold text-[var(--color-ink)]">{title}</p>
      <p className="text-xs text-[var(--color-slate)]/60">{desc}</p>
    </Link>
  );
}
