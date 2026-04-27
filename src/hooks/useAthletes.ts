import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import type { Athlete, AthleteRosterRow, Checkin, WeeklyCheckIn } from '@/types/database';

export function useAthletes() {
  const [athletes, setAthletes] = useState<AthleteRosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: e1 } = await supabase
        .from('athletes')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(timeout.signal);
      if (e1) throw e1;

      const list = (rows ?? []) as Athlete[];
      if (list.length === 0) {
        setAthletes([]);
        return;
      }

      const { data: checkins, error: e2 } = await supabase
        .from('checkins')
        .select('athlete_id, weight_kg, submitted_at, checkin_date')
        .in('athlete_id', list.map(a => a.id))
        .order('checkin_date', { ascending: false })
        .order('submitted_at', { ascending: false })
        .abortSignal(timeout.signal);
      if (e2) throw e2;

      const { data: weeklyCheckins, error: e3 } = await supabase
        .from('weekly_checkins')
        .select('athlete_id, week_start_date, weight_kg, training_adherence_percent, nutrition_adherence_percent, energy_level, soreness_level, created_at')
        .in('athlete_id', list.map(a => a.id))
        .order('week_start_date', { ascending: false })
        .order('created_at', { ascending: false })
        .abortSignal(timeout.signal);
      if (e3) throw e3;

      const latestByAthlete = new Map<string, Pick<Checkin, 'weight_kg' | 'submitted_at' | 'checkin_date'>>();
      for (const ci of (checkins ?? [])) {
        if (!latestByAthlete.has(ci.athlete_id)) {
          latestByAthlete.set(ci.athlete_id, {
            weight_kg: ci.weight_kg,
            submitted_at: ci.submitted_at,
            checkin_date: ci.checkin_date,
          });
        }
      }

      const latestWeeklyByAthlete = new Map<string, AthleteRosterRow['last_weekly_checkin']>();
      for (const ci of (weeklyCheckins ?? []) as Array<Pick<WeeklyCheckIn, 'athlete_id' | 'week_start_date' | 'weight_kg' | 'training_adherence_percent' | 'nutrition_adherence_percent' | 'energy_level' | 'soreness_level' | 'created_at'>>) {
        if (!latestWeeklyByAthlete.has(ci.athlete_id)) {
          latestWeeklyByAthlete.set(ci.athlete_id, {
            week_start_date: ci.week_start_date,
            weight_kg: ci.weight_kg,
            training_adherence_percent: ci.training_adherence_percent,
            nutrition_adherence_percent: ci.nutrition_adherence_percent,
            energy_level: ci.energy_level,
            soreness_level: ci.soreness_level,
            created_at: ci.created_at,
          });
        }
      }

      setAthletes(list.map(a => ({
        ...a,
        last_checkin: latestByAthlete.get(a.id) ?? null,
        last_weekly_checkin: latestWeeklyByAthlete.get(a.id) ?? null,
      })));
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { athletes, loading, error, refresh };
}

export interface CreateAthleteInput {
  full_name: string;
  sport: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  birth_date: string | null;
  height_cm: number | null;
  current_weight_kg?: number | null;
  target_weight_kg?: number | null;
  goal: string;
  goal_type?: Athlete['goal_type'];
  experience_level?: Athlete['experience_level'];
  training_frequency_per_week?: number;
  available_equipment?: string[];
  injuries?: string[];
  food_preferences?: string[];
  dietary_restrictions?: string[];
  stress_level?: number;
  motivation_level?: number;
  status: Athlete['status'];
}

export async function createAthlete(coachId: string, input: CreateAthleteInput): Promise<Athlete> {
  const { data, error } = await supabase
    .from('athletes')
    .insert({ ...input, coach_id: coachId })
    .select('*')
    .single();
  if (error) throw error;
  return data as Athlete;
}
