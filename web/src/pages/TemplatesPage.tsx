import { useState } from 'react';
import { Btn, PageHeader, Panel } from '../components/ui';
import { useStore } from '../hooks/useStore';
import { ensureColumns, flatLeaves, leafCount } from '../lib/columns';
import { templateService } from '../services/templates';
import type { ColumnDef, SubjectTemplate } from '../types/core';

export function TemplatesPage() {
  const { grades, templates } = useStore();
  const [selectedGrade, setSelectedGrade] = useState(grades[0]?.id || '');
  const [newSubject, setNewSubject] = useState('');
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [copyTargetGrade, setCopyTargetGrade] = useState('');
  const [copyMode, setCopyMode] = useState<'replace' | 'merge'>('replace');
  const [copyMsg, setCopyMsg] = useState('');
  const template = templates.find((t) => t.gradeId === selectedGrade);
  const selectedGradeName = grades.find((g) => g.id === selectedGrade)?.name;
  const otherGrades = grades.filter((g) => g.id !== selectedGrade);

  function addSubject() {
    if (!newSubject.trim()) return;
    templateService.addSubject(selectedGrade, newSubject);
    setNewSubject('');
  }

  function copyWholeTemplate() {
    if (!copyTargetGrade) {
      alert('اختر الصف الهدف');
      return;
    }
    const count = templateService.copyGradeTemplate(selectedGrade, copyTargetGrade, copyMode);
    const targetName = grades.find((g) => g.id === copyTargetGrade)?.name;
    setCopyMsg(
      copyMode === 'replace'
        ? `تم نسخ ${count} مادة من ${selectedGradeName} إلى ${targetName} (استبدال كامل)`
        : `تم دمج ${count} مادة من ${selectedGradeName} إلى ${targetName}`,
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="قوالب المواد"
        subtitle="انسخ قالب صف كامل أو مادة واحدة إلى صف آخر — ثم خصّص الأعمدة كما تريد"
      />

      <Panel title="نسخ قالب صف كامل">
        <p className="mb-3 text-sm text-[var(--color-slate)]/65">
          انسخ كل مواد <strong>{selectedGradeName}</strong> مع أعمدتها إلى صف آخر.
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            من الصف
            <select
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setEditingSubject(null);
                setCopyMsg('');
              }}
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            إلى الصف
            <select
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
              value={copyTargetGrade}
              onChange={(e) => setCopyTargetGrade(e.target.value)}
            >
              <option value="">اختر الصف</option>
              {otherGrades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            طريقة النسخ
            <select
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
              value={copyMode}
              onChange={(e) => setCopyMode(e.target.value as 'replace' | 'merge')}
            >
              <option value="replace">استبدال مواد الصف الهدف</option>
              <option value="merge">دمج (بدون تكرار الأسماء)</option>
            </select>
          </label>
          <div className="flex items-end">
            <Btn onClick={copyWholeTemplate} disabled={!copyTargetGrade}>
              نسخ القالب
            </Btn>
          </div>
        </div>
        {copyMsg && <p className="mt-2 text-sm font-semibold text-[var(--color-ok)]">{copyMsg}</p>}
      </Panel>

      <Panel>
        <div className="flex flex-wrap gap-3">
          <Btn variant="ghost" onClick={() => templateService.applyDefaultSections(selectedGrade)}>
            إنشاء الشعب الافتراضية لهذا الصف
          </Btn>
        </div>
      </Panel>

      <Panel
        title={`مواد الصف ${selectedGradeName}`}
        actions={
          <div className="flex gap-2">
            <input
              className="rounded-lg border border-[var(--color-line)] px-2 py-1 text-sm"
              placeholder="مادة جديدة"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
            <Btn onClick={addSubject}>إضافة</Btn>
          </div>
        }
      >
        <div className="space-y-4">
          {template?.subjects.map((sub) => (
            <SubjectCard
              key={sub.id}
              sub={sub}
              gradeId={selectedGrade}
              grades={grades}
              isEditing={editingSubject === sub.id}
              onToggleEdit={() => setEditingSubject(editingSubject === sub.id ? null : sub.id)}
            />
          ))}
          {!template?.subjects.length && (
            <p className="py-4 text-center text-sm text-[var(--color-slate)]/45">
              لا توجد مواد — أضف مادة أو انسخ قالب من صف آخر
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function SubjectCard({
  sub,
  gradeId,
  grades,
  isEditing,
  onToggleEdit,
}: {
  sub: SubjectTemplate;
  gradeId: string;
  grades: { id: string; name: string }[];
  isEditing: boolean;
  onToggleEdit: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(sub.name);
  const [rootLabel, setRootLabel] = useState('');
  const [childDraft, setChildDraft] = useState<{ parentId: string; label: string } | null>(null);
  const [renameCol, setRenameCol] = useState<{ id: string; label: string } | null>(null);
  const [showCopy, setShowCopy] = useState(false);
  const [copyToGrade, setCopyToGrade] = useState('');
  const [copySubjectName, setCopySubjectName] = useState(sub.name);

  const columns = ensureColumns(sub);
  const leaves = flatLeaves(columns);
  const otherGrades = grades.filter((g) => g.id !== gradeId);

  function doRename() {
    if (newName.trim()) templateService.renameSubject(gradeId, sub.id, newName);
    setRenaming(false);
  }

  function addRoot() {
    if (!rootLabel.trim()) return;
    templateService.addColumn(gradeId, sub.id, null, rootLabel);
    setRootLabel('');
  }

  function addChild() {
    if (!childDraft?.label.trim()) return;
    templateService.addColumn(gradeId, sub.id, childDraft.parentId, childDraft.label);
    setChildDraft(null);
  }

  function saveColRename() {
    if (!renameCol?.label.trim()) return;
    templateService.renameColumn(gradeId, sub.id, renameCol.id, renameCol.label);
    setRenameCol(null);
  }

  function doCopySubject() {
    if (!copyToGrade) {
      alert('اختر الصف الهدف');
      return;
    }
    templateService.copySubject(gradeId, sub.id, copyToGrade, copySubjectName);
    setShowCopy(false);
    const target = grades.find((g) => g.id === copyToGrade)?.name;
    alert(`تم نسخ "${sub.name}" إلى صف ${target}`);
  }

  return (
    <div className="rounded-xl border border-[var(--color-line)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {renaming ? (
          <div className="flex gap-2">
            <input
              className="rounded border px-2 py-1 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="text-sm text-[var(--color-ok)]" onClick={doRename}>
              حفظ
            </button>
            <button className="text-sm" onClick={() => setRenaming(false)}>
              إلغاء
            </button>
          </div>
        ) : (
          <p className="text-lg font-semibold">{sub.name}</p>
        )}
        <div className="flex flex-wrap gap-2 text-sm">
          <button className="text-[var(--color-teal)]" onClick={onToggleEdit}>
            {isEditing ? 'إغلاق المحرر' : 'تعديل الأعمدة'}
          </button>
          <button
            className="text-[var(--color-teal)]"
            onClick={() => {
              setShowCopy((v) => !v);
              setCopySubjectName(sub.name);
            }}
          >
            نسخ لصف آخر
          </button>
          <button
            className="text-[var(--color-teal)]"
            onClick={() => {
              setRenaming(true);
              setNewName(sub.name);
            }}
          >
            تسمية
          </button>
          <button
            className="text-[var(--color-danger)]"
            onClick={() => {
              if (confirm('حذف المادة؟')) templateService.removeSubject(gradeId, sub.id);
            }}
          >
            حذف
          </button>
        </div>
      </div>

      {showCopy && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-[var(--color-teal)] bg-[var(--color-mint)]/20 p-3">
          <label className="text-sm">
            إلى الصف
            <select
              className="mt-1 block rounded-lg border px-2 py-1 text-sm"
              value={copyToGrade}
              onChange={(e) => setCopyToGrade(e.target.value)}
            >
              <option value="">اختر</option>
              {otherGrades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            اسم المادة في الصف الجديد
            <input
              className="mt-1 block rounded-lg border px-2 py-1 text-sm"
              value={copySubjectName}
              onChange={(e) => setCopySubjectName(e.target.value)}
            />
          </label>
          <Btn onClick={doCopySubject}>نسخ المادة</Btn>
          <Btn variant="ghost" onClick={() => setShowCopy(false)}>
            إلغاء
          </Btn>
        </div>
      )}

      <div className="mt-3">
        <p className="mb-2 text-xs text-[var(--color-slate)]/55">
          {leaves.length} عمود إدخال
          {columns.some((c: ColumnDef) => c.children?.length)
            ? ` · ${columns.filter((c: ColumnDef) => c.children?.length).length} مجموعة رئيسية`
            : ''}
        </p>
        <div className="space-y-2">
          {columns.map((col: ColumnDef) => (
            <ColumnChip key={col.id} col={col} />
          ))}
        </div>
      </div>

      {isEditing && (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--color-teal)] bg-[var(--color-mint)]/20 p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--color-teal-deep)]">محرر الأعمدة</p>

          <div className="space-y-2">
            {columns.map((col: ColumnDef) => (
              <ColumnEditor
                key={col.id}
                col={col}
                depth={0}
                onAddChild={(parentId) => setChildDraft({ parentId, label: '' })}
                onRename={(id, label) => setRenameCol({ id, label })}
                onConvert={(id) => templateService.convertToGroup(gradeId, sub.id, id)}
                onRemove={(id) => templateService.removeColumn(gradeId, sub.id, id)}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className="rounded-lg border px-2 py-1 text-sm"
              placeholder="اسم عمود رئيسي"
              value={rootLabel}
              onChange={(e) => setRootLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRoot()}
            />
            <Btn onClick={addRoot}>+ عمود رئيسي</Btn>
          </div>

          {childDraft && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-white p-2">
              <span className="text-xs text-[var(--color-slate)]/60">عمود فرعي جديد</span>
              <input
                className="rounded border px-2 py-1 text-sm"
                placeholder="مثال: شفهي"
                autoFocus
                value={childDraft.label}
                onChange={(e) => setChildDraft({ ...childDraft, label: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addChild()}
              />
              <button className="text-sm font-semibold text-[var(--color-ok)]" onClick={addChild}>
                إضافة
              </button>
              <button className="text-sm" onClick={() => setChildDraft(null)}>
                إلغاء
              </button>
            </div>
          )}

          {renameCol && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-white p-2">
              <span className="text-xs text-[var(--color-slate)]/60">تعديل الاسم</span>
              <input
                className="rounded border px-2 py-1 text-sm"
                autoFocus
                value={renameCol.label}
                onChange={(e) => setRenameCol({ ...renameCol, label: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && saveColRename()}
              />
              <button className="text-sm font-semibold text-[var(--color-ok)]" onClick={saveColRename}>
                حفظ
              </button>
              <button className="text-sm" onClick={() => setRenameCol(null)}>
                إلغاء
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ColumnChip({ col }: { col: ColumnDef }) {
  const hasChildren = Boolean(col.children?.length);
  return (
    <div className="rounded-lg border border-[var(--color-line)]/70 bg-white/70 px-3 py-2">
      <span
        className={`text-sm ${hasChildren ? 'font-bold text-[var(--color-teal-deep)]' : 'font-medium'}`}
      >
        {col.label}
        {hasChildren ? ` (${leafCount(col)} فرعي)` : ''}
      </span>
      {hasChildren && (
        <div className="mt-2 flex flex-wrap gap-1 border-r-2 border-[var(--color-teal)]/25 pr-2">
          {col.children.map((child) => (
            <span key={child.id} className="rounded-md bg-[var(--color-mint)] px-2 py-0.5 text-xs">
              {child.label}
              {child.children?.length ? ` › ${child.children.map((c) => c.label).join('، ')}` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ColumnEditor({
  col,
  depth,
  onAddChild,
  onRename,
  onConvert,
  onRemove,
}: {
  col: ColumnDef;
  depth: number;
  onAddChild: (parentId: string) => void;
  onRename: (id: string, label: string) => void;
  onConvert: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const hasChildren = Boolean(col.children?.length);
  return (
    <div className={depth > 0 ? 'mr-4 border-r-2 border-[var(--color-teal)]/20 pr-3' : ''}>
      <div className="flex flex-wrap items-center gap-2 py-1">
        <span className={`text-sm ${hasChildren ? 'font-bold text-[var(--color-teal-deep)]' : 'font-medium'}`}>
          {col.label}
        </span>
        {hasChildren && <span className="text-xs text-[var(--color-slate)]/50">({col.children.length} فرعي)</span>}
        <div className="flex flex-wrap gap-2 text-xs">
          <button className="text-[var(--color-teal)]" onClick={() => onAddChild(col.id)}>
            + فرعي
          </button>
          <button className="text-[var(--color-teal)]" onClick={() => onRename(col.id, col.label)}>
            تسمية
          </button>
          {!hasChildren && (
            <button className="text-[var(--color-teal)]" onClick={() => onConvert(col.id)}>
              حوّل لمجموعة (٣ فرعي)
            </button>
          )}
          <button className="text-[var(--color-danger)]" onClick={() => onRemove(col.id)}>
            حذف
          </button>
        </div>
      </div>
      {hasChildren &&
        col.children.map((child) => (
          <ColumnEditor
            key={child.id}
            col={child}
            depth={depth + 1}
            onAddChild={onAddChild}
            onRename={onRename}
            onConvert={onConvert}
            onRemove={onRemove}
          />
        ))}
    </div>
  );
}
