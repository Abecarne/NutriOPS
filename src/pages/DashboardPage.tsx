import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { AddAthleteModal } from '@/components/AddAthleteModal';
import {
  AlertCard,
  Avatar,
  FilterChip,
  KPICard,
  SectionLabel,
  Sparkline,
  StatusDot,
  TOKENS,
  initialsOf,
  type DashboardAlert,
} from '@/components/dashboard/kit';
import { useAthletes } from '@/hooks/useAthletes';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import { supabase } from '@/lib/supabase';
import { isoDate, isoWeekStart, relativeFromNow } from '@/lib/utils';
import type { AthleteRosterRow, AthleteStatus, Checkin, NutritionPlan } from '@/types/database';

type Filter = 'all' | AthleteStatus;

export function DashboardPage() {
  const { athletes, loading, error, refresh } = useAthletes();
  const {
    checkinsByAthlete,
    plannedAthleteIds,
    loading: metricsLoading,
    error: metricsError,
  } = useDashboardMetrics(athletes);
  const [filter, setFilter] = useState<Filter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const navigate = useNavigate();

  const filtered = useMemo(
    () => (filter === 'all' ? athletes : athletes.filter(a => a.status === filter)),
    [athletes, filter],
  );

  const countByStatus = useMemo(() => {
    const counts: Record<Filter, number> = { all: athletes.length, active: 0, offseason: 0, injured: 0 };
    for (const a of athletes) counts[a.status] += 1;
    return counts;
  }, [athletes]);

  const today = isoDate();
  const checkedInToday = athletes.filter(a => a.last_checkin?.checkin_date === today).length;
  const alerts = useMemo(
    () => buildAlerts(athletes).filter(alert => !dismissedAlerts.includes(alert.id)),
    [athletes, dismissedAlerts],
  );

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionLabel index="01" title="Today at a glance" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px mt-4 rounded-md overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
          <KPICard
            label="Active athletes"
            value={countByStatus.active}
            subline={`${athletes.length} on roster`}
            delta={{ value: `${countByStatus.injured}`, tone: countByStatus.injured > 0 ? 'neg' : 'mute', text: 'injured' }}
          />
          <KPICard
            label="Check-ins today"
            value={`${checkedInToday}/${athletes.length}`}
            subline="Daily window closes 23:59"
            progress={athletes.length === 0 ? 0 : checkedInToday / athletes.length}
          />
          <KPICard
            label="Off-season"
            value={countByStatus.offseason}
            subline="Athletes outside active load"
            badge="status"
          />
          <KPICard
            label="Needs attention"
            value={alerts.length}
            subline={alerts.length === 0 ? 'No current flags' : 'Open coaching flags'}
            badge="live"
          />
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <SectionLabel index="02" title="Needs attention" count={alerts.length} />
          {alerts.length > 0 && (
            <button
              onClick={() => setDismissedAlerts(prev => [...prev, ...alerts.map(a => a.id)])}
              className="text-[11px] text-slate-500 hover:text-slate-900 tracking-wide uppercase"
            >
              Clear all
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div
            className="mt-4 rounded-md bg-white border border-dashed text-center py-10 text-sm text-slate-400"
            style={{ borderColor: TOKENS.HAIRLINE }}
          >
            All clear. Nothing flagged this morning.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 xl:grid-cols-3 gap-3">
            {alerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onClick={alert.athleteId ? () => navigate(`/athletes/${alert.athleteId}`) : undefined}
                onDismiss={() => setDismissedAlerts(prev => [...prev, alert.id])}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-baseline lg:justify-between">
          <SectionLabel index="03" title="Roster" count={athletes.length} />
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            <FilterTab current={filter} value="all" onSelect={setFilter} label={`All (${countByStatus.all})`} />
            <FilterTab current={filter} value="active" onSelect={setFilter} label={`Active (${countByStatus.active})`} />
            <FilterTab current={filter} value="offseason" onSelect={setFilter} label={`Off-season (${countByStatus.offseason})`} />
            <FilterTab current={filter} value="injured" onSelect={setFilter} label={`Injured (${countByStatus.injured})`} />
            <Button size="sm" className="ml-2" onClick={() => setModalOpen(true)}>
              + Add athlete
            </Button>
          </div>
        </div>

        {(error || metricsError) && <ErrorMessage message={error ?? metricsError ?? ''} className="mt-4" />}

        <div
          className="mt-4 bg-white rounded-md overflow-hidden"
          style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
        >
          {loading || metricsLoading ? (
            <div className="p-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              {athletes.length === 0
                ? "No athletes yet. Add the first athlete to start."
                : "No athlete matches this filter."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <RosterTable
                athletes={filtered}
                checkinsByAthlete={checkinsByAthlete}
                plannedAthleteIds={plannedAthleteIds}
              />
            </div>
          )}
        </div>
      </section>

      <AddAthleteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => refresh()}
      />
    </div>
  );
}

function useDashboardMetrics(athletes: AthleteRosterRow[]) {
  const [checkinsByAthlete, setCheckinsByAthlete] = useState<Map<string, Checkin[]>>(new Map());
  const [plannedAthleteIds, setPlannedAthleteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weekStart = useMemo(() => isoWeekStart(), []);

  const load = useCallback(async () => {
    if (athletes.length === 0) {
      setCheckinsByAthlete(new Map());
      setPlannedAthleteIds(new Set());
      setLoading(false);
      return;
    }

    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const athleteIds = athletes.map(athlete => athlete.id);
      const { data: checkins, error: checkinsError } = await supabase
        .from('checkins')
        .select('*')
        .in('athlete_id', athleteIds)
        .order('checkin_date', { ascending: false })
        .abortSignal(timeout.signal);
      if (checkinsError) throw checkinsError;

      const { data: plans, error: plansError } = await supabase
        .from('nutrition_plans')
        .select('id, athlete_id, week_start, name, created_at')
        .in('athlete_id', athleteIds)
        .eq('week_start', weekStart)
        .abortSignal(timeout.signal);
      if (plansError) throw plansError;

      const nextCheckins = new Map<string, Checkin[]>();
      for (const row of (checkins ?? []) as Checkin[]) {
        const rows = nextCheckins.get(row.athlete_id) ?? [];
        if (rows.length < 4) nextCheckins.set(row.athlete_id, [...rows, row]);
      }

      setCheckinsByAthlete(nextCheckins);
      setPlannedAthleteIds(new Set(((plans ?? []) as NutritionPlan[]).map(plan => plan.athlete_id)));
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athletes, weekStart]);

  useEffect(() => { void load(); }, [load]);

  return { checkinsByAthlete, plannedAthleteIds, loading, error };
}

function FilterTab({
  current,
  value,
  onSelect,
  label,
}: {
  current: Filter;
  value: Filter;
  onSelect: (v: Filter) => void;
  label: string;
}) {
  return (
    <FilterChip active={current === value} onClick={() => onSelect(value)}>
      {label}
    </FilterChip>
  );
}

function RosterTable({
  athletes,
  checkinsByAthlete,
  plannedAthleteIds,
}: {
  athletes: AthleteRosterRow[];
  checkinsByAthlete: Map<string, Checkin[]>;
  plannedAthleteIds: Set<string>;
}) {
  const cols = '40px minmax(220px,1.35fr) 110px 130px 130px 110px 110px 130px 90px';

  return (
    <div className="font-sans min-w-[1040px]">
      <div
        className="grid items-center px-5 h-10 text-[10px] uppercase tracking-[0.12em] text-slate-400 font-medium"
        style={{ gridTemplateColumns: cols, borderBottom: `1px solid ${TOKENS.HAIRLINE}`, background: TOKENS.PANEL_BG }}
      >
        <div />
        <div>Athlete</div>
        <div>Status</div>
        <div>Last check-in</div>
        <div className="text-right pr-4">Weight (kg)</div>
        <div>Energy · 4w</div>
        <div>Sleep · 4w</div>
        <div>Plan / week</div>
        <div className="text-right">Action</div>
      </div>

      {athletes.map((athlete, index) => (
        <RosterRow
          key={athlete.id}
          athlete={athlete}
          checkins={checkinsByAthlete.get(athlete.id) ?? []}
          planDefined={plannedAthleteIds.has(athlete.id)}
          cols={cols}
          last={index === athletes.length - 1}
        />
      ))}
    </div>
  );
}

function RosterRow({
  athlete,
  checkins,
  planDefined,
  cols,
  last,
}: {
  athlete: AthleteRosterRow;
  checkins: Checkin[];
  planDefined: boolean;
  cols: string;
  last: boolean;
}) {
  const checkinDays = daysSince(athlete.last_checkin?.checkin_date);
  const lateCheckin = checkinDays > 0;
  const weight = athlete.last_checkin?.weight_kg;
  const orderedCheckins = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const energyTrend = orderedCheckins.map(checkin => checkin.energy_level);
  const sleepTrend = orderedCheckins.map(checkin => checkin.sleep_quality);

  return (
    <Link
      to={`/athletes/${athlete.id}`}
      className="grid items-center px-5 h-[60px] text-[13px] hover:bg-[#FAFAF8] transition-colors"
      style={{
        gridTemplateColumns: cols,
        borderBottom: last ? undefined : `1px solid ${TOKENS.HAIRLINE}`,
      }}
    >
      <Avatar initials={initialsOf(athlete.full_name)} status={athlete.status} />

      <div className="flex flex-col leading-tight min-w-0">
        <span className="font-medium text-slate-900 truncate">{athlete.full_name}</span>
        <span className="text-[11px] text-slate-500 mt-0.5 truncate">{athlete.sport}</span>
      </div>

      <StatusDot status={athlete.status} />

      <div className="flex flex-col leading-tight">
        <span
          className="font-mono tabular-nums text-[12px]"
          style={{ color: lateCheckin ? TOKENS.AMBER : '#0F172A' }}
        >
          {formatCheckinDelay(checkinDays)}
        </span>
        {lateCheckin && (
          <span className="text-[10px] uppercase tracking-[0.1em] mt-0.5" style={{ color: TOKENS.AMBER }}>
            Overdue
          </span>
        )}
      </div>

      <div className="text-right pr-4 flex flex-col leading-tight items-end">
        <span className="font-mono tabular-nums text-[14px] text-slate-900">
          {typeof weight === 'number' ? Number(weight).toFixed(1) : '—'}
        </span>
        <span className="text-[11px] font-mono tabular-nums text-slate-400">
          {relativeFromNow(athlete.last_checkin?.submitted_at)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <TrendCell data={energyTrend} color={TOKENS.TEAL} />
      </div>

      <div className="flex items-center gap-2">
        <TrendCell data={sleepTrend} color="#5B7CC9" />
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: planDefined ? TOKENS.TEAL : TOKENS.AMBER }}
        />
        <span className="text-[12px]" style={{ color: planDefined ? TOKENS.TEAL : TOKENS.AMBER }}>
          {planDefined ? 'Defined' : 'Missing'}
        </span>
      </div>

      <div className="text-right">
        <span className="text-[11px] uppercase tracking-[0.1em] font-medium text-slate-500">
          Open →
        </span>
      </div>
    </Link>
  );
}

function TrendCell({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) {
    return (
      <>
        <span className="h-[2px] w-16 rounded-full" style={{ background: TOKENS.HAIRLINE }} />
        <span className="font-mono tabular-nums text-[11px] text-slate-400">—</span>
      </>
    );
  }

  return (
    <>
      <Sparkline data={data} color={color} />
      <span className="font-mono tabular-nums text-[11px] text-slate-500">
        {data[data.length - 1]}/5
      </span>
    </>
  );
}

function buildAlerts(athletes: AthleteRosterRow[]): DashboardAlert[] {
  return athletes.flatMap(athlete => {
    const alerts: DashboardAlert[] = [];
    const checkinDays = daysSince(athlete.last_checkin?.checkin_date);
    if (checkinDays > 0) {
      alerts.push({
        id: `${athlete.id}-missed`,
        type: 'missed',
        athleteId: athlete.id,
        athleteName: athlete.full_name,
        sport: athlete.sport,
        detail: Number.isFinite(checkinDays) ? `No check-in for ${checkinDays} days` : 'No check-in yet',
        initials: initialsOf(athlete.full_name),
      });
    }
    if (athlete.status === 'injured') {
      alerts.push({
        id: `${athlete.id}-energy`,
        type: 'energy',
        athleteId: athlete.id,
        athleteName: athlete.full_name,
        sport: athlete.sport,
        detail: 'Injury status requires plan review',
        initials: initialsOf(athlete.full_name),
      });
    }
    return alerts;
  }).slice(0, 3);
}

function daysSince(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
}

function formatCheckinDelay(days: number): string {
  if (!Number.isFinite(days)) return 'none';
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}
