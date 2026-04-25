import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { StatusDot } from '@/components/dashboard/kit';
import type { AthleteStatus } from '@/types/database';

export function StatusBadge({ status }: { status: AthleteStatus }) {
  return <StatusDot status={status} />;
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
