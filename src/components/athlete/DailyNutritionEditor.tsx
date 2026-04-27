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
import { DAY_TYPES, DAY_TYPE_LABELS, MEAL_SLOTS, MEAL_SLOT_LABELS } from '@/types/database';
import type { DailyNutritionTarget, DayType, MealSlot, NutritionMealItem, TrainingSession, TrainingSessionStatus } from '@/types/database';
import { TRAINING_SESSION_STATUS_LABELS, TRAINING_SESSION_TYPE_LABELS } from '@/types/database';
import type { DailyNutritionTargetInput, NutritionMealItemInput } from '@/hooks/useDailyNutritionTargets';

interface Props {
  athleteId: string;
  weekStart: string;
  onWeekChange: (weekStart: string) => void;
  targetsByDate: Map<string, DailyNutritionTarget>;
  mealItemsByTargetId: Map<string, NutritionMealItem[]>;
  sessions: TrainingSession[];
  loading: boolean;
  error: string | null;
  upsertTarget: (input: DailyNutritionTargetInput) => Promise<DailyNutritionTarget>;
  upsertMealItem: (input: NutritionMealItemInput) => Promise<NutritionMealItem>;
  deleteMealItem: (id: string) => Promise<void>;
  generateWeekFromSessions: (weekStart: string, sessions: TrainingSession[], baseCalories?: number) => Promise<DailyNutritionTarget[]>;
}

