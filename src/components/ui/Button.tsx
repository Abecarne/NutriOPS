import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary:   'bg-[var(--brand)] text-white hover:brightness-95 focus-visible:ring-[var(--brand)]',
  secondary: 'bg-white border border-[#EAE9E5] text-slate-700 hover:text-slate-900 hover:bg-[#FAFAF8] focus-visible:ring-slate-400',
  ghost:     'bg-transparent text-slate-500 hover:text-slate-900 hover:bg-white focus-visible:ring-slate-400',
  danger:    'bg-[#C2772A] text-white hover:brightness-95 focus-visible:ring-[#C2772A]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12px]',
  md: 'h-9 px-4 text-[12px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
