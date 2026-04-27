import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { requestErrorMessage } from '@/lib/requestTimeout';
import type { Checkin, DailyNutritionTarget, NutritionMealItem, TrainingSession } from '@/types/database';

export interface DailyCheckinContext {
  athlete_id: string;
  full_name: string;
  sport: string;
  club_name: string | null;
  primary_color: string;
  checkin: Checkin | null;
  nutrition_target: DailyNutritionTarget | null;
  nutrition_meal_items: NutritionMealItem[];
  training_sessions: TrainingSession[];
}

export function useDailyCheckinContext(token: string | undefined, checkinDate: string) {
  const [context, setContext] = useState<DailyCheckinContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setContext(null);
      setError('Lien de check-in invalide.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase.rpc('get_daily_checkin_context_by_token', {
        p_token: token,
        p_checkin_date: checkinDate,
      });
      if (e) throw e;
      const row = data?.[0] as DailyCheckinContext | undefined;
      if (!row) throw new Error('Lien de check-in invalide ou expiré.');
      setContext({
        ...row,
        checkin: row.checkin ?? null,
        nutrition_target: row.nutrition_target ?? null,
        nutrition_meal_items: row.nutrition_meal_items ?? [],
        training_sessions: row.training_sessions ?? [],
      });
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [checkinDate, token]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { context, setContext, loading, error, refresh };
}
