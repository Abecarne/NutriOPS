import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import { isoWeekStart } from '@/lib/utils';
import type { WeeklyCheckIn } from '@/types/database';

export type WeeklyCheckInInput = {
  id?: string;
  athlete_id: string;
  week_start_date: string;
  weight_kg: number;
  waist_cm?: number | null;
  sleep_quality: number;
  average_sleep_hours?: number | null;
  energy_level: number;
  stress_level: number;
  hunger_level: number;
  soreness_level: number;
  motivation_level: number;
  training_adherence_percent: number;
  nutrition_adherence_percent: number;
  steps_average?: number | null;
  pain_notes?: string | null;
  wins?: string | null;
  difficulties?: string | null;
  client_comment?: string | null;
  coach_feedback?: string | null;
};

export interface WeeklyCheckinContext {
  athlete_id: string;
  full_name: string;
  sport: string;
  club_name: string | null;
  primary_color: string;
  weekly_checkin: WeeklyCheckIn | null;
}

export function useWeeklyCheckins(athleteId: string | undefined, limit = 12) {
  const [checkins, setCheckins] = useState<WeeklyCheckIn[]>([]);
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
        .from('weekly_checkins')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('week_start_date', { ascending: false })
        .limit(limit)
        .abortSignal(timeout.signal);
      if (e) throw e;
      setCheckins((data ?? []) as WeeklyCheckIn[]);
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athleteId, limit]);

  useEffect(() => { void refresh(); }, [refresh]);

  const latest = checkins[0] ?? null;

  const upsertCheckin = useCallback(async (input: WeeklyCheckInInput) => {
    const { data, error: e } = await supabase
      .from('weekly_checkins')
      .upsert(input, { onConflict: 'athlete_id,week_start_date' })
      .select('*')
      .single();
    if (e) throw e;
    const saved = data as WeeklyCheckIn;
    setCheckins(prev => {
      const without = prev.filter(row => row.id !== saved.id && row.week_start_date !== saved.week_start_date);
      return [saved, ...without].sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
    });
    return saved;
  }, []);

  const updateCoachFeedback = useCallback(async (id: string, coachFeedback: string | null) => {
    const { data, error: e } = await supabase
      .from('weekly_checkins')
      .update({ coach_feedback: coachFeedback })
      .eq('id', id)
      .select('*')
      .single();
    if (e) throw e;
    const saved = data as WeeklyCheckIn;
    setCheckins(prev => prev.map(row => row.id === saved.id ? saved : row));
    return saved;
  }, []);

  return { checkins, latest, loading, error, refresh, upsertCheckin, updateCoachFeedback };
}

export function useWeeklyCheckinContext(token: string | undefined, weekStart = isoWeekStart()) {
  const [context, setContext] = useState<WeeklyCheckinContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setContext(null);
      setError('Lien de check-in invalide.');
      setLoading(false);
      return;
    }
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .rpc('get_weekly_checkin_context_by_token', {
          p_token: token,
          p_week_start_date: weekStart,
        })
        .abortSignal(timeout.signal);
      if (e) throw e;
      const row = Array.isArray(data) ? data[0] : null;
      setContext(row ? {
        ...row,
        weekly_checkin: row.weekly_checkin as WeeklyCheckIn | null,
      } as WeeklyCheckinContext : null);
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [token, weekStart]);

  useEffect(() => { void refresh(); }, [refresh]);

  return useMemo(() => ({ context, loading, error, refresh }), [context, error, loading, refresh]);
}

export async function submitWeeklyCheckinByToken(token: string, values: Omit<WeeklyCheckInInput, 'id' | 'athlete_id'>) {
  const { error } = await supabase.rpc('submit_weekly_checkin', {
    p_token: token,
    p_week_start_date: values.week_start_date,
    p_weight_kg: values.weight_kg,
    p_waist_cm: values.waist_cm ?? null,
    p_sleep_quality: values.sleep_quality,
    p_average_sleep_hours: values.average_sleep_hours ?? null,
    p_energy_level: values.energy_level,
    p_stress_level: values.stress_level,
    p_hunger_level: values.hunger_level,
    p_soreness_level: values.soreness_level,
    p_motivation_level: values.motivation_level,
    p_training_adherence_percent: values.training_adherence_percent,
    p_nutrition_adherence_percent: values.nutrition_adherence_percent,
    p_steps_average: values.steps_average ?? null,
    p_pain_notes: values.pain_notes ?? null,
    p_wins: values.wins ?? null,
    p_difficulties: values.difficulties ?? null,
    p_client_comment: values.client_comment ?? null,
    p_coach_feedback: null,
  });
  if (error) throw error;
}
