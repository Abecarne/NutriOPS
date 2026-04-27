import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TOKENS } from '@/components/dashboard/kit';
import {
  athleteToFormValues,
  clientProfileSchema,
  saveClientProfile,
  type ClientProfileFormValues,
} from '@/components/client/ClientProfileForm';
import {
  CLIENT_EXPERIENCE_LEVEL_LABELS,
  CLIENT_EXPERIENCE_LEVELS,
  CLIENT_GOAL_TYPE_LABELS,
  CLIENT_GOAL_TYPES,
} from '@/types/database';
import type { Athlete } from '@/types/database';

type StepKey =
  | 'personal'
  | 'goal'
  | 'history'
  | 'injuries'
  | 'nutrition'
  | 'lifestyle'
  | 'availability'
  | 'equipment'
  | 'notes'
  | 'review';

const STEPS: Array<{ key: StepKey; title: string }> = [
  { key: 'personal', title: 'Informations personnelles' },
  { key: 'goal', title: 'Objectif principal' },
  { key: 'history', title: 'Historique sportif' },
  { key: 'injuries', title: 'Blessures et limitations' },
  { key: 'nutrition', title: 'Nutrition' },
  { key: 'lifestyle', title: 'Lifestyle' },
  { key: 'availability', title: 'Disponibilités' },
  { key: 'equipment', title: 'Matériel disponible' },
  { key: 'notes', title: 'Notes libres' },
  { key: 'review', title: 'Résumé' },
];

interface Props {
  athlete: Athlete;
  onSaved: (athlete: Athlete) => void;
}

