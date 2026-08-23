import { useRef, useState } from 'react';
import { Btn, Panel } from './ui';
import { useStore } from '../hooks/useStore';
import {
  downloadStudentTemplate,
  importStudentsToSection,
  parseStudentsExcel,
  type StudentImportPreview,
} from '../services/studentImport';

interface Props {
  /** Pre-select grade/section (e.g. from Section page) */
  defaultGradeId?: string;
  defaultSectionId?: string;
  onDone?: () => void;
}

export function StudentExcelImport({ defaultGradeId, defaultSectionId, onDone }: Props) {
  const { grades, sections } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [gradeId, setGradeId] = useState(defaultGradeId || grades[0]?.id || '');
  const [sectionId, setSectionId] = useState(defaultSectionId || '');
  const [preview, setPreview] = useState<StudentImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [skipExisting, setSkipExisting] = useState(true);

  const gradeSections = sections.filter((s) => s.gradeId === gradeId);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setResultMsg('');
    try {
      const parsed = await parseStudentsExcel(file);
      setPreview(parsed);
      if (!parsed.okCount) {
        setResultMsg('لم يُعثر على أسماء طلاب صالحة في الملف');
      }
    } catch {
      setPreview(null);
      setResultMsg('فشل قراءة ملف Excel — تأكد أنه بصيغة .xlsx أو .xls');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function doImport() {
    if (!preview || !gradeId || !sectionId) return;
    const result = importStudentsToSection(preview, gradeId, sectionId, { skipExisting });
    setResultMsg(
      `تم إضافة ${result.added} طالب` +
        (result.skippedExisting ? ` · تخطي ${result.skippedExisting} موجود مسبقاً` : '') +
        (result.skippedInvalid ? ` · تجاهل ${result.skippedInvalid} صف غير صالح` : ''),
    );
    setPreview(null);
    onDone?.();
  }

  return (
    <Panel title="استيراد طلاب من Excel">
      <p className="mb-3 text-sm text-[var(--color-slate)]/65">
        ارفع ملف Excel فيه عمود <strong>اسم الطالب</strong> (أو أسماء فقط في العمود الأول). يمكن أيضاً
        أعمدة الصف والشعبة والملاحظات.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <Btn variant="ghost" onClick={downloadStudentTemplate}>
          تحميل قالب Excel
        </Btn>
        <Btn variant="ghost" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'جاري القراءة...' : 'اختيار ملف Excel'}
        </Btn>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          الصف المستهدف
          <select
            className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              setSectionId('');
            }}
            disabled={Boolean(defaultGradeId)}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          الشعبة المستهدفة
          <select
            className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            disabled={Boolean(defaultSectionId)}
          >
            <option value="">اختر الشعبة</option>
            {gradeSections.map((s) => (
              <option key={s.id} value={s.id}>
                شعبة {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={skipExisting} onChange={(e) => setSkipExisting(e.target.checked)} />
          تخطي الموجودين في نفس الشعبة
        </label>
      </div>

      {preview && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              الملف: <span className="font-semibold">{preview.fileName}</span> · صالح:{' '}
              <span className="font-semibold text-[var(--color-ok)]">{preview.okCount}</span> من{' '}
              {preview.rows.length}
            </p>
            <div className="flex gap-2">
              <Btn onClick={doImport} disabled={!sectionId || !preview.okCount}>
                اعتماد الاستيراد
              </Btn>
              <Btn variant="ghost" onClick={() => setPreview(null)}>
                إلغاء
              </Btn>
            </div>
          </div>
          <div className="max-h-64 overflow-auto rounded-xl border border-[var(--color-line)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-paper)]">
                <tr className="border-b text-right text-[var(--color-slate)]/50">
                  <th className="px-2 py-2">صف</th>
                  <th className="px-2 py-2">الاسم</th>
                  <th className="px-2 py-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows
                  .filter((r) => r.status !== 'empty')
                  .slice(0, 80)
                  .map((r) => (
                    <tr key={r.rowNumber} className="border-b border-[var(--color-line)]/50">
                      <td className="px-2 py-1">{r.rowNumber}</td>
                      <td className="px-2 py-1 font-medium">{r.fullName || '—'}</td>
                      <td className="px-2 py-1">
                        <StatusTag status={r.status} message={r.message} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {resultMsg && (
        <p className="mt-3 rounded-lg bg-[var(--color-mint)] px-3 py-2 text-sm text-[var(--color-teal-deep)]">
          {resultMsg}
        </p>
      )}
    </Panel>
  );
}

function StatusTag({ status, message }: { status: string; message?: string }) {
  const map: Record<string, string> = {
    ok: 'text-[var(--color-ok)]',
    duplicate: 'text-[var(--color-warn)]',
    invalid: 'text-[var(--color-danger)]',
    empty: 'text-[var(--color-slate)]/50',
  };
  const labels: Record<string, string> = {
    ok: 'جاهز',
    duplicate: 'مكرر',
    invalid: 'غير صالح',
    empty: 'فارغ',
  };
  return (
    <span className={`text-xs font-semibold ${map[status] || ''}`}>
      {labels[status] || status}
      {message ? ` — ${message}` : ''}
    </span>
  );
}
