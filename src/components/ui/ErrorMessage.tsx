import { cn } from '@/lib/utils';
import { TOKENS } from '@/components/dashboard/kit';

export function ErrorMessage({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-md bg-white px-3 py-2 text-[13px]',
        className,
      )}
      style={{ border: `1px solid ${TOKENS.HAIRLINE}`, color: TOKENS.AMBER }}
      role="alert"
    >
      {message}
    </div>
  );
}
