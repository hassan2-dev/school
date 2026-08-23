import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Btn, PageHeader, Panel } from '../components/ui';
import { useStore } from '../hooks/useStore';
import { sectionService } from '../services/sections';
import { templateService } from '../services/templates';

export function GradesPage() {
  const { grades, sections, students } = useStore();

  return (
    <div className="space-y-6">
      <PageHeader
        title="الصفوف والشعب"
        subtitle="أضف شعب جديدة لكل صف — الطلاب مرتبطون بالشعبة"
      />

      <div className="space-y-4">
        {grades
          .sort((a, b) => a.order - b.order)
          .map((grade) => (
            <GradeCard
              key={grade.id}
              grade={grade}
              sections={sections.filter((s) => s.gradeId === grade.id)}
              studentCount={students.filter((s) => s.gradeId === grade.id && s.status === 'active').length}
            />
          ))}
      </div>
    </div>
  );
}

function GradeCard({
  grade,
  sections,
  studentCount,
}: {
  grade: { id: string; name: string; maxScore: number };
  sections: { id: string; name: string }[];
  studentCount: number;
}) {
  const [newSection, setNewSection] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const template = templateService.getByGrade(grade.id);

  function addSection() {
    if (!newSection.trim()) return;
    try {
      sectionService.add(grade.id, newSection);
      setNewSection('');
      setShowAdd(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطأ');
    }
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={`/grades/${grade.id}`} className="font-display text-2xl font-bold hover:text-[var(--color-teal)]">
            الصف {grade.name}
          </Link>
          <p className="text-sm text-[var(--color-slate)]/60">
            {studentCount} طالب · {sections.length} شعب · من {grade.maxScore} ·{' '}
            {template?.subjects.length ?? 0} مواد
          </p>
        </div>
        <Btn variant="ghost" onClick={() => setShowAdd(!showAdd)}>
          + شعبة
        </Btn>
      </div>

      {showAdd && (
        <div className="mb-4 flex gap-2">
          <input
            className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm"
            placeholder="اسم الشعبة (مثلاً: د)"
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
          />
          <Btn onClick={addSection}>إضافة</Btn>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {sections.map((sec) => (
          <Link
            key={sec.id}
            to={`/section/${sec.id}`}
            className="flex min-w-[100px] flex-col items-center rounded-xl border border-[var(--color-line)] px-5 py-4 transition hover:border-[var(--color-teal)] hover:bg-[var(--color-mint)]/30"
          >
            <span className="font-display text-2xl font-bold">{sec.name}</span>
            <span className="mt-1 text-xs text-[var(--color-slate)]/55">شعبة</span>
          </Link>
        ))}
        {!sections.length && (
          <p className="text-sm text-[var(--color-slate)]/50">
            لا شعب — أضف شعبة أو طبّق القالب الافتراضي من صفحة القوالب
          </p>
        )}
      </div>
    </Panel>
  );
}
