import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { useDailyCheckinContext } from '@/hooks/useDailyCheckinContext';
import { supabase } from '@/lib/supabase';
import { formatDate, isoDate } from '@/lib/utils';
import { MEAL_SLOT_LABELS, NUTRITION_ADHERENCE_LABELS, TRAINING_SESSION_STATUS_LABELS, TRAINING_SESSION_TYPE_LABELS } from '@/types/database';
import type { NutritionAdherence, NutritionMealItem, TrainingSession, TrainingSessionStatus } from '@/types/database';

const schema = z.object({
  weight_kg: z.coerce.number().min(30, 'Poids trop bas').max(250, 'Poids trop élevé'),
  energy_level: z.coerce.number().int().min(1).max(5),
  sleep_quality: z.coerce.number().int().min(1).max(5),
  soreness_level: z.coerce.number().int().min(1).max(5),
  stress_level: z.coerce.number().int().min(1).max(5),
  motivation_level: z.coerce.number().int().min(1).max(5),
  hunger_level: z.coerce.number().int().min(1).max(5),
  digestion_quality: z.coerce.number().int().min(1).max(5),
  nutrition_adherence: z.enum(['low', 'medium', 'high']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type FeedbackState = Record<string, {
  status: TrainingSessionStatus;
  actual_duration_min: string;
  rpe: string;
  athlete_notes: string;
}>;

export function CheckinPage() {
  const { token } = useParams<{ token: string }>();
  const checkinDate = useMemo(() => isoDate(), []);
  const { context, loading, error, refresh } = useDailyCheckinContext(token, checkinDate);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      energy_level: 3,
      sleep_quality: 3,
      soreness_level: 3,
      stress_level: 3,
      motivation_level: 3,
      hunger_level: 3,
      digestion_quality: 3,
      nutrition_adherence: 'medium',
      notes: '',
    },
  });

  useEffect(() => {
    if (!context) return;
    document.documentElement.style.setProperty('--brand', context.primary_color || '#1D9E75');
    if (context.checkin) {
      form.reset({
        weight_kg: Number(context.checkin.weight_kg),
        energy_level: context.checkin.energy_level,
        sleep_quality: context.checkin.sleep_quality,
        soreness_level: context.checkin.soreness_level ?? 3,
        stress_level: context.checkin.stress_level ?? 3,
        motivation_level: context.checkin.motivation_level ?? 3,
        hunger_level: context.checkin.hunger_level ?? 3,
        digestion_quality: context.checkin.digestion_quality ?? 3,
        nutrition_adherence: context.checkin.nutrition_adherence ?? 'medium',
        notes: context.checkin.notes ?? '',
      });
    }
    setFeedback(Object.fromEntries(context.training_sessions.map(session => [
      session.id,
      {
        status: session.status,
        actual_duration_min: session.actual_duration_min?.toString() ?? session.planned_duration_min?.toString() ?? '',
        rpe: session.rpe?.toString() ?? '',
        athlete_notes: session.athlete_notes ?? '',
      },
    ])));
  }, [context, form]);

  const firstName = context?.full_name.split(' ')[0] ?? '';

  const onSubmit = async (values: FormValues) => {
    if (!token) return;
    form.clearErrors('root');
    setSubmitted(false);
    try {
      const { error: checkinError } = await supabase.rpc('submit_daily_checkin', {
        p_token: token,
        p_checkin_date: checkinDate,
        p_weight_kg: values.weight_kg,
        p_energy_level: values.energy_level,
        p_sleep_quality: values.sleep_quality,
        p_soreness_level: values.soreness_level,
        p_stress_level: values.stress_level,
        p_motivation_level: values.motivation_level,
        p_hunger_level: values.hunger_level,
        p_digestion_quality: values.digestion_quality,
        p_nutrition_adherence: values.nutrition_adherence,
        p_notes: values.notes?.trim() || null,
      });
      if (checkinError) throw checkinError;

      for (const session of context?.training_sessions ?? []) {
        const item = feedback[session.id];
        if (!item) continue;
        const { error: feedbackError } = await supabase.rpc('submit_training_feedback', {
          p_token: token,
          p_session_id: session.id,
          p_status: item.status,
          p_actual_duration_min: item.actual_duration_min ? Number(item.actual_duration_min) : null,
          p_rpe: item.rpe ? Number(item.rpe) : null,
          p_athlete_notes: item.athlete_notes.trim() || null,
        });
        if (feedbackError) throw feedbackError;
      }

      setSubmitted(true);
      await refresh();
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Enregistrement impossible',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (error || !context) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ErrorMessage message={error ?? 'Check-in introuvable.'} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] p-4 sm:p-6">
      <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
        <header className="bg-white rounded-md border border-[#EAE9E5] p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{context.club_name || 'NutriOps'}</div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Check-in quotidien</h1>
          <p className="text-sm text-slate-600 mt-1">
            Bonjour {firstName}, renseigne tes données du {formatDate(checkinDate)}.
          </p>
        </header>

        <DailyContextPanel
          sessions={context.training_sessions}
          target={context.nutrition_target}
          mealItems={context.nutrition_meal_items}
        />

        {submitted && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Check-in enregistré. Tu peux modifier puis renvoyer le formulaire si besoin.
          </div>
        )}

        {form.formState.errors.root?.message && (
          <ErrorMessage message={form.formState.errors.root.message} />
        )}

        <form className="bg-white rounded-md border border-[#EAE9E5] p-5 flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
          <Input
            label="Poids du matin (kg)"
            type="number"
            step="0.1"
            {...form.register('weight_kg')}
            error={form.formState.errors.weight_kg?.message}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <RatingField label="Énergie" value={form.watch('energy_level')} onChange={value => form.setValue('energy_level', value, { shouldValidate: true })} />
            <RatingField label="Sommeil" value={form.watch('sleep_quality')} onChange={value => form.setValue('sleep_quality', value, { shouldValidate: true })} />
            <RatingField label="Soreness / douleurs" value={form.watch('soreness_level')} onChange={value => form.setValue('soreness_level', value, { shouldValidate: true })} />
            <RatingField label="Stress" value={form.watch('stress_level')} onChange={value => form.setValue('stress_level', value, { shouldValidate: true })} />
            <RatingField label="Motivation" value={form.watch('motivation_level')} onChange={value => form.setValue('motivation_level', value, { shouldValidate: true })} />
            <RatingField label="Faim" value={form.watch('hunger_level')} onChange={value => form.setValue('hunger_level', value, { shouldValidate: true })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <RatingField label="Digestion" value={form.watch('digestion_quality')} onChange={value => form.setValue('digestion_quality', value, { shouldValidate: true })} />
            <Select label="Adhérence nutrition" {...form.register('nutrition_adherence')}>
              {(['low', 'medium', 'high'] as NutritionAdherence[]).map(value => (
                <option key={value} value={value}>{NUTRITION_ADHERENCE_LABELS[value]}</option>
              ))}
            </Select>
          </div>

          {context.training_sessions.length > 0 && (
            <div className="border-t border-[#EAE9E5] pt-5 flex flex-col gap-3">
              <div className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">Feedback séance</div>
              {context.training_sessions.map(session => (
                <SessionFeedback
                  key={session.id}
                  session={session}
                  value={feedback[session.id]}
                  onChange={value => setFeedback(prev => ({ ...prev, [session.id]: value }))}
                />
              ))}
            </div>
          )}

          <Textarea
            label="Notes libres"
            rows={4}
            placeholder="Fatigue, digestion, entraînement, contexte particulier…"
            {...form.register('notes')}
          />

          <Button type="submit" loading={form.formState.isSubmitting}>
            Envoyer le check-in
          </Button>
        </form>
      </div>
    </div>
  );
}

function DailyContextPanel({
  sessions,
  target,
  mealItems,
}: {
  sessions: TrainingSession[];
  target: { calories: number; protein_g: number; carbs_g: number; fat_g: number; day_type: string; notes: string | null } | null;
  mealItems: NutritionMealItem[];
}) {
  const mealTotals = mealItems.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      protein_g: sum.protein_g + item.protein_g,
      carbs_g: sum.carbs_g + item.carbs_g,
      fat_g: sum.fat_g + item.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-md border border-[#EAE9E5] p-4">
        <div className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">Nutrition du jour</div>
        {target ? (
          <div className="mt-3">
            <div className="text-2xl font-mono text-slate-900">{target.calories} kcal</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[12px] text-slate-600">
              <span>P {target.protein_g} g</span>
              <span>G {target.carbs_g} g</span>
              <span>L {target.fat_g} g</span>
            </div>
            <div className="mt-2 text-[12px] text-slate-500">{target.day_type}</div>
            {target.notes && <div className="mt-2 text-[12px] text-slate-500">{target.notes}</div>}
            {mealItems.length > 0 && (
              <div className="mt-4 border-t border-[#EAE9E5] pt-3">
                <div className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">Repas prévus</div>
                <div className="mt-2 text-[11px] text-slate-500">
                  Total items : {mealTotals.calories} kcal · P {mealTotals.protein_g} g · G {mealTotals.carbs_g} g · L {mealTotals.fat_g} g
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {mealItems.map(item => (
                    <div key={item.id} className="rounded-md border border-[#EAE9E5] px-3 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-[13px] font-medium text-slate-900">{item.name}</div>
                        <div className="font-mono text-[11px] text-slate-700">{item.calories} kcal</div>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {MEAL_SLOT_LABELS[item.meal_slot]} · {item.quantity || 'quantité libre'} · P {item.protein_g} g · G {item.carbs_g} g · L {item.fat_g} g
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">Aucun objectif nutritionnel défini pour aujourd’hui.</div>
        )}
      </div>

      <div className="bg-white rounded-md border border-[#EAE9E5] p-4">
        <div className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">Séances du jour</div>
        {sessions.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">Aucune séance planifiée aujourd’hui.</div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {sessions.map(session => (
              <div key={session.id} className="rounded-md border border-[#EAE9E5] px-3 py-2">
                <div className="text-[13px] font-medium text-slate-900">{session.title}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {TRAINING_SESSION_TYPE_LABELS[session.session_type]} · {session.planned_duration_min ?? '—'} min · intensité {session.planned_intensity ?? '—'}/10
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionFeedback({
  session,
  value,
  onChange,
}: {
  session: TrainingSession;
  value: FeedbackState[string] | undefined;
  onChange: (value: FeedbackState[string]) => void;
}) {
  const current = value ?? {
    status: session.status,
    actual_duration_min: session.actual_duration_min?.toString() ?? '',
    rpe: session.rpe?.toString() ?? '',
    athlete_notes: session.athlete_notes ?? '',
  };

  return (
    <div className="rounded-md border border-[#EAE9E5] p-3">
      <div className="text-[13px] font-medium text-slate-900">{session.title}</div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select
          label="Statut"
          value={current.status}
          onChange={event => onChange({ ...current, status: event.target.value as TrainingSessionStatus })}
        >
          {(['completed', 'modified', 'missed', 'planned'] as TrainingSessionStatus[]).map(status => (
            <option key={status} value={status}>{TRAINING_SESSION_STATUS_LABELS[status]}</option>
          ))}
        </Select>
        <Input
          label="Durée réelle"
          type="number"
          min={0}
          value={current.actual_duration_min}
          onChange={event => onChange({ ...current, actual_duration_min: event.target.value })}
        />
        <Input
          label="RPE"
          type="number"
          min={1}
          max={10}
          value={current.rpe}
          onChange={event => onChange({ ...current, rpe: event.target.value })}
        />
      </div>
      <Textarea
        className="mt-3"
        label="Notes séance"
        rows={2}
        value={current.athlete_notes}
        onChange={event => onChange({ ...current, athlete_notes: event.target.value })}
      />
    </div>
  );
}

function RatingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">{label}</div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map(n => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`h-9 rounded-md border text-sm font-medium transition-colors ${
                active
                  ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                  : 'border-[#EAE9E5] bg-white text-slate-700 hover:bg-[#FAFAF8]'
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
