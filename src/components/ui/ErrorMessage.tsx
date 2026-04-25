import { cn } from '@/lib/utils';

export function ErrorMessage({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700',
        className,
      )}
      role="alert"
    >
      {message}
    </div>
  );
}
