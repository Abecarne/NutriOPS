import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import { DAY_TYPES, type DayTarget, type DayType, type NutritionPlan } from '@/types/database';

export interface PlanWithTargets {
  plan: NutritionPlan;
  targets: Record<DayType, DayTarget>;
}

function makeEmptyTargets(planId: string): Record<DayType, DayTarget> {
  const out = {} as Record<DayType, DayTarget>;
  for (const t of DAY_TYPES) {
    out[t] = {
      id: `pending-${t}`,
      plan_id: planId,
      day_type: t,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      notes: null,
    };
  }
  return out;
}

export function useNutritionPlan(athleteId: string | undefined, weekStart: string) {
  const [data, setData] = useState<PlanWithTargets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!athleteId) {
      setData(null);
      setLoading(false);
      return;
    }
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const { data: plan, error: e1 } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('week_start', weekStart)
        .abortSignal(timeout.signal)
        .maybeSingle();
      if (e1) throw e1;

      if (!plan) {
        setData(null);
        return;
      }

      const { data: targets, error: e2 } = await supabase
        .from('day_targets')
        .select('*')
        .eq('plan_id', plan.id)
        .abortSignal(timeout.signal);
      if (e2) throw e2;

      const merged = makeEmptyTargets(plan.id);
      for (const row of (targets ?? []) as DayTarget[]) {
        merged[row.day_type] = row;
      }
      setData({ plan: plan as NutritionPlan, targets: merged });
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athleteId, weekStart]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh, setData };
}

/** Create a new plan (empty targets or copied). Returns the new plan + full target map. */
export async function createNutritionPlan(
  athleteId: string,
  weekStart: string,
  options: { name?: string; copyFromPlanId?: string | null } = {},
): Promise<PlanWithTargets> {
  const { data: plan, error: e1 } = await supabase
    .from('nutrition_plans')
    .insert({
      athlete_id: athleteId,
      week_start: weekStart,
      name: options.name ?? '',
    })
    .select('*')
    .single();
  if (e1) throw e1;

  let rows: Partial<DayTarget>[];
  if (options.copyFromPlanId) {
    const { data: src, error: e2 } = await supabase
      .from('day_targets')
      .select('*')
      .eq('plan_id', options.copyFromPlanId);
    if (e2) throw e2;
    rows = (src ?? []).map(t => ({
      plan_id: plan.id,
      day_type: t.day_type,
      calories: t.calories,
      protein_g: t.protein_g,
      carbs_g: t.carbs_g,
      fat_g: t.fat_g,
      notes: t.notes,
    }));
    // Ensure every day_type exists
    const existing = new Set(rows.map(r => r.day_type));
    for (const dt of DAY_TYPES) {
      if (!existing.has(dt)) rows.push({ plan_id: plan.id, day_type: dt });
    }
  } else {
    rows = DAY_TYPES.map(dt => ({ plan_id: plan.id, day_type: dt }));
  }

  const { data: inserted, error: e3 } = await supabase
    .from('day_targets')
    .insert(rows)
    .select('*');
  if (e3) throw e3;

  const targets = makeEmptyTargets(plan.id);
  for (const row of (inserted ?? []) as DayTarget[]) targets[row.day_type] = row;

  return { plan: plan as NutritionPlan, targets };
}

export async function upsertDayTarget(
  planId: string,
  dayType: DayType,
  patch: Omit<DayTarget, 'id' | 'plan_id' | 'day_type'>,
): Promise<DayTarget> {
  const { data, error } = await supabase
    .from('day_targets')
    .upsert(
      { plan_id: planId, day_type: dayType, ...patch },
      { onConflict: 'plan_id,day_type' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as DayTarget;
}

/** Most recent plan week BEFORE `weekStart` for this athlete. */
export async function findPreviousPlan(
  athleteId: string,
  beforeWeekStart: string,
): Promise<NutritionPlan | null> {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .select('*')
    .eq('athlete_id', athleteId)
    .lt('week_start', beforeWeekStart)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as NutritionPlan | null) ?? null;
}
