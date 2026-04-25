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
import { formatWeekRange, isoWeekStart } from '@/lib/utils';
import type { AthleteRosterRow, DayTarget, NutritionPlan } from '@/types/database';

interface PlanRow {
  plan: NutritionPlan;
  targets: DayTarget[];
}

type PlanFilter = 'all' | 'defined' | 'missing';

export function PlansPage() {
  const { athletes, loading: athletesLoading, error: athletesError } = useAthletes();
  const weekStart = useMemo(() => isoWeekStart(), []);
  const { plansByAthlete, loading: plansLoading, error: plansError } = usePlansForWeek(athletes, weekStart);
  const [filter, setFilter] = useState<PlanFilter>('all');

  const rows = useMemo(
    () => athletes.map(athlete => ({ athlete, planRow: plansByAthlete.get(athlete.id) ?? null })),
    [athletes, plansByAthlete],
  );

  const defined = rows.filter(row => row.planRow).length;
  const missing = rows.length - defined;
  const filtered = rows.filter(row => {
    if (filter === 'defined') return Boolean(row.planRow);
    if (filter === 'missing') return !row.planRow;
    return true;
  });

  const loading = athletesLoading || plansLoading;
  const error = athletesError || plansError;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionLabel index="01" title="Week planning" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px mt-4 rounded-md overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
          <KPICard label="Selected week" value={defined + missing} subline={formatWeekRange(weekStart)} badge="athletes" />
          <KPICard label="Plans defined" value={defined} subline="Athletes with a plan this week" progress={rows.length ? defined / rows.length : 0} />
          <KPICard label="Missing plans" value={missing} subline="Need creation or copy" delta={{ value: String(missing), tone: missing ? 'neg' : 'mute', text: 'open' }} />
          <KPICard label="Targets filled" value={totalTargets(rows)} subline="Day target rows available" badge="4 types" />
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-baseline lg:justify-between">
          <SectionLabel index="02" title="Plan coverage" count={filtered.length} />
          <div className="flex flex-wrap items-center gap-1">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All ({rows.length})</FilterChip>
            <FilterChip active={filter === 'defined'} onClick={() => setFilter('defined')}>Defined ({defined})</FilterChip>
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
            <div className="p-10 text-center text-sm text-slate-500">No plans match this filter.</div>
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

function usePlansForWeek(athletes: AthleteRosterRow[], weekStart: string) {
  const [plansByAthlete, setPlansByAthlete] = useState<Map<string, PlanRow>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (athletes.length === 0) {
      setPlansByAthlete(new Map());
      setLoading(false);
      return;
    }
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const athleteIds = athletes.map(athlete => athlete.id);
      const { data: plans, error: plansError } = await supabase
        .from('nutrition_plans')
        .select('*')
        .in('athlete_id', athleteIds)
        .eq('week_start', weekStart)
        .abortSignal(timeout.signal);
      if (plansError) throw plansError;

      const planRows = (plans ?? []) as NutritionPlan[];
      const targetsByPlanId = new Map<string, DayTarget[]>();
      if (planRows.length > 0) {
        const { data: targets, error: targetsError } = await supabase
          .from('day_targets')
          .select('*')
          .in('plan_id', planRows.map(plan => plan.id))
          .abortSignal(timeout.signal);
        if (targetsError) throw targetsError;
        for (const target of (targets ?? []) as DayTarget[]) {
          targetsByPlanId.set(target.plan_id, [...(targetsByPlanId.get(target.plan_id) ?? []), target]);
        }
      }

      const next = new Map<string, PlanRow>();
      for (const plan of planRows) {
        next.set(plan.athlete_id, { plan, targets: targetsByPlanId.get(plan.id) ?? [] });
      }
      setPlansByAthlete(next);
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athletes, weekStart]);

  useEffect(() => { void load(); }, [load]);

  return { plansByAthlete, loading, error };
}

function PlansTable({
  rows,
}: {
  rows: Array<{ athlete: AthleteRosterRow; planRow: PlanRow | null }>;
}) {
  const cols = '40px minmax(220px,1.4fr) 110px 130px 130px 130px 90px';

  return (
    <div className="min-w-[900px]">
      <div
        className="grid items-center px-5 h-10 text-[10px] uppercase tracking-[0.12em] text-slate-400 font-medium"
        style={{ gridTemplateColumns: cols, borderBottom: `1px solid ${TOKENS.HAIRLINE}`, background: TOKENS.PANEL_BG }}
      >
        <div />
        <div>Athlete</div>
        <div>Status</div>
        <div>Plan</div>
        <div>Targets</div>
        <div>Macro avg</div>
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
          <PlanState defined={Boolean(row.planRow)} />
          <div className="font-mono tabular-nums text-[12px] text-slate-700">
            {row.planRow ? `${row.planRow.targets.length}/4` : '0/4'}
          </div>
          <div className="font-mono tabular-nums text-[12px] text-slate-700">
            {row.planRow ? `${averageCalories(row.planRow.targets)} kcal` : '—'}
          </div>
          <div className="text-right text-[11px] uppercase tracking-[0.1em] font-medium text-slate-500">
            Open →
          </div>
        </Link>
      ))}
    </div>
  );
}

function PlanState({ defined }: { defined: boolean }) {
  const color = defined ? TOKENS.TEAL : TOKENS.AMBER;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[12px]" style={{ color }}>{defined ? 'Defined' : 'Missing'}</span>
    </span>
  );
}

function averageCalories(targets: DayTarget[]) {
  if (targets.length === 0) return 0;
  return Math.round(targets.reduce((sum, target) => sum + target.calories, 0) / targets.length);
}

function totalTargets(rows: Array<{ planRow: PlanRow | null }>) {
  return rows.reduce((sum, row) => sum + (row.planRow?.targets.length ?? 0), 0);
}
