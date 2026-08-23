import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login, enterDemo, user, loading, isDemo } = useAuth();
  const [email, setEmail] = useState('admin@school.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-[#0b1c24]" />
      <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-[var(--color-teal)]/40 blur-3xl" />
      <div className="absolute -left-10 bottom-0 h-64 w-64 rounded-full bg-[var(--color-mint)]/20 blur-3xl" />

      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl">
        <div className="bg-[linear-gradient(145deg,#084049,#0e5c66)] px-8 py-10 text-white">
          <p className="font-display text-3xl font-bold">سجل الدرجات</p>
          <p className="mt-2 text-sm text-white/75">استيراد · مراجعة · طباعة انفرادية وكشوف</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 px-8 py-8">
          {isDemo && (
            <p className="rounded-xl bg-[var(--color-mint)] px-3 py-2 text-sm text-[var(--color-teal-deep)]">
              Firebase غير مربوط — استخدم الدخول التجريبي لعرض النظام كاملاً مع الطباعة.
            </p>
          )}
          <label className="block text-sm">
            البريد الإلكتروني
            <input
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="block text-sm">
            كلمة المرور
            <input
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[var(--color-teal)] py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'جاري الدخول...' : 'دخول'}
          </button>
          <button
            type="button"
            onClick={enterDemo}
            className="w-full rounded-xl border border-[var(--color-line)] py-2.5 font-semibold text-[var(--color-teal-deep)]"
          >
            دخول تجريبي وعرض الطباعة
          </button>
        </form>
      </div>
    </div>
  );
}
