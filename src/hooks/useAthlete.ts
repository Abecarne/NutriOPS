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
  patch: Partial<Pick<
    Athlete,
    | 'full_name'
    | 'sport'
    | 'first_name'
    | 'last_name'
    | 'email'
    | 'phone'
    | 'birth_date'
    | 'gender'
    | 'height_cm'
    | 'current_weight_kg'
    | 'target_weight_kg'
    | 'goal'
    | 'goal_type'
    | 'experience_level'
    | 'training_frequency_per_week'
    | 'available_equipment'
    | 'injuries'
    | 'medical_notes'
    | 'food_preferences'
    | 'dietary_restrictions'
    | 'lifestyle_notes'
    | 'work_schedule'
    | 'sleep_average_hours'
    | 'stress_level'
    | 'motivation_level'
    | 'onboarding_completed_at'
    | 'onboarding_data'
    | 'onboarding_skipped_steps'
    | 'onboarding_completed_steps'
    | 'onboarding_last_step'
    | 'status'
  >>,
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

/**
 * Rotates the athlete's check-in token. Invalidates the previous
 * shareable URL — used when a link has been leaked or the athlete
 * changed phone/email.
 */
export async function regenerateCheckinToken(id: string): Promise<Athlete> {
  const newToken = crypto.randomUUID();
  const { data, error } = await supabase
    .from('athletes')
    .update({ checkin_token: newToken })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Athlete;
}
