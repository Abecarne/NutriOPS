import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export function Header() {
  const { coach, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            {coach?.logo_url ? (
              <img src={coach.logo_url} alt="Logo" className="h-7 w-7 rounded object-cover" />
            ) : (
              <div className="h-7 w-7 rounded bg-[var(--brand)] text-white flex items-center justify-center text-xs font-bold">
                N
              </div>
            )}
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-slate-900">NutriOps</span>
              {coach?.club_name && (
                <span className="text-xs text-slate-500">{coach.club_name}</span>
              )}
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <NavItem to="/dashboard">Roster</NavItem>
            <NavItem to="/settings">Paramètres</NavItem>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 hidden sm:inline">{coach?.full_name}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'px-3 py-1.5 rounded-md text-sm transition-colors',
          isActive ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:text-slate-900',
        )
      }
    >
      {children}
    </NavLink>
  );
}
