import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Btn, PageHeader, Panel } from '../components/ui';
import { useStore } from '../hooks/useStore';
import { buildHeaderMatrix, ensureColumns, flatLeaves, maxDepth } from '../lib/columns';
import { scoreService } from '../services/scores';
import { templateService } from '../services/templates';
import type { ColumnDef } from '../types/core';

export function SubjectPage() {
  const { subjectId } = useParams();
  const [params] = useSearchParams();
  const sectionId = params.get('sectionId') || '';
  const { grades, sections, students } = useStore();
  const section = sections.find((s) => s.id === sectionId);
  const grade = grades.find((g) => g.id === section?.gradeId);
  const template = grade ? templateService.getByGrade(grade.id) : null;
  const subject = template?.subjects.find((s) => s.id === subjectId);
  const roster = students
    .filter((s) => s.sectionId === sectionId && s.status === 'active')
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
  const existingScores = subjectId && sectionId ? scoreService.getForSectionSubject(sectionId, subjectId) : [];

  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({});

  if (!section || !grade || !subject) return <p>المادة أو الشعبة غير موجودة</p>;

  const columns = ensureColumns(subject);
  const leaves = flatLeaves(columns);
  const depth = maxDepth(columns);

  function getValue(studentId: string, colId: string, label: string): string {
    if (editing[studentId]?.[colId] !== undefined) return editing[studentId][colId];
    const sc = existingScores.find((s) => s.studentId === studentId);
    const v = sc?.values?.[colId] ?? sc?.values?.[label];
    return v != null ? String(v) : '';
  }

  function setValue(studentId: string, colId: string, val: string) {
    setEditing((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [colId]: val },
    }));
  }

  function saveAll() {
    for (const st of roster) {
      const values: Record<string, number | string | null> = {};
      for (const leaf of leaves) {
        const raw = getValue(st.id, leaf.id, leaf.label);
        if (!raw) {
          values[leaf.id] = null;
          continue;
        }
        const num = Number(raw);
        values[leaf.id] = Number.isFinite(num) ? num : raw;
      }

      const finalLeaf = leaves.find((l) => /نهائي|Final/i.test(l.label));
      const finalVal = finalLeaf ? values[finalLeaf.id] : null;
      const finalScore = typeof finalVal === 'number' ? finalVal : null;

      scoreService.upsert({
        studentId: st.id,
        gradeId: grade!.id,
        sectionId: section!.id,
        subjectId: subject!.id,
        values,
        finalScore,
      });
    }
    setEditing({});
    alert('تم حفظ الدرجات');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={subject.name}
        subtitle={`${grade.name} · شعبة ${section.name} · من ${grade.maxScore}`}
        actions={
          <>
            <Link to={`/section/${section.id}`}>
              <Btn variant="ghost">← الشعبة</Btn>
            </Link>
            <Btn onClick={saveAll}>حفظ الدرجات</Btn>
            <Btn variant="ghost" className="no-print" onClick={() => window.print()}>
              طباعة
            </Btn>
          </>
        }
      />

      <Panel>
        <p className="mb-3 text-xs text-[var(--color-slate)]/55">
          {leaves.length} عمود إدخال — الرأس مرتب: رئيسي ثم فرعي
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <NestedHeader columns={columns} depth={depth} />
            <tbody>
              {roster.map((st, i) => (
                <tr key={st.id} className="border-b border-[var(--color-line)]/50">
                  <td className="px-2 py-2 text-center">{i + 1}</td>
                  <td className="px-2 py-2 text-lg font-extrabold leading-relaxed">{st.fullName}</td>
                  {leaves.map((leaf) => (
                    <td key={leaf.id} className="px-1 py-1">
                      <input
                        className="w-16 rounded border border-[var(--color-line)] px-1 py-0.5 text-center text-sm"
                        value={getValue(st.id, leaf.id, leaf.label)}
                        onChange={(e) => setValue(st.id, leaf.id, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {!roster.length && (
                <tr>
                  <td colSpan={2 + leaves.length} className="py-8 text-center text-[var(--color-slate)]/45">
                    لا طلاب في هذه الشعبة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function NestedHeader({ columns, depth }: { columns: ColumnDef[]; depth: number }) {
  const matrix = buildHeaderMatrix(columns);
  return (
    <thead>
      {matrix.map((row, rowIdx) => (
        <tr
          key={rowIdx}
          className="border-b border-[var(--color-line)] bg-[var(--color-paper)] text-center text-[var(--color-slate)]/60"
        >
          {rowIdx === 0 && (
            <>
              <th className="px-2 py-2" rowSpan={depth}>
                #
              </th>
              <th className="px-2 py-2" rowSpan={depth}>
                اسم الطالب
              </th>
            </>
          )}
          {row.map((cell) => (
            <th
              key={`${cell.id}-${rowIdx}`}
              className={`px-2 py-2 ${cell.colSpan > 1 ? 'bg-[var(--color-teal)]/5 font-bold' : ''}`}
              colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
              rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
            >
              {cell.label}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  );
}
