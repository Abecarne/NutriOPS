import { useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShellFooter,
  Sidebar,
  TOKENS,
  initialsOf,
  type NavItemSpec,
  type NavKind,
} from '@/components/dashboard/kit';
import { useAuth } from '@/context/AuthContext';
import { isValidHexColor } from '@/lib/utils';

export function AppLayout({ children }: { children: ReactNode }) {
  const { coach, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (coach?.primary_color && isValidHexColor(coach.primary_color)) {
      document.documentElement.style.setProperty('--brand', coach.primary_color);
    }
  }, [coach?.primary_color]);

  const activeKind = getActiveKind(location.pathname);
  const topbar = getTopbarCopy(location.pathname);
  const navItems: NavItemSpec[] = [
    { kind: 'dashboard', label: 'Dashboard', href: '/dashboard' },
    { kind: 'athletes', label: 'Athletes', href: '/athletes' },
    { kind: 'plans', label: 'Plans', href: '/plans' },
    { kind: 'reports', label: 'Reports', href: '/reports' },
    { kind: 'settings', label: 'Settings', href: '/settings' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div
      className="min-h-screen w-full font-sans text-slate-900"
      style={{
        background: TOKENS.BG,
        fontFeatureSettings: '"cv11", "ss01"',
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <Sidebar
          items={navItems}
          activeKind={activeKind}
          coachName={coach?.full_name ?? 'Coach'}
          coachInitials={initialsOf(coach?.full_name ?? 'Coach')}
          coachRole={coach?.club_name ?? 'Head coach'}
          weekLabel="Current week"
          pulse={{ values: [3, 5, 4, 6, 7, 5, 8], received: 0, expected: 0 }}
          LinkComponent={RouterLink}
        />

        <main className="flex-1 flex flex-col min-w-0" style={{ borderLeft: `1px solid ${TOKENS.HAIRLINE}` }}>
          <header
            className="px-5 sm:px-10 py-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
            style={{ borderBottom: `1px solid ${TOKENS.HAIRLINE}` }}
          >
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                <span className="w-1 h-1 rounded-full" style={{ background: TOKENS.TEAL }} />
                {new Intl.DateTimeFormat('en', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                }).format(new Date())}
              </div>
              <h1 className="mt-1.5 text-[28px] font-light tracking-tight text-slate-900 leading-none">
                {topbar.title}
              </h1>
              <p className="mt-2 text-[13px] text-slate-500">{topbar.subtitle}</p>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-md bg-white text-[12px] text-slate-400"
                style={{ border: `1px solid ${TOKENS.HAIRLINE}`, width: 220 }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                     strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="7" cy="7" r="4.5" />
                  <path d="M14 14l-3.5-3.5" />
                </svg>
                <span>Search athletes</span>
                <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums"
                      style={{ background: TOKENS.BG, color: '#9CA3AF' }}>⌘K</span>
              </div>
              <button
                onClick={handleSignOut}
                className="h-9 px-4 rounded-md bg-white text-[12px] font-medium text-slate-600 hover:text-slate-900"
                style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
              >
                Sign out
              </button>
            </div>
          </header>

          <div className="px-5 sm:px-10 py-8 flex-1">{children}</div>
          <ShellFooter syncLabel="sync · live" />
        </main>
      </div>
    </div>
  );
}

function RouterLink({
  to,
  className,
  style,
  children,
}: {
  to: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  return <Link to={to} className={className} style={style}>{children}</Link>;
}

function getActiveKind(pathname: string): NavKind {
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/athletes')) return 'athletes';
  if (pathname.startsWith('/plans')) return 'plans';
  if (pathname.startsWith('/reports')) return 'reports';
  return 'dashboard';
}

function getTopbarCopy(pathname: string): { title: string; subtitle: string } {
  if (pathname.startsWith('/settings')) {
    return {
      title: 'Settings.',
      subtitle: 'Branding, account details, and report presentation.',
    };
  }
  if (pathname === '/athletes') {
    return {
      title: 'Athletes.',
      subtitle: 'Roster details, current status, goals, and check-in readiness.',
    };
  }
  if (pathname.startsWith('/athletes')) {
    return {
      title: 'Athlete profile.',
      subtitle: 'Weekly plan, check-ins, progression, and coach notes.',
    };
  }
  if (pathname.startsWith('/plans')) {
    return {
      title: 'Plans.',
      subtitle: 'Weekly nutrition plan coverage and missing athlete targets.',
    };
  }
  if (pathname.startsWith('/reports')) {
    return {
      title: 'Reports.',
      subtitle: 'PDF export queue for nutrition and progression follow-up.',
    };
  }
  return {
    title: 'Morning brief.',
    subtitle: 'Roster status, check-ins, nutrition plans, and attention flags.',
  };
}
