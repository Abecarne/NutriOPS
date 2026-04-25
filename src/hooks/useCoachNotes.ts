import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import type { CoachNote } from '@/types/database';

export function useCoachNote(athleteId: string | undefined, weekStart: string) {
  const [note, setNote] = useState<CoachNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!athleteId) {
      setNote(null);
      setLoading(false);
      return;
    }
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('coach_notes')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('week_start', weekStart)
        .abortSignal(timeout.signal)
        .maybeSingle();
      if (e) throw e;
      setNote((data as CoachNote | null) ?? null);
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athleteId, weekStart]);

  useEffect(() => { refresh(); }, [refresh]);

  return { note, loading, error, refresh, setNote };
}

export async function upsertCoachNote(
  athleteId: string,
  weekStart: string,
  content: string,
): Promise<CoachNote> {
  const { data, error } = await supabase
    .from('coach_notes')
    .upsert(
      { athlete_id: athleteId, week_start: weekStart, content },
      { onConflict: 'athlete_id,week_start' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as CoachNote;
}
