import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--brand)]',
        className,
      )}
      role="status"
      aria-label="Chargement"
    />
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Spinner className="h-8 w-8" />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}
