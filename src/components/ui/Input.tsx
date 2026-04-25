import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-9 px-3 rounded-md border bg-white text-[13px] text-slate-900',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent',
            'disabled:bg-slate-50 disabled:text-slate-500',
            error ? 'border-[#C2772A]' : 'border-[#EAE9E5]',
            className,
          )}
          {...rest}
        />
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
