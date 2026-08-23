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
  const template = templates.find((t) => t.gradeId === selectedGrade);

  function addSubject() {
    if (!newSubject.trim()) return;
    templateService.addSubject(selectedGrade, newSubject);
    setNewSubject('');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="قوالب المواد"
        subtitle="عمود رئيسي يحتوي 3–4 أعمدة فرعية — يظهر بنفس الترتيب في الجدول والطباعة"
      />

      <Panel>
        <div className="flex flex-wrap gap-3">
          <select
            className="rounded-xl border border-[var(--color-line)] px-3 py-2"
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setEditingSubject(null);
            }}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                الصف {g.name}
              </option>
            ))}
          </select>
          <Btn variant="ghost" onClick={() => templateService.applyDefaultSections(selectedGrade)}>
            إنشاء الشعب الافتراضية
          </Btn>
        </div>
      </Panel>

      <Panel
        title={`مواد الصف ${grades.find((g) => g.id === selectedGrade)?.name}`}
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
              isEditing={editingSubject === sub.id}
              onToggleEdit={() => setEditingSubject(editingSubject === sub.id ? null : sub.id)}
            />
          ))}
          {!template?.subjects.length && (
            <p className="py-4 text-center text-sm text-[var(--color-slate)]/45">لا توجد مواد — أضف مادة أعلاه</p>
          )}
        </div>
      </Panel>
    </div>
  );
}

function SubjectCard({
  sub,
  gradeId,
  isEditing,
  onToggleEdit,
}: {
  sub: SubjectTemplate;
  gradeId: string;
  isEditing: boolean;
  onToggleEdit: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(sub.name);
  const [rootLabel, setRootLabel] = useState('');
  const [childDraft, setChildDraft] = useState<{ parentId: string; label: string } | null>(null);
  const [renameCol, setRenameCol] = useState<{ id: string; label: string } | null>(null);

  const columns = ensureColumns(sub);
  const leaves = flatLeaves(columns);

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
        <div className="flex gap-2 text-sm">
          <button className="text-[var(--color-teal)]" onClick={onToggleEdit}>
            {isEditing ? 'إغلاق المحرر' : 'تعديل الأعمدة'}
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
