import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import type { Athlete } from '@/types/database';

export function useAthlete(id: string | undefined) {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setAthlete(null);
      setError('Identifiant athlète manquant.');
      setLoading(false);
      return;
    }
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('athletes')
        .select('*')
        .eq('id', id)
        .abortSignal(timeout.signal)
        .single();
      if (e) throw e;
      setAthlete(data as Athlete);
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  return { athlete, loading, error, refresh, setAthlete };
}

export async function updateAthlete(
  id: string,
  patch: Partial<Pick<Athlete, 'full_name' | 'sport' | 'birth_date' | 'height_cm' | 'goal' | 'status'>>,
): Promise<Athlete> {
  const { data, error } = await supabase
    .from('athletes')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Athlete;
}
