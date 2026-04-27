/**
 * Rich progression view for a single athlete.
 *
 * Displays — in this order:
 *   1. Period selector (4w / 8w / 12w / 24w)
 *   2. KPI band with week-over-week deltas (weight, energy, sleep, RPE,
 *      training load, calorie adherence) — each with an up/down arrow
 *   3. Weight curve over the period
 *   4. Recovery composite (energy / sleep / soreness)
 *   5. Training load planned vs actual (bars) + RPE moving avg
 *   6. Nutrition coverage (kcal target vs declared meal items)
 *   7. Two correlation scatters surfaced as insights
 *   8. Weekly summary table — every line carries an arrow
 */

import { useMemo, useState } from 'react';
import { addDays, format, parseISO, startOfISOWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CorrelationScatter,
  ChartFrame,
  EmptyChart,
  NutritionCoverageBars,
  RecoveryComposite,
  TrainingLoadBars,
  TrendArrow,
  WeightCurve,
  describeCorrelation,
  pearson,
  type CorrelationPoint,
} from '@/components/dashboard/charts';
import { FilterChip, TOKENS } from '@/components/dashboard/kit';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useAthleteProgressData } from '@/hooks/useAthleteProgressData';
import type { Checkin, DailyNutritionTarget, TrainingSession } from '@/types/database';

interface Props {
  athleteId: string;
}

const PERIODS = [4, 8, 12, 24] as const;
type Period = typeof PERIODS[number];

