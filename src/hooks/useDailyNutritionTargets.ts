import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import { distributeMacros, isoWeekDays } from '@/lib/utils';
import type { DailyNutritionTarget, DayType, MealSlot, NutritionMealItem, TrainingSession } from '@/types/database';

export type DailyNutritionTargetInput = {
  id?: string;
  athlete_id: string;
  target_date: string;
  day_type: DayType;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes?: string | null;
};

export type NutritionMealItemInput = {
  id?: string;
  target_id: string;
  meal_slot: MealSlot;
  name: string;
  quantity?: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes?: string | null;
  position: number;
};

export function useDailyNutritionTargets(
  athleteId: string | undefined,
  startDate: string,
  endDate: string,
) {
  const [targets, setTargets] = useState<DailyNutritionTarget[]>([]);
  const [mealItems, setMealItems] = useState<NutritionMealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!athleteId) {
      setTargets([]);
      setMealItems([]);
      setLoading(false);
      return;
    }
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('daily_nutrition_targets')
        .select('*')
        .eq('athlete_id', athleteId)
        .gte('target_date', startDate)
        .lte('target_date', endDate)
        .order('target_date', { ascending: true })
        .abortSignal(timeout.signal);
      if (e) throw e;
      const targetRows = (data ?? []) as DailyNutritionTarget[];
      setTargets(targetRows);

      if (targetRows.length === 0) {
        setMealItems([]);
      } else {
        const { data: meals, error: mealError } = await supabase
          .from('nutrition_meal_items')
          .select('*')
          .in('target_id', targetRows.map(target => target.id))
          .order('position', { ascending: true })
          .order('created_at', { ascending: true })
          .abortSignal(timeout.signal);
        if (mealError) throw mealError;
        setMealItems((meals ?? []) as NutritionMealItem[]);
      }
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athleteId, endDate, startDate]);

  useEffect(() => { void refresh(); }, [refresh]);

  const byDate = useMemo(() => new Map(targets.map(target => [target.target_date, target])), [targets]);
  const mealItemsByTargetId = useMemo(() => {
    const next = new Map<string, NutritionMealItem[]>();
    for (const item of mealItems) {
      next.set(item.target_id, [...(next.get(item.target_id) ?? []), item]);
    }
    return next;
  }, [mealItems]);

  const upsertTarget = useCallback(async (input: DailyNutritionTargetInput) => {
    const { data, error: e } = await supabase
      .from('daily_nutrition_targets')
      .upsert(input, { onConflict: 'athlete_id,target_date' })
      .select('*')
      .single();
    if (e) throw e;
    const saved = data as DailyNutritionTarget;
    setTargets(prev => {
      const without = prev.filter(target => target.id !== saved.id && target.target_date !== saved.target_date);
      return [...without, saved].sort((a, b) => a.target_date.localeCompare(b.target_date));
    });
    return saved;
  }, []);

  const upsertMealItem = useCallback(async (input: NutritionMealItemInput) => {
    const { data, error: e } = await supabase
      .from('nutrition_meal_items')
      .upsert(input)
      .select('*')
      .single();
    if (e) throw e;
    const saved = data as NutritionMealItem;
    setMealItems(prev => {
      const without = prev.filter(item => item.id !== saved.id);
      return [...without, saved].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
    });
    return saved;
  }, []);

  const deleteMealItem = useCallback(async (id: string) => {
    const { error: e } = await supabase.from('nutrition_meal_items').delete().eq('id', id);
    if (e) throw e;
    setMealItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const generateWeekFromSessions = useCallback(async (
    weekStart: string,
    sessions: TrainingSession[],
    baseCalories = 2400,
  ) => {
    if (!athleteId) return [];
    const rows = isoWeekDays(weekStart).map(date => {
      const daySessions = sessions.filter(session => session.session_date === date);
      const dayType = inferDayType(daySessions);
      const calories = baseCalories + calorieDelta(dayType);
      const macros = distributeMacros(calories);
      return {
        athlete_id: athleteId,
        target_date: date,
        day_type: dayType,
        calories,
        ...macros,
        notes: daySessions.length
          ? `Ajusté automatiquement depuis ${daySessions.length} séance(s).`
          : 'Jour généré automatiquement.',
      };
    });

    const { data, error: e } = await supabase
      .from('daily_nutrition_targets')
      .upsert(rows, { onConflict: 'athlete_id,target_date' })
      .select('*')
      .order('target_date', { ascending: true });
    if (e) throw e;
    const saved = (data ?? []) as DailyNutritionTarget[];
    setTargets(saved);
    return saved;
  }, [athleteId]);

  return {
    targets,
    byDate,
    mealItems,
    mealItemsByTargetId,
    loading,
    error,
    refresh,
    upsertTarget,
    upsertMealItem,
    deleteMealItem,
    generateWeekFromSessions,
    setTargets,
    setMealItems,
  };
}

function inferDayType(sessions: TrainingSession[]): DayType {
  if (sessions.some(session => session.session_type === 'competition')) return 'competition';
  if (sessions.some(session => (session.planned_intensity ?? 0) >= 7 || session.session_type === 'strength' || session.session_type === 'endurance')) {
    return 'intense';
  }
  if (sessions.some(session => session.session_type === 'recovery' || session.session_type === 'mobility')) return 'light';
  return sessions.length > 0 ? 'light' : 'rest';
}

function calorieDelta(dayType: DayType): number {
  if (dayType === 'competition') return 450;
  if (dayType === 'intense') return 300;
  if (dayType === 'light') return 100;
  return -150;
}
