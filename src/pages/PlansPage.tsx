import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Avatar,
  FilterChip,
  KPICard,
  SectionLabel,
  StatusDot,
  TOKENS,
  initialsOf,
} from '@/components/dashboard/kit';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useAthletes } from '@/hooks/useAthletes';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import { supabase } from '@/lib/supabase';
import { formatWeekRange, isoWeekEnd, isoWeekStart } from '@/lib/utils';
import type { AthleteRosterRow, DailyNutritionTarget, TrainingSession } from '@/types/database';

type PlanFilter = 'all' | 'complete' | 'missing';

interface WeekPlanningRow {
  athlete: AthleteRosterRow;
  targets: DailyNutritionTarget[];
  sessions: TrainingSession[];
}

export function PlansPage() {
  const { athletes, loading: athletesLoading, error: athletesError } = useAthletes();
  const weekStart = useMemo(() => isoWeekStart(), []);
  const weekEnd = useMemo(() => isoWeekEnd(weekStart), [weekStart]);
  const { rows, loading: plansLoading, error: plansError } = useWeekPlanning(athletes, weekStart, weekEnd);
  const [filter, setFilter] = useState<PlanFilter>('all');

  const complete = rows.filter(row => row.targets.length === 7).length;
  const missing = rows.length - complete;
  const sessions = rows.reduce((sum, row) => sum + row.sessions.length, 0);
  const load = rows.reduce((sum, row) => sum + row.sessions.reduce((s, session) => s + (session.internal_load ?? ((session.planned_duration_min ?? 0) * (session.planned_intensity ?? 0))), 0), 0);

  const filtered = rows.filter(row => {
    if (filter === 'complete') return row.targets.length === 7;
    if (filter === 'missing') return row.targets.length < 7;
    return true;
  });

  const loading = athletesLoading || plansLoading;
  const error = athletesError || plansError;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionLabel index="01" title="Weekly planning" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px mt-4 rounded-md overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
          <KPICard label="Selected week" value={rows.length} subline={formatWeekRange(weekStart)} badge="athletes" />
          <KPICard label="Nutrition complete" value={`${complete}/${rows.length}`} subline="7 daily targets defined" progress={rows.length ? complete / rows.length : 0} />
          <KPICard label="Training sessions" value={sessions} subline="Planned this week" badge="training" />
          <KPICard label="Estimated load" value={load} subline="Duration x intensity/RPE" delta={{ value: String(missing), tone: missing ? 'neg' : 'mute', text: 'missing nutrition' }} />
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-baseline lg:justify-between">
          <SectionLabel index="02" title="Planning coverage" count={filtered.length} />
          <div className="flex flex-wrap items-center gap-1">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All ({rows.length})</FilterChip>
            <FilterChip active={filter === 'complete'} onClick={() => setFilter('complete')}>Complete ({complete})</FilterChip>
            <FilterChip active={filter === 'missing'} onClick={() => setFilter('missing')}>Missing ({missing})</FilterChip>
          </div>
        </div>

        {error && <ErrorMessage message={error} className="mt-4" />}

        <div
          className="mt-4 bg-white rounded-md overflow-hidden"
          style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
        >
          {loading ? (
            <div className="p-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No planning rows match this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <PlansTable rows={filtered} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function useWeekPlanning(athletes: AthleteRosterRow[], weekStart: string, weekEnd: string) {
  const [rows, setRows] = useState<WeekPlanningRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (athletes.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const athleteIds = athletes.map(athlete => athlete.id);
      const { data: targets, error: targetsError } = await supabase
        .from('daily_nutrition_targets')
        .select('*')
        .in('athlete_id', athleteIds)
        .gte('target_date', weekStart)
        .lte('target_date', weekEnd)
        .abortSignal(timeout.signal);
      if (targetsError) throw targetsError;

      const { data: sessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select('*')
        .in('athlete_id', athleteIds)
        .gte('session_date', weekStart)
        .lte('session_date', weekEnd)
        .abortSignal(timeout.signal);
      if (sessionsError) throw sessionsError;

      const targetsByAthlete = groupByAthlete((targets ?? []) as DailyNutritionTarget[]);
      const sessionsByAthlete = groupByAthlete((sessions ?? []) as TrainingSession[]);
      setRows(athletes.map(athlete => ({
        athlete,
        targets: targetsByAthlete.get(athlete.id) ?? [],
        sessions: sessionsByAthlete.get(athlete.id) ?? [],
      })));
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athletes, weekEnd, weekStart]);

  useEffect(() => { void load(); }, [load]);

  return { rows, loading, error };
}

function PlansTable({ rows }: { rows: WeekPlanningRow[] }) {
  const cols = '40px minmax(220px,1.4fr) 110px 130px 130px 130px 120px 90px';

  return (
    <div className="min-w-[1040px]">
      <div
        className="grid items-center px-5 h-10 text-[10px] uppercase tracking-[0.12em] text-slate-400 font-medium"
        style={{ gridTemplateColumns: cols, borderBottom: `1px solid ${TOKENS.HAIRLINE}`, background: TOKENS.PANEL_BG }}
      >
        <div />
        <div>Athlete</div>
        <div>Status</div>
        <div>Nutrition</div>
        <div>Calories avg</div>
        <div>Sessions</div>
        <div>Load</div>
        <div className="text-right">Action</div>
      </div>

      {rows.map((row, index) => (
        <Link
          key={row.athlete.id}
          to={`/athletes/${row.athlete.id}`}
          className="grid items-center px-5 h-[60px] text-[13px] hover:bg-[#FAFAF8] transition-colors"
          style={{
            gridTemplateColumns: cols,
            borderBottom: index === rows.length - 1 ? undefined : `1px solid ${TOKENS.HAIRLINE}`,
          }}
        >
          <Avatar initials={initialsOf(row.athlete.full_name)} status={row.athlete.status} />
          <div className="min-w-0">
            <div className="font-medium text-slate-900 truncate">{row.athlete.full_name}</div>
            <div className="mt-0.5 text-[11px] text-slate-500 truncate">{row.athlete.sport}</div>
          </div>
          <StatusDot status={row.athlete.status} />
          <PlanState complete={row.targets.length === 7} value={`${row.targets.length}/7`} />
          <div className="font-mono tabular-nums text-[12px] text-slate-700">
            {row.targets.length ? `${averageCalories(row.targets)} kcal` : '—'}
          </div>
          <div className="font-mono tabular-nums text-[12px] text-slate-700">{row.sessions.length}</div>
          <div className="font-mono tabular-nums text-[12px] text-slate-700">{trainingLoad(row.sessions)}</div>
          <div className="text-right text-[11px] uppercase tracking-[0.1em] font-medium text-slate-500">Open →</div>
        </Link>
      ))}
    </div>
  );
}

function PlanState({ complete, value }: { complete: boolean; value: string }) {
  const color = complete ? TOKENS.TEAL : TOKENS.AMBER;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[12px]" style={{ color }}>{value}</span>
    </span>
  );
}

function groupByAthlete<T extends { athlete_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    map.set(row.athlete_id, [...(map.get(row.athlete_id) ?? []), row]);
  }
  return map;
}

function averageCalories(targets: DailyNutritionTarget[]) {
  return Math.round(targets.reduce((sum, target) => sum + target.calories, 0) / targets.length);
}

function trainingLoad(sessions: TrainingSession[]) {
  return sessions.reduce((sum, session) => sum + (session.internal_load ?? ((session.planned_duration_min ?? 0) * (session.planned_intensity ?? 0))), 0);
}
