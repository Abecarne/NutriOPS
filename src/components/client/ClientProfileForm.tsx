import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { updateAthlete } from '@/hooks/useAthlete';
import {
  CLIENT_EXPERIENCE_LEVEL_LABELS,
  CLIENT_EXPERIENCE_LEVELS,
  CLIENT_GOAL_TYPE_LABELS,
  CLIENT_GOAL_TYPES,
} from '@/types/database';
import type { Athlete, ClientExperienceLevel, ClientGoalType } from '@/types/database';

export const clientProfileSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').or(z.literal('')),
  phone: z.string().optional(),
  sport: z.string().min(2, 'Discipline requise'),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  height_cm: z.coerce.number().min(100).max(240).optional().or(z.literal('')),
  current_weight_kg: z.coerce.number().min(30).max(250).optional().or(z.literal('')),
  target_weight_kg: z.coerce.number().min(30).max(250).optional().or(z.literal('')),
  goal: z.string().optional(),
  goal_type: z.enum(CLIENT_GOAL_TYPES),
  experience_level: z.enum(CLIENT_EXPERIENCE_LEVELS),
  training_frequency_per_week: z.coerce.number().int().min(0).max(14),
  available_equipment: z.string().optional(),
  injuries: z.string().optional(),
  medical_notes: z.string().optional(),
  food_preferences: z.string().optional(),
  dietary_restrictions: z.string().optional(),
  lifestyle_notes: z.string().optional(),
  work_schedule: z.string().optional(),
  sleep_average_hours: z.coerce.number().min(0).max(24).optional().or(z.literal('')),
  stress_level: z.coerce.number().int().min(1).max(5),
  motivation_level: z.coerce.number().int().min(1).max(5),
});

export type ClientProfileFormValues = z.infer<typeof clientProfileSchema>;

interface Props {
  athlete: Athlete;
  onSaved: (athlete: Athlete) => void;
  onCancel?: () => void;
  submitLabel?: string;
  markOnboardingComplete?: boolean;
}

