import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AddAthleteModal } from '@/components/AddAthleteModal';
import {
  Avatar,
  FilterChip,
  KPICard,
  SectionLabel,
  Sparkline,
  StatusDot,
  TOKENS,
  initialsOf,
} from '@/components/dashboard/kit';
import { TrendArrow } from '@/components/dashboard/charts';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useAthletes } from '@/hooks/useAthletes';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import { supabase } from '@/lib/supabase';
import { isoDate, relativeFromNow } from '@/lib/utils';
import type { AthleteRosterRow, AthleteStatus, Checkin } from '@/types/database';

type Filter = 'all' | AthleteStatus;

interface RosterMetrics {
  byAthlete: Map<string, Checkin[]>;
}

export function AthletesPage() {
  const { athletes, loading, error, refresh } = useAthletes();
  const { metrics } = useRosterMetrics(athletes);
  const [filter, setFilter] = useState<Filter>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(
    () => (filter === 'all' ? athletes : athletes.filter(a => a.status === filter)),
    [athletes, filter],
  );

  const counts = useMemo(() => {
    const out: Record<Filter, number> = { all: athletes.length, active: 0, offseason: 0, injured: 0 };
    for (const athlete of athletes) out[athlete.status] += 1;
    return out;
  }, [athletes]);

  const today = isoDate();
  const checkedInToday = athletes.filter(a => a.last_checkin?.checkin_date === today).length;
  const overdue = athletes.filter(a => isOverdue(a.last_checkin?.checkin_date ?? null, today)).length;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionLabel index="01" title="Roster overview" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px mt-4 rounded-md overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
          <KPICard label="Total athletes" value={athletes.length} subline="Managed in this workspace" />
          <KPICard label="Active" value={counts.active} subline="Currently in performance block" />
          <KPICard
            label="Checked in today"
            value={`${checkedInToday}/${athletes.length}`}
            subline="Daily check-in submitted"
            progress={athletes.length ? checkedInToday / athletes.length : 0}
          />
          <KPICard
            label="Overdue"
            value={overdue}
            subline="No check-in for ≥ 2 days"
            delta={{ value: String(overdue), tone: overdue > 0 ? 'neg' : 'mute', text: 'flagged' }}
          />
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-baseline lg:justify-between">
          <SectionLabel index="02" title="Athletes" count={filtered.length} />
          <div className="flex flex-wrap items-center gap-1">
            <FilterTab current={filter} value="all" onSelect={setFilter} label={`All (${counts.all})`} />
            <FilterTab current={filter} value="active" onSelect={setFilter} label={`Active (${counts.active})`} />
            <FilterTab current={filter} value="offseason" onSelect={setFilter} label={`Off-season (${counts.offseason})`} />
            <FilterTab current={filter} value="injured" onSelect={setFilter} label={`Injured (${counts.injured})`} />
            <Button size="sm" className="ml-2" onClick={() => setModalOpen(true)}>
              + Add athlete
            </Button>
          </div>
        </div>

        {error && <ErrorMessage message={error} className="mt-4" />}

        {loading ? (
          <div className="p-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
        ) : filtered.length === 0 ? (
          <div
            className="mt-4 rounded-md bg-white p-10 text-center text-sm text-slate-500"
            style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
          >
            No athletes for this filter.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(athlete => (
              <AthleteTile
                key={athlete.id}
                athlete={athlete}
                checkins={metrics.byAthlete.get(athlete.id) ?? []}
              />
            ))}
          </div>
        )}
      </section>

      <AddAthleteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => refresh()}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Tile
// ─────────────────────────────────────────────────────────────────────

