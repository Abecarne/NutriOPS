/**
 * Read-only display modal for a single daily check-in submitted by
 * the athlete. Shows every captured signal (energy/sleep/soreness/
 * stress/motivation/hunger/digestion/nutrition adherence + notes)
 * plus the training feedback for the same day if available.
 */

import { Modal } from '@/components/ui/Modal';
import { TOKENS } from '@/components/dashboard/kit';
import {
  NUTRITION_ADHERENCE_LABELS,
  TRAINING_SESSION_STATUS_LABELS,
  TRAINING_SESSION_TYPE_LABELS,
} from '@/types/database';
import type { Checkin, TrainingSession } from '@/types/database';
import { formatDate } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  checkin: Checkin | null;
  /** Sessions of the same date — feedback is rendered when present. */
  sessions?: TrainingSession[];
}

export function CheckinDetailModal({ open, onClose, checkin, sessions = [] }: Props) {
  if (!checkin) return null;

  const sameDaySessions = sessions.filter(s => s.session_date === checkin.checkin_date);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Check-in du ${formatDate(checkin.checkin_date)}`}
    >
      <div className="flex flex-col gap-5">
        {/* Header — submission timestamp + weight */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
              Soumis
            </div>
            <div className="text-[13px] text-slate-700 mt-0.5">
              {new Date(checkin.submitted_at).toLocaleString('fr-FR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
              Poids du matin
            </div>
            <div className="mt-0.5 font-mono tabular-nums text-[20px] text-slate-900">
              {Number(checkin.weight_kg).toFixed(1)} <span className="text-[12px] text-slate-400">kg</span>
            </div>
          </div>
        </header>

        {/* Readiness — 8 signal tiles */}
        <section className="flex flex-col gap-2">
          <SectionLabel>Readiness</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-md overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
            <SignalTile label="Énergie"    value={checkin.energy_level}      max={5} tone={signalTone(checkin.energy_level, 'higher_is_better')} />
            <SignalTile label="Sommeil"    value={checkin.sleep_quality}     max={5} tone={signalTone(checkin.sleep_quality, 'higher_is_better')} />
            <SignalTile label="Soreness"   value={checkin.soreness_level}    max={5} tone={signalTone(checkin.soreness_level, 'lower_is_better')} />
            <SignalTile label="Stress"     value={checkin.stress_level}      max={5} tone={signalTone(checkin.stress_level, 'lower_is_better')} />
            <SignalTile label="Motivation" value={checkin.motivation_level}  max={5} tone={signalTone(checkin.motivation_level, 'higher_is_better')} />
            <SignalTile label="Faim"       value={checkin.hunger_level}      max={5} tone="mute" />
            <SignalTile label="Digestion"  value={checkin.digestion_quality} max={5} tone={signalTone(checkin.digestion_quality, 'higher_is_better')} />
            <AdherenceTile adherence={checkin.nutrition_adherence} />
          </div>
        </section>

        {/* Athlete notes */}
        {checkin.notes && (
          <section className="flex flex-col gap-2">
            <SectionLabel>Notes athlète</SectionLabel>
            <div
              className="rounded-md p-3 text-[13px] text-slate-700 whitespace-pre-wrap"
              style={{ background: TOKENS.PANEL_BG, border: `1px solid ${TOKENS.HAIRLINE}` }}
            >
              {checkin.notes}
            </div>
          </section>
        )}

        {/* Training feedback for the same day */}
        {sameDaySessions.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionLabel>Séances du jour</SectionLabel>
            <div className="flex flex-col gap-2">
              {sameDaySessions.map(session => (
                <SessionFeedbackCard key={session.id} session={session} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
      {children}
    </div>
  );
}

type Tone = 'pos' | 'neg' | 'mute';

function signalTone(
  value: number | null | undefined,
  direction: 'higher_is_better' | 'lower_is_better',
): Tone {
  if (value === null || value === undefined) return 'mute';
  if (direction === 'higher_is_better') {
    if (value >= 4) return 'pos';
    if (value <= 2) return 'neg';
    return 'mute';
  }
  if (value <= 2) return 'pos';
  if (value >= 4) return 'neg';
  return 'mute';
}

function SignalTile({
  label, value, max, tone,
}: {
  label: string;
  value: number | null | undefined;
  max: number;
  tone: Tone;
}) {
  const color =
    tone === 'pos' ? TOKENS.TEAL :
    tone === 'neg' ? TOKENS.AMBER :
    TOKENS.SLATE;
  const ratio = value !== null && value !== undefined ? value / max : 0;

  return (
    <div className="bg-white px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-medium truncate">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span
          className="text-[22px] font-mono tabular-nums leading-none"
          style={{ color, fontFeatureSettings: '"tnum"' }}
        >
          {value !== null && value !== undefined ? value : '—'}
        </span>
        <span className="text-[11px] font-mono tabular-nums text-slate-400">/{max}</span>
      </div>
      <div className="mt-2 h-[3px] rounded-full overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.round(ratio * 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function AdherenceTile({ adherence }: { adherence: 'low' | 'medium' | 'high' | null | undefined }) {
  const tone =
    adherence === 'high' ? 'pos' :
    adherence === 'low' ? 'neg' :
    'mute';
  const color =
    tone === 'pos' ? TOKENS.TEAL :
    tone === 'neg' ? TOKENS.AMBER :
    TOKENS.SLATE;
  const label = adherence ? NUTRITION_ADHERENCE_LABELS[adherence] : '—';

  return (
    <div className="bg-white px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-medium truncate">
        Adhérence nutrition
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span
          className="text-[16px] font-medium leading-tight"
          style={{ color }}
        >
          {label}
        </span>
      </div>
      <div className="mt-2 h-[3px] rounded-full" style={{ background: adherence ? color : TOKENS.HAIRLINE, opacity: adherence ? 1 : 0.4 }} />
    </div>
  );
}

function SessionFeedbackCard({ session }: { session: TrainingSession }) {
  const statusColor =
    session.status === 'completed' ? TOKENS.TEAL :
    session.status === 'missed'    ? TOKENS.AMBER :
    session.status === 'modified'  ? '#B5478B' :
    TOKENS.SLATE;
  const intensityDelta =
    session.actual_duration_min !== null &&
    session.actual_duration_min !== undefined &&
    session.planned_duration_min !== null &&
    session.planned_duration_min !== undefined
      ? session.actual_duration_min - session.planned_duration_min
      : null;

  return (
    <div className="rounded-md p-3" style={{ background: 'white', border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[13px] font-medium text-slate-900 truncate">{session.title}</div>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em]">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          <span style={{ color: statusColor }}>
            {TRAINING_SESSION_STATUS_LABELS[session.status]}
          </span>
        </span>
      </div>

      <div className="mt-1 text-[11px] text-slate-500">
        {TRAINING_SESSION_TYPE_LABELS[session.session_type]}
        {' · '}
        prévu {session.planned_duration_min ?? '—'} min
        {' · '}
        intensité {session.planned_intensity ?? '—'}/10
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-[12px]">
        <Metric
          label="Durée réelle"
          value={session.actual_duration_min !== null && session.actual_duration_min !== undefined ? `${session.actual_duration_min} min` : '—'}
          delta={intensityDelta !== null ? `${intensityDelta > 0 ? '+' : ''}${intensityDelta} min` : undefined}
          deltaTone={intensityDelta !== null && Math.abs(intensityDelta) > 10 ? 'neg' : 'mute'}
        />
        <Metric
          label="RPE"
          value={session.rpe !== null && session.rpe !== undefined ? `${session.rpe}/10` : '—'}
          deltaTone={session.rpe !== null && session.rpe !== undefined && session.rpe >= 8 ? 'neg' : 'mute'}
        />
        <Metric
          label="Charge interne"
          value={session.internal_load !== null && session.internal_load !== undefined ? String(session.internal_load) : '—'}
        />
      </div>

      {session.athlete_notes && (
        <div className="mt-3 rounded-md p-2 text-[12px] text-slate-700 whitespace-pre-wrap" style={{ background: TOKENS.PANEL_BG, border: `1px solid ${TOKENS.HAIRLINE}` }}>
          <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500 mb-1">
            Retour athlète
          </div>
          {session.athlete_notes}
        </div>
      )}
    </div>
  );
}

function Metric({
  label, value, delta, deltaTone = 'mute',
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: Tone;
}) {
  const deltaColor =
    deltaTone === 'pos' ? TOKENS.TEAL :
    deltaTone === 'neg' ? TOKENS.AMBER :
    TOKENS.SLATE;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono tabular-nums text-slate-900">{value}</span>
        {delta && (
          <span className="font-mono tabular-nums text-[10px]" style={{ color: deltaColor }}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
