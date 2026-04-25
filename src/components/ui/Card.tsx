import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TOKENS } from '@/components/dashboard/kit';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-white rounded-md overflow-hidden',
        className,
      )}
      style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('px-5 py-4 flex items-center justify-between gap-4', className)}
      style={{ borderBottom: `1px solid ${TOKENS.HAIRLINE}`, background: TOKENS.PANEL_BG }}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('text-[15px] font-medium tracking-tight text-slate-900', className)}>{children}</h2>;
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
