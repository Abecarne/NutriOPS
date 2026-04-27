/**
 * Unified weekly workbench — training (left) + nutrition (right) for the
 * selected day, with a 7-day picker that surfaces both planning signals
 * (sessions count + nutrition target presence + meal-item count).
 *
 * Goal: cut clicks. The coach picks a day once and edits both plans
 * without switching tabs. Each side keeps its existing dedicated editor
 * but framed in a tighter shell.
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { TOKENS } from '@/components/dashboard/kit';
import { WeekSelector } from '@/components/athlete/WeekSelector';
import { WeekDayPicker, type WeekDaySummary } from '@/components/athlete/WeekDayPicker';
import { distributeMacros, formatDateShort, isoWeekDays } from '@/lib/utils';
import {
  DAY_TYPES,
  DAY_TYPE_LABELS,
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  TRAINING_SESSION_STATUSES,
  TRAINING_SESSION_STATUS_LABELS,
  TRAINING_SESSION_TYPES,
  TRAINING_SESSION_TYPE_LABELS,
} from '@/types/database';
import type {
  DailyNutritionTarget,
  DayType,
  MealSlot,
  NutritionMealItem,
  TrainingSession,
  TrainingSessionStatus,
  TrainingSessionType,
} from '@/types/database';
import type { DailyNutritionTargetInput, NutritionMealItemInput } from '@/hooks/useDailyNutritionTargets';
import type { TrainingSessionInput } from '@/hooks/useTrainingSessions';

// ─────────────────────────────────────────────────────────────────────
// Component contract
// ─────────────────────────────────────────────────────────────────────

interface Props {
  athleteId: string;
  weekStart: string;
  onWeekChange: (weekStart: string) => void;

  // Training
  sessionsByDate: Map<string, TrainingSession[]>;
  sessions: TrainingSession[];
  trainingLoading: boolean;
  trainingError: string | null;
  upsertSession: (input: TrainingSessionInput) => Promise<TrainingSession>;
  deleteSession: (id: string) => Promise<void>;
  duplicatePreviousWeek: (weekStart: string) => Promise<TrainingSession[]>;

  // Nutrition
  targetsByDate: Map<string, DailyNutritionTarget>;
  mealItemsByTargetId: Map<string, NutritionMealItem[]>;
  nutritionLoading: boolean;
  nutritionError: string | null;
  upsertTarget: (input: DailyNutritionTargetInput) => Promise<DailyNutritionTarget>;
  upsertMealItem: (input: NutritionMealItemInput) => Promise<NutritionMealItem>;
  deleteMealItem: (id: string) => Promise<void>;
  generateWeekFromSessions: (
    weekStart: string,
    sessions: TrainingSession[],
    baseCalories?: number,
  ) => Promise<DailyNutritionTarget[]>;
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────

export function WeekWorkbench(props: Props) {
  const {
    athleteId, weekStart, onWeekChange,
    sessionsByDate, sessions, trainingLoading, trainingError,
    upsertSession, deleteSession, duplicatePreviousWeek,
    targetsByDate, mealItemsByTargetId, nutritionLoading, nutritionError,
    upsertTarget, upsertMealItem, deleteMealItem, generateWeekFromSessions,
  } = props;

  const days = useMemo(() => isoWeekDays(weekStart), [weekStart]);
  const [selectedDate, setSelectedDate] = useState(weekStart);
  const [duplicating, setDuplicating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [baseCalories, setBaseCalories] = useState(2400);

  useEffect(() => {
    if (!days.includes(selectedDate)) setSelectedDate(weekStart);
  }, [days, selectedDate, weekStart]);

  // Day picker shows: number of sessions + kcal target (or "missing")
  const daySummaries = useMemo<WeekDaySummary[]>(
    () => days.map(day => {
      const daySessions = sessionsByDate.get(day) ?? [];
      const target = targetsByDate.get(day);
      const meals = target ? (mealItemsByTargetId.get(target.id) ?? []) : [];
      const planSignal = target ? `${target.calories} kcal` : 'cible —';
      const trainingSignal = daySessions.length ? `${daySessions.length} séance${daySessions.length > 1 ? 's' : ''}` : 'repos';
      return {
        date: day,
        label: trainingSignal,
        subline: meals.length ? `${planSignal} · ${meals.length} repas` : planSignal,
        tone: target && daySessions.length ? 'ok' : target || daySessions.length ? 'mute' : 'warn',
      };
    }),
    [days, mealItemsByTargetId, sessionsByDate, targetsByDate],
  );

  const weeklyLoad = sessions.reduce(
    (sum, s) => sum + (s.internal_load ?? ((s.planned_duration_min ?? 0) * (s.planned_intensity ?? 0))),
    0,
  );
  const weeklyKcal = Array.from(targetsByDate.values()).reduce((sum, t) => sum + t.calories, 0);

  const duplicate = async () => {
    setDuplicating(true);
    try {
      await duplicatePreviousWeek(weekStart);
    } finally {
      setDuplicating(false);
    }
  };

  const generateNutrition = async () => {
    setGenerating(true);
    try {
      await generateWeekFromSessions(weekStart, sessions, baseCalories);
    } finally {
      setGenerating(false);
    }
  };

  const selectedSessions = sessionsByDate.get(selectedDate) ?? [];
  const selectedTarget = targetsByDate.get(selectedDate) ?? null;
  const selectedMealItems = selectedTarget ? (mealItemsByTargetId.get(selectedTarget.id) ?? []) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Semaine — entraînement + nutrition</CardTitle>
        <WeekSelector weekStart={weekStart} onChange={onWeekChange} />
      </CardHeader>
      <CardBody className="flex flex-col gap-5">
        {/* Top toolbar : weekly KPIs + bulk actions */}
        <div
          className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-md p-3"
          style={{ background: TOKENS.PANEL_BG, border: `1px solid ${TOKENS.HAIRLINE}` }}
        >
          <div className="flex items-center gap-6 text-[12px] text-slate-600">
            <span>
              Charge sem.{' '}
              <span className="font-mono text-slate-900 tabular-nums">{weeklyLoad}</span>
            </span>
            <span>
              Kcal cumulés sem.{' '}
              <span className="font-mono text-slate-900 tabular-nums">{weeklyKcal}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button variant="secondary" size="sm" onClick={duplicate} loading={duplicating}>
              Dupliquer entraînement S-1
            </Button>
            <div className="w-[120px]">
              <Input
                label="Base kcal"
                type="number"
                value={baseCalories}
                onChange={e => setBaseCalories(Number(e.target.value))}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={generateNutrition} loading={generating}>
              Générer nutrition
            </Button>
          </div>
        </div>

        {trainingError && <ErrorMessage message={trainingError} />}
        {nutritionError && <ErrorMessage message={nutritionError} />}

        {trainingLoading || nutritionLoading ? (
          <div className="py-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
        ) : (
          <>
            <WeekDayPicker
              days={daySummaries}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <DayTrainingPanel
                athleteId={athleteId}
                date={selectedDate}
                sessions={selectedSessions}
                onSave={upsertSession}
                onDelete={deleteSession}
              />
              <DayNutritionPanel
                athleteId={athleteId}
                date={selectedDate}
                target={selectedTarget}
                sessions={selectedSessions}
                mealItems={selectedMealItems}
                onTargetSave={upsertTarget}
                onMealSave={upsertMealItem}
                onMealDelete={deleteMealItem}
              />
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// LEFT — training panel for the selected day
// ─────────────────────────────────────────────────────────────────────

function DayTrainingPanel({
  athleteId, date, sessions, onSave, onDelete,
}: {
  athleteId: string;
  date: string;
  sessions: TrainingSession[];
  onSave: (input: TrainingSessionInput) => Promise<TrainingSession>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const dayLoad = sessions.reduce(
    (s, x) => s + (x.internal_load ?? ((x.planned_duration_min ?? 0) * (x.planned_intensity ?? 0))),
    0,
  );

  return (
    <section
      className="rounded-md bg-white flex flex-col"
      style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
    >
      <header
        className="px-4 py-3 flex items-baseline justify-between gap-3"
        style={{ background: TOKENS.PANEL_BG, borderBottom: `1px solid ${TOKENS.HAIRLINE}` }}
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
            Entraînement
          </div>
          <div className="text-[13px] font-medium text-slate-900 mt-0.5">
            {formatDateShort(date)} · {sessions.length} séance{sessions.length > 1 ? 's' : ''} · charge {dayLoad}
          </div>
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>+ Séance</Button>
      </header>

      <div className="p-4 flex flex-col gap-3">
        {adding && (
          <SessionForm
            initial={{
              athlete_id: athleteId,
              session_date: date,
              title: '',
              session_type: 'strength',
              planned_duration_min: 60,
              planned_intensity: 6,
              description: '',
              status: 'planned',
            }}
            onCancel={() => setAdding(false)}
            onSubmit={async input => {
              await onSave(input);
              setAdding(false);
            }}
          />
        )}

        {sessions.length === 0 && !adding ? (
          <div
            className="rounded-md py-10 text-center text-[13px] text-slate-500"
            style={{ border: `1px dashed ${TOKENS.HAIRLINE}` }}
          >
            Pas de séance ce jour. Utilise « + Séance » pour créer.
          </div>
        ) : (
          sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onSave={onSave}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  );
}

function SessionCard({
  session, onSave, onDelete,
}: {
  session: TrainingSession;
  onSave: (input: TrainingSessionInput) => Promise<TrainingSession>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const load = session.internal_load
    ?? ((session.planned_duration_min ?? 0) * (session.planned_intensity ?? 0));
  const statusColor =
    session.status === 'completed' ? TOKENS.TEAL :
    session.status === 'missed'    ? TOKENS.AMBER :
    session.status === 'modified'  ? '#B5478B' :
    TOKENS.SLATE;

  if (editing) {
    return (
      <SessionForm
        initial={session}
        onCancel={() => setEditing(false)}
        onDelete={async () => {
          await onDelete(session.id);
          setEditing(false);
        }}
        onSubmit={async input => {
          await onSave(input);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded-md text-left px-3 py-3 hover:bg-[#FAFAF8] transition-colors"
      style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[13px] font-medium text-slate-900 truncate">{session.title || 'Sans titre'}</div>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em]" style={{ color: statusColor }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          {TRAINING_SESSION_STATUS_LABELS[session.status]}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-slate-500">
        {TRAINING_SESSION_TYPE_LABELS[session.session_type]}
        {' · '}
        {session.planned_duration_min ?? '—'} min
        {' · '}
        intensité {session.planned_intensity ?? '—'}/10
        {' · '}
        load <span className="font-mono tabular-nums text-slate-700">{load || '—'}</span>
        {session.rpe !== null && session.rpe !== undefined && (
          <> · RPE <span className="font-mono tabular-nums text-slate-700">{session.rpe}</span></>
        )}
      </div>
    </button>
  );
}

function SessionForm({
  initial, onSubmit, onCancel, onDelete,
}: {
  initial: TrainingSessionInput;
  onSubmit: (input: TrainingSessionInput) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    ...initial,
    title: initial.title ?? '',
    session_type: initial.session_type ?? 'strength',
    planned_duration_min: initial.planned_duration_min ?? 60,
    planned_intensity: initial.planned_intensity ?? 6,
    description: initial.description ?? '',
    status: initial.status ?? 'planned',
    actual_duration_min: initial.actual_duration_min ?? null,
    rpe: initial.rpe ?? null,
    coach_notes: initial.coach_notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!draft.title.trim()) {
      setError('Le titre est requis.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        id: draft.id,
        athlete_id: draft.athlete_id,
        session_date: draft.session_date,
        title: draft.title.trim(),
        session_type: draft.session_type,
        planned_duration_min: numberOrNull(draft.planned_duration_min),
        planned_intensity: numberOrNull(draft.planned_intensity),
        status: draft.status,
        actual_duration_min: numberOrNull(draft.actual_duration_min),
        rpe: numberOrNull(draft.rpe),
        athlete_notes: draft.athlete_notes ?? null,
        description: draft.description?.trim() || null,
        coach_notes: draft.coach_notes?.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sauvegarde impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md bg-white p-3 flex flex-col gap-2" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <Input label="Titre" value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Select label="Type" value={draft.session_type} onChange={e => setDraft(p => ({ ...p, session_type: e.target.value as TrainingSessionType }))}>
          {TRAINING_SESSION_TYPES.map(t => <option key={t} value={t}>{TRAINING_SESSION_TYPE_LABELS[t]}</option>)}
        </Select>
        <Select label="Statut" value={draft.status} onChange={e => setDraft(p => ({ ...p, status: e.target.value as TrainingSessionStatus }))}>
          {TRAINING_SESSION_STATUSES.map(s => <option key={s} value={s}>{TRAINING_SESSION_STATUS_LABELS[s]}</option>)}
        </Select>
        <Input label="Min." type="number" value={draft.planned_duration_min ?? ''} onChange={e => setDraft(p => ({ ...p, planned_duration_min: Number(e.target.value) }))} />
        <Input label="Intensité" type="number" min={1} max={10} value={draft.planned_intensity ?? ''} onChange={e => setDraft(p => ({ ...p, planned_intensity: Number(e.target.value) }))} />
      </div>
      <Textarea label="Consignes" rows={3} value={draft.description ?? ''} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} />
      {error && <div className="text-xs" style={{ color: TOKENS.AMBER }}>{error}</div>}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} loading={saving}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        {onDelete && <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// RIGHT — nutrition panel for the selected day
// ─────────────────────────────────────────────────────────────────────

function DayNutritionPanel({
  athleteId, date, target, sessions, mealItems,
  onTargetSave, onMealSave, onMealDelete,
}: {
  athleteId: string;
  date: string;
  target: DailyNutritionTarget | null;
  sessions: TrainingSession[];
  mealItems: NutritionMealItem[];
  onTargetSave: (input: DailyNutritionTargetInput) => Promise<DailyNutritionTarget>;
  onMealSave: (input: NutritionMealItemInput) => Promise<NutritionMealItem>;
  onMealDelete: (id: string) => Promise<void>;
}) {
  const initial = useMemo(() => ({
    day_type: target?.day_type ?? inferDayType(sessions),
    calories: target?.calories ?? 0,
    protein_g: target?.protein_g ?? 0,
    carbs_g: target?.carbs_g ?? 0,
    fat_g: target?.fat_g ?? 0,
    notes: target?.notes ?? '',
  }), [sessions, target]);
  const [draft, setDraft] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingTarget, setCreatingTarget] = useState(false);

  useEffect(() => {
    setDraft(initial);
    setDirty(false);
  }, [initial]);

  useEffect(() => {
    if (!dirty) return;
    const handle = window.setTimeout(async () => {
      setSaving(true);
      setError(null);
      try {
        await onTargetSave({
          athlete_id: athleteId,
          target_date: date,
          day_type: draft.day_type,
          calories: Number(draft.calories) || 0,
          protein_g: Number(draft.protein_g) || 0,
          carbs_g: Number(draft.carbs_g) || 0,
          fat_g: Number(draft.fat_g) || 0,
          notes: draft.notes.trim() || null,
        });
        setDirty(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sauvegarde impossible');
      } finally {
        setSaving(false);
      }
    }, 500);
    return () => window.clearTimeout(handle);
  }, [athleteId, date, dirty, draft, onTargetSave]);

  const update = (patch: Partial<typeof draft>) => {
    setDraft(p => ({ ...p, ...patch }));
    setDirty(true);
  };

  const updateCalories = (value: number) => {
    update({ calories: value, ...distributeMacros(value) });
  };

  const ensureTarget = async (): Promise<DailyNutritionTarget> => {
    if (target) return target;
    setCreatingTarget(true);
    try {
      return await onTargetSave({
        athlete_id: athleteId,
        target_date: date,
        day_type: inferDayType(sessions),
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        notes: null,
      });
    } finally {
      setCreatingTarget(false);
    }
  };

  const totals = mealItems.reduce(
    (s, m) => ({
      calories: s.calories + m.calories,
      protein_g: s.protein_g + m.protein_g,
      carbs_g: s.carbs_g + m.carbs_g,
      fat_g: s.fat_g + m.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
  const ratio = draft.calories ? Math.min(1.5, totals.calories / draft.calories) : 0;

  return (
    <section
      className="rounded-md bg-white flex flex-col"
      style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
    >
      <header
        className="px-4 py-3 flex items-baseline justify-between gap-3"
        style={{ background: TOKENS.PANEL_BG, borderBottom: `1px solid ${TOKENS.HAIRLINE}` }}
      >
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
            Nutrition
          </div>
          <div className="text-[13px] font-medium text-slate-900 mt-0.5">
            {formatDateShort(date)} · {draft.calories || '—'} kcal · {mealItems.length} repas
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          {saving ? 'Sauvegarde…' : dirty ? 'En attente' : 'Synchronisé'}
        </div>
      </header>

      <div className="p-4 flex flex-col gap-4">
        {/* Macros block */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <Select label="Type" value={draft.day_type} onChange={e => update({ day_type: e.target.value as DayType })}>
            {DAY_TYPES.map(d => <option key={d} value={d}>{DAY_TYPE_LABELS[d]}</option>)}
          </Select>
          <Input label="Kcal" type="number" value={draft.calories} onChange={e => updateCalories(Number(e.target.value))} />
          <Input label="Prot." type="number" value={draft.protein_g} onChange={e => update({ protein_g: Number(e.target.value) })} />
          <Input label="Gluc." type="number" value={draft.carbs_g} onChange={e => update({ carbs_g: Number(e.target.value) })} />
          <Input label="Lip." type="number" value={draft.fat_g} onChange={e => update({ fat_g: Number(e.target.value) })} />
        </div>
        <Textarea label="Notes" rows={2} value={draft.notes} onChange={e => update({ notes: e.target.value })} />
        {error && <div className="text-xs" style={{ color: TOKENS.AMBER }}>{error}</div>}

        {/* Coverage progress */}
        <div className="rounded-md p-3" style={{ background: TOKENS.PANEL_BG, border: `1px solid ${TOKENS.HAIRLINE}` }}>
          <div className="flex items-baseline justify-between text-[11px]">
            <span className="uppercase tracking-[0.12em] font-medium text-slate-500">Couverture repas</span>
            <span className="font-mono tabular-nums text-slate-700">
              {totals.calories}/{draft.calories || 0} kcal
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: TOKENS.HAIRLINE }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(Math.min(1, ratio) * 100)}%`,
                background: ratio > 1.1 ? TOKENS.AMBER : TOKENS.TEAL,
              }}
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-slate-500">
            <span>P {totals.protein_g}/{draft.protein_g || 0} g</span>
            <span>G {totals.carbs_g}/{draft.carbs_g || 0} g</span>
            <span>L {totals.fat_g}/{draft.fat_g || 0} g</span>
          </div>
        </div>

        {/* Meal items */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">Repas / collations</span>
          </div>
          {mealItems.map(item => (
            <MealItemEditor
              key={item.id}
              item={item}
              onSave={onMealSave}
              onDelete={onMealDelete}
            />
          ))}
          <NewMealItemForm
            disabled={creatingTarget}
            nextPosition={mealItems.length}
            onCreate={async input => {
              const savedTarget = await ensureTarget();
              await onMealSave({ ...input, target_id: savedTarget.id });
            }}
          />
        </div>
      </div>
    </section>
  );
}

function NewMealItemForm({
  nextPosition, disabled, onCreate,
}: {
  nextPosition: number;
  disabled: boolean;
  onCreate: (input: Omit<NutritionMealItemInput, 'target_id'> & { target_id?: string }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setOpen(true)}>
        + Ajouter un repas
      </Button>
    );
  }

  return (
    <MealItemForm
      initial={{
        target_id: '',
        meal_slot: 'snack',
        name: '',
        quantity: '',
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        notes: '',
        position: nextPosition,
      }}
      onCancel={() => setOpen(false)}
      onSubmit={async input => {
        await onCreate(input);
        setOpen(false);
      }}
    />
  );
}

function MealItemEditor({
  item, onSave, onDelete,
}: {
  item: NutritionMealItem;
  onSave: (input: NutritionMealItemInput) => Promise<NutritionMealItem>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <MealItemForm
        initial={item}
        onCancel={() => setEditing(false)}
        onDelete={async () => {
          await onDelete(item.id);
          setEditing(false);
        }}
        onSubmit={async input => {
          await onSave(input);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded-md text-left px-3 py-2 hover:bg-[#FAFAF8] transition-colors"
      style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-slate-900 truncate">{item.name}</div>
          <div className="mt-0.5 text-[11px] text-slate-500 truncate">
            {MEAL_SLOT_LABELS[item.meal_slot]}{item.quantity ? ` · ${item.quantity}` : ''}
          </div>
        </div>
        <div className="font-mono text-[11px] text-slate-700 tabular-nums">{item.calories} kcal</div>
      </div>
    </button>
  );
}

function MealItemForm({
  initial, onSubmit, onCancel, onDelete,
}: {
  initial: NutritionMealItemInput;
  onSubmit: (input: NutritionMealItemInput) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    ...initial,
    quantity: initial.quantity ?? '',
    notes: initial.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!draft.name.trim()) {
      setError('Le nom est requis.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        ...draft,
        name: draft.name.trim(),
        quantity: draft.quantity?.trim() || null,
        notes: draft.notes?.trim() || null,
        calories: Number(draft.calories) || 0,
        protein_g: Number(draft.protein_g) || 0,
        carbs_g: Number(draft.carbs_g) || 0,
        fat_g: Number(draft.fat_g) || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sauvegarde impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md bg-white p-3 flex flex-col gap-2" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <Select label="Repas" value={draft.meal_slot} onChange={e => setDraft(p => ({ ...p, meal_slot: e.target.value as MealSlot }))}>
        {MEAL_SLOTS.map(s => <option key={s} value={s}>{MEAL_SLOT_LABELS[s]}</option>)}
      </Select>
      <Input label="Item" value={draft.name} placeholder="Ex : riz basmati + poulet" onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} />
      <Input label="Quantité" value={draft.quantity ?? ''} placeholder="Ex : 150 g + 120 g" onChange={e => setDraft(p => ({ ...p, quantity: e.target.value }))} />
      <div className="grid grid-cols-2 gap-2">
        <Input label="Kcal" type="number" value={draft.calories} onChange={e => setDraft(p => ({ ...p, calories: Number(e.target.value) }))} />
        <Input label="Prot." type="number" value={draft.protein_g} onChange={e => setDraft(p => ({ ...p, protein_g: Number(e.target.value) }))} />
        <Input label="Gluc." type="number" value={draft.carbs_g} onChange={e => setDraft(p => ({ ...p, carbs_g: Number(e.target.value) }))} />
        <Input label="Lip." type="number" value={draft.fat_g} onChange={e => setDraft(p => ({ ...p, fat_g: Number(e.target.value) }))} />
      </div>
      <Textarea label="Notes" rows={2} value={draft.notes ?? ''} onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))} />
      {error && <div className="text-xs" style={{ color: TOKENS.AMBER }}>{error}</div>}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} loading={saving}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        {onDelete && <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────

function inferDayType(sessions: TrainingSession[]): DayType {
  if (sessions.some(s => s.session_type === 'competition')) return 'competition';
  if (sessions.some(s => (s.planned_intensity ?? 0) >= 7 || s.session_type === 'strength' || s.session_type === 'endurance')) return 'intense';
  if (sessions.length > 0) return 'light';
  return 'rest';
}

function numberOrNull(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
