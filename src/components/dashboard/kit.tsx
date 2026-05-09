/**
 * Shared design primitives for the dashboard shell.
 * Used by both the live page (/dashboard) and the static
 * design preview (/design). The look & feel lives here so
 * the two consumers cannot drift.
 */

import type { ComponentType, ReactNode } from 'react';
import type { AthleteStatus } from '@/types/database';

// ─────────────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────────────

export const TOKENS = {
  TEAL:        '#1D9E75',
  AMBER:       '#C2772A',
  CRITICAL:    '#B5335A',
  CRITICAL_BG: '#FBEDF1',
  WARNING_BG:  '#FBF1E5',
  SLATE:       '#6B7280',
  HAIRLINE:    '#EAE9E5',
  BG:          '#F5F5F3',
  PANEL_BG:    '#FAFAF8',
} as const;

// ─────────────────────────────────────────────────────────────────────
// Sparkline
// ─────────────────────────────────────────────────────────────────────

export function Sparkline({
  data,
  color,
  width = 64,
  height = 22,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div
        className="h-[2px] rounded-full"
        style={{ width, background: TOKENS.HAIRLINE }}
        aria-label="Pas assez de données"
      />
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const path = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const [px, py] = points[points.length - 2];
  const [lx, ly] = points[points.length - 1];
  const tipPath = `M${px.toFixed(1)},${py.toFixed(1)} L${lx.toFixed(1)},${ly.toFixed(1)}`;

  return (
    <svg width={width} height={height} className="overflow-visible block" aria-hidden>
      <path d={path} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={tipPath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={2.25} fill={color} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Status dot + Avatar
// ─────────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<AthleteStatus, { color: string; label: string }> = {
  active:    { color: TOKENS.TEAL,  label: 'Active' },
  offseason: { color: TOKENS.SLATE, label: 'Off-season' },
  injured:   { color: TOKENS.AMBER, label: 'Injured' },
};

export function StatusDot({ status }: { status: AthleteStatus }) {
  const { color, label } = STATUS_MAP[status];
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[12px] text-slate-700">{label}</span>
    </span>
  );
}

export function Avatar({ initials, status }: { initials: string; status?: AthleteStatus }) {
  const ring =
    status === 'injured' ? 'ring-1 ring-[#C2772A]/40' :
    status === 'offseason' ? 'ring-1 ring-slate-300' :
    'ring-1 ring-[#1D9E75]/30';
  return (
    <div
      className={`w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-[11px] font-medium text-slate-700 ${ring}`}
    >
      {initials}
    </div>
  );
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────

export type NavKind = 'dashboard' | 'athletes' | 'plans' | 'reports' | 'integrations' | 'settings';
export type AlertKind =
  | 'missed'    // legacy — overdue check-in
  | 'weight'    // weight variation
  | 'energy'    // legacy — recovery low
  | 'recovery'  // sleep / soreness / energy
  | 'nutrition' // missing target / low adherence
  | 'training'  // missed/modified session, soreness vs intense
  | 'adherence';// no check-in submitted today

export type AlertSeverityLevel = 'info' | 'warning' | 'critical';

export const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  missed:    'Check-in manquant',
  weight:    'Variation de poids',
  energy:    'Récupération basse',
  recovery:  'Récupération',
  nutrition: 'Nutrition',
  training:  'Entraînement',
  adherence: 'Adhérence',
};

export function NavIcon({ kind }: { kind: NavKind }) {
  const c = { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'dashboard':
      return (
        <svg {...c} viewBox="0 0 16 16">
          <rect x="2" y="2" width="5" height="6" rx="1" />
          <rect x="9" y="2" width="5" height="3" rx="1" />
          <rect x="9" y="7" width="5" height="7" rx="1" />
          <rect x="2" y="10" width="5" height="4" rx="1" />
        </svg>
      );
    case 'athletes':
      return (
        <svg {...c} viewBox="0 0 16 16">
          <circle cx="6" cy="5.5" r="2.25" />
          <path d="M2 13.5c0-2.2 1.8-4 4-4s4 1.8 4 4" />
          <circle cx="11.5" cy="6" r="1.75" />
          <path d="M10 13.5c0-1.8 1.3-3.3 3-3.7" />
        </svg>
      );
    case 'plans':
      return (
        <svg {...c} viewBox="0 0 16 16">
          <rect x="3" y="2.5" width="10" height="11" rx="1.25" />
          <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
        </svg>
      );
    case 'reports':
      return (
        <svg {...c} viewBox="0 0 16 16">
          <path d="M3.5 2.5h6L12.5 5.5v8a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" />
          <path d="M9.5 2.5v3h3" />
          <path d="M5.5 9.5l1.5 1.5 2.5-3" />
        </svg>
      );
    case 'integrations':
      return (
        <svg {...c} viewBox="0 0 16 16">
          <path d="M6.5 4.5H5a3.5 3.5 0 0 0 0 7h1.5" />
          <path d="M9.5 4.5H11a3.5 3.5 0 0 1 0 7H9.5" />
          <path d="M5.75 8h4.5" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...c} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="2.25" />
          <path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7L3.4 3.4" />
        </svg>
      );
  }
}

export function AlertIcon({ type }: { type: AlertKind }) {
  const c = { width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'missed':
      return (
        <svg {...c} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4.5V8l2 1.5" />
        </svg>
      );
    case 'weight':
      return (
        <svg {...c} viewBox="0 0 16 16">
          <path d="M8 2.5v9" />
          <path d="M5 8.5l3 3 3-3" />
        </svg>
      );
    case 'energy':
      return (
        <svg {...c} viewBox="0 0 16 16">
          <path d="M9 2L4 9h3.5L7 14l5-7H8.5L9 2z" />
        </svg>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────
// Section header / KPI / chip
// ─────────────────────────────────────────────────────────────────────

export function SectionLabel({
  index, title, count,
}: { index: string; title: string; count?: number }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-[10px] tabular-nums text-slate-400 tracking-[0.1em]">
        {index}
      </span>
      <h2 className="text-[15px] font-medium text-slate-900 tracking-tight">{title}</h2>
      {typeof count === 'number' && (
        <span className="font-mono text-[11px] tabular-nums text-slate-400">{count}</span>
      )}
    </div>
  );
}

export function KPICard({
  label, value, subline, delta, progress, badge,
}: {
  label: string;
  value: string | number;
  subline?: string;
  delta?: { value: string; tone: 'pos' | 'neg' | 'mute'; text: string };
  progress?: number;
  badge?: string;
}) {
  const deltaColor =
    delta?.tone === 'pos' ? TOKENS.TEAL :
    delta?.tone === 'neg' ? TOKENS.AMBER :
    TOKENS.SLATE;
  return (
    <div className="bg-white px-6 pt-5 pb-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-medium">
          {label}
        </span>
        {badge && (
          <span className="text-[9px] uppercase tracking-[0.14em] text-slate-400 font-medium">
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="text-[36px] font-mono font-medium tabular-nums leading-none text-slate-900"
          style={{ fontFeatureSettings: '"tnum"' }}
        >
          {value}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 mt-auto pt-1">
        <span className="text-[11px] text-slate-500 truncate">{subline ?? ''}</span>
        {delta && (
          <span className="flex items-center gap-1 text-[11px] font-mono tabular-nums">
            <span style={{ color: deltaColor }}>{delta.value}</span>
            <span className="text-slate-400">{delta.text}</span>
          </span>
        )}
      </div>
      {typeof progress === 'number' && (
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.round(progress * 100)}%`, background: TOKENS.TEAL }}
          />
        </div>
      )}
    </div>
  );
}

export function FilterChip({
  children, active, onClick,
}: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'h-7 px-3 rounded-full text-[11px] tracking-wide transition-colors',
        active ? 'text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-white',
      ].join(' ')}
      style={
        active
          ? { background: '#0F172A', borderColor: '#0F172A' }
          : { border: `1px solid ${TOKENS.HAIRLINE}` }
      }
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Alert card
// ─────────────────────────────────────────────────────────────────────

export interface DashboardAlert {
  id: string;
  type: AlertKind;
  athleteName: string;
  athleteId?: string;
  sport: string;
  detail: string;
  initials: string;
}

export function AlertCard({
  alert, onDismiss, onClick,
}: {
  alert: DashboardAlert;
  onDismiss: () => void;
  onClick?: () => void;
}) {
  const accent =
    alert.type === 'missed' ? TOKENS.SLATE :
    alert.type === 'weight' ? TOKENS.AMBER :
    '#B5478B';
  const typeLabel =
    alert.type === 'missed' ? 'No check-in' :
    alert.type === 'weight' ? 'Weight drop' :
    'Low energy';

  return (
    <div
      className="bg-white rounded-md flex items-stretch overflow-hidden"
      style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
    >
      <span className="w-[3px] shrink-0" style={{ background: accent }} />
      <div className="flex-1 px-4 py-3.5 flex items-center gap-3 min-w-0">
        <Avatar initials={alert.initials} />
        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 text-left disabled:cursor-default"
          disabled={!onClick}
        >
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-slate-900 truncate">
              {alert.athleteName}
            </span>
            <span className="text-[11px] text-slate-400 truncate">· {alert.sport}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px]" style={{ color: accent }}>
            <AlertIcon type={alert.type} />
            <span className="font-medium">{typeLabel}</span>
            <span className="text-slate-500 truncate">— {alert.detail}</span>
          </div>
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-slate-300 hover:text-slate-700 p-1 -mr-1 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
               strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────

export interface NavItemSpec {
  kind: NavKind;
  label: string;
  href: string;
  badge?: string;
}

interface SidebarProps {
  items: NavItemSpec[];
  activeKind: NavKind;
  coachName: string;
  coachInitials: string;
  coachRole?: string;
  weekLabel?: string;
  pulse: { values: number[]; received: number; expected: number };
  /** Component used to render a nav link. Defaults to <a>. Pass <Link> from
   * react-router to enable client-side navigation. */
  LinkComponent?: ComponentType<{ to: string; className?: string; style?: React.CSSProperties; children: ReactNode }>;
}

export function Sidebar({
  items, activeKind, coachName, coachInitials, coachRole = 'Head coach',
  weekLabel = 'Week', pulse, LinkComponent,
}: SidebarProps) {
  return (
    <aside className="flex h-full flex-col" style={{ width: 232, background: TOKENS.BG }}>
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[13px] font-semibold"
            style={{ background: TOKENS.TEAL }}
          >
            N
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">NutriOps</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
              Performance / S2
            </span>
          </div>
        </div>
      </div>

      <nav className="px-3 flex flex-col gap-0.5">
        {items.map(item => (
          <NavLink
            key={item.kind}
            item={item}
            active={item.kind === activeKind}
            LinkComponent={LinkComponent}
          />
        ))}
      </nav>

      <div className="mt-10 mx-5 px-4 py-4 rounded-md bg-white"
           style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 mb-2">
          {weekLabel} · pulse
        </div>
        <div className="flex items-end gap-1 h-10">
          {pulse.values.map((h, i) => {
            const max = Math.max(...pulse.values, 1);
            return (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${(h / max) * 100}%`,
                  background: i === pulse.values.length - 1 ? TOKENS.TEAL : '#D8D6CF',
                  minHeight: '2px',
                }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Check-ins</span>
          <span className="text-[12px] font-mono text-slate-900 tabular-nums">
            {pulse.received}/{pulse.expected}
          </span>
        </div>
      </div>

      <div className="flex-1" />

      <div
        className="mx-3 mb-4 mt-6 px-3 py-3 rounded-md flex items-center gap-3"
        style={{ background: 'white', border: `1px solid ${TOKENS.HAIRLINE}` }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
          style={{ background: '#1F3A2E' }}
        >
          {coachInitials}
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[12px] font-medium text-slate-900 truncate">{coachName}</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{coachRole}</span>
        </div>
        <div className="ml-auto">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
               strokeWidth="1.5" className="text-slate-400">
            <path d="M5 6l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  item, active, LinkComponent,
}: {
  item: NavItemSpec;
  active: boolean;
  LinkComponent?: SidebarProps['LinkComponent'];
}) {
  const className = [
    'group relative flex items-center gap-3 h-9 px-3 rounded-md text-[13px] transition-colors',
    active ? 'text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900',
  ].join(' ');
  const style = active ? { background: 'white', border: `1px solid ${TOKENS.HAIRLINE}` } : undefined;
  const content = (
    <>
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-sm"
          style={{ background: TOKENS.TEAL, transform: 'translateX(-12px)' }}
        />
      )}
      <span className={active ? 'text-[#1D9E75]' : 'text-slate-400 group-hover:text-slate-700'}>
        <NavIcon kind={item.kind} />
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className="text-[10px] font-mono tabular-nums text-slate-400">{item.badge}</span>
      )}
    </>
  );

  if (LinkComponent) {
    return (
      <LinkComponent to={item.href} className={className} style={style}>
        {content}
      </LinkComponent>
    );
  }
  return (
    <a href={item.href} className={className} style={style}>
      {content}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────

export function ShellFooter({ syncLabel }: { syncLabel?: string }) {
  return (
    <div
      className="px-10 py-5 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-slate-400"
      style={{ borderTop: `1px solid ${TOKENS.HAIRLINE}` }}
    >
      <span>NutriOps · v0.1 · Performance preview</span>
      {syncLabel && (
        <span className="font-mono tabular-nums normal-case tracking-normal text-slate-400">
          {syncLabel}
        </span>
      )}
    </div>
  );
}