function AthleteTile({
  athlete,
  checkins,
}: {
  athlete: AthleteRosterRow;
  checkins: Checkin[];
}) {
  const ordered = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date)).slice(-7);
  const latest = checkins[0] ?? null;
  const previous = checkins[1] ?? null;
  const weightDelta = latest && previous ? Number(latest.weight_kg) - Number(previous.weight_kg) : null;
  const energyTrend = ordered.map(c => c.energy_level);
  const sleepTrend = ordered.map(c => c.sleep_quality);
  const energyAvg = energyTrend.length ? avg(energyTrend) : null;
  const sleepAvg = sleepTrend.length ? avg(sleepTrend) : null;

  return (
    <Link
      to={`/athletes/${athlete.id}`}
      className="rounded-md bg-white p-4 flex flex-col gap-3 hover:bg-[#FAFAF8] transition-colors"
      style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar initials={initialsOf(athlete.full_name)} status={athlete.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[14px] font-medium text-slate-900 truncate">{athlete.full_name}</span>
            <StatusDot status={athlete.status} />
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">{athlete.sport}</div>
        </div>
      </div>

      {/* Weight + delta */}
      <div className="flex items-baseline justify-between border-t pt-3" style={{ borderColor: TOKENS.HAIRLINE }}>
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Poids</div>
          <div className="font-mono tabular-nums text-[18px] text-slate-900">
            {latest ? `${Number(latest.weight_kg).toFixed(1)}` : '—'}
            <span className="text-[11px] text-slate-400 ml-1">kg</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">vs. dernier</div>
          <div className="mt-0.5">
            <TrendArrow delta={weightDelta} unit="kg" digits={1} tone="neg" />
          </div>
        </div>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <TrendBox
          label="Énergie 7j"
          data={energyTrend}
          color={TOKENS.TEAL}
          avgValue={energyAvg}
        />
        <TrendBox
          label="Sommeil 7j"
          data={sleepTrend}
          color="#5B7CC9"
          avgValue={sleepAvg}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{relativeFromNow(latest?.submitted_at)}</span>
        <span className="uppercase tracking-[0.1em] font-medium text-slate-500">
          Open →
        </span>
      </div>
    </Link>
  );
}

function TrendBox({
  label, data, color, avgValue,
}: {
  label: string;
  data: number[];
  color: string;
  avgValue: number | null;
}) {
  return (
    <div className="rounded-md p-2.5" style={{ background: TOKENS.PANEL_BG, border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</span>
        <span className="font-mono tabular-nums text-[11px] text-slate-700">
          {avgValue !== null ? `${avgValue.toFixed(1)}/5` : '—'}
        </span>
      </div>
      <div className="mt-2">
        {data.length >= 2 ? (
          <Sparkline data={data} color={color} width={120} height={24} />
        ) : (
          <div className="h-[24px] flex items-center text-[10px] text-slate-400">
            Données insuffisantes
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Roster metrics — last 7 check-ins per athlete
// ─────────────────────────────────────────────────────────────────────

function useRosterMetrics(athletes: AthleteRosterRow[]) {
  const [metrics, setMetrics] = useState<RosterMetrics>({ byAthlete: new Map() });

  const load = useCallback(async () => {
    if (athletes.length === 0) {
      setMetrics({ byAthlete: new Map() });
      return;
    }
    const timeout = createRequestTimeout();
    try {
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .in('athlete_id', athletes.map(a => a.id))
        .order('checkin_date', { ascending: false })
        .limit(athletes.length * 7)
        .abortSignal(timeout.signal);
      if (error) throw error;
      const byAthlete = new Map<string, Checkin[]>();
      for (const row of (data ?? []) as Checkin[]) {
        const list = byAthlete.get(row.athlete_id) ?? [];
        if (list.length < 7) byAthlete.set(row.athlete_id, [...list, row]);
      }
      setMetrics({ byAthlete });
    } catch (err) {
      // Silent; the page already surfaces athletes-fetch errors.
      void requestErrorMessage(err);
    } finally {
      timeout.clear();
    }
  }, [athletes]);

  useEffect(() => { void load(); }, [load]);

  return { metrics };
}

// ─────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────

function FilterTab({
  current, value, onSelect, label,
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

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function isOverdue(lastCheckinDate: string | null, todayISO: string): boolean {
  if (!lastCheckinDate) return true;
  const diff = (new Date(`${todayISO}T00:00:00`).getTime() - new Date(`${lastCheckinDate}T00:00:00`).getTime()) / 86_400_000;
  return diff >= 2;
}
