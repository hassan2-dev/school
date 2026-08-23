import { Link } from 'react-router-dom';
import { Panel, StatCard } from '../components/ui';
import { useStore } from '../hooks/useStore';

export function HomePage() {
  const { students, grades, sections } = useStore();
  const active = students.filter((s) => s.status === 'active');
  const graduated = students.filter((s) => s.status === 'graduated');

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] bg-[#0b1c24] px-6 py-10 text-white md:px-10">
        <div className="relative max-w-2xl">
          <h1 className="font-display text-4xl font-bold md:text-5xl">نظام الطلاب والدرجات</h1>
          <p className="mt-3 text-white/70">
            قاعدة بيانات مركزية لكل طلاب المدرسة — إضافة وتعديل الشعب والطلاب، قوالب ثابتة للمواد،
            وترقية تلقائية عند النجاح.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/students" className="rounded-xl bg-[var(--color-teal)] px-5 py-2.5 text-sm font-semibold">
              إدارة الطلاب
            </Link>
            <Link to="/grades" className="rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold">
              الصفوف والشعب
            </Link>
            <Link to="/promotion" className="rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold">
              ترقية الصفوف
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="طلاب نشطون" value={active.length} />
        <StatCard label="متخرجون" value={graduated.length} />
        <StatCard label="الصفوف" value={grades.length} />
        <StatCard label="الشعب" value={sections.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="كيف يعمل النظام">
          <ol className="list-inside list-decimal space-y-2 text-sm text-[var(--color-slate)]/80">
            <li>كل طالب له سجل واحد في قاعدة البيانات</li>
            <li>الشعب (أ ب ج) لكل صف — تضيفها وتعدّلها يدوياً</li>
            <li>قوالب المواد ثابتة لكل صف (رياضيات، علوم، قراءة...)</li>
            <li>نفس أسماء الطلاب تظهر في كل مواد الشعبة</li>
            <li>عند النجاح → ترقية تلقائية للصف التالي</li>
          </ol>
        </Panel>

        <Panel title="اختصارات">
          <div className="grid gap-2 sm:grid-cols-2">
            <Shortcut to="/students" title="إضافة طالب" desc="طالب طالب" />
            <Shortcut to="/grades" title="إضافة شعبة" desc="أ ب ج د..." />
            <Shortcut to="/templates" title="قوالب المواد" desc="تعديل أعمدة الدرجات" />
            <Shortcut to="/forms" title="طباعة" desc="انفرادية وكشوف" />
          </div>
        </Panel>
      </div>

      <Panel title="الصفوف">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {grades
            .sort((a, b) => a.order - b.order)
            .map((g) => {
              const secs = sections.filter((s) => s.gradeId === g.id);
              const count = active.filter((s) => s.gradeId === g.id).length;
              return (
                <Link
                  key={g.id}
                  to={`/grades/${g.id}`}
                  className="rounded-xl border border-[var(--color-line)] p-4 transition hover:border-[var(--color-teal)] hover:bg-[var(--color-mint)]/30"
                >
                  <p className="font-display text-lg font-bold">{g.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-slate)]/60">
                    {secs.length} شعب · {count} طالب · من {g.maxScore}
                  </p>
                </Link>
              );
            })}
        </div>
      </Panel>
    </div>
  );
}

function Shortcut({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-[var(--color-line)] px-4 py-3 hover:border-[var(--color-teal)]"
    >
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-[var(--color-slate)]/55">{desc}</p>
    </Link>
  );
}
