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
import { computeAthleteAlerts } from '@/lib/alerts';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import { supabase } from '@/lib/supabase';
import { isoDate, relativeFromNow } from '@/lib/utils';
import type { AthleteRosterRow, AthleteStatus, Checkin, DailyNutritionTarget, TrainingSession } from '@/types/database';

type Filter = 'all' | AthleteStatus;

interface DashboardMetrics {
  checkinsByAthlete: Map<string, Checkin[]>;
  sessionsByAthlete: Map<string, TrainingSession[]>;
  targetsByAthlete: Map<string, DailyNutritionTarget>;
  alerts: DashboardAlert[];
}

export function DashboardPage() {
  const { athletes, loading, error, refresh } = useAthletes();
  const {
    metrics,
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
  const todaysSessions = Array.from(metrics.sessionsByAthlete.values()).flat().length;
  const missingTargets = athletes.filter(a => !metrics.targetsByAthlete.has(a.id)).length;
  const visibleAlerts = metrics.alerts.filter(alert => !dismissedAlerts.includes(alert.id)).slice(0, 6);
  const criticalCount = metrics.alerts.filter(alert => alert.severity === 'critical').length;
  const warningCount = metrics.alerts.filter(alert => alert.severity === 'warning').length;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionLabel index="01" title="Coach today" />
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
            subline="Daily readiness received"
            progress={athletes.length === 0 ? 0 : checkedInToday / athletes.length}
          />
          <KPICard
            label="Sessions today"
            value={todaysSessions}
            subline="Planned or reported"
            badge="training"
          />
          <KPICard
            label="Needs attention"
            value={visibleAlerts.length}
            subline={
              criticalCount > 0
                ? `${criticalCount} critical · ${warningCount} warning`
                : warningCount > 0
                  ? `${warningCount} warning${warningCount > 1 ? 's' : ''}`
                  : 'All clear today'
            }
            delta={{
              value: String(missingTargets),
              tone: missingTargets ? 'neg' : 'mute',
              text: 'nutrition missing',
            }}
          />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <SectionLabel index="02" title="Needs attention" count={visibleAlerts.length} />
            {(criticalCount > 0 || warningCount > 0) && (
              <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                {criticalCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                    style={{ background: TOKENS.CRITICAL_BG, color: TOKENS.CRITICAL }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: TOKENS.CRITICAL }} />
                    {criticalCount} critical
                  </span>
                )}
                {warningCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded"
                    style={{ background: TOKENS.WARNING_BG, color: TOKENS.AMBER }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: TOKENS.AMBER }} />
                    {warningCount} warning
                  </span>
                )}
              </div>
            )}
          </div>
          {visibleAlerts.length > 0 && (
            <button
              onClick={() => setDismissedAlerts(prev => [...prev, ...visibleAlerts.map(a => a.id)])}
              className="text-[11px] text-slate-500 hover:text-slate-900 tracking-wide uppercase"
            >
              Clear all
            </button>
          )}
        </div>

        {visibleAlerts.length === 0 ? (
          <div
            className="mt-4 rounded-md bg-white border border-dashed text-center py-10 text-sm text-slate-400"
            style={{ borderColor: TOKENS.HAIRLINE }}
          >
            Nothing flagged from today’s readiness, nutrition and training data.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
            {visibleAlerts.map(alert => (
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
          <SectionLabel index="03" title="Roster monitoring" count={athletes.length} />
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
                ? 'No athletes yet. Add the first athlete to start.'
                : 'No athlete matches this filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <RosterTable athletes={filtered} metrics={metrics} />
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
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    checkinsByAthlete: new Map(),
    sessionsByAthlete: new Map(),
    targetsByAthlete: new Map(),
    alerts: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => isoDate(), []);

  const load = useCallback(async () => {
    if (athletes.length === 0) {
      setMetrics({ checkinsByAthlete: new Map(), sessionsByAthlete: new Map(), targetsByAthlete: new Map(), alerts: [] });
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
        .limit(athleteIds.length * 14)
        .abortSignal(timeout.signal);
      if (checkinsError) throw checkinsError;

      const { data: sessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select('*')
        .in('athlete_id', athleteIds)
        .eq('session_date', today)
        .order('created_at', { ascending: true })
        .abortSignal(timeout.signal);
      if (sessionsError) throw sessionsError;

      const { data: targets, error: targetsError } = await supabase
        .from('daily_nutrition_targets')
        .select('*')
        .in('athlete_id', athleteIds)
        .eq('target_date', today)
        .abortSignal(timeout.signal);
      if (targetsError) throw targetsError;

      const checkinsByAthlete = new Map<string, Checkin[]>();
      for (const row of (checkins ?? []) as Checkin[]) {
        const rows = checkinsByAthlete.get(row.athlete_id) ?? [];
        if (rows.length < 14) checkinsByAthlete.set(row.athlete_id, [...rows, row]);
      }

      const sessionsByAthlete = new Map<string, TrainingSession[]>();
      for (const row of (sessions ?? []) as TrainingSession[]) {
        sessionsByAthlete.set(row.athlete_id, [...(sessionsByAthlete.get(row.athlete_id) ?? []), row]);
      }

      const targetsByAthlete = new Map<string, DailyNutritionTarget>();
      for (const row of (targets ?? []) as DailyNutritionTarget[]) {
        targetsByAthlete.set(row.athlete_id, row);
      }

      const severityRank: Record<'critical' | 'warning' | 'info', number> = {
        critical: 0, warning: 1, info: 2,
      };
      const alerts = athletes
        .flatMap(athlete => computeAthleteAlerts({
          athlete,
          checkins: checkinsByAthlete.get(athlete.id) ?? [],
          sessions: sessionsByAthlete.get(athlete.id) ?? [],
          targets: targetsByAthlete.get(athlete.id) ? [targetsByAthlete.get(athlete.id)!] : [],
          today,
        }))
        .map(alert => ({
          id: alert.id,
          type: alert.category, // already 'recovery' | 'nutrition' | 'training' | 'adherence' | 'weight'
          severity: alert.severity,
          athleteId: alert.athlete_id,
          athleteName: alert.athlete_name ?? 'Athlete',
          sport: athletes.find(athlete => athlete.id === alert.athlete_id)?.sport ?? '',
          title: alert.title,
          description: alert.description,
          detail: `${alert.title} — ${alert.description}`,
          initials: initialsOf(alert.athlete_name ?? 'Athlete'),
        }) satisfies DashboardAlert)
        .sort((a, b) => severityRank[a.severity ?? 'info'] - severityRank[b.severity ?? 'info'])
        .slice(0, 12);

      setMetrics({ checkinsByAthlete, sessionsByAthlete, targetsByAthlete, alerts });
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athletes, today]);

  useEffect(() => { void load(); }, [load]);

  return { metrics, loading, error };
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
  metrics,
}: {
  athletes: AthleteRosterRow[];
  metrics: DashboardMetrics;
}) {
  const cols = '40px minmax(220px,1.35fr) 110px 112px 96px 96px 96px 150px 150px 90px';

  return (
    <div className="font-sans min-w-[1220px]">
      <div
        className="grid items-center px-5 h-10 text-[10px] uppercase tracking-[0.12em] text-slate-400 font-medium"
        style={{ gridTemplateColumns: cols, borderBottom: `1px solid ${TOKENS.HAIRLINE}`, background: TOKENS.PANEL_BG }}
      >
        <div />
        <div>Athlete</div>
        <div>Status</div>
        <div>Check-in</div>
        <div>Weight</div>
        <div>Energy</div>
        <div>Soreness</div>
        <div>Training today</div>
        <div>Nutrition today</div>
        <div className="text-right">Action</div>
      </div>

      {athletes.map((athlete, index) => (
        <RosterRow
          key={athlete.id}
          athlete={athlete}
          checkins={metrics.checkinsByAthlete.get(athlete.id) ?? []}
          sessions={metrics.sessionsByAthlete.get(athlete.id) ?? []}
          target={metrics.targetsByAthlete.get(athlete.id) ?? null}
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
  sessions,
  target,
  cols,
  last,
}: {
  athlete: AthleteRosterRow;
  checkins: Checkin[];
  sessions: TrainingSession[];
  target: DailyNutritionTarget | null;
  cols: string;
  last: boolean;
}) {
  const checkinDays = daysSince(athlete.last_checkin?.checkin_date);
  const lateCheckin = checkinDays > 0;
  const latest = checkins[0] ?? null;
  const previous = checkins[1] ?? null;
  const weightDelta = latest && previous ? Number(latest.weight_kg) - Number(previous.weight_kg) : null;
  const orderedCheckins = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date)).slice(-7);
  const energyTrend = orderedCheckins.map(checkin => checkin.energy_level);
  const sorenessTrend = orderedCheckins.map(checkin => checkin.soreness_level ?? 0).filter(Boolean);
  const mainSession = sessions[0];
  const adherence = latest?.nutrition_adherence ?? null;

  return (
    <Link
      to={`/athletes/${athlete.id}`}
      className="grid items-center px-5 h-[64px] text-[13px] hover:bg-[#FAFAF8] transition-colors"
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
        <span className="font-mono tabular-nums text-[12px]" style={{ color: lateCheckin ? TOKENS.AMBER : '#0F172A' }}>
          {formatCheckinDelay(checkinDays)}
        </span>
        {lateCheckin && <span className="text-[10px] uppercase tracking-[0.1em] mt-0.5" style={{ color: TOKENS.AMBER }}>Overdue</span>}
      </div>

      <div className="flex flex-col leading-tight">
        <span className="font-mono tabular-nums text-[13px] text-slate-900">
          {latest ? `${Number(latest.weight_kg).toFixed(1)} kg` : '—'}
        </span>
        <WeightDelta delta={weightDelta} fallback={relativeFromNow(latest?.submitted_at)} />
      </div>

      <TrendCell data={energyTrend} color={TOKENS.TEAL} suffix="/5" />
      <TrendCell data={sorenessTrend} color={TOKENS.AMBER} suffix="/5" />

      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-[12px] text-slate-900 truncate">{mainSession?.title ?? 'No session'}</span>
        <span className="text-[10px] text-slate-400 truncate">
          {mainSession ? `${mainSession.status} · ${mainSession.planned_duration_min ?? '—'} min` : 'Training not planned'}
        </span>
      </div>

      <div className="flex flex-col leading-tight">
        <span className="font-mono tabular-nums text-[12px]" style={{ color: target ? TOKENS.TEAL : TOKENS.AMBER }}>
          {target ? `${target.calories} kcal` : 'Missing'}
        </span>
        <AdherenceBadge adherence={adherence} dayType={target?.day_type} />
      </div>

      <div className="text-right">
        <span className="text-[11px] uppercase tracking-[0.1em] font-medium text-slate-500">Open →</span>
      </div>
    </Link>
  );
}

function WeightDelta({ delta, fallback }: { delta: number | null; fallback: string }) {
  if (delta === null) {
    return <span className="text-[10px] text-slate-400">{fallback}</span>;
  }
  if (Math.abs(delta) < 0.1) {
    return <span className="text-[10px] font-mono tabular-nums text-slate-400">— stable</span>;
  }
  const tone = Math.abs(delta) >= 1.5 ? TOKENS.AMBER : TOKENS.SLATE;
  return (
    <span className="text-[10px] font-mono tabular-nums" style={{ color: tone }}>
      {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)} kg
    </span>
  );
}

function AdherenceBadge({
  adherence,
  dayType,
}: {
  adherence: 'low' | 'medium' | 'high' | null;
  dayType?: string;
}) {
  if (!adherence) {
    return <span className="text-[10px] text-slate-400">{dayType ?? 'No target'}</span>;
  }
  const map = {
    low:    { color: TOKENS.AMBER, label: 'Adh. faible' },
    medium: { color: TOKENS.SLATE, label: 'Adh. moyenne' },
    high:   { color: TOKENS.TEAL,  label: 'Adh. bonne' },
  } as const;
  const { color, label } = map[adherence];
  return (
    <span className="inline-flex items-center gap-1 text-[10px]" style={{ color }}>
      <span className="w-1 h-1 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function TrendCell({ data, color, suffix }: { data: number[]; color: string; suffix: string }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="h-[2px] w-16 rounded-full" style={{ background: TOKENS.HAIRLINE }} />
        <span className="font-mono tabular-nums text-[11px] text-slate-400">—</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Sparkline data={data} color={color} />
      <span className="font-mono tabular-nums text-[11px] text-slate-500">
        {data[data.length - 1]}{suffix}
      </span>
    </div>
  );
}

function daysSince(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - new Date(`${value}T00:00:00`).getTime()) / 86_400_000));
}

function formatCheckinDelay(days: number): string {
  if (!Number.isFinite(days)) return 'none';
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}
