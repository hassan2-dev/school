import { useEffect, useMemo, useState } from 'react';
import { ensureColumns, flatLeaves } from '../lib/columns';
import {
  ClassGradeSheet,
  IndividualGradeSheet,
  PRINT_STYLE_OPTIONS,
  buildBlankIndividual,
  type ClassSheetData,
  type IndividualSheetData,
} from '../components/print/GradeSheets';
import { Btn, PageHeader, Panel } from '../components/ui';
import { useStore } from '../hooks/useStore';
import { configService } from '../services/config';
import { scoreService } from '../services/scores';
import { templateService } from '../services/templates';
import type { PrintHeader, PrintSheetStyle } from '../types/core';

type Tab = 'individual-blank' | 'individual-filled' | 'class-blank' | 'class-filled';

function defaultHeader(config: ReturnType<typeof configService.get>): PrintHeader {
  return configService.toPrintHeader(config);
}

export function FormsPrintPage() {
  const { config, grades, sections, students } = useStore();
  const [gradeId, setGradeId] = useState(grades[0]?.id || '');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [tab, setTab] = useState<Tab>('class-blank');
  const [studentId, setStudentId] = useState('');
  const [blankCopies, setBlankCopies] = useState(1);
  const [blankRows, setBlankRows] = useState(30);
  const [header, setHeader] = useState<PrintHeader>(() => defaultHeader(config));
  const [saveMsg, setSaveMsg] = useState('');

  // أعد تحميل الرأس عند تغيّر إعدادات المدرسة المحفوظة
  useEffect(() => {
    setHeader(defaultHeader(config));
  }, [
    config.name,
    config.academicYear,
    config.republicTitle,
    config.ministryTitle,
    config.directorate,
    config.documentTitle,
    config.examLabel,
    config.teacherName,
    config.printStyle,
  ]);

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

  function patchHeader<K extends keyof PrintHeader>(key: K, value: PrintHeader[K]) {
    setHeader((h) => ({ ...h, [key]: value }));
    setSaveMsg('');
  }

  function saveHeaderDefaults() {
    configService.savePrintHeader(header);
    setSaveMsg('تم الحفظ في localStorage — الرأس والمدرسة يبقيان بعد إغلاق الصفحة');
  }

  const individualSheets: IndividualSheetData[] = useMemo(() => {
    if (!grade || !section) return [];
    const subjectNames = template?.subjects.map((s) => s.name) ?? [];

    if (tab === 'individual-blank') {
      return Array.from({ length: Math.max(1, blankCopies) }, () =>
        buildBlankIndividual({
          schoolName: header.schoolName,
          yearLabel: header.academicYear,
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
        schoolName: header.schoolName,
        academicYear: header.academicYear,
        gradeName: grade.name,
        sectionName: section.name,
        studentName: st.fullName,
        studentNumber: idx + 1,
        maxScore: grade.maxScore,
        mode: 'filled' as const,
        header,
        rows: (template?.subjects ?? []).map((sub) => {
          const sc = stScores.find((s) => s.subjectId === sub.id);
          return { subjectName: sub.name, score: sc?.finalScore ?? '', notes: '' };
        }),
      };
    });
  }, [tab, grade, section, template, roster, studentId, blankCopies, header]);

  const classSheet: ClassSheetData | null = useMemo(() => {
    if (!grade || !section || !subject) return null;
    if (tab !== 'class-blank' && tab !== 'class-filled') return null;

    const columns = ensureColumns(subject);
    const leaves = flatLeaves(columns);
    const scores = scoreService.getForSectionSubject(section.id, subject.id);

    if (tab === 'class-blank') {
      // دائماً فارغ بالكامل — بدون أسماء حتى لو موجود طلاب
      return {
        header,
        gradeName: grade.name,
        sectionName: section.name,
        subjectName: subject.name,
        maxScore: grade.maxScore,
        columns,
        rows: [],
        mode: 'blank',
        extraBlankRows: Math.max(5, blankRows),
      };
    }

    return {
      header,
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
          valuesById[leaf.id] = sc?.values?.[leaf.id] ?? sc?.values?.[leaf.label] ?? '';
        }
        return {
          number: i + 1,
          studentName: st.fullName,
          valuesById,
          final: sc?.finalScore ?? '',
        };
      }),
    };
  }, [tab, grade, section, subject, roster, blankRows, header]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'class-blank', label: 'كشف مادة فارغ' },
    { id: 'class-filled', label: 'كشف مادة بالدرجات' },
    { id: 'individual-blank', label: 'انفرادية فارغة' },
    { id: 'individual-filled', label: 'انفرادية بالدرجات' },
  ];

  const isClassTab = tab === 'class-blank' || tab === 'class-filled';

  return (
    <div className="space-y-6 print-root">
      <PageHeader
        title="الطباعة"
        subtitle="كشف فارغ = بدون أسماء. كشف بالدرجات = مع الطلاب المحفوظين. البيانات تُحفظ في المتصفح (localStorage)"
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
          {isClassTab && (
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
              عدد الصفوف الفارغة
              <input
                type="number"
                min={5}
                max={50}
                value={blankRows}
                onChange={(e) => setBlankRows(Number(e.target.value) || 30)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              />
            </label>
          )}
        </div>

        {isClassTab && (
          <p className="mt-3 text-sm text-[var(--color-teal-deep)]">
            {tab === 'class-blank'
              ? 'هذا الكشف فارغ بالكامل (بدون أسماء) — حتى لو عندك طلاب محفوظين'
              : `طلاب الشعبة المحفوظون: ${roster.length}`}
            {subject ? ` · أعمدة: ${flatLeaves(ensureColumns(subject)).map((l) => l.label).join(' · ')}` : ''}
          </p>
        )}
      </Panel>

      {isClassTab && (
        <Panel className="no-print" title="تعديل رأس الكشف بالكامل">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FieldInput label="سطر الدولة" value={header.republicTitle} onChange={(v) => patchHeader('republicTitle', v)} />
            <FieldInput label="الوزارة" value={header.ministryTitle} onChange={(v) => patchHeader('ministryTitle', v)} />
            <FieldInput label="المديرية / المنطقة" value={header.directorate} onChange={(v) => patchHeader('directorate', v)} placeholder="مديرية تربية الرصافة..." />
            <FieldInput label="اسم المدرسة" value={header.schoolName} onChange={(v) => patchHeader('schoolName', v)} />
            <FieldInput label="العام الدراسي" value={header.academicYear} onChange={(v) => patchHeader('academicYear', v)} placeholder="2025/2026" />
            <FieldInput label="عنوان الكشف" value={header.documentTitle} onChange={(v) => patchHeader('documentTitle', v)} />
            <FieldInput label="نوع الامتحان" value={header.examLabel} onChange={(v) => patchHeader('examLabel', v)} placeholder="سعي / شهري / نهاية السنة" />
            <FieldInput label="اسم المعلم" value={header.teacherName} onChange={(v) => patchHeader('teacherName', v)} placeholder="اختياري" />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold">قالب الشكل</p>
            <div className="grid gap-3 md:grid-cols-3">
              {PRINT_STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patchHeader('style', opt.id as PrintSheetStyle)}
                  className={`rounded-2xl border p-4 text-right transition ${
                    header.style === opt.id
                      ? 'border-[var(--color-teal)] bg-[var(--color-mint)]/40 ring-2 ring-[var(--color-teal)]/30'
                      : 'border-[var(--color-line)] hover:border-[var(--color-teal)]/40'
                  }`}
                >
                  <p className="font-semibold">{opt.label}</p>
                  <p className="mt-1 text-xs text-[var(--color-slate)]/60">{opt.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Btn onClick={saveHeaderDefaults}>حفظ في localStorage</Btn>
            <Btn variant="ghost" onClick={() => setHeader(defaultHeader(config))}>
              استعادة المحفوظ
            </Btn>
            {saveMsg && (
              <p className="text-sm font-semibold text-[var(--color-ok)]">{saveMsg}</p>
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--color-slate)]/55">
            الطلاب والدرجات يُحفظون تلقائياً في localStorage عند الإضافة أو الاستيراد من Excel.
          </p>
        </Panel>
      )}

      {(tab === 'individual-blank' || tab === 'individual-filled') &&
        individualSheets.map((sheet, i) => <IndividualGradeSheet key={i} data={sheet} />)}

      {isClassTab && classSheet && <ClassGradeSheet data={classSheet} />}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
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
