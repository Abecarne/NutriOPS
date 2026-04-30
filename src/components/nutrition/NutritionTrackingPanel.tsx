import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { TOKENS } from '@/components/dashboard/kit';
import { useNutritionTracking } from '@/hooks/useNutritionTracking';
import { isoDate, shiftDate } from '@/lib/utils';
import { MEAL_LOG_TYPE_LABELS, MEAL_LOG_TYPES } from '@/types/database';
import type { MealLog, MealLogType, NutritionTarget } from '@/types/database';

export function NutritionTrackingPanel({ athleteId }: { athleteId: string }) {
  const [startDate] = useState(() => shiftDate(isoDate(), -14));
  const nutrition = useNutritionTracking(athleteId, startDate);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [showMealForm, setShowMealForm] = useState(false);

  const totalsByDate = useMemo(() => {
    const map = new Map<string, { calories: number; protein: number; carbs: number; fat: number; count: number }>();
    for (const log of nutrition.mealLogs) {
      const current = map.get(log.log_date) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
      map.set(log.log_date, {
        calories: current.calories + (log.calories ?? 0),
        protein: current.protein + (log.protein_g ?? 0),
        carbs: current.carbs + (log.carbs_g ?? 0),
        fat: current.fat + (log.fat_g ?? 0),
        count: current.count + 1,
      });
    }
    return map;
  }, [nutrition.mealLogs]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Objectifs nutrition</CardTitle>
          <Button size="sm" onClick={() => setShowTargetForm(true)}>+ Objectif</Button>
        </CardHeader>
        <CardBody>
          {nutrition.error && <ErrorMessage message={nutrition.error} className="mb-4" />}
          {nutrition.loading ? (
            <div className="py-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
          ) : (
            <div className="flex flex-col gap-4">
              {showTargetForm && (
                <NutritionTargetForm
                  athleteId={athleteId}
                  target={nutrition.activeTarget}
                  onSave={async input => {
                    await nutrition.upsertTarget(input);
                    setShowTargetForm(false);
                  }}
                  onCancel={() => setShowTargetForm(false)}
                />
              )}
              {nutrition.activeTarget ? (
                <TargetSummary target={nutrition.activeTarget} />
              ) : (
                <div className="rounded-md border border-dashed border-[#EAE9E5] p-8 text-center text-sm text-slate-500">
                  Aucun objectif nutrition global. Ajoute calories, macros et eau pour cadrer le journal.
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal alimentaire</CardTitle>
          <Button size="sm" onClick={() => setShowMealForm(true)}>+ Repas</Button>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-4">
            {showMealForm && (
              <MealLogForm
                athleteId={athleteId}
                onSave={async input => {
                  await nutrition.upsertMealLog(input);
                  setShowMealForm(false);
                }}
                onCancel={() => setShowMealForm(false)}
              />
            )}
            {nutrition.mealLogs.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#EAE9E5] p-8 text-center text-sm text-slate-500">
                Aucun repas loggé sur les 14 derniers jours.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {Array.from(totalsByDate.entries()).map(([date, totals]) => (
                  <div key={date} className="rounded-md overflow-hidden" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
                    <div className="px-4 py-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between" style={{ background: TOKENS.PANEL_BG }}>
                      <div className="text-[13px] font-medium text-slate-900">{date}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {totals.count} repas · {totals.calories} kcal · P {totals.protein} · G {totals.carbs} · L {totals.fat}
                      </div>
                    </div>
                    <div className="p-3 flex flex-col gap-2">
                      {(nutrition.logsByDate.get(date) ?? []).map(log => (
                        <MealLogRow key={log.id} log={log} onDelete={nutrition.deleteMealLog} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function TargetSummary({ target }: { target: NutritionTarget }) {
  const values = [
    ['Calories', `${target.calories_target} kcal`],
    ['Protéines', `${target.protein_target_g} g`],
    ['Glucides', `${target.carbs_target_g} g`],
    ['Lipides', `${target.fat_target_g} g`],
    ['Eau', target.water_target_l ? `${target.water_target_l} L` : '—'],
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-px rounded-md overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
      {values.map(([label, value]) => (
        <div key={label} className="bg-white px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
          <div className="mt-1 font-mono text-[16px] text-slate-900">{value}</div>
        </div>
      ))}
    </div>
  );
}

function NutritionTargetForm({
  athleteId,
  target,
  onSave,
  onCancel,
}: {
  athleteId: string;
  target: NutritionTarget | null;
  onSave: (input: Parameters<ReturnType<typeof useNutritionTracking>['upsertTarget']>[0]) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({
    calories_target: target?.calories_target ?? 2400,
    protein_target_g: target?.protein_target_g ?? 160,
    carbs_target_g: target?.carbs_target_g ?? 260,
    fat_target_g: target?.fat_target_g ?? 70,
    water_target_l: target?.water_target_l ?? 2.5,
    notes: target?.notes ?? '',
    start_date: target?.start_date ?? isoDate(),
    end_date: target?.end_date ?? '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({
      calories_target: target?.calories_target ?? 2400,
      protein_target_g: target?.protein_target_g ?? 160,
      carbs_target_g: target?.carbs_target_g ?? 260,
      fat_target_g: target?.fat_target_g ?? 70,
      water_target_l: target?.water_target_l ?? 2.5,
      notes: target?.notes ?? '',
      start_date: target?.start_date ?? isoDate(),
      end_date: target?.end_date ?? '',
    });
  }, [target]);

  return (
    <div className="rounded-md border border-[#EAE9E5] p-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
      <Input label="Calories" type="number" value={draft.calories_target} onChange={e => setDraft(p => ({ ...p, calories_target: Number(e.target.value) }))} />
      <Input label="Protéines" type="number" value={draft.protein_target_g} onChange={e => setDraft(p => ({ ...p, protein_target_g: Number(e.target.value) }))} />
      <Input label="Glucides" type="number" value={draft.carbs_target_g} onChange={e => setDraft(p => ({ ...p, carbs_target_g: Number(e.target.value) }))} />
      <Input label="Lipides" type="number" value={draft.fat_target_g} onChange={e => setDraft(p => ({ ...p, fat_target_g: Number(e.target.value) }))} />
      <Input label="Eau (L)" type="number" step="0.1" value={draft.water_target_l} onChange={e => setDraft(p => ({ ...p, water_target_l: Number(e.target.value) }))} />
      <Input label="Début" type="date" value={draft.start_date} onChange={e => setDraft(p => ({ ...p, start_date: e.target.value }))} />
      <Input label="Fin" type="date" value={draft.end_date} onChange={e => setDraft(p => ({ ...p, end_date: e.target.value }))} />
      <Textarea label="Notes coach" rows={3} className="sm:col-span-4" value={draft.notes} onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))} />
      <div className="sm:col-span-4 flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={saving}>Annuler</Button>
        <Button
          size="sm"
          loading={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                id: target?.id,
                athlete_id: athleteId,
                calories_target: draft.calories_target,
                protein_target_g: draft.protein_target_g,
                carbs_target_g: draft.carbs_target_g,
                fat_target_g: draft.fat_target_g,
                water_target_l: draft.water_target_l,
                notes: draft.notes.trim() || null,
                start_date: draft.start_date,
                end_date: draft.end_date || null,
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function MealLogForm({
  athleteId,
  onSave,
  onCancel,
}: {
  athleteId: string;
  onSave: (input: Parameters<ReturnType<typeof useNutritionTracking>['upsertMealLog']>[0]) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({
    log_date: isoDate(),
    meal_type: 'lunch' as MealLogType,
    description: '',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    photo_url: '',
    adherence_rating: '',
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-md border border-[#EAE9E5] p-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
      <Input label="Date" type="date" value={draft.log_date} onChange={e => setDraft(p => ({ ...p, log_date: e.target.value }))} />
      <Select label="Repas" value={draft.meal_type} onChange={e => setDraft(p => ({ ...p, meal_type: e.target.value as MealLogType }))}>
        {MEAL_LOG_TYPES.map(type => <option key={type} value={type}>{MEAL_LOG_TYPE_LABELS[type]}</option>)}
      </Select>
      <Input label="Adhérence (1-5)" type="number" min={1} max={5} value={draft.adherence_rating} onChange={e => setDraft(p => ({ ...p, adherence_rating: e.target.value }))} />
      <Input label="Calories" type="number" value={draft.calories} onChange={e => setDraft(p => ({ ...p, calories: e.target.value }))} />
      <Textarea label="Description" rows={3} className="sm:col-span-4" value={draft.description} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} />
      <Input label="Protéines" type="number" value={draft.protein_g} onChange={e => setDraft(p => ({ ...p, protein_g: e.target.value }))} />
      <Input label="Glucides" type="number" value={draft.carbs_g} onChange={e => setDraft(p => ({ ...p, carbs_g: e.target.value }))} />
      <Input label="Lipides" type="number" value={draft.fat_g} onChange={e => setDraft(p => ({ ...p, fat_g: e.target.value }))} />
      <Input label="Photo URL" value={draft.photo_url} onChange={e => setDraft(p => ({ ...p, photo_url: e.target.value }))} />
      <div className="sm:col-span-4 flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={saving}>Annuler</Button>
        <Button
          size="sm"
          loading={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                athlete_id: athleteId,
                log_date: draft.log_date,
                meal_type: draft.meal_type,
                description: draft.description.trim() || 'Repas',
                calories: numberOrNull(draft.calories),
                protein_g: numberOrNull(draft.protein_g),
                carbs_g: numberOrNull(draft.carbs_g),
                fat_g: numberOrNull(draft.fat_g),
                photo_url: draft.photo_url.trim() || null,
                adherence_rating: numberOrNull(draft.adherence_rating),
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          Ajouter le repas
        </Button>
      </div>
    </div>
  );
}

function MealLogRow({ log, onDelete }: { log: MealLog; onDelete: (id: string) => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="rounded-md border border-[#EAE9E5] px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-2">
          <div className="text-[13px] font-medium text-slate-900">{MEAL_LOG_TYPE_LABELS[log.meal_type]}</div>
          {log.adherence_rating && <div className="text-[11px] text-slate-500">adhérence {log.adherence_rating}/5</div>}
        </div>
        <div className="mt-1 text-[12px] text-slate-600 whitespace-pre-wrap">{log.description}</div>
        <div className="mt-1 font-mono text-[11px] text-slate-500">
          {log.calories ?? '—'} kcal · P {log.protein_g ?? '—'} · G {log.carbs_g ?? '—'} · L {log.fat_g ?? '—'}
        </div>
        {log.photo_url && <div className="mt-1 text-[11px] text-slate-400 truncate">{log.photo_url}</div>}
      </div>
      <Button
        size="sm"
        variant="ghost"
        loading={deleting}
        onClick={async () => {
          setDeleting(true);
          try {
            await onDelete(log.id);
          } finally {
            setDeleting(false);
          }
        }}
      >
        Supprimer
      </Button>
    </div>
  );
}

function numberOrNull(value: string) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
