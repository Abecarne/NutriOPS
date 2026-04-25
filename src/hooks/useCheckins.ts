import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import type { Checkin } from '@/types/database';

export function useCheckins(athleteId: string | undefined, limit = 12) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!athleteId) {
      setCheckins([]);
      setLoading(false);
      return;
    }
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('checkins')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('checkin_date', { ascending: false })
        .limit(limit)
        .abortSignal(timeout.signal);
      if (e) throw e;
      setCheckins((data ?? []) as Checkin[]);
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athleteId, limit]);

  useEffect(() => { refresh(); }, [refresh]);

  return { checkins, loading, error, refresh };
}
