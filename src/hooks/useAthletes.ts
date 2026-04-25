import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import type { Athlete, AthleteRosterRow, Checkin } from '@/types/database';

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
        .select('athlete_id, weight_kg, submitted_at, week_start')
        .in('athlete_id', list.map(a => a.id))
        .order('submitted_at', { ascending: false })
        .abortSignal(timeout.signal);
      if (e2) throw e2;

      const latestByAthlete = new Map<string, Pick<Checkin, 'weight_kg' | 'submitted_at' | 'week_start'>>();
      for (const ci of (checkins ?? [])) {
        if (!latestByAthlete.has(ci.athlete_id)) {
          latestByAthlete.set(ci.athlete_id, {
            weight_kg: ci.weight_kg,
            submitted_at: ci.submitted_at,
            week_start: ci.week_start,
          });
        }
      }

      setAthletes(list.map(a => ({ ...a, last_checkin: latestByAthlete.get(a.id) ?? null })));
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
  birth_date: string | null;
  height_cm: number | null;
  goal: string;
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
