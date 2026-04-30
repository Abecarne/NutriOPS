import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import type {
  TrainingExercise,
  TrainingProgram,
  TrainingProgramSession,
  TrainingProgramStatus,
  TrainingSessionStatus,
  TrainingSessionType,
  TrainingWeek,
} from '@/types/database';

export type TrainingProgramInput = {
  id?: string;
  athlete_id: string;
  title: string;
  goal: string;
  start_date: string;
  end_date?: string | null;
  status: TrainingProgramStatus;
};

export type TrainingWeekInput = {
  id?: string;
  program_id: string;
  week_number: number;
  focus?: string | null;
  notes?: string | null;
};

export type TrainingProgramSessionInput = {
  id?: string;
  week_id: string;
  title: string;
  scheduled_date?: string | null;
  status: TrainingSessionStatus;
  session_type: TrainingSessionType;
  duration_minutes?: number | null;
  notes?: string | null;
};

export type TrainingExerciseInput = {
  id?: string;
  session_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  target_load_kg?: number | null;
  actual_load_kg?: number | null;
  tempo?: string | null;
  rest_seconds?: number | null;
  rpe?: number | null;
  notes?: string | null;
  video_url?: string | null;
  position: number;
};

export function useTrainingPrograms(athleteId: string | undefined) {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [weeks, setWeeks] = useState<TrainingWeek[]>([]);
  const [sessions, setSessions] = useState<TrainingProgramSession[]>([]);
  const [exercises, setExercises] = useState<TrainingExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!athleteId) {
      setPrograms([]);
      setWeeks([]);
      setSessions([]);
      setExercises([]);
      setLoading(false);
      return;
    }

    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const { data: programRows, error: programError } = await supabase
        .from('training_programs')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('status', { ascending: true })
        .order('start_date', { ascending: false })
        .abortSignal(timeout.signal);
      if (programError) throw programError;

      const programList = (programRows ?? []) as TrainingProgram[];
      setPrograms(programList);

      if (programList.length === 0) {
        setWeeks([]);
        setSessions([]);
        setExercises([]);
        return;
      }

      const { data: weekRows, error: weekError } = await supabase
        .from('training_weeks')
        .select('*')
        .in('program_id', programList.map(program => program.id))
        .order('week_number', { ascending: true })
        .abortSignal(timeout.signal);
      if (weekError) throw weekError;
      const weekList = (weekRows ?? []) as TrainingWeek[];
      setWeeks(weekList);

      if (weekList.length === 0) {
        setSessions([]);
        setExercises([]);
        return;
      }

      const { data: sessionRows, error: sessionError } = await supabase
        .from('training_program_sessions')
        .select('*')
        .in('week_id', weekList.map(week => week.id))
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
        .abortSignal(timeout.signal);
      if (sessionError) throw sessionError;
      const sessionList = (sessionRows ?? []) as TrainingProgramSession[];
      setSessions(sessionList);

      if (sessionList.length === 0) {
        setExercises([]);
        return;
      }

      const { data: exerciseRows, error: exerciseError } = await supabase
        .from('training_exercises')
        .select('*')
        .in('session_id', sessionList.map(session => session.id))
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
        .abortSignal(timeout.signal);
      if (exerciseError) throw exerciseError;
      setExercises((exerciseRows ?? []) as TrainingExercise[]);
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const activeProgram = useMemo(
    () => programs.find(program => program.status === 'active') ?? programs[0] ?? null,
    [programs],
  );

  const weeksByProgramId = useMemo(() => groupBy(weeks, week => week.program_id), [weeks]);
  const sessionsByWeekId = useMemo(() => groupBy(sessions, session => session.week_id), [sessions]);
  const exercisesBySessionId = useMemo(() => groupBy(exercises, exercise => exercise.session_id), [exercises]);

  const upsertProgram = useCallback(async (input: TrainingProgramInput) => {
    const { data, error: e } = await supabase
      .from('training_programs')
      .upsert(input)
      .select('*')
      .single();
    if (e) throw e;
    const saved = data as TrainingProgram;
    setPrograms(prev => [saved, ...prev.filter(program => program.id !== saved.id)]);
    return saved;
  }, []);

  const upsertWeek = useCallback(async (input: TrainingWeekInput) => {
    const { data, error: e } = await supabase
      .from('training_weeks')
      .upsert(input, { onConflict: 'program_id,week_number' })
      .select('*')
      .single();
    if (e) throw e;
    const saved = data as TrainingWeek;
    setWeeks(prev => [...prev.filter(week => week.id !== saved.id), saved].sort((a, b) => a.week_number - b.week_number));
    return saved;
  }, []);

  const upsertSession = useCallback(async (input: TrainingProgramSessionInput) => {
    const { data, error: e } = await supabase
      .from('training_program_sessions')
      .upsert(input)
      .select('*')
      .single();
    if (e) throw e;
    const saved = data as TrainingProgramSession;
    setSessions(prev => [...prev.filter(session => session.id !== saved.id), saved]);
    return saved;
  }, []);

  const upsertExercise = useCallback(async (input: TrainingExerciseInput) => {
    const { data, error: e } = await supabase
      .from('training_exercises')
      .upsert(input)
      .select('*')
      .single();
    if (e) throw e;
    const saved = data as TrainingExercise;
    setExercises(prev => [...prev.filter(exercise => exercise.id !== saved.id), saved].sort((a, b) => a.position - b.position));
    return saved;
  }, []);

  const deleteExercise = useCallback(async (id: string) => {
    const { error: e } = await supabase.from('training_exercises').delete().eq('id', id);
    if (e) throw e;
    setExercises(prev => prev.filter(exercise => exercise.id !== id));
  }, []);

  return {
    programs,
    activeProgram,
    weeks,
    sessions,
    exercises,
    weeksByProgramId,
    sessionsByWeekId,
    exercisesBySessionId,
    loading,
    error,
    refresh,
    upsertProgram,
    upsertWeek,
    upsertSession,
    upsertExercise,
    deleteExercise,
  };
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}
