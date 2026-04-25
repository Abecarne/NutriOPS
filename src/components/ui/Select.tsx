import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...rest }, ref) => {
    const selectId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-9 px-3 rounded-md border bg-white text-[13px] text-slate-900',
            'focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent',
            error ? 'border-[#C2772A]' : 'border-[#EAE9E5]',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
