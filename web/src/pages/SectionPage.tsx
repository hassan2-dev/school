import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StudentExcelImport } from '../components/StudentExcelImport';
import { Btn, PageHeader, Panel } from '../components/ui';
import { useStore } from '../hooks/useStore';
import { studentService } from '../services/students';
import { templateService } from '../services/templates';

export function SectionPage() {
  const { sectionId } = useParams();
  const { sections, grades, students, config } = useStore();
  const section = sections.find((s) => s.id === sectionId);
  const grade = grades.find((g) => g.id === section?.gradeId);
  const roster = students.filter((s) => s.sectionId === sectionId && s.status === 'active');
  const template = section ? templateService.getByGrade(section.gradeId) : null;
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showExcel, setShowExcel] = useState(false);

  if (!section || !grade) return <p>الشعبة غير موجودة</p>;

  function addStudent() {
    if (!newName.trim()) return;
    studentService.add({ fullName: newName, gradeId: grade!.id, sectionId: section!.id });
    setNewName('');
    setShowAdd(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${grade.name} — شعبة ${section.name}`}
        subtitle={`${roster.length} طالب · العام ${config.academicYear}`}
        actions={
          <>
            <Link to={`/grades/${grade.id}`}>
              <Btn variant="ghost">← الصف</Btn>
            </Link>
            <Btn variant="ghost" onClick={() => setShowExcel((v) => !v)}>
              استيراد Excel
            </Btn>
            <Btn onClick={() => setShowAdd(true)}>+ طالب</Btn>
          </>
        }
      />

      {showExcel && (
        <StudentExcelImport
          defaultGradeId={grade.id}
          defaultSectionId={section.id}
          onDone={() => setShowExcel(false)}
        />
      )}

      {showAdd && (
        <Panel title="إضافة طالب للشعبة">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-[var(--color-line)] px-3 py-2"
              placeholder="اسم الطالب"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Btn onClick={addStudent}>حفظ</Btn>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="قائمة الطلاب" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-[var(--color-slate)]/50">
                <th className="py-2">#</th>
                <th className="py-2">الاسم</th>
                <th className="py-2">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((st, i) => (
                <tr key={st.id} className="border-b border-[var(--color-line)]/50">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">
                    <Link to={`/student/${st.id}`} className="font-medium hover:text-[var(--color-teal)]">
                      {st.fullName}
                    </Link>
                  </td>
                  <td className="py-2">
                    <Link to={`/student/${st.id}`} className="text-[var(--color-teal)]">
                      ملف الطالب
                    </Link>
                  </td>
                </tr>
              ))}
              {!roster.length && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-[var(--color-slate)]/45">
                    لا طلاب — أضف يدوياً أو استورد من Excel
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title="مواد الشعبة">
          <p className="mb-3 text-xs text-[var(--color-slate)]/55">
            نفس الطلاب يظهرون في كل المواد تلقائياً
          </p>
          <ul className="space-y-2">
            {template?.subjects.map((sub) => (
              <li key={sub.id}>
                <Link
                  to={`/subject/${sub.id}?sectionId=${section.id}`}
                  className="block rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm hover:border-[var(--color-teal)]"
                >
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
