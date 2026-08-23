import { useMemo, useState } from 'react';
import { Btn, PageHeader, Panel } from '../components/ui';
import { useStore } from '../hooks/useStore';
import { promotionService } from '../services/promotion';

export function PromotionPage() {
  const state = useStore();
  const { grades } = state;
  const [gradeFilter, setGradeFilter] = useState('');
  const [result, setResult] = useState<{ promoted: number; graduated: number; total: number } | null>(null);

  const preview = useMemo(
    () => promotionService.preview(gradeFilter || undefined),
    [gradeFilter, state.students, state.scores],
  );

  const willPromote = preview.filter((p) => p.willPromote);
  const willStay = preview.filter((p) => !p.willPromote);

  function runPromotion() {
    if (!confirm(`ترقية ${willPromote.length} طالب ناجح؟`)) return;
    const res = promotionService.promotePassing(gradeFilter || undefined);
    setResult(res);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ترقية الصفوف"
        subtitle="الطلاب الناجحون ينتقلون تلقائياً للصف التالي — نفس الشعبة إن وُجدت"
        actions={
          <Btn onClick={runPromotion} disabled={!willPromote.length}>
            ترقية الناجحين ({willPromote.length})
          </Btn>
        }
      />

      {result && (
        <Panel>
          <p className="text-[var(--color-ok)] font-semibold">
            تمت الترقية: {result.promoted} طالب · تخرج: {result.graduated}
          </p>
        </Panel>
      )}

      <Panel>
        <select
          className="rounded-xl border border-[var(--color-line)] px-3 py-2"
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
        >
          <option value="">كل الصفوف</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`سينُقلون (${willPromote.length})`}>
          <ul className="max-h-96 space-y-1 overflow-auto text-sm">
            {willPromote.map((p) => (
              <li key={p.studentId} className="flex justify-between border-b border-[var(--color-line)]/50 py-2">
                <span>{p.fullName}</span>
                <span className="text-[var(--color-ok)]">
                  {p.gradeName} → {p.nextGradeName} (معدل {p.average})
                </span>
              </li>
            ))}
            {!willPromote.length && <li className="text-[var(--color-slate)]/45">لا أحد للترقية</li>}
          </ul>
        </Panel>

        <Panel title={`يبقون (${willStay.length})`}>
          <ul className="max-h-96 space-y-1 overflow-auto text-sm">
            {willStay.map((p) => (
              <li key={p.studentId} className="flex justify-between border-b border-[var(--color-line)]/50 py-2">
                <span>{p.fullName}</span>
                <span className="text-[var(--color-warn)]">{p.reason}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
