/**
 * Static design frame for the NutriOps coach dashboard.
 * Self-contained — no Supabase calls, all dummy data inline.
 * Mounted at /design for review at 1440px viewport.
 *
 * Aesthetic: refined instrument-panel. Hairline borders, no shadows,
 * tabular mono numerics, dot status indicators, anchored sparklines.
 */

import { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────

type Status = 'active' | 'offseason' | 'injured';

interface Athlete {
  id: string;
  initials: string;
  name: string;
  sport: string;
  status: Status;
  lastCheckinDays: number;
  weight: number;
  weightDelta: number;
  energyTrend: number[];
  sleepTrend: number[];
  planStatus: 'defined' | 'updated' | 'missing';
  planUpdatedDays?: number;
  competitionInDays?: number;
}

const ATHLETES: Athlete[] = [
  {
    id: 'a1', initials: 'LP', name: 'Lucas Petit', sport: 'Rugby XV',
    status: 'active', lastCheckinDays: 8, weight: 96.8, weightDelta: -0.4,
    energyTrend: [4, 4, 3, 3], sleepTrend: [4, 3, 3, 4],
    planStatus: 'defined',
  },
  {
    id: 'a2', initials: 'SC', name: 'Sarah Chen', sport: 'Cycling — road',
    status: 'active', lastCheckinDays: 1, weight: 58.2, weightDelta: -2.4,
    energyTrend: [4, 3, 3, 2], sleepTrend: [4, 4, 3, 3],
    planStatus: 'updated', planUpdatedDays: 1,
  },
  {
    id: 'a3', initials: 'MR', name: 'Marco Rossi', sport: 'MMA — lightweight',
    status: 'active', lastCheckinDays: 3, weight: 77.5, weightDelta: 0,
    energyTrend: [3, 2, 2, 2], sleepTrend: [3, 3, 3, 3],
    planStatus: 'defined',
  },
  {
    id: 'a4', initials: 'EL', name: 'Emma Laurent', sport: 'CrossFit',
    status: 'active', lastCheckinDays: 2, weight: 64.1, weightDelta: 0.3,
    energyTrend: [4, 4, 5, 5], sleepTrend: [4, 4, 4, 5],
    planStatus: 'updated', planUpdatedDays: 4,
  },
  {
    id: 'a5', initials: 'NB', name: 'Nadia Bensaïd', sport: 'Athletics — 800m',
    status: 'active', lastCheckinDays: 1, weight: 53.8, weightDelta: 0.2,
    energyTrend: [3, 4, 4, 5], sleepTrend: [4, 4, 5, 4],
    planStatus: 'defined',
    competitionInDays: 2,
  },
  {
    id: 'a6', initials: 'AV', name: 'Anya Volkov', sport: 'Swimming — 200 fly',
    status: 'active', lastCheckinDays: 3, weight: 62.4, weightDelta: 0,
    energyTrend: [4, 4, 4, 4], sleepTrend: [3, 4, 4, 4],
    planStatus: 'defined',
    competitionInDays: 5,
  },
  {
    id: 'a7', initials: 'TB', name: 'Tom Bauer', sport: 'Cycling — track',
    status: 'offseason', lastCheckinDays: 12, weight: 72.0, weightDelta: 0,
    energyTrend: [3, 3, 2, 3], sleepTrend: [4, 4, 4, 4],
    planStatus: 'missing',
  },
  {
    id: 'a8', initials: 'JM', name: 'Jules Martin', sport: 'Judo — 81kg',
    status: 'injured', lastCheckinDays: 5, weight: 81.2, weightDelta: 1.1,
    energyTrend: [2, 2, 3, 3], sleepTrend: [3, 4, 4, 4],
    planStatus: 'updated', planUpdatedDays: 6,
  },
];

interface Alert {
  id: string;
  type: 'missed' | 'weight' | 'energy';
  athleteName: string;
  sport: string;
  detail: string;
  initials: string;
}

const INITIAL_ALERTS: Alert[] = [
  {
    id: 'al1', type: 'missed', athleteName: 'Tom Bauer', sport: 'Cycling — track',
    detail: 'No check-in for 12 days', initials: 'TB',
  },
  {
    id: 'al2', type: 'weight', athleteName: 'Sarah Chen', sport: 'Cycling — road',
    detail: 'Lost 2.4 kg vs last week', initials: 'SC',
  },
  {
    id: 'al3', type: 'energy', athleteName: 'Marco Rossi', sport: 'MMA — lightweight',
    detail: 'Energy ≤ 2 / 5 — two weeks running', initials: 'MR',
  },
];

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────

const TEAL = '#1D9E75';
const AMBER = '#C2772A';
const SLATE = '#6B7280';
const HAIRLINE = '#EAE9E5';
const BG = '#F5F5F3';

function Sparkline({
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
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeOpacity={0.35}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={tipPath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={lx} cy={ly} r={2.25} fill={color} />
    </svg>
  );
}

function StatusDot({ status }: { status: Status }) {
  const map: Record<Status, { color: string; label: string }> = {
    active:    { color: TEAL,  label: 'Active' },
    offseason: { color: SLATE, label: 'Off-season' },
    injured:   { color: AMBER, label: 'Injured' },
  };
  const { color, label } = map[status];
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[12px] text-slate-700">{label}</span>
    </span>
  );
}

function Avatar({ initials, status }: { initials: string; status?: Status }) {
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

function NavIcon({ kind }: { kind: 'dashboard' | 'athletes' | 'plans' | 'reports' | 'settings' }) {
  const common = { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'dashboard':
      return (
        <svg {...common} viewBox="0 0 16 16">
          <rect x="2" y="2" width="5" height="6" rx="1" />
          <rect x="9" y="2" width="5" height="3" rx="1" />
          <rect x="9" y="7" width="5" height="7" rx="1" />
          <rect x="2" y="10" width="5" height="4" rx="1" />
        </svg>
      );
    case 'athletes':
      return (
        <svg {...common} viewBox="0 0 16 16">
          <circle cx="6" cy="5.5" r="2.25" />
          <path d="M2 13.5c0-2.2 1.8-4 4-4s4 1.8 4 4" />
          <circle cx="11.5" cy="6" r="1.75" />
          <path d="M10 13.5c0-1.8 1.3-3.3 3-3.7" />
        </svg>
      );
    case 'plans':
      return (
        <svg {...common} viewBox="0 0 16 16">
          <rect x="3" y="2.5" width="10" height="11" rx="1.25" />
          <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
        </svg>
      );
    case 'reports':
      return (
        <svg {...common} viewBox="0 0 16 16">
          <path d="M3.5 2.5h6L12.5 5.5v8a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" />
          <path d="M9.5 2.5v3h3" />
          <path d="M5.5 9.5l1.5 1.5 2.5-3" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="2.25" />
          <path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7L3.4 3.4" />
        </svg>
      );
  }
}

function AlertIcon({ type }: { type: Alert['type'] }) {
  const common = { width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'missed':
      return (
        <svg {...common} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4.5V8l2 1.5" />
        </svg>
      );
    case 'weight':
      return (
        <svg {...common} viewBox="0 0 16 16">
          <path d="M8 2.5v9" />
          <path d="M5 8.5l3 3 3-3" />
        </svg>
      );
    case 'energy':
      return (
        <svg {...common} viewBox="0 0 16 16">
          <path d="M9 2L4 9h3.5L7 14l5-7H8.5L9 2z" />
        </svg>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────

export function DesignDashboard() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);

  const checkinsThisWeek = ATHLETES.filter(a => a.lastCheckinDays <= 7).length;
  const activeCount = ATHLETES.filter(a => a.status === 'active').length;
  const competitionsThisWeek = ATHLETES.filter(a => (a.competitionInDays ?? 99) <= 7);
  const avgEnergy = (
    ATHLETES.reduce((s, a) => s + a.energyTrend[a.energyTrend.length - 1], 0) / ATHLETES.length
  ).toFixed(1);

  return (
    <div
      className="min-h-screen w-full font-sans text-slate-900"
      style={{
        background: BG,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontFeatureSettings: '"cv11", "ss01"',
      }}
    >
      {/* ============ FRAME : 1440px ============ */}
      <div className="mx-auto flex" style={{ width: 1440, minHeight: '100vh' }}>
        {/* SIDEBAR */}
        <Sidebar />

        {/* MAIN */}
        <main className="flex-1 flex flex-col" style={{ borderLeft: `1px solid ${HAIRLINE}` }}>
          <TopBar />

          <div className="px-10 py-8 flex flex-col gap-8">
            {/* Zone 1 — KPIs */}
            <section>
              <SectionLabel index="01" title="Today at a glance" />
              <div className="grid grid-cols-4 gap-px mt-4 rounded-md overflow-hidden" style={{ background: HAIRLINE }}>
                <KPICard
                  label="Active athletes"
                  value={activeCount}
                  subline={`${ATHLETES.length} on roster`}
                  delta={{ value: '+1', tone: 'pos', text: 'vs last week' }}
                />
                <KPICard
                  label="Check-ins this week"
                  value={`${checkinsThisWeek}/${ATHLETES.length}`}
                  subline="Window closes Sun 23:59"
                  progress={checkinsThisWeek / ATHLETES.length}
                />
                <KPICard
                  label="Avg energy"
                  value={avgEnergy}
                  subline="Out of 5"
                  delta={{ value: '−0.2', tone: 'neg', text: 'vs last week' }}
                />
                <KPICard
                  label="Competitions"
                  value={competitionsThisWeek.length}
                  subline={competitionsThisWeek.map(a => a.name.split(' ')[0]).join(' · ') || 'none scheduled'}
                  badge="this week"
                />
              </div>
            </section>

            {/* Zone 2 — Alerts strip */}
            <section>
              <div className="flex items-baseline justify-between">
                <SectionLabel index="02" title="Needs attention" count={alerts.length} />
                <button className="text-[11px] text-slate-500 hover:text-slate-900 tracking-wide uppercase">
                  Clear all
                </button>
              </div>
              {alerts.length === 0 ? (
                <div
                  className="mt-4 rounded-md bg-white border border-dashed text-center py-10 text-sm text-slate-400"
                  style={{ borderColor: HAIRLINE }}
                >
                  All clear. Nothing flagged this morning.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {alerts.map(a => (
                    <AlertCard
                      key={a.id}
                      alert={a}
                      onDismiss={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Zone 3 — Roster */}
            <section>
              <div className="flex items-baseline justify-between">
                <SectionLabel index="03" title="Roster" count={ATHLETES.length} />
                <div className="flex items-center gap-1 text-[11px]">
                  <FilterChip active>All</FilterChip>
                  <FilterChip>Active</FilterChip>
                  <FilterChip>Off-season</FilterChip>
                  <FilterChip>Injured</FilterChip>
                </div>
              </div>
              <div
                className="mt-4 bg-white rounded-md overflow-hidden"
                style={{ border: `1px solid ${HAIRLINE}` }}
              >
                <RosterTable />
              </div>
            </section>
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────────────

function Sidebar() {
  return (
    <aside
      className="flex flex-col"
      style={{ width: 232, background: BG }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[13px] font-semibold"
            style={{ background: TEAL }}
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

      {/* Nav */}
      <nav className="px-3 flex flex-col gap-0.5">
        <NavLink kind="dashboard" label="Dashboard" active />
        <NavLink kind="athletes"  label="Athletes" badge="14" />
        <NavLink kind="plans"     label="Plans" />
        <NavLink kind="reports"   label="Reports" />
        <NavLink kind="settings"  label="Settings" />
      </nav>

      {/* Mid block — week pulse */}
      <div className="mt-10 mx-5 px-4 py-4 rounded-md bg-white"
           style={{ border: `1px solid ${HAIRLINE}` }}>
        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 mb-2">
          Week 12 · pulse
        </div>
        <div className="flex items-end gap-1 h-10">
          {[3, 5, 4, 6, 7, 5, 8].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${(h / 8) * 100}%`,
                background: i === 6 ? TEAL : '#D8D6CF',
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Check-ins</span>
          <span className="text-[12px] font-mono text-slate-900 tabular-nums">8/12</span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Coach card */}
      <div
        className="mx-3 mb-4 mt-6 px-3 py-3 rounded-md flex items-center gap-3"
        style={{ background: 'white', border: `1px solid ${HAIRLINE}` }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
          style={{ background: '#1F3A2E' }}
        >
          AB
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[12px] font-medium text-slate-900 truncate">Antoine Bonnaud</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Head coach</span>
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
  kind,
  label,
  active,
  badge,
}: {
  kind: 'dashboard' | 'athletes' | 'plans' | 'reports' | 'settings';
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <a
      className={[
        'group relative flex items-center gap-3 h-9 px-3 rounded-md text-[13px] transition-colors',
        active ? 'text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900',
      ].join(' ')}
      style={active ? { background: 'white', border: `1px solid ${HAIRLINE}` } : undefined}
      href="#"
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-sm"
          style={{ background: TEAL, transform: 'translateX(-12px)' }}
        />
      )}
      <span className={active ? 'text-[#1D9E75]' : 'text-slate-400 group-hover:text-slate-700'}>
        <NavIcon kind={kind} />
      </span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-[10px] font-mono tabular-nums text-slate-400">{badge}</span>
      )}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <header
      className="px-10 py-6 flex items-end justify-between"
      style={{ borderBottom: `1px solid ${HAIRLINE}` }}
    >
      <div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
          <span className="w-1 h-1 rounded-full" style={{ background: TEAL }} />
          Tuesday · March 18, 2025 · 07:42
        </div>
        <h1 className="mt-1.5 text-[28px] font-light tracking-tight text-slate-900 leading-none">
          Morning brief.
        </h1>
        <p className="mt-2 text-[13px] text-slate-500">
          <span className="font-mono tabular-nums text-slate-900">7</span> athletes train today ·
          <span className="font-mono tabular-nums text-slate-900"> 2</span> compete this week ·
          <span className="font-mono tabular-nums text-slate-900"> 4</span> check-ins still open
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 px-3 h-9 rounded-md bg-white text-[12px] text-slate-400"
          style={{ border: `1px solid ${HAIRLINE}`, width: 220 }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
               strokeWidth="1.5" strokeLinecap="round">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M14 14l-3.5-3.5" />
          </svg>
          <span>Search athletes</span>
          <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums"
                style={{ background: BG, color: '#9CA3AF' }}>⌘K</span>
        </div>
        <button
          className="h-9 px-4 rounded-md text-white text-[12px] font-medium"
          style={{ background: TEAL }}
        >
          + Add athlete
        </button>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────
// KPI CARDS
// ─────────────────────────────────────────────────────────────────────

function SectionLabel({
  index, title, count,
}: { index: string; title: string; count?: number }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-[10px] tabular-nums text-slate-400 tracking-[0.1em]">
        {index}
      </span>
      <h2 className="text-[15px] font-medium text-slate-900 tracking-tight">
        {title}
      </h2>
      {typeof count === 'number' && (
        <span className="font-mono text-[11px] tabular-nums text-slate-400">{count}</span>
      )}
    </div>
  );
}

function KPICard({
  label,
  value,
  subline,
  delta,
  progress,
  badge,
}: {
  label: string;
  value: string | number;
  subline: string;
  delta?: { value: string; tone: 'pos' | 'neg'; text: string };
  progress?: number;
  badge?: string;
}) {
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
        <span className="text-[11px] text-slate-500 truncate">{subline}</span>
        {delta && (
          <span className="flex items-center gap-1 text-[11px] font-mono tabular-nums">
            <span style={{ color: delta.tone === 'pos' ? TEAL : AMBER }}>{delta.value}</span>
            <span className="text-slate-400">{delta.text}</span>
          </span>
        )}
      </div>

      {typeof progress === 'number' && (
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: HAIRLINE }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.round(progress * 100)}%`, background: TEAL }}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// ALERT CARDS
// ─────────────────────────────────────────────────────────────────────

function AlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  const accent = alert.type === 'missed' ? '#9CA3AF' : alert.type === 'weight' ? AMBER : '#B5478B';
  const typeLabel =
    alert.type === 'missed' ? 'No check-in' :
    alert.type === 'weight' ? 'Weight drop' :
    'Low energy';

  return (
    <div
      className="bg-white rounded-md flex items-stretch overflow-hidden"
      style={{ border: `1px solid ${HAIRLINE}` }}
    >
      <span className="w-[3px] shrink-0" style={{ background: accent }} />
      <div className="flex-1 px-4 py-3.5 flex items-center gap-3 min-w-0">
        <Avatar initials={alert.initials} />
        <div className="min-w-0 flex-1">
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
        </div>
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
// ROSTER TABLE
// ─────────────────────────────────────────────────────────────────────

function FilterChip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={[
        'h-7 px-3 rounded-full text-[11px] tracking-wide transition-colors',
        active
          ? 'text-white'
          : 'text-slate-500 hover:text-slate-900 hover:bg-white',
      ].join(' ')}
      style={
        active
          ? { background: '#0F172A', borderColor: '#0F172A' }
          : { border: `1px solid ${HAIRLINE}` }
      }
    >
      {children}
    </button>
  );
}

function RosterTable() {
  const cols = '40px 220px 110px 130px 140px 110px 110px 130px 90px';

  return (
    <div className="font-sans">
      {/* Head */}
      <div
        className="grid items-center px-5 h-10 text-[10px] uppercase tracking-[0.12em] text-slate-400 font-medium"
        style={{ gridTemplateColumns: cols, borderBottom: `1px solid ${HAIRLINE}`, background: '#FAFAF8' }}
      >
        <div></div>
        <div>Athlete</div>
        <div>Status</div>
        <div>Last check-in</div>
        <div className="text-right pr-4">Weight (kg)</div>
        <div>Energy · 4w</div>
        <div>Sleep · 4w</div>
        <div>Plan / week</div>
        <div className="text-right">Action</div>
      </div>

      {/* Rows */}
      {ATHLETES.map((a, i) => (
        <RosterRow key={a.id} a={a} cols={cols} last={i === ATHLETES.length - 1} />
      ))}
    </div>
  );
}

function RosterRow({ a, cols, last }: { a: Athlete; cols: string; last: boolean }) {
  const lateCheckin = a.lastCheckinDays > 7;
  const weightTone =
    Math.abs(a.weightDelta) >= 2 ? AMBER :
    a.weightDelta === 0 ? SLATE : TEAL;
  const planLabel =
    a.planStatus === 'missing' ? 'Missing' :
    a.planStatus === 'updated' ? `Updated · ${a.planUpdatedDays}d` :
    'Defined';
  const planTone =
    a.planStatus === 'missing' ? AMBER :
    a.planStatus === 'updated' ? TEAL :
    SLATE;

  return (
    <div
      className="grid items-center px-5 h-[60px] text-[13px] hover:bg-[#FAFAF8] transition-colors cursor-pointer"
      style={{
        gridTemplateColumns: cols,
        borderBottom: last ? undefined : `1px solid ${HAIRLINE}`,
      }}
    >
      <Avatar initials={a.initials} status={a.status} />

      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{a.name}</span>
          {a.competitionInDays !== undefined && (
            <span
              className="text-[9px] font-mono tabular-nums px-1.5 py-0.5 rounded uppercase tracking-[0.1em]"
              style={{ background: '#FFF7E6', color: AMBER }}
            >
              Comp T−{a.competitionInDays}d
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-500 mt-0.5">{a.sport}</span>
      </div>

      <StatusDot status={a.status} />

      <div className="flex flex-col leading-tight">
        <span
          className="font-mono tabular-nums text-[12px]"
          style={{ color: lateCheckin ? AMBER : '#0F172A' }}
        >
          {a.lastCheckinDays === 0 ? 'today' : `${a.lastCheckinDays}d ago`}
        </span>
        {lateCheckin && (
          <span className="text-[10px] uppercase tracking-[0.1em] mt-0.5" style={{ color: AMBER }}>
            Overdue
          </span>
        )}
      </div>

      <div className="text-right pr-4 flex flex-col leading-tight items-end">
        <span className="font-mono tabular-nums text-[14px] text-slate-900">
          {a.weight.toFixed(1)}
        </span>
        <span className="text-[11px] font-mono tabular-nums" style={{ color: weightTone }}>
          {a.weightDelta === 0
            ? '— · stable'
            : `${a.weightDelta > 0 ? '↑' : '↓'} ${Math.abs(a.weightDelta).toFixed(1)}`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Sparkline data={a.energyTrend} color={TEAL} />
        <span className="font-mono tabular-nums text-[11px] text-slate-500">
          {a.energyTrend[a.energyTrend.length - 1]}/5
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Sparkline data={a.sleepTrend} color="#5B7CC9" />
        <span className="font-mono tabular-nums text-[11px] text-slate-500">
          {a.sleepTrend[a.sleepTrend.length - 1]}/5
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: planTone }}
        />
        <span className="text-[12px]" style={{ color: planTone }}>
          {planLabel}
        </span>
      </div>

      <div className="text-right">
        <button
          className="text-[11px] uppercase tracking-[0.1em] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          Open →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <div
      className="px-10 py-5 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-slate-400"
      style={{ borderTop: `1px solid ${HAIRLINE}` }}
    >
      <span>NutriOps · v0.1 · Performance preview</span>
      <span className="font-mono tabular-nums normal-case tracking-normal text-slate-400">
        sync · 14s ago
      </span>
    </div>
  );
}

export default DesignDashboard;
