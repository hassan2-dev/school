import { useMemo, useState } from 'react';
import { DEMO_STUDENTS_G1, DEMO_STUDENTS_G5, SEED_IDS, buildCompleteSeed } from '../seed/completeSeed';
import { localStore } from '../services/localStore';

const SAMPLES = [
  { name: 'رياضيات_الخامس_ب.xlsx', href: '/samples/رياضيات_الخامس_ب.xlsx', desc: 'خامس ب · من 100' },
  { name: 'القراءة_الأول_أ.xlsx', href: '/samples/القراءة_الأول_أ.xlsx', desc: 'أول أ · مكونات متعددة' },
  { name: 'علوم_الأول_أ.xlsx', href: '/samples/علوم_الأول_أ.xlsx', desc: 'أول أ · درجة واحدة' },
  { name: 'الإنكليزي_الأول_أ.xlsx', href: '/samples/الإنكليزي_الأول_أ.xlsx', desc: 'أول أ · إنكليزي' },
];

export function SeedAdminPage() {
  const [tick, setTick] = useState(0);
  const stats = useMemo(() => {
    void tick;
    return {
      schools: localStore.schools.length,
      years: localStore.academicYears.length,
      grades: localStore.grades.length,
      sections: localStore.sections.length,
      subjects: localStore.subjects.length,
      students: localStore.students.length,
      enrollments: localStore.enrollments.length,
      scores: localStore.scores.length,
      templates: localStore.templates.length,
      documents: localStore.documents.length,
      imports: localStore.imports.length,
    };
  }, [tick]);

  function reseed() {
    localStore.resetToSeed();
    setTick((t) => t + 1);
    alert('تم إعادة تحميل الـ Seed بالكامل.');
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(buildCompleteSeed(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'school-grades-seed.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Seed — بيانات التسليم</h1>
        <p className="mt-1 text-[var(--color-ink)]/60">
          حزمة بيانات كاملة جاهزة للعرض والتسليم بدون إعداد Firebase
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--color-moss)]/10 bg-white/85 p-6">
        <h2 className="font-display text-xl font-semibold">المدرسة التجريبية</h2>
        <ul className="mt-3 space-y-1 text-sm">
          <li>
            <strong>الاسم:</strong> مدرسة عبد الله الرضيع الابتدائية
          </li>
          <li>
            <strong>ID:</strong> {SEED_IDS.school}
          </li>
          <li>
            <strong>العام النشط:</strong> 2024/2025
          </li>
          <li>
            <strong>طلاب الأول أ:</strong> {DEMO_STUDENTS_G1.length}
          </li>
          <li>
            <strong>طلاب الخامس ب:</strong> {DEMO_STUDENTS_G5.length}
          </li>
        </ul>
      </section>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-[var(--color-moss)]/10 bg-white/80 p-4">
            <p className="text-xs text-[var(--color-ink)]/50">{k}</p>
            <p className="font-display text-2xl font-bold text-[var(--color-moss)]">{v}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[var(--color-moss)]/10 bg-white/85 p-6">
        <h2 className="font-display text-xl font-semibold">ملفات تجريبية للرفع</h2>
        <p className="mt-1 text-sm text-[var(--color-ink)]/55">
          حمّلها ثم ارفعها من صفحة «رفع الملفات» لتجربة التحليل والمراجعة
        </p>
        <ul className="mt-4 space-y-2">
          {SAMPLES.map((s) => (
            <li
              key={s.name}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-sand)] px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">📄 {s.name}</p>
                <p className="text-[var(--color-ink)]/50">{s.desc}</p>
              </div>
              <a
                href={s.href}
                download
                className="rounded-lg bg-[var(--color-moss)] px-3 py-1.5 text-white"
              >
                تنزيل
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reseed}
          className="rounded-xl bg-[var(--color-moss)] px-5 py-2.5 text-white"
        >
          إعادة تحميل الـ Seed
        </button>
        <button
          type="button"
          onClick={downloadJson}
          className="rounded-xl border border-[var(--color-moss)]/30 px-5 py-2.5"
        >
          تصدير Seed JSON
        </button>
      </div>
    </div>
  );
}