export function OnboardingWizard({ athlete, onSaved }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = STEPS[stepIndex];
  const form = useForm<ClientProfileFormValues>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: athleteToFormValues(athlete),
    mode: 'onBlur',
  });
  const values = form.watch();

  const progress = useMemo(() => (stepIndex + 1) / STEPS.length, [stepIndex]);

  const saveDraft = async (complete = false) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await saveClientProfile(athlete.id, form.getValues(), complete);
      onSaved(updated);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sauvegarde impossible');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    const ok = await form.trigger(requiredFieldsForStep(step.key));
    if (!ok) return;
    if (step.key !== 'review') await saveDraft(false);
    setStepIndex(i => Math.min(i + 1, STEPS.length - 1));
  };

  const finish = async () => {
    const ok = await form.trigger();
    if (!ok) return;
    await saveDraft(true);
  };

  return (
    <div className="bg-white rounded-md overflow-hidden" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <div className="p-5" style={{ background: TOKENS.PANEL_BG, borderBottom: `1px solid ${TOKENS.HAIRLINE}` }}>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">
              Onboarding client
            </div>
            <h2 className="mt-1 text-[18px] font-medium text-slate-900">{step.title}</h2>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            {stepIndex + 1}/{STEPS.length}
          </div>
        </div>
        <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
          <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>

      <form className="p-5 flex flex-col gap-5" onSubmit={form.handleSubmit(finish)}>
        {error && <ErrorMessage message={error} />}
        <StepContent step={step.key} values={values} form={form} />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[#EAE9E5] pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={stepIndex === 0 || saving}
            onClick={() => setStepIndex(i => Math.max(i - 1, 0))}
          >
            Précédent
          </Button>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" loading={saving} onClick={() => saveDraft(false)}>
              Sauvegarder
            </Button>
            {step.key === 'review' ? (
              <Button type="submit" loading={saving || form.formState.isSubmitting}>
                Valider l'onboarding
              </Button>
            ) : (
              <Button type="button" loading={saving} onClick={next}>
                Suivant
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function StepContent({
  step,
  values,
  form,
}: {
  step: StepKey;
  values: ClientProfileFormValues;
  form: ReturnType<typeof useForm<ClientProfileFormValues>>;
}) {
  if (step === 'personal') {
    return (
      <Grid>
        <Input label="Prénom" {...form.register('first_name')} error={form.formState.errors.first_name?.message} />
        <Input label="Nom" {...form.register('last_name')} error={form.formState.errors.last_name?.message} />
        <Input label="Email" type="email" {...form.register('email')} error={form.formState.errors.email?.message} />
        <Input label="Téléphone" {...form.register('phone')} />
        <Input label="Date de naissance" type="date" {...form.register('birth_date')} />
        <Input label="Genre" {...form.register('gender')} />
      </Grid>
    );
  }

  if (step === 'goal') {
    return (
      <Grid>
        <Input label="Discipline" {...form.register('sport')} error={form.formState.errors.sport?.message} />
        <Select label="Objectif principal" {...form.register('goal_type')}>
          {CLIENT_GOAL_TYPES.map(type => <option key={type} value={type}>{CLIENT_GOAL_TYPE_LABELS[type]}</option>)}
        </Select>
        <Input label="Poids actuel (kg)" type="number" step="0.1" {...form.register('current_weight_kg')} />
        <Input label="Poids cible (kg)" type="number" step="0.1" {...form.register('target_weight_kg')} />
        <Textarea label="Objectif détaillé" rows={4} className="sm:col-span-2" {...form.register('goal')} />
      </Grid>
    );
  }

  if (step === 'history') {
    return (
      <Grid>
        <Select label="Niveau" {...form.register('experience_level')}>
          {CLIENT_EXPERIENCE_LEVELS.map(level => <option key={level} value={level}>{CLIENT_EXPERIENCE_LEVEL_LABELS[level]}</option>)}
        </Select>
        <Input label="Fréquence / semaine" type="number" min={0} max={14} {...form.register('training_frequency_per_week')} />
      </Grid>
    );
  }

  if (step === 'injuries') {
    return (
      <Grid>
        <Textarea label="Blessures et limitations" rows={4} placeholder="Sépare par virgules" {...form.register('injuries')} />
        <Textarea label="Notes médicales" rows={4} {...form.register('medical_notes')} />
      </Grid>
    );
  }

  if (step === 'nutrition') {
    return (
      <Grid>
        <Textarea label="Préférences alimentaires" rows={4} placeholder="Sépare par virgules" {...form.register('food_preferences')} />
        <Textarea label="Restrictions alimentaires" rows={4} placeholder="Sépare par virgules" {...form.register('dietary_restrictions')} />
      </Grid>
    );
  }

  if (step === 'lifestyle') {
    return (
      <Grid>
        <Input label="Sommeil moyen (h)" type="number" step="0.1" {...form.register('sleep_average_hours')} />
        <Input label="Stress (1-5)" type="number" min={1} max={5} {...form.register('stress_level')} />
        <Input label="Motivation (1-5)" type="number" min={1} max={5} {...form.register('motivation_level')} />
      </Grid>
    );
  }

  if (step === 'availability') {
    return (
      <Grid>
        <Textarea label="Disponibilités / planning de travail" rows={5} className="sm:col-span-2" {...form.register('work_schedule')} />
      </Grid>
    );
  }

  if (step === 'equipment') {
    return (
      <Grid>
        <Textarea label="Matériel disponible" rows={5} className="sm:col-span-2" placeholder="Sépare par virgules" {...form.register('available_equipment')} />
      </Grid>
    );
  }

  if (step === 'notes') {
    return (
      <Grid>
        <Textarea label="Notes libres" rows={6} className="sm:col-span-2" {...form.register('lifestyle_notes')} />
      </Grid>
    );
  }

  return <Review values={values} />;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Review({ values }: { values: ClientProfileFormValues }) {
  const rows = [
    ['Client', `${values.first_name} ${values.last_name}`],
    ['Email', values.email || '—'],
    ['Objectif', CLIENT_GOAL_TYPE_LABELS[values.goal_type]],
    ['Niveau', CLIENT_EXPERIENCE_LEVEL_LABELS[values.experience_level]],
    ['Poids', `${values.current_weight_kg || '—'} kg → ${values.target_weight_kg || '—'} kg`],
    ['Fréquence', `${values.training_frequency_per_week} séance(s) / semaine`],
    ['Blessures', values.injuries || '—'],
    ['Matériel', values.available_equipment || '—'],
    ['Nutrition', [values.food_preferences, values.dietary_restrictions].filter(Boolean).join(' · ') || '—'],
    ['Lifestyle', values.lifestyle_notes || '—'],
  ];

  return (
    <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
      {rows.map(([label, value], index) => (
        <div
          key={label}
          className="grid grid-cols-[160px_1fr] gap-4 px-4 py-3 text-[13px]"
          style={{ borderBottom: index === rows.length - 1 ? undefined : `1px solid ${TOKENS.HAIRLINE}` }}
        >
          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
          <div className="text-slate-800 whitespace-pre-wrap">{value}</div>
        </div>
      ))}
    </div>
  );
}

function requiredFieldsForStep(step: StepKey): Array<keyof ClientProfileFormValues> {
  if (step === 'personal') return ['first_name', 'last_name', 'email'];
  if (step === 'goal') return ['sport', 'goal_type', 'current_weight_kg'];
  if (step === 'history') return ['experience_level', 'training_frequency_per_week'];
  return [];
}
