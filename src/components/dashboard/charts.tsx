/**
 * Chart primitives tuned to the NutriOps look — hairline gridlines,
 * tabular-num axis labels, no decorative shadow, anchored end-of-line
 * dots when relevant. Built on top of Recharts but overrides Recharts'
 * default stylings so charts feel native to the dashboard kit.
 */

import { useMemo, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { TOKENS } from '@/components/dashboard/kit';

const AXIS_TICK = { fontSize: 11, fill: '#64748b' } as const;
const TOOLTIP_STYLE = {
  fontSize: 11,
  borderRadius: 6,
  border: `1px solid ${TOKENS.HAIRLINE}`,
  background: '#ffffff',
  padding: '6px 8px',
} as const;
const TOOLTIP_LABEL_STYLE = { color: '#0f172a', fontWeight: 600, fontSize: 11 } as const;

// ─────────────────────────────────────────────────────────────────────
// Trend arrow — used for week-over-week deltas
// ─────────────────────────────────────────────────────────────────────

export type ArrowTone = 'pos' | 'neg' | 'mute';

export function TrendArrow({
  delta,
  unit,
  tone,
  digits = 1,
}: {
  delta: number | null;
  unit?: string;
  tone?: ArrowTone | ((delta: number) => ArrowTone);
  digits?: number;
}) {
  if (delta === null || delta === undefined || Number.isNaN(delta)) {
    return <span className="text-[11px] font-mono text-slate-400">—</span>;
  }
  const resolvedTone: ArrowTone =
    typeof tone === 'function'
      ? tone(delta)
      : tone ?? defaultTone(delta);
  const color =
    resolvedTone === 'pos' ? TOKENS.TEAL :
    resolvedTone === 'neg' ? TOKENS.AMBER :
    TOKENS.SLATE;
  const arrow =
    Math.abs(delta) < 1e-6 ? '—' :
    delta > 0 ? '↑' :
    '↓';
  return (
    <span
      className="inline-flex items-center gap-1 font-mono tabular-nums text-[11px]"
      style={{ color }}
    >
      <span className="text-[12px] leading-none">{arrow}</span>
      <span>
        {Math.abs(delta).toFixed(digits)}
        {unit ? ` ${unit}` : ''}
      </span>
    </span>
  );
}

function defaultTone(delta: number): ArrowTone {
  if (Math.abs(delta) < 1e-6) return 'mute';
  return delta > 0 ? 'pos' : 'neg';
}

// ─────────────────────────────────────────────────────────────────────
// Chart frame — section title + responsive height + legend slot
// ─────────────────────────────────────────────────────────────────────

export function ChartFrame({
  title,
  subtitle,
  height = 240,
  legend,
  children,
}: {
  title: string;
  subtitle?: string;
  height?: number;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-md bg-white"
      style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
    >
      <div
        className="px-4 py-3 flex items-baseline justify-between"
        style={{ borderBottom: `1px solid ${TOKENS.HAIRLINE}`, background: TOKENS.PANEL_BG }}
      >
        <div>
          <div className="text-[13px] font-medium text-slate-900">{title}</div>
          {subtitle && <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
        {legend}
      </div>
      <div className="p-3" style={{ height }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Weight curve with WoW deltas — points on Sundays carry an arrow tag
// ─────────────────────────────────────────────────────────────────────

export interface WeightPoint {
  date: string;
  weight: number;
}

export function WeightCurve({ points, height = 240 }: { points: WeightPoint[]; height?: number }) {
  if (points.length === 0) {
    return (
      <EmptyChart message="Aucun poids enregistré pour la période." height={height} />
    );
  }

  const min = Math.min(...points.map(p => p.weight));
  const max = Math.max(...points.map(p => p.weight));
  const padding = Math.max(0.5, (max - min) * 0.1);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={TOKENS.HAIRLINE} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="date" stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} />
        <YAxis
          stroke={TOKENS.HAIRLINE}
          tick={AXIS_TICK}
          tickLine={false}
          domain={[min - padding, max + padding]}
          width={36}
          tickFormatter={(v: number) => v.toFixed(1)}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Poids']}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke={TOKENS.TEAL}
          strokeWidth={2}
          dot={{ r: 2.5, stroke: TOKENS.TEAL, strokeWidth: 1.5, fill: '#fff' }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Recovery composite — energy + sleep + soreness (inverted)
// ─────────────────────────────────────────────────────────────────────

export interface RecoveryPoint {
  date: string;
  energy: number;
  sleep: number;
  soreness: number;
}

export function RecoveryComposite({ points, height = 240 }: { points: RecoveryPoint[]; height?: number }) {
  if (points.length === 0) {
    return <EmptyChart message="Aucun check-in sur la période." height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={TOKENS.HAIRLINE} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="date" stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} />
        <YAxis stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} width={24} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="plainline" />
        <ReferenceLine y={3} stroke={TOKENS.HAIRLINE} strokeDasharray="2 4" />
        <Line type="monotone" dataKey="energy"   name="Énergie"  stroke={TOKENS.TEAL}   strokeWidth={1.75} dot={false} activeDot={{ r: 3 }} />
        <Line type="monotone" dataKey="sleep"    name="Sommeil"  stroke="#5B7CC9"        strokeWidth={1.75} dot={false} activeDot={{ r: 3 }} />
        <Line type="monotone" dataKey="soreness" name="Soreness" stroke={TOKENS.AMBER}   strokeWidth={1.75} dot={false} activeDot={{ r: 3 }} strokeDasharray="3 3" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Training load bars — planned vs actual per day
// ─────────────────────────────────────────────────────────────────────

export interface TrainingLoadPoint {
  date: string;
  planned: number;
  actual: number;
}

export function TrainingLoadBars({ points, height = 240 }: { points: TrainingLoadPoint[]; height?: number }) {
  if (points.length === 0) {
    return <EmptyChart message="Aucune séance pour la période." height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={points} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={TOKENS.HAIRLINE} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="date" stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} />
        <YAxis stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} width={32} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        <Bar dataKey="planned" name="Planifié" fill="#D8D6CF" />
        <Bar dataKey="actual"  name="Réalisé" fill={TOKENS.TEAL} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Nutrition coverage bars — kcal target vs declared meal items
// ─────────────────────────────────────────────────────────────────────

export interface NutritionCoveragePoint {
  date: string;
  target: number;
  declared: number;
}

export function NutritionCoverageBars({ points, height = 240 }: { points: NutritionCoveragePoint[]; height?: number }) {
  if (points.length === 0) {
    return <EmptyChart message="Aucune cible nutritionnelle saisie." height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={points} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={TOKENS.HAIRLINE} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="date" stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} />
        <YAxis stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} width={36} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        <Bar dataKey="declared" name="Repas déclarés (kcal)" fill={TOKENS.TEAL} />
        <Line type="monotone" dataKey="target" name="Cible (kcal)" stroke={TOKENS.AMBER} strokeWidth={2} dot={{ r: 2.5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Priority 2 reusable charts — public dashboard API
// ─────────────────────────────────────────────────────────────────────

export function WeightProgressChart({ points, height = 240 }: { points: WeightPoint[]; height?: number }) {
  return <WeightCurve points={points} height={height} />;
}

export interface AdherencePoint {
  date: string;
  training: number;
  nutrition: number;
}

export function AdherenceChart({ points, height = 240 }: { points: AdherencePoint[]; height?: number }) {
  if (points.length === 0) {
    return <EmptyChart message="Aucune donnée d'adhérence sur la période." height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={TOKENS.HAIRLINE} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="date" stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} />
        <YAxis stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} domain={[0, 100]} width={34} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} formatter={(value: number) => [`${value}%`, '']} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="plainline" />
        <ReferenceLine y={70} stroke={TOKENS.AMBER} strokeDasharray="3 3" />
        <Line type="monotone" dataKey="training" name="Entraînement" stroke={TOKENS.TEAL} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
        <Line type="monotone" dataKey="nutrition" name="Nutrition" stroke={TOKENS.AMBER} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface EnergySleepPoint {
  date: string;
  energy: number;
  sleep: number;
}

export function EnergySleepChart({ points, height = 240 }: { points: EnergySleepPoint[]; height?: number }) {
  if (points.length === 0) {
    return <EmptyChart message="Aucune donnée énergie/sommeil." height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={TOKENS.HAIRLINE} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="date" stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} />
        <YAxis stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} width={24} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="plainline" />
        <Line type="monotone" dataKey="energy" name="Énergie" stroke={TOKENS.TEAL} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
        <Line type="monotone" dataKey="sleep" name="Sommeil" stroke="#5B7CC9" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface PerformancePoint {
  date: string;
  exercise: string;
  load: number;
  rpe?: number | null;
}

export function PerformanceChart({ points, height = 240 }: { points: PerformancePoint[]; height?: number }) {
  if (points.length === 0) {
    return <EmptyChart message="Aucune performance d'exercice disponible." height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={TOKENS.HAIRLINE} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="date" stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} />
        <YAxis stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} width={34} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          formatter={(value: number, key: string) => [key === 'load' ? `${value} kg` : value, key === 'load' ? 'Charge' : 'RPE']}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="plainline" />
        <Line type="monotone" dataKey="load" name="Charge" stroke={TOKENS.TEAL} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 3 }} />
        <Line type="monotone" dataKey="rpe" name="RPE" stroke={TOKENS.AMBER} strokeWidth={1.75} dot={false} strokeDasharray="3 3" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface CheckInTrendPoint {
  date: string;
  energy: number;
  sleep: number;
  stress: number;
  soreness: number;
  motivation: number;
}

export function CheckInTrendChart({ points, height = 260 }: { points: CheckInTrendPoint[]; height?: number }) {
  if (points.length === 0) {
    return <EmptyChart message="Aucune tendance de check-in disponible." height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={TOKENS.HAIRLINE} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="date" stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} />
        <YAxis stroke={TOKENS.HAIRLINE} tick={AXIS_TICK} tickLine={false} domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} width={24} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="plainline" />
        <Line type="monotone" dataKey="energy" name="Énergie" stroke={TOKENS.TEAL} strokeWidth={1.75} dot={false} />
        <Line type="monotone" dataKey="sleep" name="Sommeil" stroke="#5B7CC9" strokeWidth={1.75} dot={false} />
        <Line type="monotone" dataKey="stress" name="Stress" stroke="#B5478B" strokeWidth={1.75} dot={false} />
        <Line type="monotone" dataKey="soreness" name="Soreness" stroke={TOKENS.AMBER} strokeWidth={1.75} dot={false} />
        <Line type="monotone" dataKey="motivation" name="Motivation" stroke={TOKENS.SLATE} strokeWidth={1.75} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Correlation scatter — generic (x, y, size?) plot
// ─────────────────────────────────────────────────────────────────────

export interface CorrelationPoint {
  x: number;
  y: number;
  z?: number;
  label?: string;
}

export function CorrelationScatter({
  points, xLabel, yLabel, height = 220,
}: {
  points: CorrelationPoint[];
  xLabel: string;
  yLabel: string;
  height?: number;
}) {
  if (points.length === 0) {
    return <EmptyChart message="Données insuffisantes pour cette corrélation." height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 16, right: 16, left: 0, bottom: 24 }}>
        <CartesianGrid stroke={TOKENS.HAIRLINE} strokeDasharray="2 4" />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          stroke={TOKENS.HAIRLINE}
          tick={AXIS_TICK}
          tickLine={false}
          label={{ value: xLabel, position: 'insideBottom', offset: -8, fontSize: 11, fill: '#64748b' }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          stroke={TOKENS.HAIRLINE}
          tick={AXIS_TICK}
          tickLine={false}
          width={36}
          label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
        />
        <ZAxis type="number" dataKey="z" range={[40, 240]} />
        <Tooltip
          cursor={{ stroke: TOKENS.HAIRLINE, strokeDasharray: '2 4' }}
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          formatter={(value: number, key: string) => [Math.round(value * 100) / 100, key]}
        />
        <Scatter
          data={points}
          fill={TOKENS.TEAL}
          fillOpacity={0.55}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Pearson correlation helper
// ─────────────────────────────────────────────────────────────────────

export function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const ex = xs[i] - meanX;
    const ey = ys[i] - meanY;
    num += ex * ey;
    dx += ex * ex;
    dy += ey * ey;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

export function describeCorrelation(r: number | null): { label: string; tone: ArrowTone } {
  if (r === null) return { label: 'données insuffisantes', tone: 'mute' };
  const a = Math.abs(r);
  const direction = r >= 0 ? 'positive' : 'négative';
  if (a < 0.15) return { label: 'corrélation faible', tone: 'mute' };
  if (a < 0.4)  return { label: `corrélation ${direction} modérée`, tone: r >= 0 ? 'pos' : 'neg' };
  return { label: `corrélation ${direction} forte`, tone: r >= 0 ? 'pos' : 'neg' };
}

// Memo helper to align sequences by date (intersect)
export function useAlignedSeries<A extends { date: string }, B extends { date: string }>(
  a: A[],
  b: B[],
): Array<{ date: string; a: A; b: B }> {
  return useMemo(() => {
    const byDateB = new Map(b.map(item => [item.date, item]));
    return a
      .map(item => {
        const match = byDateB.get(item.date);
        return match ? { date: item.date, a: item, b: match } : null;
      })
      .filter((row): row is { date: string; a: A; b: B } => row !== null);
  }, [a, b]);
}

// ─────────────────────────────────────────────────────────────────────
// Empty state placeholder
// ─────────────────────────────────────────────────────────────────────

export function EmptyChart({ message, height }: { message: string; height: number }) {
  return (
    <div
      className="flex items-center justify-center text-[12px] text-slate-400"
      style={{ height, border: `1px dashed ${TOKENS.HAIRLINE}`, borderRadius: 6 }}
    >
      {message}
    </div>
  );
}
