import { useEffect, useMemo, useState } from 'react';
import { ensureColumns, flatLeaves } from '../lib/columns';
import {
  ClassGradeSheet,
  IndividualGradeSheet,
  buildBlankIndividual,
  type ClassSheetData,
  type IndividualSheetData,
} from '../components/print/GradeSheets';
import { Btn, PageHeader, Panel } from '../components/ui';
import { useStore } from '../hooks/useStore';
import { scoreService } from '../services/scores';
import { templateService } from '../services/templates';

type Tab = 'individual-blank' | 'individual-filled' | 'class-blank' | 'class-filled';

export function FormsPrintPage() {
  const { config, grades, sections, students } = useStore();
  const [gradeId, setGradeId] = useState(grades[0]?.id || '');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [tab, setTab] = useState<Tab>('individual-blank');
  const [studentId, setStudentId] = useState('');
  const [blankCopies, setBlankCopies] = useState(1);
  const [blankRows, setBlankRows] = useState(25);

  const gradeSections = sections.filter((s) => s.gradeId === gradeId);
  const grade = grades.find((g) => g.id === gradeId);
  const section = sections.find((s) => s.id === sectionId);
  const template = gradeId ? templateService.getByGrade(gradeId) : null;
  const subject = template?.subjects.find((s) => s.id === subjectId);
  const roster = students
    .filter((s) => s.sectionId === sectionId && s.status === 'active')
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));

  useEffect(() => {
    if (!gradeSections.find((s) => s.id === sectionId) && gradeSections[0]) {
      setSectionId(gradeSections[0].id);
    }
  }, [gradeId, gradeSections, sectionId]);

  useEffect(() => {
    if (!template?.subjects.length) {
      setSubjectId('');
      return;
    }
    if (!template.subjects.find((s) => s.id === subjectId)) {
      setSubjectId(template.subjects[0].id);
    }
  }, [gradeId, template, subjectId]);

  const individualSheets: IndividualSheetData[] = useMemo(() => {
    if (!grade || !section) return [];
    const subjectNames = template?.subjects.map((s) => s.name) ?? [];

    if (tab === 'individual-blank') {
      return Array.from({ length: Math.max(1, blankCopies) }, () =>
        buildBlankIndividual({
          schoolName: config.name,
          yearLabel: config.academicYear,
          gradeName: grade.name,
          sectionName: section.name,
          maxScore: grade.maxScore,
          subjectNames,
        }),
      );
    }

    if (tab !== 'individual-filled') return [];

    const targets = studentId ? roster.filter((s) => s.id === studentId) : roster;
    return targets.map((st, idx) => {
      const stScores = scoreService.getForStudent(st.id);
      return {
        schoolName: config.name,
        academicYear: config.academicYear,
        gradeName: grade.name,
        sectionName: section.name,
        studentName: st.fullName,
        studentNumber: idx + 1,
        maxScore: grade.maxScore,
        mode: 'filled' as const,
        rows: (template?.subjects ?? []).map((sub) => {
          const sc = stScores.find((s) => s.subjectId === sub.id);
          return { subjectName: sub.name, score: sc?.finalScore ?? '', notes: '' };
        }),
      };
    });
  }, [tab, grade, section, template, roster, studentId, blankCopies, config]);

  const classSheet: ClassSheetData | null = useMemo(() => {
    if (!grade || !section || !subject) return null;
    if (tab !== 'class-blank' && tab !== 'class-filled') return null;

    const columns = ensureColumns(subject);
    const leaves = flatLeaves(columns);
    const scores = scoreService.getForSectionSubject(section.id, subject.id);

    if (tab === 'class-blank') {
      return {
        schoolName: config.name,
        academicYear: config.academicYear,
        gradeName: grade.name,
        sectionName: section.name,
        subjectName: subject.name,
        maxScore: grade.maxScore,
        columns,
        rows: [],
        mode: 'blank',
        blankRowCount: blankRows,
      };
    }

    return {
      schoolName: config.name,
      academicYear: config.academicYear,
      gradeName: grade.name,
      sectionName: section.name,
      subjectName: subject.name,
      maxScore: grade.maxScore,
      columns,
      mode: 'filled',
      rows: roster.map((st, i) => {
        const sc = scores.find((s) => s.studentId === st.id);
        const valuesById: Record<string, string | number | null | undefined> = {};
        for (const leaf of leaves) {
          // Prefer id key; fallback to label for older saved scores
          const byId = sc?.values?.[leaf.id];
          const byLabel = sc?.values?.[leaf.label];
          valuesById[leaf.id] = byId ?? byLabel ?? '';
        }
        return {
          number: i + 1,
          studentName: st.fullName,
          valuesById,
          final: sc?.finalScore ?? '',
        };
      }),
    };
  }, [tab, grade, section, subject, roster, blankRows, config]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'individual-blank', label: 'انفرادية فارغة' },
    { id: 'individual-filled', label: 'انفرادية بالدرجات' },
    { id: 'class-blank', label: 'كشف مادة فارغ' },
    { id: 'class-filled', label: 'كشف مادة بالدرجات' },
  ];

  return (
    <div className="space-y-6 print-root">
      <PageHeader
        title="الطباعة"
        subtitle="انفرادية · كشف مادة مع أعمدة رئيسية وفرعية مرتبة مثل القالب"
        actions={
          <Btn className="no-print" onClick={() => window.print()}>
            طباعة
          </Btn>
        }
      />

      <Panel className="no-print">
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                tab === t.id ? 'bg-[var(--color-teal)] text-white' : 'border border-[var(--color-line)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="الصف"
            value={gradeId}
            onChange={setGradeId}
            options={grades.map((g) => ({ value: g.id, label: g.name }))}
          />
          <Select
            label="الشعبة"
            value={sectionId}
            onChange={setSectionId}
            options={gradeSections.map((s) => ({ value: s.id, label: `شعبة ${s.name}` }))}
          />
          {(tab === 'class-blank' || tab === 'class-filled') && (
            <Select
              label="المادة"
              value={subjectId}
              onChange={setSubjectId}
              options={(template?.subjects ?? []).map((s) => ({ value: s.id, label: s.name }))}
            />
          )}
          {tab === 'individual-filled' && (
            <Select
              label="الطالب"
              value={studentId}
              onChange={setStudentId}
              options={[{ value: '', label: 'الكل' }, ...roster.map((s) => ({ value: s.id, label: s.fullName }))]}
            />
          )}
          {tab === 'individual-blank' && (
            <label className="text-sm">
              عدد النسخ
              <input
                type="number"
                min={1}
                max={50}
                value={blankCopies}
                onChange={(e) => setBlankCopies(Number(e.target.value) || 1)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
          )}
          {tab === 'class-blank' && (
            <label className="text-sm">
              عدد الصفوف
              <input
                type="number"
                min={5}
                max={50}
                value={blankRows}
                onChange={(e) => setBlankRows(Number(e.target.value) || 25)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
          )}
        </div>
        {(tab === 'class-blank' || tab === 'class-filled') && subject && (
          <p className="mt-3 text-xs text-[var(--color-slate)]/60">
            أعمدة القالب: {flatLeaves(ensureColumns(subject)).map((l) => l.label).join(' · ')}
          </p>
        )}
      </Panel>

      {(tab === 'individual-blank' || tab === 'individual-filled') &&
        individualSheets.map((sheet, i) => <IndividualGradeSheet key={i} data={sheet} />)}

      {(tab === 'class-blank' || tab === 'class-filled') && classSheet && (
        <ClassGradeSheet data={classSheet} />
      )}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="text-sm">
      {label}
      <select
        className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value || 'all'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
