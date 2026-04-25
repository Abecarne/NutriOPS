import { useEffect, type ReactNode } from 'react';
import { Header } from './Header';
import { useAuth } from '@/context/AuthContext';
import { isValidHexColor } from '@/lib/utils';

export function AppLayout({ children }: { children: ReactNode }) {
  const { coach } = useAuth();

  useEffect(() => {
    if (coach?.primary_color && isValidHexColor(coach.primary_color)) {
      document.documentElement.style.setProperty('--brand', coach.primary_color);
    }
  }, [coach?.primary_color]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
