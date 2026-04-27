import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { submitWeeklyCheckinByToken } from '@/hooks/useWeeklyCheckins';
import type { WeeklyCheckIn } from '@/types/database';

const schema = z.object({
  weight_kg: z.coerce.number().min(30, 'Poids trop bas').max(250, 'Poids trop élevé'),
  waist_cm: z.coerce.number().min(40).max(200).optional().or(z.literal('')),
  sleep_quality: z.coerce.number().int().min(1).max(5),
  average_sleep_hours: z.coerce.number().min(0).max(24).optional().or(z.literal('')),
  energy_level: z.coerce.number().int().min(1).max(5),
  stress_level: z.coerce.number().int().min(1).max(5),
  hunger_level: z.coerce.number().int().min(1).max(5),
  soreness_level: z.coerce.number().int().min(1).max(5),
  motivation_level: z.coerce.number().int().min(1).max(5),
  training_adherence_percent: z.coerce.number().int().min(0).max(100),
  nutrition_adherence_percent: z.coerce.number().int().min(0).max(100),
  steps_average: z.coerce.number().int().min(0).optional().or(z.literal('')),
  pain_notes: z.string().optional(),
  wins: z.string().optional(),
  difficulties: z.string().optional(),
  client_comment: z.string().optional(),
});

type Values = z.infer<typeof schema>;

interface Props {
  token: string;
  weekStart: string;
  existing: WeeklyCheckIn | null;
  onSubmitted: () => Promise<void> | void;
}

export function WeeklyCheckinForm({ token, weekStart, existing, onSubmitted }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(existing),
  });

  useEffect(() => {
    form.reset(defaultValues(existing));
  }, [existing, form]);

  const onSubmit = async (values: Values) => {
    form.clearErrors('root');
    setSubmitted(false);
    try {
      await submitWeeklyCheckinByToken(token, {
        week_start_date: weekStart,
        weight_kg: values.weight_kg,
        waist_cm: numberOrNull(values.waist_cm),
        sleep_quality: values.sleep_quality,
        average_sleep_hours: numberOrNull(values.average_sleep_hours),
        energy_level: values.energy_level,
        stress_level: values.stress_level,
        hunger_level: values.hunger_level,
        soreness_level: values.soreness_level,
        motivation_level: values.motivation_level,
        training_adherence_percent: values.training_adherence_percent,
        nutrition_adherence_percent: values.nutrition_adherence_percent,
        steps_average: numberOrNull(values.steps_average),
        pain_notes: emptyToNull(values.pain_notes),
        wins: emptyToNull(values.wins),
        difficulties: emptyToNull(values.difficulties),
        client_comment: emptyToNull(values.client_comment),
        coach_feedback: null,
      });
      setSubmitted(true);
      await onSubmitted();
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Enregistrement impossible',
      });
    }
  };

  return (
    <form className="bg-white rounded-md border border-[#EAE9E5] p-5 flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
      {submitted && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Check-in hebdomadaire enregistré.
        </div>
      )}
      {form.formState.errors.root?.message && <ErrorMessage message={form.formState.errors.root.message} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Poids (kg)" type="number" step="0.1" {...form.register('weight_kg')} error={form.formState.errors.weight_kg?.message} />
        <Input label="Tour de taille (cm)" type="number" step="0.1" {...form.register('waist_cm')} />
        <Input label="Pas moyens" type="number" {...form.register('steps_average')} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RatingField label="Sommeil" value={form.watch('sleep_quality')} onChange={value => form.setValue('sleep_quality', value, { shouldValidate: true })} />
        <Input label="Sommeil moyen (h)" type="number" step="0.1" {...form.register('average_sleep_hours')} />
        <RatingField label="Énergie" value={form.watch('energy_level')} onChange={value => form.setValue('energy_level', value, { shouldValidate: true })} />
        <RatingField label="Stress" value={form.watch('stress_level')} onChange={value => form.setValue('stress_level', value, { shouldValidate: true })} />
        <RatingField label="Faim" value={form.watch('hunger_level')} onChange={value => form.setValue('hunger_level', value, { shouldValidate: true })} />
        <RatingField label="Soreness" value={form.watch('soreness_level')} onChange={value => form.setValue('soreness_level', value, { shouldValidate: true })} />
        <RatingField label="Motivation" value={form.watch('motivation_level')} onChange={value => form.setValue('motivation_level', value, { shouldValidate: true })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Adhérence entraînement (%)" type="number" min={0} max={100} {...form.register('training_adherence_percent')} />
        <Input label="Adhérence nutrition (%)" type="number" min={0} max={100} {...form.register('nutrition_adherence_percent')} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Textarea label="Douleurs / gênes" rows={4} {...form.register('pain_notes')} />
        <Textarea label="Difficultés" rows={4} {...form.register('difficulties')} />
        <Textarea label="Victoires de la semaine" rows={4} {...form.register('wins')} />
        <Textarea label="Commentaire libre" rows={4} {...form.register('client_comment')} />
      </div>

      <Button type="submit" loading={form.formState.isSubmitting}>
        Envoyer le check-in hebdomadaire
      </Button>
    </form>
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
      <div className="grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map(score => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className="h-9 rounded-md border text-[12px] font-medium"
            style={{
              borderColor: value === score ? 'var(--brand)' : '#EAE9E5',
              background: value === score ? 'var(--brand)' : '#fff',
              color: value === score ? '#fff' : '#475569',
            }}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

function defaultValues(existing: WeeklyCheckIn | null): Values {
  return {
    weight_kg: existing?.weight_kg ?? 70,
    waist_cm: existing?.waist_cm ?? '',
    sleep_quality: existing?.sleep_quality ?? 3,
    average_sleep_hours: existing?.average_sleep_hours ?? '',
    energy_level: existing?.energy_level ?? 3,
    stress_level: existing?.stress_level ?? 3,
    hunger_level: existing?.hunger_level ?? 3,
    soreness_level: existing?.soreness_level ?? 3,
    motivation_level: existing?.motivation_level ?? 3,
    training_adherence_percent: existing?.training_adherence_percent ?? 80,
    nutrition_adherence_percent: existing?.nutrition_adherence_percent ?? 80,
    steps_average: existing?.steps_average ?? '',
    pain_notes: existing?.pain_notes ?? '',
    wins: existing?.wins ?? '',
    difficulties: existing?.difficulties ?? '',
    client_comment: existing?.client_comment ?? '',
  };
}

function emptyToNull(value: string | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

function numberOrNull(value: string | number | undefined) {
  if (value === '' || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
