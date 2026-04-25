import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AddAthleteModal } from '@/components/AddAthleteModal';
import {
  Avatar,
  FilterChip,
  KPICard,
  SectionLabel,
  StatusDot,
  TOKENS,
  initialsOf,
} from '@/components/dashboard/kit';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useAthletes } from '@/hooks/useAthletes';
import { isoDate, relativeFromNow } from '@/lib/utils';
import type { AthleteRosterRow, AthleteStatus } from '@/types/database';

type Filter = 'all' | AthleteStatus;

export function AthletesPage() {
  const { athletes, loading, error, refresh } = useAthletes();
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

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionLabel index="01" title="Roster overview" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px mt-4 rounded-md overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
          <KPICard label="Total athletes" value={athletes.length} subline="Managed in this workspace" />
          <KPICard label="Active" value={counts.active} subline="Currently in performance block" />
          <KPICard label="Off-season" value={counts.offseason} subline="Reduced load or transition" />
          <KPICard label="Checked in today" value={`${checkedInToday}/${athletes.length}`} subline="Daily check-in submitted" progress={athletes.length ? checkedInToday / athletes.length : 0} />
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

        <div
          className="mt-4 bg-white rounded-md overflow-hidden"
          style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
        >
          {loading ? (
            <div className="p-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No athletes for this filter.</div>
          ) : (
            <AthletesGrid athletes={filtered} />
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

function AthletesGrid({ athletes }: { athletes: AthleteRosterRow[] }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2">
      {athletes.map((athlete, index) => (
        <AthleteTile
          key={athlete.id}
          athlete={athlete}
          last={index === athletes.length - 1}
          rightEdge={index % 2 === 0}
        />
      ))}
    </div>
  );
}

function AthleteTile({
  athlete,
  last,
  rightEdge,
}: {
  athlete: AthleteRosterRow;
  last: boolean;
  rightEdge: boolean;
}) {
  return (
    <Link
      to={`/athletes/${athlete.id}`}
      className="p-5 flex items-start gap-4 hover:bg-[#FAFAF8] transition-colors"
      style={{
        borderRight: rightEdge ? `1px solid ${TOKENS.HAIRLINE}` : undefined,
        borderBottom: last ? undefined : `1px solid ${TOKENS.HAIRLINE}`,
      }}
    >
      <Avatar initials={initialsOf(athlete.full_name)} status={athlete.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[14px] font-medium text-slate-900 truncate">{athlete.full_name}</div>
            <div className="mt-0.5 text-[12px] text-slate-500 truncate">{athlete.sport}</div>
          </div>
          <StatusDot status={athlete.status} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
          <Metric label="Weight" value={athlete.last_checkin ? `${Number(athlete.last_checkin.weight_kg).toFixed(1)} kg` : '—'} />
          <Metric label="Check-in" value={relativeFromNow(athlete.last_checkin?.submitted_at)} />
          <Metric label="Goal" value={athlete.goal || '—'} />
        </div>
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 text-[12px] text-slate-700 truncate">{value}</div>
    </div>
  );
}
