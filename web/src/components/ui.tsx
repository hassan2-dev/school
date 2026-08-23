import type { ReactNode } from 'react';

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[0_10px_30px_rgba(11,28,36,0.04)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--color-teal)]" />
      <p className="text-sm text-[var(--color-slate)]/70">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-[var(--color-teal-deep)]">
        {typeof value === 'number' ? value.toLocaleString('ar-IQ') : value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--color-slate)]/50">{hint}</p>}
    </div>
  );
}

export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone =
    pct >= 90
      ? 'bg-emerald-50 text-[var(--color-ok)]'
      : pct >= 75
        ? 'bg-amber-50 text-[var(--color-warn)]'
        : 'bg-red-50 text-[var(--color-danger)]';
  return <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${tone}`}>{pct}%</span>;
}

export function StepList({ steps }: { steps: { label: string; done?: boolean; error?: boolean }[] }) {
  return (
    <ul className="space-y-2">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-2 text-sm">
          <span className={s.error ? 'text-[var(--color-danger)]' : s.done ? 'text-[var(--color-ok)]' : 'text-black/30'}>
            {s.error ? '✗' : s.done ? '✓' : '…'}
          </span>
          <span>{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="no-print mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-bold text-[var(--color-teal-deep)]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[var(--color-slate)]/70">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  children,
  actions,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--color-line)] bg-white/95 p-5 shadow-[0_12px_40px_rgba(11,28,36,0.05)] ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title ? <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">{title}</h2> : <span />}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'warn';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const styles =
    variant === 'primary'
      ? 'bg-[var(--color-teal)] text-white hover:bg-[var(--color-teal-deep)]'
      : variant === 'warn'
        ? 'bg-[var(--color-warn)] text-white'
        : 'border border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-mint)]';
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}
