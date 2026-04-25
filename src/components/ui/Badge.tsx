import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { AthleteStatus } from '@/types/database';

const STATUS_CLASSES: Record<AthleteStatus, string> = {
  active:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  offseason: 'bg-slate-100 text-slate-700 border-slate-200',
  injured:   'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<AthleteStatus, string> = {
  active: 'Actif',
  offseason: 'Intersaison',
  injured: 'Blessé',
};

export function StatusBadge({ status }: { status: AthleteStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        'bg-slate-100 text-slate-700 border-slate-200',
        className,
      )}
    >
      {children}
    </span>
  );
}
