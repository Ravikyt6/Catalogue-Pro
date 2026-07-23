import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 24 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-brand-600" />;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-app bg-[var(--surface)] shadow-sm ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, icon, actions }: { title: string; subtitle?: string; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {icon && <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30">{icon}</div>}
        <div>
          <h1 className="text-xl font-bold text-app">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-muted">{icon}</div>}
      <p className="text-base font-semibold text-app">{title}</p>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
  );
}

export function Badge({ children, tone = 'ink' }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    ink: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };
  return <span className={`chip ${tones[tone] ?? tones.ink}`}>{children}</span>;
}

export function StatCard({ label, value, tone = 'brand', icon }: { label: string; value: string; tone?: string; icon?: ReactNode }) {
  const tones: Record<string, string> = {
    brand: 'text-brand-600', success: 'text-emerald-600', danger: 'text-rose-600', warning: 'text-amber-600', ink: 'text-slate-600',
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className={`mt-1 text-xl font-bold ${tones[tone] ?? tones.brand}`}>{value}</p>
        </div>
        {icon && <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-2)] ${tones[tone] ?? tones.brand}`}>{icon}</div>}
      </div>
    </Card>
  );
}
