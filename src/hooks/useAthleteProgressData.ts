import { useCallback, useEffect, useState } from 'react';
import { addDays, format, startOfISOWeek } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import type {
  Checkin,
  DailyNutritionTarget,
  NutritionMealItem,
  TrainingSession,
} from '@/types/database';

export interface AthleteProgressData {
  checkins: Checkin[];
  sessions: TrainingSession[];
  targets: DailyNutritionTarget[];
  mealItems: NutritionMealItem[];
}

/**
 * Loads check-ins, training sessions, daily nutrition targets, and meal
 * items for an athlete over the last `weeks` ISO weeks (inclusive of the
 * current week). Used by the Progress tab to power 4-24w analytics.
 */
export function useAthleteProgressData(athleteId: string | undefined, weeks: number) {
  const [data, setData] = useState<AthleteProgressData>({
    checkins: [], sessions: [], targets: [], mealItems: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!athleteId) {
      setData({ checkins: [], sessions: [], targets: [], mealItems: [] });
      setLoading(false);
      return;
    }
    const periodStart = format(addDays(startOfISOWeek(new Date()), -7 * (weeks - 1)), 'yyyy-MM-dd');
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const [{ data: checkins, error: e1 }, { data: sessions, error: e2 }, { data: targets, error: e3 }] = await Promise.all([
        supabase
          .from('checkins')
          .select('*')
          .eq('athlete_id', athleteId)
          .gte('checkin_date', periodStart)
          .order('checkin_date', { ascending: true })
          .abortSignal(timeout.signal),
        supabase
          .from('training_sessions')
          .select('*')
          .eq('athlete_id', athleteId)
          .gte('session_date', periodStart)
          .order('session_date', { ascending: true })
          .abortSignal(timeout.signal),
        supabase
          .from('daily_nutrition_targets')
          .select('*')
          .eq('athlete_id', athleteId)
          .gte('target_date', periodStart)
          .order('target_date', { ascending: true })
          .abortSignal(timeout.signal),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      if (e3) throw e3;

      const targetIds = ((targets ?? []) as DailyNutritionTarget[]).map(t => t.id);
      let mealItems: NutritionMealItem[] = [];
      if (targetIds.length > 0) {
        const { data: items, error: e4 } = await supabase
          .from('nutrition_meal_items')
          .select('*')
          .in('target_id', targetIds)
          .abortSignal(timeout.signal);
        if (e4) throw e4;
        mealItems = (items ?? []) as NutritionMealItem[];
      }

      setData({
        checkins: (checkins ?? []) as Checkin[],
        sessions: (sessions ?? []) as TrainingSession[],
        targets: (targets ?? []) as DailyNutritionTarget[],
        mealItems,
      });
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athleteId, weeks]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { ...data, loading, error, refresh };
}
