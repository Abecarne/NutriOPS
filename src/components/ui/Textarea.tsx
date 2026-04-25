import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...rest }, ref) => {
    const taId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={taId} className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={taId}
          className={cn(
            'px-3 py-2 rounded-md border bg-white text-[13px] text-slate-900',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent',
            error ? 'border-[#C2772A]' : 'border-[#EAE9E5]',
            className,
          )}
          {...rest}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