export function AthleteProgress({ athleteId }: Props) {
  const [period, setPeriod] = useState<Period>(12);
  const today = useMemo(() => new Date(), []);
  const periodStart = useMemo(() => addDays(startOfISOWeek(today), -7 * (period - 1)), [period, today]);
  const { checkins, sessions, targets, mealItems, loading, error } = useAthleteProgressData(athleteId, period);

  // ───── Filter & sort (the hook already returns rows >= periodStart)
  const inPeriod = useMemo(() => ({
    checkins: [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date)),
    sessions,
    targets,
  }), [checkins, sessions, targets]);

  // ───── Aggregate data series for charts
  const weightSeries = useMemo(
    () => inPeriod.checkins.map(c => ({ date: format(parseISO(c.checkin_date), 'dd/MM'), weight: Number(c.weight_kg) })),
    [inPeriod.checkins],
  );

  const recoverySeries = useMemo(
    () => inPeriod.checkins.map(c => ({
      date: format(parseISO(c.checkin_date), 'dd/MM'),
      energy: c.energy_level,
      sleep: c.sleep_quality,
      soreness: c.soreness_level ?? 0,
    })),
    [inPeriod.checkins],
  );

  const trainingLoadSeries = useMemo(() => {
    const byDate = new Map<string, { planned: number; actual: number }>();
    for (const s of inPeriod.sessions) {
      const cur = byDate.get(s.session_date) ?? { planned: 0, actual: 0 };
      const planned = (s.planned_duration_min ?? 0) * (s.planned_intensity ?? 0);
      const actual = s.internal_load
        ?? ((s.actual_duration_min ?? 0) * (s.rpe ?? 0));
      byDate.set(s.session_date, {
        planned: cur.planned + planned,
        actual:  cur.actual + actual,
      });
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date: format(parseISO(date), 'dd/MM'), ...v }));
  }, [inPeriod.sessions]);

  const nutritionSeries = useMemo(() => {
    // Sum meal item kcals per target_id
    const declaredByTargetId = new Map<string, number>();
    for (const item of mealItems) {
      declaredByTargetId.set(item.target_id, (declaredByTargetId.get(item.target_id) ?? 0) + item.calories);
    }
    return inPeriod.targets
      .sort((a, b) => a.target_date.localeCompare(b.target_date))
      .map(t => ({
        date: format(parseISO(t.target_date), 'dd/MM'),
        target: t.calories,
        declared: declaredByTargetId.get(t.id) ?? 0,
      }));
  }, [inPeriod.targets, mealItems]);

  // ───── Weekly KPIs with WoW deltas
  const kpis = useMemo(() => computeWoWKpis(inPeriod.checkins, inPeriod.sessions), [inPeriod.checkins, inPeriod.sessions]);

  // ───── Weekly summary rows
  const weeklyRows = useMemo(
    () => buildWeeklySummary(inPeriod.checkins, inPeriod.sessions, inPeriod.targets),
    [inPeriod.checkins, inPeriod.sessions, inPeriod.targets],
  );

  // ───── Correlations
  const correlations = useMemo(() => buildCorrelations(inPeriod.checkins, inPeriod.sessions), [inPeriod.checkins, inPeriod.sessions]);

  return (
    <div className="flex flex-col gap-6">
      {/* Period switch */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">Période</span>
        {PERIODS.map(p => (
          <FilterChip key={p} active={p === period} onClick={() => setPeriod(p)}>
            {p} sem
          </FilterChip>
        ))}
        <span className="text-[11px] text-slate-400 ml-auto">
          Depuis {format(periodStart, 'dd MMM yyyy', { locale: fr })}
        </span>
      </div>

      {error && <ErrorMessage message={error} />}
      {loading && (
        <div className="py-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
      )}

      {/* KPI band — WoW deltas */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-px rounded-md overflow-hidden"
        style={{ background: TOKENS.HAIRLINE }}
      >
        <DeltaTile label="Poids" value={kpis.weight.value} unit="kg" delta={kpis.weight.delta} digits={1} bigger="neg" />
        <DeltaTile label="Énergie moy." value={kpis.energy.value} unit="/5" delta={kpis.energy.delta} digits={1} bigger="pos" />
        <DeltaTile label="Sommeil moy." value={kpis.sleep.value} unit="/5" delta={kpis.sleep.delta} digits={1} bigger="pos" />
        <DeltaTile label="Soreness moy." value={kpis.soreness.value} unit="/5" delta={kpis.soreness.delta} digits={1} bigger="neg" />
        <DeltaTile label="RPE moy." value={kpis.rpe.value} unit="/10" delta={kpis.rpe.delta} digits={1} bigger="neg" />
        <DeltaTile label="Charge sem." value={kpis.load.value} unit="" delta={kpis.load.delta} digits={0} bigger="pos" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartFrame title="Poids" subtitle="Courbe sur la période sélectionnée">
          <WeightCurve points={weightSeries} />
        </ChartFrame>
        <ChartFrame title="Récupération" subtitle="Énergie · sommeil · soreness (1–5)">
          <RecoveryComposite points={recoverySeries} />
        </ChartFrame>
        <ChartFrame title="Charge entraînement" subtitle="Planifié vs réalisé (durée × intensité)">
          <TrainingLoadBars points={trainingLoadSeries} />
        </ChartFrame>
        <ChartFrame title="Couverture nutrition" subtitle="Repas déclarés vs cible kcal">
          <NutritionCoverageBars points={nutritionSeries} />
        </ChartFrame>
      </div>

      {/* Correlations */}
      <CorrelationsBlock data={correlations} />

      {/* Weekly summary */}
      <Card>
        <CardHeader>
          <CardTitle>Synthèse hebdomadaire</CardTitle>
          <span className="text-[11px] text-slate-500">Flèches = delta vs semaine précédente</span>
        </CardHeader>
        <CardBody className="p-0">
          <WeeklySummaryTable rows={weeklyRows} />
        </CardBody>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// KPI tile with delta arrow
// ─────────────────────────────────────────────────────────────────────

function DeltaTile({
  label, value, unit, delta, digits, bigger,
}: {
  label: string;
  value: number | null;
  unit: string;
  delta: number | null;
  digits: number;
  /** Direction of "good": pos = up arrow is good, neg = down arrow is good. */
  bigger: 'pos' | 'neg';
}) {
  const tone =
    delta === null ? 'mute' :
    Math.abs(delta) < 1e-6 ? 'mute' :
    bigger === 'pos'
      ? (delta > 0 ? 'pos' : 'neg')
      : (delta > 0 ? 'neg' : 'pos');

  return (
    <div className="bg-white px-4 py-3 flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500 truncate">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[22px] font-mono tabular-nums leading-none text-slate-900">
          {value !== null ? value.toFixed(digits) : '—'}
        </span>
        {value !== null && unit && <span className="text-[11px] text-slate-400">{unit}</span>}
      </div>
      <TrendArrow delta={delta} unit={unit.replace('/', '')} tone={tone as 'pos' | 'neg' | 'mute'} digits={digits} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Correlations block
// ─────────────────────────────────────────────────────────────────────

interface BuiltCorrelation {
  title: string;
  xLabel: string;
  yLabel: string;
  points: CorrelationPoint[];
  r: number | null;
}

function CorrelationsBlock({ data }: { data: BuiltCorrelation[] }) {
  if (data.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Corrélations clés</CardTitle>
        <span className="text-[11px] text-slate-500">Coefficient de Pearson</span>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.map(c => {
            const desc = describeCorrelation(c.r);
            const color =
              desc.tone === 'pos' ? TOKENS.TEAL :
              desc.tone === 'neg' ? TOKENS.AMBER :
              TOKENS.SLATE;
            return (
              <div key={c.title} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <div className="text-[13px] font-medium text-slate-900">{c.title}</div>
                  <div className="text-[11px] font-mono tabular-nums" style={{ color }}>
                    r = {c.r !== null ? c.r.toFixed(2) : '—'} · {desc.label}
                  </div>
                </div>
                <CorrelationScatter points={c.points} xLabel={c.xLabel} yLabel={c.yLabel} />
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Weekly summary table
// ─────────────────────────────────────────────────────────────────────

interface WeeklyRow {
  weekStart: string;
  weight: number | null;
  weightDelta: number | null;
  energy: number | null;
  energyDelta: number | null;
  sleep: number | null;
  sleepDelta: number | null;
  rpe: number | null;
  rpeDelta: number | null;
  load: number;
  loadDelta: number | null;
  calorieAdherence: number | null; // 0..1+
  calorieAdherenceDelta: number | null;
}

function WeeklySummaryTable({ rows }: { rows: WeeklyRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="p-6 text-center text-[13px] text-slate-500">
        Pas assez de données pour la période sélectionnée.
      </div>
    );
  }
  const cols = '120px repeat(6, minmax(120px, 1fr))';
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[840px]">
        <div
          className="grid items-center px-5 h-10 text-[10px] uppercase tracking-[0.12em] text-slate-500 font-medium"
          style={{ gridTemplateColumns: cols, borderBottom: `1px solid ${TOKENS.HAIRLINE}`, background: TOKENS.PANEL_BG }}
        >
          <div>Semaine</div>
          <div>Poids</div>
          <div>Énergie</div>
          <div>Sommeil</div>
          <div>RPE</div>
          <div>Charge</div>
          <div>Adhérence kcal</div>
        </div>
        {rows.map((row, i) => (
          <div
            key={row.weekStart}
            className="grid items-center px-5 h-[58px] text-[13px]"
            style={{
              gridTemplateColumns: cols,
              borderBottom: i === rows.length - 1 ? undefined : `1px solid ${TOKENS.HAIRLINE}`,
            }}
          >
            <div className="font-mono tabular-nums text-[12px] text-slate-700">
              {format(parseISO(row.weekStart), 'dd MMM', { locale: fr })}
            </div>
            <CellWithDelta value={row.weight !== null ? row.weight.toFixed(1) : '—'} suffix="kg" delta={row.weightDelta} digits={1} direction="neg" />
            <CellWithDelta value={row.energy !== null ? row.energy.toFixed(1) : '—'} suffix="/5" delta={row.energyDelta} digits={1} direction="pos" />
            <CellWithDelta value={row.sleep !== null ? row.sleep.toFixed(1) : '—'} suffix="/5" delta={row.sleepDelta} digits={1} direction="pos" />
            <CellWithDelta value={row.rpe !== null ? row.rpe.toFixed(1) : '—'} suffix="/10" delta={row.rpeDelta} digits={1} direction="neg" />
            <CellWithDelta value={String(row.load)} delta={row.loadDelta} digits={0} direction="pos" />
            <CellWithDelta
              value={row.calorieAdherence !== null ? `${Math.round(row.calorieAdherence * 100)}%` : '—'}
              delta={row.calorieAdherenceDelta !== null ? row.calorieAdherenceDelta * 100 : null}
              digits={0}
              suffix="%"
              direction="pos"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CellWithDelta({
  value, suffix, delta, digits, direction,
}: {
  value: string;
  suffix?: string;
  delta: number | null;
  digits: number;
  direction: 'pos' | 'neg';
}) {
  const tone =
    delta === null || Math.abs(delta) < 1e-6 ? 'mute' :
    direction === 'pos' ? (delta > 0 ? 'pos' : 'neg') :
    (delta > 0 ? 'neg' : 'pos');
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-mono tabular-nums text-slate-900">
        {value}{suffix && value !== '—' ? <span className="text-[11px] text-slate-400 ml-0.5">{suffix}</span> : null}
      </span>
      <TrendArrow delta={delta} digits={digits} tone={tone as 'pos' | 'neg' | 'mute'} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Aggregation helpers
// ─────────────────────────────────────────────────────────────────────

function avg(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (filtered.length === 0) return null;
  return filtered.reduce((s, v) => s + v, 0) / filtered.length;
}

function weekKey(date: string): string {
  return format(startOfISOWeek(parseISO(date)), 'yyyy-MM-dd');
}

function groupByWeek<T>(items: T[], dateOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const k = weekKey(dateOf(it));
    map.set(k, [...(map.get(k) ?? []), it]);
  }
  return map;
}

function computeWoWKpis(checkins: Checkin[], sessions: TrainingSession[]) {
  const weeksCheckins = groupByWeek(checkins, c => c.checkin_date);
  const weeksSessions = groupByWeek(sessions, s => s.session_date);
  const sortedWeeks = Array.from(new Set([...weeksCheckins.keys(), ...weeksSessions.keys()])).sort();

  if (sortedWeeks.length === 0) {
    const empty = { value: null, delta: null };
    return { weight: empty, energy: empty, sleep: empty, soreness: empty, rpe: empty, load: empty };
  }

  const lastWeek = sortedWeeks[sortedWeeks.length - 1];
  const prevWeek = sortedWeeks.length >= 2 ? sortedWeeks[sortedWeeks.length - 2] : null;

  const summarize = (week: string | null) => {
    if (!week) return null;
    const cs = weeksCheckins.get(week) ?? [];
    const ss = weeksSessions.get(week) ?? [];
    return {
      weight:   avg(cs.map(c => Number(c.weight_kg))),
      energy:   avg(cs.map(c => c.energy_level)),
      sleep:    avg(cs.map(c => c.sleep_quality)),
      soreness: avg(cs.map(c => c.soreness_level)),
      rpe:      avg(ss.map(s => s.rpe)),
      load:     ss.reduce((sum, s) => sum + (s.internal_load ?? ((s.planned_duration_min ?? 0) * (s.planned_intensity ?? 0))), 0),
    };
  };
  const cur = summarize(lastWeek)!;
  const prev = summarize(prevWeek);
  const delta = (curV: number | null, prevV: number | null | undefined) =>
    curV === null || prevV === null || prevV === undefined ? null : curV - prevV;

  return {
    weight:   { value: cur.weight,   delta: delta(cur.weight,   prev?.weight) },
    energy:   { value: cur.energy,   delta: delta(cur.energy,   prev?.energy) },
    sleep:    { value: cur.sleep,    delta: delta(cur.sleep,    prev?.sleep) },
    soreness: { value: cur.soreness, delta: delta(cur.soreness, prev?.soreness) },
    rpe:      { value: cur.rpe,      delta: delta(cur.rpe,      prev?.rpe) },
    load:     { value: cur.load,     delta: prev ? cur.load - prev.load : null },
  };
}

function buildWeeklySummary(
  checkins: Checkin[],
  sessions: TrainingSession[],
  targets: DailyNutritionTarget[],
): WeeklyRow[] {
  const weeksCheckins = groupByWeek(checkins, c => c.checkin_date);
  const weeksSessions = groupByWeek(sessions, s => s.session_date);
  const weeksTargets = groupByWeek(targets, t => t.target_date);
  const allWeeks = Array.from(new Set([
    ...weeksCheckins.keys(),
    ...weeksSessions.keys(),
    ...weeksTargets.keys(),
  ])).sort();

  const rows: WeeklyRow[] = [];
  for (const week of allWeeks) {
    const cs = weeksCheckins.get(week) ?? [];
    const ss = weeksSessions.get(week) ?? [];
    const ts = weeksTargets.get(week) ?? [];

    const calorieTargetSum = ts.reduce((s, t) => s + t.calories, 0);
    // Adherence approximated by proportion of days where the athlete declared
    // checkin's nutrition_adherence. Map 'low'->0.5, 'medium'->0.85, 'high'->1.
    const adhMap = { low: 0.5, medium: 0.85, high: 1 } as const;
    const declaredScores = cs
      .map(c => (c.nutrition_adherence ? adhMap[c.nutrition_adherence] : null))
      .filter((v): v is number => v !== null);
    const calorieAdherence = declaredScores.length > 0
      ? avg(declaredScores)
      : (calorieTargetSum > 0 ? null : null);

    rows.push({
      weekStart: week,
      weight:   avg(cs.map(c => Number(c.weight_kg))),
      weightDelta: null,
      energy:   avg(cs.map(c => c.energy_level)),
      energyDelta: null,
      sleep:    avg(cs.map(c => c.sleep_quality)),
      sleepDelta: null,
      rpe:      avg(ss.map(s => s.rpe)),
      rpeDelta: null,
      load:     ss.reduce((s, sess) => s + (sess.internal_load ?? ((sess.planned_duration_min ?? 0) * (sess.planned_intensity ?? 0))), 0),
      loadDelta: null,
      calorieAdherence,
      calorieAdherenceDelta: null,
    });
  }

  // Inject deltas (current - previous)
  for (let i = 1; i < rows.length; i++) {
    const cur = rows[i];
    const prev = rows[i - 1];
    cur.weightDelta = cur.weight !== null && prev.weight !== null ? cur.weight - prev.weight : null;
    cur.energyDelta = cur.energy !== null && prev.energy !== null ? cur.energy - prev.energy : null;
    cur.sleepDelta  = cur.sleep !== null && prev.sleep !== null ? cur.sleep - prev.sleep : null;
    cur.rpeDelta    = cur.rpe !== null && prev.rpe !== null ? cur.rpe - prev.rpe : null;
    cur.loadDelta   = cur.load - prev.load;
    cur.calorieAdherenceDelta = cur.calorieAdherence !== null && prev.calorieAdherence !== null
      ? cur.calorieAdherence - prev.calorieAdherence
      : null;
  }

  // Show most recent first
  return rows.reverse();
}

function buildCorrelations(checkins: Checkin[], sessions: TrainingSession[]): BuiltCorrelation[] {
  // 1. Sleep vs energy (same day) — high correlation expected
  const sleepEnergy: CorrelationPoint[] = checkins.map(c => ({
    x: c.sleep_quality,
    y: c.energy_level,
    z: 1,
  }));
  const rSleepEnergy = pearson(
    sleepEnergy.map(p => p.x),
    sleepEnergy.map(p => p.y),
  );

  // 2. Training load (same day) vs next-day soreness
  const sessionLoadByDate = new Map<string, number>();
  for (const s of sessions) {
    const load = s.internal_load ?? ((s.planned_duration_min ?? 0) * (s.planned_intensity ?? 0));
    sessionLoadByDate.set(s.session_date, (sessionLoadByDate.get(s.session_date) ?? 0) + load);
  }
  const checkinByDate = new Map(checkins.map(c => [c.checkin_date, c]));
  const loadVsSoreness: CorrelationPoint[] = [];
  for (const [date, load] of sessionLoadByDate.entries()) {
    if (load <= 0) continue;
    const next = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
    const ck = checkinByDate.get(next);
    if (!ck || ck.soreness_level === null || ck.soreness_level === undefined) continue;
    loadVsSoreness.push({ x: load, y: ck.soreness_level, z: 1 });
  }
  const rLoadSoreness = pearson(
    loadVsSoreness.map(p => p.x),
    loadVsSoreness.map(p => p.y),
  );

  return [
    {
      title: 'Sommeil ↔ énergie (même jour)',
      xLabel: 'Sommeil (1–5)',
      yLabel: 'Énergie (1–5)',
      points: sleepEnergy,
      r: rSleepEnergy,
    },
    {
      title: 'Charge d\'entraînement ↔ soreness J+1',
      xLabel: 'Charge interne',
      yLabel: 'Soreness J+1 (1–5)',
      points: loadVsSoreness,
      r: rLoadSoreness,
    },
  ];
}

// Re-export EmptyChart so callers don't need a second import.
export { EmptyChart };
