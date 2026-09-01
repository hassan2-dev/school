import { useEffect, useState } from 'react';
import { Btn, ExplainDialog, PageHeader, Panel } from '../components/ui';
import { useStore } from '../hooks/useStore';
import { ensureColumns, flatLeaves, leafCount } from '../lib/columns';
import { templateService } from '../services/templates';
import type { ColumnDef, SubjectTemplate } from '../types/core';

type Notice = { type: 'ok' | 'err'; text: string } | null;

const selectClass =
  'mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm';

export function TemplatesPage() {
  const { grades, templates } = useStore();
  const [selectedGrade, setSelectedGrade] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [copyTargetGrade, setCopyTargetGrade] = useState('');
  const [copyMode, setCopyMode] = useState<'replace' | 'merge'>('replace');
  const [notice, setNotice] = useState<Notice>(null);
  const [showGradeCopyHelp, setShowGradeCopyHelp] = useState(false);
  const [showGradeCopyConfirm, setShowGradeCopyConfirm] = useState(false);

  useEffect(() => {
    if (!selectedGrade && grades[0]) setSelectedGrade(grades[0].id);
  }, [grades, selectedGrade]);

  useEffect(() => {
    setCopyTargetGrade('');
    setEditingSubject(null);
    setNotice(null);
  }, [selectedGrade]);

  const template = templates.find((t) => t.gradeId === selectedGrade);
  const selectedGradeName = grades.find((g) => g.id === selectedGrade)?.name ?? '';
  const copyTargetName = grades.find((g) => g.id === copyTargetGrade)?.name ?? '';
  const otherGrades = grades.filter((g) => g.id !== selectedGrade);
  const subjectNames = template?.subjects.map((s) => s.name).join('، ') || '—';

  function showNotice(type: 'ok' | 'err', text: string) {
    setNotice({ type, text });
  }

  function addSubject() {
    if (!newSubject.trim()) return;
    templateService.addSubject(selectedGrade, newSubject);
    setNewSubject('');
    showNotice('ok', `تمت إضافة مادة "${newSubject.trim()}"`);
  }

  function openGradeCopyConfirm() {
    if (!copyTargetGrade) {
      showNotice('err', 'اختر الصف الهدف أولاً');
      return;
    }
    setShowGradeCopyConfirm(true);
  }

  function copyWholeTemplate() {
    const result = templateService.copyGradeTemplate(selectedGrade, copyTargetGrade, copyMode);
    setShowGradeCopyConfirm(false);
    if (!result.ok) {
      showNotice('err', result.reason);
      return;
    }
    if (copyMode === 'replace') {
      showNotice('ok', `تم نسخ ${result.added} مادة من ${selectedGradeName} إلى ${copyTargetName} (استبدال كامل)`);
    } else if (result.skipped > 0) {
      showNotice(
        'ok',
        `تمت إضافة ${result.added} مادة إلى ${copyTargetName} · تم تخطي ${result.skipped} مادة مكررة`,
      );
    } else {
      showNotice('ok', `تمت إضافة ${result.added} مادة إلى ${copyTargetName}`);
    }
  }

  const gradeCopySections = [
    {
      title: 'ماذا يُنسخ؟',
      body: (
        <>
          جميع مواد صف <strong>{selectedGradeName}</strong> مع أعمدة الدرجات (رئيسية وفرعية).
          <br />
          <span className="text-[var(--color-slate)]/60">
            ({template?.subjects.length ?? 0} مادة: {subjectNames})
          </span>
        </>
      ),
    },
    {
      title: 'أين يذهب؟',
      body: (
        <>
          من <strong>صف {selectedGradeName}</strong> ← إلى <strong>صف {copyTargetName}</strong>
          <br />
          {copyMode === 'replace'
            ? 'سيستبدل مواد الصف الهدف بالكامل.'
            : 'سيُضاف إلى مواد الصف الهدف الحالية (بدون تكرار الأسماء).'}
        </>
      ),
    },
    {
      title: 'لماذا؟',
      body:
        'لتوفير الوقت — بدل إنشاء المواد والأعمدة يدوياً في كل صف، تنسخ القالب الجاهز ثم تخصّصه حسب حاجة ذلك الصف. التعديل لاحقاً في الصف الهدف لا يؤثر على الصف المصدر.',
    },
  ];

  const gradeCopyNote =
    copyMode === 'replace' ? (
      <>
        <strong>تنبيه:</strong> الاستبدال يحذف مواد صف {copyTargetName} الحالية ودرجات الطلاب المرتبطة بها.
      </>
    ) : (
      <>
        <strong>ملاحظة:</strong> المواد الموجودة مسبقاً في صف {copyTargetName} بنفس الاسم لن تتغيّر.
      </>
    );

  if (!grades.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="قوالب المواد" subtitle="لا توجد صفوف — أضف صفوفاً أولاً من صفحة الصفوف" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="قوالب المواد"
        subtitle="حدّد الصف، عدّل المواد، أو انسخ القالب إلى صف آخر ثم خصّصه"
      />

      <Panel title="الصف الحالي">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="text-sm">
            الصف
            <select
              className={selectClass}
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <Btn variant="ghost" onClick={() => templateService.applyDefaultSections(selectedGrade)}>
            إنشاء الشعب الافتراضية
          </Btn>
        </div>
      </Panel>

      <Panel
        title={
          <span className="flex items-center gap-2">
            نسخ قالب الصف
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-teal)]/40 text-xs font-bold text-[var(--color-teal)] hover:bg-[var(--color-mint)]"
              title="ما معنى نسخ القالب؟"
              onClick={() => setShowGradeCopyHelp(true)}
            >
              ؟
            </button>
          </span>
        }
      >
        <p className="mb-3 text-sm text-[var(--color-slate)]/65">
          انسخ مواد <strong>{selectedGradeName}</strong> ({template?.subjects.length ?? 0} مادة) إلى صف آخر.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            إلى الصف
            <select
              className={selectClass}
              value={copyTargetGrade}
              onChange={(e) => setCopyTargetGrade(e.target.value)}
            >
              <option value="">اختر الصف الهدف</option>
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
              className={selectClass}
              value={copyMode}
              onChange={(e) => setCopyMode(e.target.value as 'replace' | 'merge')}
            >
              <option value="replace">استبدال مواد الصف الهدف</option>
              <option value="merge">دمج (تخطي الأسماء المكررة)</option>
            </select>
          </label>
          <div className="flex items-end">
            <Btn onClick={openGradeCopyConfirm} disabled={!copyTargetGrade}>
              نسخ القالب
            </Btn>
          </div>
        </div>
      </Panel>

      <ExplainDialog
        open={showGradeCopyHelp}
        title="شرح: نسخ قالب الصف"
        sections={[
          {
            title: 'ماذا يُنسخ؟',
            body: 'كل المواد المعرّفة للصف المختار، مع أعمدة الدرجات (مثل: شفهي، تحريري، مجموع...). لا يُنسخ الطلاب ولا درجاتهم.',
          },
          {
            title: 'أين يذهب؟',
            body: 'من الصف الذي تختاره في الأعلى إلى صف آخر تختاره من قائمة «إلى الصف».',
          },
          {
            title: 'لماذا؟',
            body: 'مثلاً: جهّزت قالب الصف الأول بالكامل وتريد نفس الهيكل في الصف الثاني — انسخه وعدّل ما تحتاجه فقط.',
          },
        ]}
        note={
          <>
            <strong>استبدال:</strong> يحذف مواد الصف الهدف ويضع النسخة الجديدة.
            <br />
            <strong>دمج:</strong> يضيف المواد الجديدة فقط ويتخطى الأسماء المكررة.
          </>
        }
        infoOnly
        onClose={() => setShowGradeCopyHelp(false)}
      />

      <ExplainDialog
        open={showGradeCopyConfirm}
        title="تأكيد نسخ قالب الصف"
        sections={gradeCopySections}
        note={gradeCopyNote}
        confirmLabel="نعم، انسخ الآن"
        onConfirm={copyWholeTemplate}
        onClose={() => setShowGradeCopyConfirm(false)}
      />

      {notice && (
        <p
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            notice.type === 'ok'
              ? 'bg-emerald-50 text-[var(--color-ok)]'
              : 'bg-red-50 text-[var(--color-danger)]'
          }`}
        >
          {notice.text}
        </p>
      )}

      <Panel
        title={`مواد ${selectedGradeName}`}
        actions={
          <div className="flex gap-2">
            <input
              className="rounded-lg border border-[var(--color-line)] px-2 py-1 text-sm"
              placeholder="مادة جديدة"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubject()}
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
              onNotice={showNotice}
            />
          ))}
          {!template?.subjects.length && (
            <p className="py-4 text-center text-sm text-[var(--color-slate)]/45">
              لا توجد مواد — أضف مادة أو انسخ قالباً من صف آخر
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
  onNotice,
}: {
  sub: SubjectTemplate;
  gradeId: string;
  grades: { id: string; name: string }[];
  isEditing: boolean;
  onToggleEdit: () => void;
  onNotice: (type: 'ok' | 'err', text: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(sub.name);
  const [rootLabel, setRootLabel] = useState('');
  const [childDraft, setChildDraft] = useState<{ parentId: string; label: string } | null>(null);
  const [renameCol, setRenameCol] = useState<{ id: string; label: string } | null>(null);
  const [showCopy, setShowCopy] = useState(false);
  const [copyToGrade, setCopyToGrade] = useState('');
  const [copySubjectName, setCopySubjectName] = useState(sub.name);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);

  useEffect(() => {
    setNewName(sub.name);
    setCopySubjectName(sub.name);
  }, [sub.name]);

  const columns = ensureColumns(sub);
  const leaves = flatLeaves(columns);
  const otherGrades = grades.filter((g) => g.id !== gradeId);
  const sourceGradeName = grades.find((g) => g.id === gradeId)?.name ?? '';
  const targetGradeName = grades.find((g) => g.id === copyToGrade)?.name ?? '';
  const columnSummary = leaves.map((l) => l.label).join('، ') || '—';

  function openCopyConfirm() {
    if (!copyToGrade) {
      onNotice('err', 'اختر الصف الهدف أولاً');
      return;
    }
    if (!copySubjectName.trim()) {
      onNotice('err', 'أدخل اسم المادة في الصف الجديد');
      return;
    }
    setShowCopyConfirm(true);
  }

  function doCopySubject() {
    const result = templateService.copySubject(gradeId, sub.id, copyToGrade, copySubjectName);
    setShowCopyConfirm(false);
    if (!result.ok) {
      onNotice('err', result.reason);
      return;
    }
    setShowCopy(false);
    setCopyToGrade('');
    onNotice('ok', `تم نسخ "${result.subject.name}" إلى صف ${targetGradeName}`);
  }

  function doRename() {
    if (!newName.trim()) return;
    templateService.renameSubject(gradeId, sub.id, newName);
    setRenaming(false);
    onNotice('ok', `تم تغيير الاسم إلى "${newName.trim()}"`);
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

  function doRename() {
    <div className="rounded-xl border border-[var(--color-line)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {renaming ? (
          <div className="flex gap-2">
            <input
              className="rounded border px-2 py-1 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doRename()}
            />
            <button type="button" className="text-sm text-[var(--color-ok)]" onClick={doRename}>
              حفظ
            </button>
            <button type="button" className="text-sm" onClick={() => setRenaming(false)}>
              إلغاء
            </button>
          </div>
        ) : (
          <p className="text-lg font-semibold">{sub.name}</p>
        )}
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" className="text-[var(--color-teal)]" onClick={onToggleEdit}>
            {isEditing ? 'إغلاق المحرر' : 'تعديل الأعمدة'}
          </button>
          <button
            type="button"
            className="text-[var(--color-teal)]"
            onClick={() => {
              setShowCopy((v) => !v);
              setCopySubjectName(sub.name);
            }}
          >
            نسخ لصف آخر
          </button>
          <button
            type="button"
            className="text-[var(--color-teal)]"
            onClick={() => {
              setRenaming(true);
              setNewName(sub.name);
            }}
          >
            تسمية
          </button>
          <button
            type="button"
            className="text-[var(--color-danger)]"
            onClick={() => {
              if (confirm('حذف المادة؟')) {
                templateService.removeSubject(gradeId, sub.id);
                onNotice('ok', `تم حذف "${sub.name}"`);
              }
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
              onKeyDown={(e) => e.key === 'Enter' && doCopySubject()}
            />
          </label>
          <Btn onClick={openCopyConfirm}>نسخ المادة</Btn>
          <Btn variant="ghost" onClick={() => setShowCopy(false)}>
            إلغاء
          </Btn>
        </div>
      )}

      <ExplainDialog
        open={showCopyConfirm}
        title={`تأكيد نسخ مادة «${sub.name}»`}
        sections={[
          {
            title: 'ماذا يُنسخ؟',
            body: (
              <>
                مادة <strong>{sub.name}</strong> مع {leaves.length} عمود إدخال.
                <br />
                <span className="text-[var(--color-slate)]/60">({columnSummary})</span>
              </>
            ),
          },
          {
            title: 'أين يذهب؟',
            body: (
              <>
                من <strong>صف {sourceGradeName}</strong> ← إلى <strong>صف {targetGradeName}</strong>
                <br />
                باسم: <strong>{copySubjectName.trim()}</strong>
              </>
            ),
          },
          {
            title: 'لماذا؟',
            body:
              'لاستخدام نفس هيكل الدرجات (شفهي/تحريري/مجموع...) في صف آخر دون إعادة إنشائه يدوياً. يمكنك تعديل الأعمدة لاحقاً في الصف الجديد بشكل مستقل.',
          },
        ]}
        note="لا يُنسخ الطلاب ولا درجاتهم — فقط قالب المادة وأعمدتها."
        confirmLabel="نعم، انسخ المادة"
        onConfirm={doCopySubject}
        onClose={() => setShowCopyConfirm(false)}
      />

      <div className="mt-3">
        <p className="mb-2 text-xs text-[var(--color-slate)]/55">
          {leaves.length} عمود إدخال
          {columns.some((c) => c.children?.length)
            ? ` · ${columns.filter((c) => c.children?.length).length} مجموعة رئيسية`
            : ''}
        </p>
        <div className="space-y-2">
          {columns.map((col) => (
            <ColumnChip key={col.id} col={col} />
          ))}
        </div>
      </div>

      {isEditing && (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--color-teal)] bg-[var(--color-mint)]/20 p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--color-teal-deep)]">محرر الأعمدة</p>

          <div className="space-y-2">
            {columns.map((col) => (
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
              <button type="button" className="text-sm font-semibold text-[var(--color-ok)]" onClick={addChild}>
                إضافة
              </button>
              <button type="button" className="text-sm" onClick={() => setChildDraft(null)}>
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
              <button type="button" className="text-sm font-semibold text-[var(--color-ok)]" onClick={saveColRename}>
                حفظ
              </button>
              <button type="button" className="text-sm" onClick={() => setRenameCol(null)}>
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
          <button type="button" className="text-[var(--color-teal)]" onClick={() => onAddChild(col.id)}>
            + فرعي
          </button>
          <button type="button" className="text-[var(--color-teal)]" onClick={() => onRename(col.id, col.label)}>
            تسمية
          </button>
          {!hasChildren && (
            <button type="button" className="text-[var(--color-teal)]" onClick={() => onConvert(col.id)}>
              حوّل لمجموعة (٣ فرعي)
            </button>
          )}
          <button type="button" className="text-[var(--color-danger)]" onClick={() => onRemove(col.id)}>
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
