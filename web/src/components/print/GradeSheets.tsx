import type { ColumnDef, PrintHeader, PrintSheetStyle } from '../../types/core';
import { buildHeaderMatrix, flatLeaves, maxDepth } from '../../lib/columns';

export interface IndividualSheetData {
  schoolName: string;
  academicYear: string;
  gradeName: string;
  sectionName: string;
  studentName: string;
  studentNumber?: number | string;
  maxScore: number;
  rows: { subjectName: string; score: string | number; notes?: string }[];
  mode: 'blank' | 'filled';
  blankRowCount?: number;
  header?: Partial<PrintHeader>;
}

export interface ClassSheetData {
  header: PrintHeader;
  gradeName: string;
  sectionName: string;
  subjectName: string;
  maxScore: number;
  columns: ColumnDef[];
  rows: {
    number: number;
    studentName: string;
    valuesById: Record<string, string | number | null | undefined>;
    final?: string | number;
  }[];
  mode: 'blank' | 'filled';
  /** صفوف إضافية فارغة بعد أسماء الطلاب */
  extraBlankRows?: number;
}

export function IndividualGradeSheet({ data }: { data: IndividualSheetData }) {
  const blankCount = data.blankRowCount ?? 10;
  const rows =
    data.mode === 'filled'
      ? data.rows
      : Array.from({ length: blankCount }, (_, i) => ({
          subjectName: data.rows[i]?.subjectName || '',
          score: '',
          notes: '',
        }));

  const republic = data.header?.republicTitle || 'جمهورية العراق';
  const ministry = data.header?.ministryTitle || 'وزارة التربية';

  return (
    <article className="sheet-page sheet-paper mx-auto mb-6 w-full max-w-[210mm] p-6 shadow-sm print:mb-0 print:shadow-none">
      <header className="mb-4 border-b-2 border-black pb-3 text-center">
        <p className="font-display text-2xl font-bold">{republic}</p>
        <p className="mt-1 text-sm">{ministry}</p>
        <p className="mt-3 font-display text-xl font-bold underline decoration-2 underline-offset-4">
          انفرادية درجات الطالب
          {data.mode === 'blank' ? ' (نموذج فارغ)' : ''}
        </p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <Field label="اسم المدرسة" value={data.schoolName} />
        <Field label="العام الدراسي" value={data.academicYear} />
        <Field label="الصف" value={data.gradeName} />
        <Field label="الشعبة" value={data.sectionName} />
        <Field
          label="اسم الطالب"
          value={data.mode === 'blank' && !data.studentName ? '................................' : data.studentName}
        />
        <Field label="الرقم" value={data.studentNumber ?? '........'} />
      </div>

      <table className="sheet-table">
        <thead>
          <tr>
            <th style={{ width: 48 }}>ت</th>
            <th className="name-cell">المادة</th>
            <th style={{ width: 110 }}>الدرجة / {data.maxScore}</th>
            <th style={{ width: 140 }}>الملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td className="name-cell">{row.subjectName || '\u00A0'}</td>
              <td>{row.score === '' || row.score == null ? '\u00A0' : row.score}</td>
              <td>{row.notes || '\u00A0'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm">
        <Sign label="معلم الصف" />
        <Sign label="إدارة المدرسة" />
        <Sign label="ختم المدرسة" />
      </div>
    </article>
  );
}

export function ClassGradeSheet({ data }: { data: ClassSheetData }) {
  const columns = data.columns?.length ? data.columns : [{ id: 'score', label: 'الدرجة', children: [] }];
  const leaves = flatLeaves(columns);
  const depth = maxDepth(columns);
  const matrix = buildHeaderMatrix(columns);
  const style = data.header.style || 'classic';

  const baseRows =
    data.mode === 'filled'
      ? data.rows
      : data.rows.length
        ? data.rows.map((r) => ({
            ...r,
            valuesById: {},
            final: '',
          }))
        : [];

  const extra = Math.max(0, data.extraBlankRows ?? 0);
  const startNum = baseRows.length + 1;
  const extraRows = Array.from({ length: extra }, (_, i) => ({
    number: startNum + i,
    studentName: '',
    valuesById: {} as Record<string, string | number | null | undefined>,
    final: '',
  }));

  const rows = [...baseRows, ...extraRows];
  const showExtraFinal =
    data.mode === 'filled' && !leaves.some((l) => /نهائي|Final/i.test(l.label));

  return (
    <article
      className={`sheet-page sheet-paper landscape-sheet sheet-style-${style} mx-auto mb-6 w-full max-w-[297mm] overflow-x-auto p-5 shadow-sm print:mb-0 print:shadow-none`}
    >
      <ClassHeader data={data} />

      <table className="sheet-table nested-print-table">
        <thead>
          {matrix.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {rowIdx === 0 && (
                <>
                  <th style={{ width: 40 }} rowSpan={depth}>
                    ت
                  </th>
                  <th className="name-cell" rowSpan={depth}>
                    اسم الطالب
                  </th>
                </>
              )}
              {row.map((cell) => (
                <th
                  key={`${cell.id}-${rowIdx}`}
                  colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                  rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                  className={cell.colSpan > 1 ? 'group-head' : undefined}
                >
                  {cell.label}
                </th>
              ))}
              {rowIdx === 0 && showExtraFinal && <th rowSpan={depth}>النهائية</th>}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.number}>
              <td>{row.number}</td>
              <td className="name-cell">{row.studentName || '\u00A0'}</td>
              {leaves.map((leaf) => {
                const v = row.valuesById?.[leaf.id];
                return <td key={leaf.id}>{v === '' || v == null ? '\u00A0' : v}</td>;
              })}
              {showExtraFinal && <td>{row.final === '' || row.final == null ? '\u00A0' : row.final}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm">
        <Sign label={data.header.teacherName ? `المعلم: ${data.header.teacherName}` : 'معلم المادة'} />
        <Sign label="إدارة المدرسة" />
        <Sign label="الختم" />
      </div>
    </article>
  );
}

function ClassHeader({ data }: { data: ClassSheetData }) {
  const h = data.header;
  const style = h.style;

  if (style === 'formal') {
    return (
      <header className="mb-4">
        <div className="grid grid-cols-3 items-start gap-2 border-2 border-black p-3 text-sm">
          <div className="text-right">
            <p className="font-bold">{h.republicTitle}</p>
            <p>{h.ministryTitle}</p>
            {h.directorate && <p className="mt-1">{h.directorate}</p>}
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-bold underline decoration-2 underline-offset-4">
              {h.documentTitle}
            </p>
            {h.examLabel && <p className="mt-1 text-xs">{h.examLabel}</p>}
            {data.mode === 'blank' && <p className="mt-1 text-xs text-black/60">نموذج للتعبئة</p>}
          </div>
          <div className="text-left">
            <p>
              <span className="font-semibold">العام:</span> {h.academicYear}
            </p>
            <p>
              <span className="font-semibold">من:</span> {data.maxScore}
            </p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border border-black px-3 py-2 text-sm md:grid-cols-4">
          <Field label="المدرسة" value={h.schoolName} />
          <Field label="الصف" value={data.gradeName} />
          <Field label="الشعبة" value={data.sectionName} />
          <Field label="المادة" value={data.subjectName} />
        </div>
      </header>
    );
  }

  if (style === 'clean') {
    return (
      <header className="mb-4 text-center">
        <p className="text-xs tracking-wide text-black/55">
          {h.republicTitle} · {h.ministryTitle}
          {h.directorate ? ` · ${h.directorate}` : ''}
        </p>
        <p className="mt-2 font-display text-2xl font-bold">{h.documentTitle}</p>
        {h.examLabel && <p className="mt-1 text-sm text-black/70">{h.examLabel}</p>}
        <div className="mx-auto mt-3 flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-1 border-y border-black/30 py-2 text-sm">
          <span>
            <b>المدرسة:</b> {h.schoolName}
          </span>
          <span>
            <b>العام:</b> {h.academicYear}
          </span>
          <span>
            <b>الصف:</b> {data.gradeName}
          </span>
          <span>
            <b>الشعبة:</b> {data.sectionName}
          </span>
          <span>
            <b>المادة:</b> {data.subjectName}
          </span>
          <span>
            <b>من:</b> {data.maxScore}
          </span>
        </div>
      </header>
    );
  }

  // classic
  return (
    <header className="mb-3 border-b-2 border-black pb-2 text-center">
      <p className="font-display text-xl font-bold">
        {h.republicTitle} — {h.ministryTitle}
      </p>
      {h.directorate && <p className="mt-1 text-sm">{h.directorate}</p>}
      <p className="mt-2 font-display text-lg font-bold">
        {h.documentTitle}
        {data.mode === 'blank' ? ' (نموذج فارغ)' : ''}
      </p>
      {h.examLabel && <p className="mt-1 text-sm">{h.examLabel}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
        <Field label="المدرسة" value={h.schoolName} />
        <Field label="العام" value={h.academicYear} />
        <Field label="الصف" value={data.gradeName} />
        <Field label="الشعبة" value={data.sectionName} />
        <Field label="المادة" value={data.subjectName || '................'} />
        <Field label="من" value={String(data.maxScore)} />
      </div>
    </header>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <p>
      <span className="font-semibold">{label}: </span>
      <span>{value}</span>
    </p>
  );
}

function Sign({ label }: { label: string }) {
  return (
    <div>
      <p className="mb-10 font-semibold">{label}</p>
      <p>........................</p>
    </div>
  );
}

export function buildBlankIndividual(params: {
  schoolName: string;
  yearLabel: string;
  gradeName: string;
  sectionName: string;
  maxScore: number;
  subjectNames: string[];
  studentName?: string;
  blankExtras?: number;
}): IndividualSheetData {
  const rows = [
    ...params.subjectNames.map((subjectName) => ({ subjectName, score: '', notes: '' })),
    ...Array.from({ length: params.blankExtras ?? 0 }, () => ({
      subjectName: '',
      score: '',
      notes: '',
    })),
  ];
  return {
    schoolName: params.schoolName,
    academicYear: params.yearLabel,
    gradeName: params.gradeName,
    sectionName: params.sectionName,
    studentName: params.studentName || '',
    maxScore: params.maxScore,
    rows,
    mode: 'blank',
    blankRowCount: Math.max(rows.length, 8),
  };
}

export const PRINT_STYLE_OPTIONS: { id: PrintSheetStyle; label: string; hint: string }[] = [
  { id: 'classic', label: 'كلاسيكي', hint: 'رأس مركزي بسيط — مناسب للطباعة السريعة' },
  { id: 'formal', label: 'رسمي إداري', hint: 'إطار ثلاثي: وزارة / عنوان / عام' },
  { id: 'clean', label: 'حديث نظيف', hint: 'خطوط خفيفة ومسافات واسعة' },
];
