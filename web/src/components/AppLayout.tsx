import { NavLink, Outlet } from 'react-router-dom';
import { useStore } from '../hooks/useStore';

const links = [
  { to: '/', label: 'الرئيسية', end: true },
  { to: '/students', label: 'قاعدة الطلاب' },
  { to: '/grades', label: 'الصفوف والشعب' },
  { to: '/templates', label: 'قوالب المواد' },
  { to: '/promotion', label: 'الترقية' },
  { to: '/forms', label: 'الطباعة' },
];

export function AppLayout() {
  const { config } = useStore();

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-[var(--color-line)] bg-[#0b1c24] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-teal)] font-display text-lg font-bold">
              ط
            </div>
            <div>
              <p className="font-display text-xl font-bold leading-tight">{config.name}</p>
              <p className="text-xs text-white/50">العام {config.academicYear} · بدون تسجيل دخول</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-white text-[var(--color-ink)]' : 'text-white/75 hover:bg-white/10'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="print-root mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