export function ClientProfileForm({
  athlete,
  onSaved,
  onCancel,
  submitLabel = 'Enregistrer',
  markOnboardingComplete = false,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ClientProfileFormValues>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: athleteToFormValues(athlete),
  });

  const onSubmit = async (values: ClientProfileFormValues) => {
    setError(null);
    try {
      const updated = await saveClientProfile(athlete.id, values, markOnboardingComplete);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sauvegarde impossible');
    }
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
      {error && <ErrorMessage message={error} />}

      <ProfileSection title="Identité">
        <Input label="Prénom" {...form.register('first_name')} error={form.formState.errors.first_name?.message} />
        <Input label="Nom" {...form.register('last_name')} error={form.formState.errors.last_name?.message} />
        <Input label="Email" type="email" {...form.register('email')} error={form.formState.errors.email?.message} />
        <Input label="Téléphone" {...form.register('phone')} />
        <Input label="Date de naissance" type="date" {...form.register('birth_date')} />
        <Input label="Genre" {...form.register('gender')} placeholder="Optionnel" />
      </ProfileSection>

      <ProfileSection title="Objectif et niveau">
        <Input label="Discipline" {...form.register('sport')} error={form.formState.errors.sport?.message} />
        <Select label="Objectif principal" {...form.register('goal_type')}>
          {CLIENT_GOAL_TYPES.map(type => (
            <option key={type} value={type}>{CLIENT_GOAL_TYPE_LABELS[type]}</option>
          ))}
        </Select>
        <Select label="Niveau" {...form.register('experience_level')}>
          {CLIENT_EXPERIENCE_LEVELS.map(level => (
            <option key={level} value={level}>{CLIENT_EXPERIENCE_LEVEL_LABELS[level]}</option>
          ))}
        </Select>
        <Input label="Fréquence / semaine" type="number" min={0} max={14} {...form.register('training_frequency_per_week')} />
        <Input label="Taille (cm)" type="number" {...form.register('height_cm')} error={form.formState.errors.height_cm?.message} />
        <Input label="Poids actuel (kg)" type="number" step="0.1" {...form.register('current_weight_kg')} error={form.formState.errors.current_weight_kg?.message} />
        <Input label="Poids cible (kg)" type="number" step="0.1" {...form.register('target_weight_kg')} error={form.formState.errors.target_weight_kg?.message} />
        <Textarea label="Objectif détaillé" rows={3} className="sm:col-span-2" {...form.register('goal')} />
      </ProfileSection>

      <ProfileSection title="Contraintes">
        <Textarea label="Matériel disponible" rows={3} placeholder="Sépare par virgules" {...form.register('available_equipment')} />
        <Textarea label="Blessures / limitations" rows={3} placeholder="Sépare par virgules" {...form.register('injuries')} />
        <Textarea label="Notes médicales" rows={3} className="sm:col-span-2" {...form.register('medical_notes')} />
      </ProfileSection>

      <ProfileSection title="Nutrition et lifestyle">
        <Textarea label="Préférences alimentaires" rows={3} placeholder="Sépare par virgules" {...form.register('food_preferences')} />
        <Textarea label="Restrictions alimentaires" rows={3} placeholder="Sépare par virgules" {...form.register('dietary_restrictions')} />
        <Input label="Sommeil moyen (h)" type="number" step="0.1" {...form.register('sleep_average_hours')} />
        <Input label="Stress (1-5)" type="number" min={1} max={5} {...form.register('stress_level')} />
        <Input label="Motivation (1-5)" type="number" min={1} max={5} {...form.register('motivation_level')} />
        <Textarea label="Planning de travail" rows={3} {...form.register('work_schedule')} />
        <Textarea label="Notes lifestyle" rows={3} className="sm:col-span-2" {...form.register('lifestyle_notes')} />
      </ProfileSection>

      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>}
        <Button type="submit" loading={form.formState.isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

export function athleteToFormValues(athlete: Athlete): ClientProfileFormValues {
  const parts = athlete.full_name.trim().split(/\s+/);
  return {
    first_name: athlete.first_name || parts[0] || '',
    last_name: athlete.last_name || parts.slice(1).join(' ') || '',
    email: athlete.email ?? '',
    phone: athlete.phone ?? '',
    sport: athlete.sport,
    birth_date: athlete.birth_date ?? '',
    gender: athlete.gender ?? '',
    height_cm: athlete.height_cm ?? '',
    current_weight_kg: athlete.current_weight_kg ?? '',
    target_weight_kg: athlete.target_weight_kg ?? '',
    goal: athlete.goal ?? '',
    goal_type: (athlete.goal_type ?? 'performance') as ClientGoalType,
    experience_level: athlete.experience_level as ClientExperienceLevel,
    training_frequency_per_week: athlete.training_frequency_per_week ?? 3,
    available_equipment: arrayToText(athlete.available_equipment),
    injuries: arrayToText(athlete.injuries),
    medical_notes: athlete.medical_notes ?? '',
    food_preferences: arrayToText(athlete.food_preferences),
    dietary_restrictions: arrayToText(athlete.dietary_restrictions),
    lifestyle_notes: athlete.lifestyle_notes ?? '',
    work_schedule: athlete.work_schedule ?? '',
    sleep_average_hours: athlete.sleep_average_hours ?? '',
    stress_level: athlete.stress_level ?? 3,
    motivation_level: athlete.motivation_level ?? 3,
  };
}

export async function saveClientProfile(
  athleteId: string,
  values: ClientProfileFormValues,
  markOnboardingComplete = false,
) {
  const fullName = `${values.first_name.trim()} ${values.last_name.trim()}`.trim();
  return updateAthlete(athleteId, {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    full_name: fullName,
    email: emptyToNull(values.email),
    phone: emptyToNull(values.phone),
    sport: values.sport.trim(),
    birth_date: emptyToNull(values.birth_date),
    gender: emptyToNull(values.gender),
    height_cm: numberToNull(values.height_cm),
    current_weight_kg: numberToNull(values.current_weight_kg),
    target_weight_kg: numberToNull(values.target_weight_kg),
    goal: emptyToNull(values.goal),
    goal_type: values.goal_type,
    experience_level: values.experience_level,
    training_frequency_per_week: Number(values.training_frequency_per_week),
    available_equipment: textToArray(values.available_equipment),
    injuries: textToArray(values.injuries),
    medical_notes: emptyToNull(values.medical_notes),
    food_preferences: textToArray(values.food_preferences),
    dietary_restrictions: textToArray(values.dietary_restrictions),
    lifestyle_notes: emptyToNull(values.lifestyle_notes),
    work_schedule: emptyToNull(values.work_schedule),
    sleep_average_hours: numberToNull(values.sleep_average_hours),
    stress_level: Number(values.stress_level),
    motivation_level: Number(values.motivation_level),
    onboarding_completed_at: markOnboardingComplete ? new Date().toISOString() : undefined,
  });
}

function arrayToText(values: string[] | null | undefined) {
  return (values ?? []).join(', ');
}

function textToArray(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function emptyToNull(value: string | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

function numberToNull(value: string | number | undefined) {
  if (value === '' || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
