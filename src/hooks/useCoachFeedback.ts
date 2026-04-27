import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import type { CoachFeedback, CoachFeedbackRelatedType, CoachFeedbackVisibility } from '@/types/database';

export interface CoachFeedbackInput {
  athlete_id: string;
  related_type: CoachFeedbackRelatedType;
  related_id?: string | null;
  message: string;
  visibility: CoachFeedbackVisibility;
}

export function useCoachFeedback(athleteId: string | undefined, relatedId?: string | null) {
  const [feedbacks, setFeedbacks] = useState<CoachFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!athleteId) {
      setFeedbacks([]);
      setLoading(false);
      return;
    }
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('coach_feedback')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false })
        .abortSignal(timeout.signal);
      if (relatedId) query = query.eq('related_id', relatedId);
      const { data, error: e } = await query;
      if (e) throw e;
      setFeedbacks((data ?? []) as CoachFeedback[]);
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athleteId, relatedId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const addFeedback = useCallback(async (input: CoachFeedbackInput) => {
    const { data, error: e } = await supabase
      .from('coach_feedback')
      .insert(input)
      .select('*')
      .single();
    if (e) throw e;
    const saved = data as CoachFeedback;
    setFeedbacks(prev => [saved, ...prev]);
    return saved;
  }, []);

  return { feedbacks, loading, error, refresh, addFeedback };
}
