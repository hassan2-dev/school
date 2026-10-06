import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Btn, Panel, StatCard } from '../components/ui';
import { useStore } from '../hooks/useStore';
import { downloadBackup, importBackupFile } from '../services/backup';
import { firebaseConfigStatus } from '../lib/firebase';
import { syncService } from '../services/sync';
import { store } from '../store';

export function HomePage() {
  const { students, grades, sections } = useStore();
  const [storageStatus, setStorageStatus] = useState('جاري التحميل...');
  const [backupMsg, setBackupMsg] = useState('');
  const [syncing, setSyncing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fb = firebaseConfigStatus();
  const cloudReady = fb.ready;
  const active = students.filter((s) => s.status === 'active');
  const graduated = students.filter((s) => s.status === 'graduated');

  async function refreshStatus() {
    const meta = await syncService.getMeta();
    setStorageStatus(syncService.statusLabel(meta));
  }

  useEffect(() => {
    void refreshStatus();
  }, [students.length]);

  function clearAll() {
    if (
      !confirm(
        'تصفير البيانات؟\nسيتم حذف كل الطلاب والدرجات.\nتبقى الصفوف والشعب وقوالب المواد واسم المدرسة.',
      )
    ) {
      return;
    }
    store.clearData();
    window.location.reload();
  }

  function loadDemo() {
    if (!confirm('تحميل بيانات تجريبية؟ سيستبدل الطلاب الحاليين.')) return;
    store.resetDemo();
    window.location.reload();
  }

  function exportData() {
    downloadBackup();
    setBackupMsg('تم تنزيل ملف النسخة الاحتياطية — احفظه على جهازك أو ارفعه في متصفح آخر');
  }

  async function onImportFile(file: File | undefined) {
    if (!file) return;
    if (
      !confirm(
        'رفع نسخة احتياطية؟\nسيستبدل كل البيانات الحالية في هذا المتصفح بمحتوى الملف.',
      )
    ) {
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    const result = await importBackupFile(file);
    if (!result.ok) {
      setBackupMsg(result.reason);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setBackupMsg('تم رفع البيانات بنجاح');
    window.location.reload();
  }

  async function pushCloud() {
    if (!confirm('رفع كل بيانات هذا المتصفح إلى Firebase؟')) return;
    setSyncing(true);
    const result = await syncService.pushToCloud();
    setBackupMsg(result.message);
    await refreshStatus();
    setSyncing(false);
  }

  async function pullCloud() {
    if (!confirm('جلب البيانات من Firebase؟\nسيستبدل البيانات الحالية في هذا المتصفح.')) return;
    setSyncing(true);
    const result = await syncService.pullFromCloud();
    setBackupMsg(result.message);
    if (result.ok) {
      window.location.reload();
      return;
    }
    await refreshStatus();
    setSyncing(false);
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] bg-[#0b1c24] px-6 py-10 text-white md:px-10">
        <div className="relative max-w-2xl">
          <h1 className="font-display text-4xl font-bold md:text-5xl">نظام الطلاب والدرجات</h1>
          <p className="mt-3 text-white/70">
            حفظ محلي + مزامنة Firebase — ارفع من جهاز، واجلب من جهاز آخر.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/students" className="rounded-xl bg-[var(--color-teal)] px-5 py-2.5 text-sm font-semibold">
              إدارة الطلاب
            </Link>
            <Link to="/grades" className="rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold">
              الصفوف والشعب
            </Link>
            <Link to="/promotion" className="rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold">
              ترقية الصفوف
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="طلاب نشطون" value={active.length} />
        <StatCard label="متخرجون" value={graduated.length} />
        <StatCard label="الصفوف" value={grades.length} />
        <StatCard label="الشعب" value={sections.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="كيف يعمل النظام">
          <ol className="list-inside list-decimal space-y-2 text-sm text-[var(--color-slate)]/80">
            <li>كل طالب له سجل واحد في قاعدة البيانات</li>
            <li>الشعب (أ ب ج) لكل صف — تضيفها وتعدّلها يدوياً</li>
            <li>قوالب المواد ثابتة لكل صف (رياضيات، علوم، قراءة...)</li>
            <li>نفس أسماء الطلاب تظهر في كل مواد الشعبة</li>
            <li>عند النجاح → ترقية تلقائية للصف التالي</li>
          </ol>
        </Panel>

        <Panel title="اختصارات">
          <div className="grid gap-2 sm:grid-cols-2">
            <Shortcut to="/students" title="إضافة طالب" desc="طالب طالب أو Excel" />
            <Shortcut to="/grades" title="إضافة شعبة" desc="أ ب ج د..." />
            <Shortcut to="/templates" title="قوالب المواد" desc="تعديل أعمدة الدرجات" />
            <Shortcut to="/forms" title="طباعة" desc="انفرادية وكشوف" />
          </div>
        </Panel>
      </div>

      <Panel title="الصفوف">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {grades
            .sort((a, b) => a.order - b.order)
            .map((g) => {
              const secs = sections.filter((s) => s.gradeId === g.id);
              const count = active.filter((s) => s.gradeId === g.id).length;
              return (
                <Link
                  key={g.id}
                  to={`/grades/${g.id}`}
                  className="rounded-xl border border-[var(--color-line)] p-4 transition hover:border-[var(--color-teal)] hover:bg-[var(--color-mint)]/30"
                >
                  <p className="font-display text-lg font-bold">{g.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-slate)]/60">
                    {secs.length} شعب · {count} طالب · من {g.maxScore}
                  </p>
                </Link>
              );
            })}
        </div>
      </Panel>

      <Panel title="قاعدة البيانات والمزامنة">
        <p className="mb-2 text-sm font-semibold text-[var(--color-teal-deep)]">{storageStatus}</p>
        <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-[var(--color-slate)]/70">
          <li>
            <strong>رفع إلى Firebase:</strong> من المتصفح اللي فيه البيانات
          </li>
          <li>
            <strong>جلب من Firebase:</strong> في أي متصفح/جهاز ثاني
          </li>
          <li>أو استخدم ملف JSON كنسخة احتياطية يدوية</li>
        </ul>
        <div className="mb-3 flex flex-wrap gap-2">
          <Btn onClick={() => void pushCloud()} disabled={!cloudReady || syncing}>
            {syncing ? 'جاري...' : 'رفع إلى Firebase'}
          </Btn>
          <Btn variant="ghost" onClick={() => void pullCloud()} disabled={!cloudReady || syncing}>
            جلب من Firebase
          </Btn>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={exportData}>
            تنزيل نسخة JSON
          </Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>
            رفع نسخة JSON
          </Btn>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImportFile(e.target.files?.[0])}
          />
          <Btn variant="warn" onClick={clearAll}>
            تصفير البيانات
          </Btn>
          <Btn variant="ghost" onClick={loadDemo}>
            تحميل بيانات تجريبية
          </Btn>
        </div>
        {backupMsg && (
          <p
            className={`mt-3 text-sm font-semibold ${
              backupMsg.includes('نجاح') || backupMsg.includes('تم')
                ? 'text-[var(--color-ok)]'
                : 'text-[var(--color-danger)]'
            }`}
          >
            {backupMsg}
          </p>
        )}
        {!cloudReady ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-[var(--color-danger)]">
            <p className="font-semibold">Firebase غير متصل</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                افتح الرابط المحلي الصحيح: <strong>http://localhost:5174</strong> (أو المنفذ اللي يظهر
                بـ npm run dev)
              </li>
              <li>لا تستخدم رابط Vercel حتى تضيف نفس المفاتيح هناك</li>
              <li>أوقف السيرفر (Ctrl+C) ثم من مجلد web: npm run dev</li>
              <li>
                حالة المفاتيح: apiKey={fb.hasApiKey ? '✓' : '✗'} · projectId={fb.hasApiKey && fb.projectId ? '✓' : '✗'} ·
                appId={fb.hasAppId ? '✓' : '✗'}
              </li>
            </ul>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-ok)]">
            متصل بمشروع Firebase: <strong>{fb.projectId}</strong>
          </p>
        )}
      </Panel>
    </div>
  );
}

function Shortcut({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-[var(--color-line)] px-4 py-3 hover:border-[var(--color-teal)]"
    >
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-[var(--color-slate)]/55">{desc}</p>
    </Link>
  );
}
