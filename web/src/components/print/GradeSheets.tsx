import type { ColumnDef } from '../../types/core';
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
}

export interface ClassSheetData {
  schoolName: string;
  academicYear: string;
  gradeName: string;
  sectionName: string;
  subjectName: string;
  maxScore: number;
  /** Nested column tree from subject template */
  columns: ColumnDef[];
  rows: {
    number: number;
    studentName: string;
    /** values keyed by leaf column id */
    valuesById: Record<string, string | number | null | undefined>;
    final?: string | number;
  }[];
  mode: 'blank' | 'filled';
  blankRowCount?: number;
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

  return (
    <article className="sheet-page sheet-paper mx-auto mb-6 w-full max-w-[210mm] p-6 shadow-sm print:mb-0 print:shadow-none">
      <header className="mb-4 border-b-2 border-black pb-3 text-center">
        <p className="font-display text-2xl font-bold">جمهورية العراق</p>
        <p className="mt-1 text-sm">وزارة التربية</p>
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
  const blankCount = data.blankRowCount ?? 20;

  const rows =
    data.mode === 'filled'
      ? data.rows
      : Array.from({ length: blankCount }, (_, i) => ({
          number: i + 1,
          studentName: '',
          valuesById: {} as Record<string, string | number | null | undefined>,
          final: '',
        }));

  const showExtraFinal =
    data.mode === 'filled' &&
    !leaves.some((l) => /نهائي|Final/i.test(l.label));

  return (
    <article className="sheet-page sheet-paper landscape-sheet mx-auto mb-6 w-full max-w-[297mm] overflow-x-auto p-5 shadow-sm print:mb-0 print:shadow-none">
      <header className="mb-3 border-b-2 border-black pb-2 text-center">
        <p className="font-display text-xl font-bold">جمهورية العراق — وزارة التربية</p>
        <p className="mt-2 font-display text-lg font-bold">
          كشف درجات المادة{data.mode === 'blank' ? ' (نموذج فارغ)' : ''}
        </p>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
        <Field label="المدرسة" value={data.schoolName} />
        <Field label="العام" value={data.academicYear} />
        <Field label="الصف" value={data.gradeName} />
        <Field label="الشعبة" value={data.sectionName} />
        <Field label="المادة" value={data.subjectName || '................'} />
        <Field label="من" value={String(data.maxScore)} />
      </div>

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
              {rowIdx === 0 && showExtraFinal && (
                <th rowSpan={depth}>النهائية</th>
              )}
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

      <div className="mt-8 grid grid-cols-2 gap-6 text-center text-sm">
        <Sign label="معلم المادة" />
        <Sign label="إدارة المدرسة / الختم" />
      </div>
    </article>
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
