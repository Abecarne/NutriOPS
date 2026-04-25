import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout } from '@/lib/requestTimeout';
import type { Coach } from '@/types/database';

interface AuthContextValue {
  session: Session | null;
  coach: Coach | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCoach: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadCoach(userId: string): Promise<Coach | null> {
  const timeout = createRequestTimeout();
  try {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', userId)
      .abortSignal(timeout.signal)
      .maybeSingle();
    if (error) throw error;
    return data as Coach | null;
  } finally {
    timeout.clear();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const coachUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const syncCoach = async (userId: string, force = false) => {
      if (!force && coachUserIdRef.current === userId) return;
      coachUserIdRef.current = userId;
      try {
        const loadedCoach = await loadCoach(userId);
        if (mounted) setCoach(loadedCoach);
      } catch {
        if (mounted) setCoach(null);
      }
    };

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
        setLoading(false);
        if (data.session?.user) void syncCoach(data.session.user.id);
      } catch {
        if (!mounted) return;
        setSession(null);
        setCoach(null);
        coachUserIdRef.current = null;
        setLoading(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);

      if (event === 'SIGNED_OUT' || !newSession?.user) {
        coachUserIdRef.current = null;
        setCoach(null);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      void syncCoach(newSession.user.id, event === 'USER_UPDATED');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    coach,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (email, password, fullName) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    refreshCoach: async () => {
      if (!session?.user) return;
      coachUserIdRef.current = session.user.id;
      setCoach(await loadCoach(session.user.id));
    },
  }), [session, coach, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
