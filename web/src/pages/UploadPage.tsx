import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader, Panel, StepList } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { nowIso, uid } from '../lib/normalize';
import { runImportPipeline, type PipelineProgress } from '../processing/pipeline';
import { dataService } from '../services/dataService';
import { localStore } from '../services/localStore';
import type { FileProcessingResult, ImportIssueDraft, StudentMatchSuggestion } from '../types/models';

export function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const school = localStore.schools[0];
  const years = localStore.academicYears.filter((y) => y.schoolId === school?.id);
  const [yearId, setYearId] = useState(years.find((y) => y.isActive)?.id || years[0]?.id || '');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const steps = useMemo(
    () =>
      progress.map((p) => ({
        label: p.fileName ? `${p.fileName}: ${p.step}` : p.step,
        done: p.done && !p.error,
        error: Boolean(p.error),
      })),
    [progress],
  );

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter((f) => /\.(docx|xlsx|xls|pdf)$/i.test(f.name));
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...next.filter((f) => !names.has(f.name))];
    });
  }

  async function startProcessing() {
    if (!school || !files.length) return;
    setBusy(true);
    setProgress([]);
    try {
      const knownHashes = await dataService.getKnownHashes(school.id);
      const output = await runImportPipeline(files, {
        maxScoreByGradeName: dataService.getMaxScoreMap(),
        knownHashes,
        onProgress: (p) =>
          setProgress((prev) => [...prev.filter((x) => x.fileName !== p.fileName || !p.fileName), p]),
      });

      const draft = {
        id: uid('imp'),
        schoolId: school.id,
        academicYearId: yearId,
        status: 'review' as const,
        documentIds: output.results.map((r) => r.documentId),
        fileCount: output.results.length,
        studentsCount: output.results.reduce((s, r) => s + r.studentsDetected, 0),
        subjectsCount: new Set(output.results.map((r) => r.subject.value).filter(Boolean)).size,
        warningsCount: output.issues.filter((i) => i.severity === 'warning').length,
        errorsCount: output.issues.filter((i) => i.severity === 'error').length,
        results: output.results,
        matchSuggestions: output.matchSuggestions,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy: user?.id || 'demo',
        hashes: output.hashes,
        issues: output.issues,
      };

      sessionStorage.setItem('pendingImport', JSON.stringify(draft));
      navigate('/import/review');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'فشل التحليل');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="رفع الدرجات"
        subtitle="ارفع عدة ملفات دفعة واحدة — النظام يستخرج الصف والشعبة والمادة والطلاب تلقائياً"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <p className="text-sm text-[var(--color-slate)]/55">المدرسة</p>
          <p className="mt-1 font-semibold text-[var(--color-teal-deep)]">{school?.name}</p>
        </Panel>
        <Panel>
          <label className="text-sm text-[var(--color-slate)]/55">
            العام الدراسي
            <select
              className="mt-2 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </label>
        </Panel>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`rounded-[28px] border-2 border-dashed p-10 text-center transition ${
          dragOver
            ? 'border-[var(--color-teal)] bg-[var(--color-mint)]'
            : 'border-[var(--color-line)] bg-white'
        }`}
      >
        <p className="font-display text-2xl font-bold text-[var(--color-teal-deep)]">أسقط الملفات هنا</p>
        <p className="mt-2 text-sm text-[var(--color-slate)]/55">DOCX · XLSX · PDF</p>
        <label className="mt-6 inline-block cursor-pointer rounded-xl bg-[var(--color-teal)] px-5 py-2.5 font-semibold text-white">
          اختيار ملفات
          <input
            type="file"
            multiple
            accept=".docx,.xlsx,.xls,.pdf"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>
      </div>

      {files.length > 0 && (
        <Panel title={`الملفات (${files.length})`}>
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.name} className="flex items-center justify-between text-sm">
                <span>📄 {f.name}</span>
                <button
                  type="button"
                  className="text-[var(--color-danger)]"
                  onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}
                >
                  إزالة
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {busy && (
        <Panel title="جاري تحليل الملفات...">
          <StepList steps={steps.length ? steps : [{ label: 'بدء المعالجة...', done: false }]} />
        </Panel>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={!files.length || busy}
          onClick={() => void startProcessing()}
          className="rounded-xl bg-[var(--color-teal)] px-6 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          تحليل واستمرار للمراجعة
        </button>
        <Link
          to="/forms"
          className="rounded-xl border border-[var(--color-line)] px-6 py-2.5 font-semibold"
        >
          أو اطبع نماذج فارغة
        </Link>
      </div>
    </div>
  );
}

export type PendingImportDraft = {
  id: string;
  schoolId: string;
  academicYearId: string;
  status: 'review';
  documentIds: string[];
  fileCount: number;
  studentsCount: number;
  subjectsCount: number;
  warningsCount: number;
  errorsCount: number;
  results: FileProcessingResult[];
  matchSuggestions: StudentMatchSuggestion[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  hashes: Record<string, string>;
  issues: ImportIssueDraft[];
};
