import { useEffect, type ReactNode } from 'react';
import { TOKENS } from '@/components/dashboard/kit';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative bg-white rounded-md w-full ${SIZES[size]} max-h-[90vh] overflow-y-auto`}
        style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${TOKENS.HAIRLINE}`, background: TOKENS.PANEL_BG }}
        >
          <h3 className="text-[15px] font-medium tracking-tight text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
