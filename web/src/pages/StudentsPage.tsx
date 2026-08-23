import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StudentExcelImport } from '../components/StudentExcelImport';
import { Btn, PageHeader, Panel } from '../components/ui';
import { useStore } from '../hooks/useStore';
import { studentService } from '../services/students';
import type { StudentStatus } from '../types/core';

export function StudentsPage() {
  const { students, grades, sections } = useStore();
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showExcel, setShowExcel] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGradeId, setNewGradeId] = useState(grades[0]?.id || '');
  const [newSectionId, setNewSectionId] = useState('');

  // Full edit dialog state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editGradeId, setEditGradeId] = useState('');
  const [editSectionId, setEditSectionId] = useState('');
  const [editStatus, setEditStatus] = useState<StudentStatus>('active');
  const [editNotes, setEditNotes] = useState('');

  const filtered = useMemo(() => {
    let list = query ? studentService.search(query) : students;
    if (gradeFilter) list = list.filter((s) => s.gradeId === gradeFilter);
    if (sectionFilter) list = list.filter((s) => s.sectionId === sectionFilter);
    return list.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
  }, [students, query, gradeFilter, sectionFilter]);

  const sectionsForFilter = sections.filter((s) => s.gradeId === (gradeFilter || newGradeId));
  const sectionsForEdit = sections.filter((s) => s.gradeId === editGradeId);

  function handleAdd() {
    if (!newName.trim() || !newGradeId || !newSectionId) return;
    studentService.add({ fullName: newName, gradeId: newGradeId, sectionId: newSectionId });
    setNewName('');
    setShowAdd(false);
  }

  function openEdit(id: string) {
    const st = students.find((s) => s.id === id);
    if (!st) return;
    setEditId(id);
    setEditName(st.fullName);
    setEditGradeId(st.gradeId);
    setEditSectionId(st.sectionId);
    setEditStatus(st.status);
    setEditNotes(st.notes || '');
  }

  function saveEdit() {
    if (!editId || !editName.trim()) return;
    studentService.update(editId, {
      fullName: editName,
      gradeId: editGradeId,
      sectionId: editSectionId,
      status: editStatus,
      notes: editNotes || undefined,
    });
    setEditId(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="قاعدة الطلاب"
        subtitle="إضافة يدوية أو استيراد مباشر من Excel"
        actions={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setShowExcel((v) => !v)}>
              استيراد Excel
            </Btn>
            <Btn onClick={() => setShowAdd(true)}>+ إضافة طالب</Btn>
          </div>
        }
      />

      {showExcel && (
        <StudentExcelImport
          defaultGradeId={gradeFilter || undefined}
          defaultSectionId={sectionFilter || undefined}
          onDone={() => setShowExcel(false)}
        />
      )}

      {/* Search & Filter */}
      <Panel>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm"
            placeholder="بحث بالاسم..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm"
            value={gradeFilter}
            onChange={(e) => { setGradeFilter(e.target.value); setSectionFilter(''); }}
          >
            <option value="">كل الصفوف</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select
            className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          >
            <option value="">كل الشعب</option>
            {sectionsForFilter.map((s) => <option key={s.id} value={s.id}>شعبة {s.name}</option>)}
          </select>
          <p className="flex items-center text-sm text-[var(--color-slate)]/60">{filtered.length} طالب</p>
        </div>
      </Panel>

      {/* Add form */}
      {showAdd && (
        <Panel title="إضافة طالب جديد">
          <div className="grid gap-3 md:grid-cols-3">
            <input className="rounded-xl border border-[var(--color-line)] px-3 py-2" placeholder="اسم الطالب الكامل" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <select className="rounded-xl border border-[var(--color-line)] px-3 py-2" value={newGradeId} onChange={(e) => { setNewGradeId(e.target.value); setNewSectionId(''); }}>
              {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select className="rounded-xl border border-[var(--color-line)] px-3 py-2" value={newSectionId} onChange={(e) => setNewSectionId(e.target.value)}>
              <option value="">اختر الشعبة</option>
              {sections.filter((s) => s.gradeId === newGradeId).map((s) => <option key={s.id} value={s.id}>شعبة {s.name}</option>)}
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <Btn onClick={handleAdd}>حفظ</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>إلغاء</Btn>
          </div>
        </Panel>
      )}

      {/* Full edit dialog */}
      {editId && (
        <Panel title="تعديل بيانات الطالب">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              الاسم الكامل
              <input className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>
            <label className="text-sm">
              الصف
              <select className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2" value={editGradeId} onChange={(e) => { setEditGradeId(e.target.value); setEditSectionId(''); }}>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              الشعبة
              <select className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2" value={editSectionId} onChange={(e) => setEditSectionId(e.target.value)}>
                <option value="">اختر</option>
                {sectionsForEdit.map((s) => <option key={s.id} value={s.id}>شعبة {s.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              الحالة
              <select className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2" value={editStatus} onChange={(e) => setEditStatus(e.target.value as StudentStatus)}>
                <option value="active">نشط</option>
                <option value="graduated">متخرج</option>
                <option value="withdrawn">منسحب</option>
                <option value="repeated">باقٍ</option>
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              ملاحظات
              <textarea className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2" rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Btn onClick={saveEdit}>حفظ التعديلات</Btn>
            <Btn variant="ghost" onClick={() => setEditId(null)}>إلغاء</Btn>
            <Btn variant="warn" onClick={() => { if (confirm('حذف الطالب نهائياً؟')) { studentService.remove(editId!); setEditId(null); } }}>
              حذف الطالب
            </Btn>
          </div>
        </Panel>
      )}

      {/* Table */}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-right text-[var(--color-slate)]/50">
                <th className="py-2 px-1">#</th>
                <th className="py-2">الاسم</th>
                <th className="py-2">الصف</th>
                <th className="py-2">الشعبة</th>
                <th className="py-2">الحالة</th>
                <th className="py-2">ملاحظات</th>
                <th className="py-2">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((st, i) => {
                const grade = grades.find((g) => g.id === st.gradeId);
                const section = sections.find((s) => s.id === st.sectionId);
                return (
                  <tr key={st.id} className="border-b border-[var(--color-line)]/50">
                    <td className="py-2 px-1">{i + 1}</td>
                    <td className="py-2">
                      <Link to={`/student/${st.id}`} className="font-medium hover:text-[var(--color-teal)]">{st.fullName}</Link>
                    </td>
                    <td className="py-2">{grade?.name}</td>
                    <td className="py-2">{section?.name}</td>
                    <td className="py-2"><StatusBadge status={st.status} /></td>
                    <td className="py-2 max-w-[120px] truncate text-xs text-[var(--color-slate)]/60">{st.notes || '—'}</td>
                    <td className="py-2">
                      <button className="text-[var(--color-teal)] font-semibold" onClick={() => openEdit(st.id)}>
                        تعديل
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-[var(--color-ok)]',
    graduated: 'bg-blue-50 text-blue-700',
    withdrawn: 'bg-gray-100 text-gray-600',
    repeated: 'bg-amber-50 text-[var(--color-warn)]',
  };
  const labels: Record<string, string> = {
    active: 'نشط', graduated: 'متخرج', withdrawn: 'منسحب', repeated: 'باقٍ',
  };
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${map[status] || ''}`}>{labels[status] || status}</span>;
}
