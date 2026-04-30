import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import { isoDate } from '@/lib/utils';
import type { MealLog, MealLogType, NutritionTarget } from '@/types/database';

export type NutritionTargetInput = {
  id?: string;
  athlete_id: string;
  calories_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  water_target_l?: number | null;
  notes?: string | null;
  start_date: string;
  end_date?: string | null;
};

export type MealLogInput = {
  id?: string;
  athlete_id: string;
  log_date: string;
  meal_type: MealLogType;
  description: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  photo_url?: string | null;
  adherence_rating?: number | null;
};

export function useNutritionTracking(athleteId: string | undefined, startDate?: string, endDate = isoDate()) {
  const [targets, setTargets] = useState<NutritionTarget[]>([]);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!athleteId) {
      setTargets([]);
      setMealLogs([]);
      setLoading(false);
      return;
    }

    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const { data: targetRows, error: targetError } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('start_date', { ascending: false })
        .abortSignal(timeout.signal);
      if (targetError) throw targetError;

      let mealQuery = supabase
        .from('meal_logs')
        .select('*')
        .eq('athlete_id', athleteId)
        .lte('log_date', endDate)
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false })
        .abortSignal(timeout.signal);
      if (startDate) mealQuery = mealQuery.gte('log_date', startDate);
      const { data: mealRows, error: mealError } = await mealQuery;
      if (mealError) throw mealError;

      setTargets((targetRows ?? []) as NutritionTarget[]);
      setMealLogs((mealRows ?? []) as MealLog[]);
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athleteId, endDate, startDate]);

  useEffect(() => { void refresh(); }, [refresh]);

  const activeTarget = useMemo(() => {
    const today = endDate;
    return targets.find(target => (
      target.start_date <= today && (!target.end_date || target.end_date >= today)
    )) ?? targets[0] ?? null;
  }, [endDate, targets]);

  const logsByDate = useMemo(() => {
    const map = new Map<string, MealLog[]>();
    for (const log of mealLogs) {
      map.set(log.log_date, [...(map.get(log.log_date) ?? []), log]);
    }
    return map;
  }, [mealLogs]);

  const upsertTarget = useCallback(async (input: NutritionTargetInput) => {
    const { data, error: e } = await supabase
      .from('nutrition_targets')
      .upsert(input)
      .select('*')
      .single();
    if (e) throw e;
    const saved = data as NutritionTarget;
    setTargets(prev => [saved, ...prev.filter(target => target.id !== saved.id)]);
    return saved;
  }, []);

  const upsertMealLog = useCallback(async (input: MealLogInput) => {
    const { data, error: e } = await supabase
      .from('meal_logs')
      .upsert(input)
      .select('*')
      .single();
    if (e) throw e;
    const saved = data as MealLog;
    setMealLogs(prev => [saved, ...prev.filter(log => log.id !== saved.id)]);
    return saved;
  }, []);

  const deleteMealLog = useCallback(async (id: string) => {
    const { error: e } = await supabase.from('meal_logs').delete().eq('id', id);
    if (e) throw e;
    setMealLogs(prev => prev.filter(log => log.id !== id));
  }, []);

  return {
    targets,
    activeTarget,
    mealLogs,
    logsByDate,
    loading,
    error,
    refresh,
    upsertTarget,
    upsertMealLog,
    deleteMealLog,
  };
}
