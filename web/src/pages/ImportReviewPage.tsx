import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfidenceBadge } from '../components/ui';
import { approveAndImport } from '../services/importService';
import type { PendingImportDraft } from './UploadPage';
import type { FieldConfidence } from '../types/models';

function loadDraft(): PendingImportDraft | null {
  const raw = sessionStorage.getItem('pendingImport');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingImportDraft;
  } catch {
    return null;
  }
}

function FieldRow({
  label,
  field,
  onChange,
}: {
  label: string;
  field: FieldConfidence;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-sand)] py-3">
      <div>
        <p className="text-sm text-[var(--color-ink)]/50">{label}</p>
        {field.needsReview ? (
          <input
            className="mt-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1"
            value={field.value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="حدد يدوياً"
          />
        ) : (
          <p className="font-medium">{field.value || '—'} ✓</p>
        )}
      </div>
      <ConfidenceBadge value={field.confidence} />
    </div>
  );
}

export function ImportReviewPage() {
  const navigate = useNavigate();
  const initial = useMemo(() => loadDraft(), []);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);

  if (!draft) {
    return (
      <div className="rounded-2xl bg-white/80 p-8 text-center">
        <p>لا توجد عملية مراجعة حالياً.</p>
        <Link to="/upload" className="mt-4 inline-block text-[var(--color-moss)]">
          اذهب لرفع الملفات
        </Link>
      </div>
    );
  }

  function updateResultField(
    documentId: string,
    key: 'school' | 'academicYear' | 'grade' | 'section' | 'subject',
    value: string,
  ) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        results: prev.results.map((r) =>
          r.documentId === documentId
            ? {
                ...r,
                [key]: {
                  ...r[key],
                  value,
                  confidence: 1,
                  source: 'user' as const,
                  needsReview: !value,
                },
              }
            : r,
        ),
      };
    });
  }

  function setMatchDecision(id: string, decision: 'merge' | 'keep_separate') {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        matchSuggestions: prev.matchSuggestions.map((m) =>
          m.id === id ? { ...m, decision } : m,
        ),
      };
    });
  }

  async function approve() {
    if (!draft) return;
    const pendingMatches = draft.matchSuggestions.filter((m) => m.decision === 'pending');
    if (pendingMatches.length) {
      alert('يوجد اقتراحات مطابقة للطلاب تحتاج قرار (دمج أو إبقاء منفصل).');
      return;
    }
    setBusy(true);
    try {
      await approveAndImport({
        schoolId: draft.schoolId,
        academicYearId: draft.academicYearId,
        results: draft.results,
        matchSuggestions: draft.matchSuggestions,
        createdBy: draft.createdBy,
        hashes: draft.hashes,
      });
      sessionStorage.removeItem('pendingImport');
      navigate('/');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل الاستيراد');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">مراجعة الاستيراد</h1>
        <p className="mt-1 text-[var(--color-ink)]/60">
          راجع ما فهمه النظام قبل الاعتماد — لا استيراد صامت بدون موافقتك
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Summary label="الملفات" value={draft.fileCount} />
        <Summary label="المواد" value={draft.subjectsCount} />
        <Summary label="الطلاب" value={draft.studentsCount} />
        <Summary label="التحذيرات / الأخطاء" value={`${draft.warningsCount} / ${draft.errorsCount}`} />
      </div>

      {draft.results.map((r) => (
        <section
          key={r.documentId}
          className="rounded-2xl border border-[var(--color-moss)]/10 bg-white/85 p-6 shadow-sm"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">📄 {r.fileName}</h2>
            <div className="flex items-center gap-2 text-sm">
              <span>الثقة الإجمالية</span>
              <ConfidenceBadge value={r.confidence} />
            </div>
          </div>

          <FieldRow
            label="المدرسة"
            field={r.school}
            onChange={(v) => updateResultField(r.documentId, 'school', v)}
          />
          <FieldRow
            label="العام الدراسي"
            field={r.academicYear}
            onChange={(v) => updateResultField(r.documentId, 'academicYear', v)}
          />
          <FieldRow
            label="الصف"
            field={r.grade}
            onChange={(v) => updateResultField(r.documentId, 'grade', v)}
          />
          <FieldRow
            label="الشعبة"
            field={r.section}
            onChange={(v) => updateResultField(r.documentId, 'section', v)}
          />
          <FieldRow
            label="المادة"
            field={r.subject}
            onChange={(v) => updateResultField(r.documentId, 'subject', v)}
          />

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-[var(--color-ink)]/50">عدد الطلاب</p>
              <p className="font-medium">{r.studentsDetected} ✓</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-ink)]/50">مكونات التقييم</p>
              <ul className="mt-1 list-inside list-disc text-sm">
                {r.assessmentComponents.length ? (
                  r.assessmentComponents.map((c) => <li key={c}>{c}</li>)
                ) : (
                  <li className="text-amber-700">لم تُكتشف أعمدة — راجع الملف</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b text-right text-[var(--color-ink)]/50">
                  <th className="py-2">#</th>
                  <th className="py-2">اسم الطالب</th>
                  {r.assessmentComponents.slice(0, 6).map((c) => (
                    <th key={c} className="py-2">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.rows.slice(0, 12).map((row, i) => (
                  <tr key={`${row.fullName}-${i}`} className="border-b border-[var(--color-sand)]">
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2">{row.fullName}</td>
                    {r.assessmentComponents.slice(0, 6).map((c) => (
                      <td key={c} className="py-2">
                        {row.values[c] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {r.rows.length > 12 && (
              <p className="mt-2 text-xs text-[var(--color-ink)]/45">
                عرض 12 من {r.rows.length} طالب
              </p>
            )}
          </div>
        </section>
      ))}

      {draft.matchSuggestions.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6">
          <h2 className="font-display text-lg font-semibold text-amber-900">
            ⚠️ احتمال وجود تطابق بين الطلاب
          </h2>
          <div className="mt-4 space-y-4">
            {draft.matchSuggestions.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-amber-200 bg-white p-4 text-sm"
              >
                <p>{m.leftName}</p>
                <p>{m.rightName}</p>
                <p className="mt-1 text-amber-800">نسبة التطابق: {Math.round(m.similarity * 100)}%</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchDecision(m.id, 'merge')}
                    className={`rounded-lg px-3 py-1.5 ${
                      m.decision === 'merge' ? 'bg-[var(--color-moss)] text-white' : 'border'
                    }`}
                  >
                    دمج
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchDecision(m.id, 'keep_separate')}
                    className={`rounded-lg px-3 py-1.5 ${
                      m.decision === 'keep_separate' ? 'bg-[var(--color-moss)] text-white' : 'border'
                    }`}
                  >
                    إبقاء منفصل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {draft.issues.length > 0 && (
        <section className="rounded-2xl border border-[var(--color-moss)]/10 bg-white/85 p-6">
          <h2 className="font-display text-lg font-semibold">الملاحظات والتنبيهات</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {draft.issues.map((issue, i) => (
              <li key={`${issue.code}-${i}`} className="flex gap-2">
                <span>{issue.severity === 'error' ? '❌' : '⚠️'}</span>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void approve()}
          className="rounded-xl bg-[var(--color-moss)] px-6 py-2.5 text-white disabled:opacity-50"
        >
          {busy ? 'جاري الاستيراد...' : 'اعتماد واستيراد'}
        </button>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem('pendingImport');
            navigate('/upload');
          }}
          className="rounded-xl border border-[var(--color-moss)]/30 px-6 py-2.5"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[var(--color-moss)]/10 bg-white/80 p-4">
      <p className="text-sm text-[var(--color-ink)]/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-[var(--color-moss)]">{value}</p>
    </div>
  );
}