export function DailyNutritionEditor({
  athleteId,
  weekStart,
  onWeekChange,
  targetsByDate,
  mealItemsByTargetId,
  sessions,
  loading,
  error,
  upsertTarget,
  upsertMealItem,
  deleteMealItem,
  generateWeekFromSessions,
}: Props) {
  const [baseCalories, setBaseCalories] = useState(2400);
  const [generating, setGenerating] = useState(false);
  const days = useMemo(() => isoWeekDays(weekStart), [weekStart]);
  const [selectedDate, setSelectedDate] = useState(weekStart);
  const selectedTarget = targetsByDate.get(selectedDate) ?? null;
  const selectedSessions = sessions.filter(session => session.session_date === selectedDate);
  const selectedMealItems = selectedTarget ? (mealItemsByTargetId.get(selectedTarget.id) ?? []) : [];

  useEffect(() => {
    if (!days.includes(selectedDate)) setSelectedDate(weekStart);
  }, [days, selectedDate, weekStart]);

  const daySummaries = useMemo<WeekDaySummary[]>(
    () => days.map(day => {
      const target = targetsByDate.get(day);
      const daySessions = sessions.filter(session => session.session_date === day);
      const meals = target ? (mealItemsByTargetId.get(target.id) ?? []) : [];
      return {
        date: day,
        label: target ? `${target.calories} kcal` : 'Cible manquante',
        subline: meals.length ? `${meals.length} item(s) repas` : daySessions.length ? `${daySessions.length} séance(s)` : DAY_TYPE_LABELS[target?.day_type ?? 'rest'],
        tone: target ? 'ok' : 'warn',
      };
    }),
    [days, mealItemsByTargetId, sessions, targetsByDate],
  );

  const generate = async () => {
    setGenerating(true);
    try {
      await generateWeekFromSessions(weekStart, sessions, baseCalories);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutrition quotidienne</CardTitle>
        <WeekSelector weekStart={weekStart} onChange={onWeekChange} />
      </CardHeader>
      <CardBody className="flex flex-col gap-5">
        {error && <ErrorMessage message={error} />}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[180px]">
            <Input
              label="Base kcal"
              type="number"
              value={baseCalories}
              onChange={event => setBaseCalories(Number(event.target.value))}
            />
          </div>
          <Button variant="secondary" onClick={generate} loading={generating}>
            Générer depuis les séances
          </Button>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
        ) : (
          <>
            <WeekDayPicker days={daySummaries} selectedDate={selectedDate} onSelect={setSelectedDate} />
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
              <NutritionDayWorkspace
                key={selectedDate}
                athleteId={athleteId}
                date={selectedDate}
                target={selectedTarget}
                sessions={selectedSessions}
                mealItems={selectedMealItems}
                onTargetSave={upsertTarget}
                onMealSave={upsertMealItem}
                onMealDelete={deleteMealItem}
              />
              <DailyContextSummary
                date={selectedDate}
                sessions={selectedSessions}
                target={selectedTarget}
                mealItems={selectedMealItems}
              />
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// LEFT — full editing workspace (macros + meal items)
// ─────────────────────────────────────────────────────────────────────

function NutritionDayWorkspace({
  athleteId,
  date,
  target,
  sessions,
  mealItems,
  onTargetSave,
  onMealSave,
  onMealDelete,
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
    setDraft(prev => ({ ...prev, ...patch }));
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

  return (
    <div className="rounded-md bg-white p-4 flex flex-col gap-5" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <header className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
        <div>
          <div className="text-[13px] font-medium text-slate-900">{formatDateShort(date)}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {sessions.length ? `${sessions.length} séance(s) planifiée(s)` : 'Pas de séance'}
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          {saving ? 'Sauvegarde…' : dirty ? 'En attente' : 'Synchronisé'}
        </div>
      </header>

      {/* ───── Macros block ───── */}
      <section className="flex flex-col gap-3">
        <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
          Cible nutritionnelle
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Select
            label="Type"
            value={draft.day_type}
            onChange={event => update({ day_type: event.target.value as DayType })}
          >
            {DAY_TYPES.map(dt => <option key={dt} value={dt}>{DAY_TYPE_LABELS[dt]}</option>)}
          </Select>
          <Input label="Calories" type="number" value={draft.calories} onChange={event => updateCalories(Number(event.target.value))} />
          <Input label="Prot."   type="number" value={draft.protein_g} onChange={event => update({ protein_g: Number(event.target.value) })} />
          <Input label="Gluc."   type="number" value={draft.carbs_g}   onChange={event => update({ carbs_g: Number(event.target.value) })} />
          <Input label="Lip."    type="number" value={draft.fat_g}     onChange={event => update({ fat_g: Number(event.target.value) })} />
        </div>
        <Textarea
          label="Notes"
          rows={3}
          value={draft.notes}
          onChange={event => update({ notes: event.target.value })}
        />
        {error && <div className="text-xs" style={{ color: TOKENS.AMBER }}>{error}</div>}
      </section>

      {/* ───── Meal items block — all inputs live here ───── */}
      <section className="flex flex-col gap-3 pt-4" style={{ borderTop: `1px solid ${TOKENS.HAIRLINE}` }}>
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
            Repas / collations
          </div>
          <div className="text-[11px] font-mono text-slate-500 tabular-nums">
            {mealItems.length} item{mealItems.length > 1 ? 's' : ''}
          </div>
        </div>

        {mealItems.length === 0 && (
          <div
            className="rounded-md bg-[#FAFAF8] px-3 py-3 text-[12px] text-slate-500"
            style={{ border: `1px dashed ${TOKENS.HAIRLINE}` }}
          >
            Aucun repas détaillé. Ajoute les aliments ou collations pour visualiser la journée complète.
          </div>
        )}

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
      </section>
    </div>
  );
}

function NewMealItemForm({
  nextPosition,
  disabled,
  onCreate,
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
  item,
  onSave,
  onDelete,
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
      className="rounded-md bg-white px-3 py-2 text-left hover:bg-[#FAFAF8] transition-colors"
      style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-slate-900 truncate">{item.name}</div>
          <div className="mt-0.5 text-[11px] text-slate-500 truncate">
            {MEAL_SLOT_LABELS[item.meal_slot]} · {item.quantity || 'quantité libre'}
          </div>
        </div>
        <div className="font-mono text-[11px] text-slate-700 tabular-nums">{item.calories} kcal</div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-slate-500">
        <span>P {item.protein_g} g</span>
        <span>G {item.carbs_g} g</span>
        <span>L {item.fat_g} g</span>
      </div>
    </button>
  );
}

function MealItemForm({
  initial,
  onSubmit,
  onCancel,
  onDelete,
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
      setError('Le nom de l’item est requis.');
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
      <Select label="Repas" value={draft.meal_slot} onChange={event => setDraft(prev => ({ ...prev, meal_slot: event.target.value as MealSlot }))}>
        {MEAL_SLOTS.map(slot => <option key={slot} value={slot}>{MEAL_SLOT_LABELS[slot]}</option>)}
      </Select>
      <Input label="Item" value={draft.name} placeholder="Ex : riz basmati + poulet" onChange={event => setDraft(prev => ({ ...prev, name: event.target.value }))} />
      <Input label="Quantité" value={draft.quantity ?? ''} placeholder="Ex : 150 g + 120 g" onChange={event => setDraft(prev => ({ ...prev, quantity: event.target.value }))} />
      <div className="grid grid-cols-2 gap-2">
        <Input label="Kcal" type="number" value={draft.calories} onChange={event => setDraft(prev => ({ ...prev, calories: Number(event.target.value) }))} />
        <Input label="Prot." type="number" value={draft.protein_g} onChange={event => setDraft(prev => ({ ...prev, protein_g: Number(event.target.value) }))} />
        <Input label="Gluc." type="number" value={draft.carbs_g} onChange={event => setDraft(prev => ({ ...prev, carbs_g: Number(event.target.value) }))} />
        <Input label="Lip." type="number" value={draft.fat_g} onChange={event => setDraft(prev => ({ ...prev, fat_g: Number(event.target.value) }))} />
      </div>
      <Textarea label="Notes" rows={2} value={draft.notes ?? ''} onChange={event => setDraft(prev => ({ ...prev, notes: event.target.value }))} />
      {error && <div className="text-xs" style={{ color: TOKENS.AMBER }}>{error}</div>}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save} loading={saving}>Save</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        {onDelete && <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// RIGHT — read-only daily context summary (no inputs)
// ─────────────────────────────────────────────────────────────────────

function DailyContextSummary({
  date,
  sessions,
  target,
  mealItems,
}: {
  date: string;
  sessions: TrainingSession[];
  target: DailyNutritionTarget | null;
  mealItems: NutritionMealItem[];
}) {
  const totals = sumMeals(mealItems);
  const calorieRatio = target?.calories ? Math.min(1.5, totals.calories / target.calories) : 0;

  return (
    <aside
      className="rounded-md p-4 h-fit flex flex-col gap-4"
      style={{ background: '#FAFAF8', border: `1px solid ${TOKENS.HAIRLINE}` }}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
            Contexte du jour
          </div>
          <div className="mt-1 text-[13px] font-medium text-slate-900">{formatDateShort(date)}</div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
          read-only
        </div>
      </div>

      {/* Macros target overview */}
      <div className="grid grid-cols-2 gap-3 text-[12px]">
        <Metric label="Type" value={target ? DAY_TYPE_LABELS[target.day_type] : 'Non défini'} />
        <Metric label="Séances" value={String(sessions.length)} />
        <Metric label="Calories cible" value={target ? `${target.calories} kcal` : '—'} />
        <Metric label="Protéines" value={target ? `${target.protein_g} g` : '—'} />
        <Metric label="Glucides" value={target ? `${target.carbs_g} g` : '—'} />
        <Metric label="Lipides" value={target ? `${target.fat_g} g` : '—'} />
      </div>

      {/* Meal coverage */}
      <div className="rounded-md bg-white p-3" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
            Couverture repas
          </div>
          <div className="text-[11px] font-mono text-slate-500 tabular-nums">
            {mealItems.length} item{mealItems.length > 1 ? 's' : ''}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <Metric label="Kcal" value={`${totals.calories}/${target?.calories ?? 0}`} />
          <Metric label="Prot." value={`${totals.protein_g}/${target?.protein_g ?? 0} g`} />
          <Metric label="Gluc." value={`${totals.carbs_g}/${target?.carbs_g ?? 0} g`} />
          <Metric label="Lip." value={`${totals.fat_g}/${target?.fat_g ?? 0} g`} />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: TOKENS.HAIRLINE }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(Math.min(1, calorieRatio) * 100)}%`,
              background: calorieRatio > 1.1 ? TOKENS.AMBER : TOKENS.TEAL,
            }}
          />
        </div>
        {calorieRatio > 1.1 && (
          <div className="mt-2 text-[10px] uppercase tracking-[0.1em]" style={{ color: TOKENS.AMBER }}>
            Dépassement {Math.round((calorieRatio - 1) * 100)}%
          </div>
        )}
      </div>

      {/* Meal items — read only */}
      {mealItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
            Liste des repas
          </div>
          {mealItems.map(item => (
            <div
              key={item.id}
              className="rounded-md bg-white px-3 py-2"
              style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-slate-900 truncate">{item.name}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500 truncate">
                    {MEAL_SLOT_LABELS[item.meal_slot]}
                    {item.quantity ? ` · ${item.quantity}` : ''}
                  </div>
                </div>
                <div className="font-mono text-[11px] text-slate-700 tabular-nums shrink-0">
                  {item.calories} kcal
                </div>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                <span>P {item.protein_g} g</span>
                <span>G {item.carbs_g} g</span>
                <span>L {item.fat_g} g</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sessions — read only */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
          Séances du jour
        </div>
        {sessions.length === 0 ? (
          <div className="text-[12px] text-slate-500">
            Aucune séance planifiée. Le jour peut rester en repos ou léger.
          </div>
        ) : sessions.map(session => (
          <div
            key={session.id}
            className="rounded-md bg-white px-3 py-2"
            style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[12px] font-medium text-slate-900 truncate">{session.title}</div>
              <SessionStatusPill status={session.status} />
            </div>
            <div className="mt-1 text-[10px] text-slate-500 truncate">
              {TRAINING_SESSION_TYPE_LABELS[session.session_type]}
              {' · '}
              {session.planned_duration_min ?? '—'} min
              {' · '}
              intensité {session.planned_intensity ?? '—'}/10
            </div>
            {session.rpe !== null && session.rpe !== undefined && (
              <div className="mt-1 text-[10px] text-slate-500">
                RPE rapporté <span className="font-mono tabular-nums text-slate-700">{session.rpe}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

function SessionStatusPill({ status }: { status: TrainingSessionStatus }) {
  const tone =
    status === 'completed' ? TOKENS.TEAL :
    status === 'missed'    ? TOKENS.AMBER :
    status === 'modified'  ? '#B5478B' :
    TOKENS.SLATE;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em]">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone }} />
      <span className="text-slate-600">{TRAINING_SESSION_STATUS_LABELS[status]}</span>
    </span>
  );
}

function sumMeals(items: NutritionMealItem[]) {
  return items.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      protein_g: sum.protein_g + item.protein_g,
      carbs_g: sum.carbs_g + item.carbs_g,
      fat_g: sum.fat_g + item.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 text-slate-800 truncate">{value}</div>
    </div>
  );
}

function inferDayType(sessions: TrainingSession[]): DayType {
  if (sessions.some(session => session.session_type === 'competition')) return 'competition';
  if (sessions.some(session => (session.planned_intensity ?? 0) >= 7 || session.session_type === 'strength' || session.session_type === 'endurance')) return 'intense';
  if (sessions.length > 0) return 'light';
  return 'rest';
}
