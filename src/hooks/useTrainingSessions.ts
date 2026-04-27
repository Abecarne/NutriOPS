import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import { shiftDate } from '@/lib/utils';
import type { TrainingSession, TrainingSessionStatus, TrainingSessionType } from '@/types/database';

export type TrainingSessionInput = {
  id?: string;
  athlete_id: string;
  session_date: string;
  title: string;
  session_type: TrainingSessionType;
  planned_duration_min?: number | null;
  planned_intensity?: number | null;
  description?: string | null;
  status?: TrainingSessionStatus;
  actual_duration_min?: number | null;
  rpe?: number | null;
  athlete_notes?: string | null;
  coach_notes?: string | null;
};

export function useTrainingSessions(
  athleteId: string | undefined,
  startDate: string,
  endDate: string,
) {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!athleteId) {
      setSessions([]);
      setLoading(false);
      return;
    }
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('athlete_id', athleteId)
        .gte('session_date', startDate)
        .lte('session_date', endDate)
        .order('session_date', { ascending: true })
        .order('created_at', { ascending: true })
        .abortSignal(timeout.signal);
      if (e) throw e;
      setSessions((data ?? []) as TrainingSession[]);
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athleteId, endDate, startDate]);

  useEffect(() => { void refresh(); }, [refresh]);

  const byDate = useMemo(() => {
    const next = new Map<string, TrainingSession[]>();
    for (const session of sessions) {
      next.set(session.session_date, [...(next.get(session.session_date) ?? []), session]);
    }
    return next;
  }, [sessions]);

  const upsertSession = useCallback(async (input: TrainingSessionInput) => {
    const { data, error: e } = await supabase
      .from('training_sessions')
      .upsert(input)
      .select('*')
      .single();
    if (e) throw e;
    const saved = data as TrainingSession;
    setSessions(prev => {
      const without = prev.filter(session => session.id !== saved.id);
      return [...without, saved].sort((a, b) => a.session_date.localeCompare(b.session_date) || a.created_at.localeCompare(b.created_at));
    });
    return saved;
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    const { error: e } = await supabase.from('training_sessions').delete().eq('id', id);
    if (e) throw e;
    setSessions(prev => prev.filter(session => session.id !== id));
  }, []);

  const duplicatePreviousWeek = useCallback(async (weekStart: string) => {
    if (!athleteId) return [];
    const previousStart = shiftDate(weekStart, -7);
    const previousEnd = shiftDate(weekStart, -1);
    const { data: previous, error: loadError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('athlete_id', athleteId)
      .gte('session_date', previousStart)
      .lte('session_date', previousEnd)
      .order('session_date', { ascending: true });
    if (loadError) throw loadError;

    const rows = ((previous ?? []) as TrainingSession[]).map(session => ({
      athlete_id: athleteId,
      session_date: shiftDate(session.session_date, 7),
      title: session.title,
      session_type: session.session_type,
      planned_duration_min: session.planned_duration_min,
      planned_intensity: session.planned_intensity,
      description: session.description,
      status: 'planned' as const,
      coach_notes: session.coach_notes,
    }));
    if (rows.length === 0) return [];

    const { data, error: insertError } = await supabase
      .from('training_sessions')
      .insert(rows)
      .select('*')
      .order('session_date', { ascending: true });
    if (insertError) throw insertError;
    const saved = (data ?? []) as TrainingSession[];
    setSessions(prev => [...prev, ...saved].sort((a, b) => a.session_date.localeCompare(b.session_date) || a.created_at.localeCompare(b.created_at)));
    return saved;
  }, [athleteId]);

  return { sessions, byDate, loading, error, refresh, upsertSession, deleteSession, duplicatePreviousWeek, setSessions };
}
