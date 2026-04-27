import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { createAthlete } from '@/hooks/useAthletes';
import { useAuth } from '@/context/AuthContext';
import {
  CLIENT_EXPERIENCE_LEVEL_LABELS,
  CLIENT_EXPERIENCE_LEVELS,
  CLIENT_GOAL_TYPE_LABELS,
  CLIENT_GOAL_TYPES,
} from '@/types/database';
import type { Athlete, AthleteStatus } from '@/types/database';

const schema = z.object({
  first_name: z.string().min(1, 'Prénom requis'),
  last_name: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').or(z.literal('')),
  phone: z.string().optional(),
  sport: z.string().min(2, 'Sport requis'),
  birth_date: z.string().optional(),
  height_cm: z.string().optional(),
  current_weight_kg: z.string().optional(),
  target_weight_kg: z.string().optional(),
  goal: z.string().optional(),
  goal_type: z.enum(CLIENT_GOAL_TYPES),
  experience_level: z.enum(CLIENT_EXPERIENCE_LEVELS),
  training_frequency_per_week: z.string().optional(),
  status: z.enum(['active', 'offseason', 'injured']),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (athlete: Athlete) => void;
}

export function AddAthleteModal({ open, onClose, onCreated }: Props) {
  const { coach } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      goal_type: 'performance',
      experience_level: 'beginner',
      training_frequency_per_week: '3',
      status: 'active' as AthleteStatus,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!coach) return;
    setFormError(null);
    try {
      const fullName = `${values.first_name.trim()} ${values.last_name.trim()}`.trim();
      const athlete = await createAthlete(coach.id, {
        full_name: fullName,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        sport: values.sport.trim(),
        birth_date: values.birth_date || null,
        height_cm: values.height_cm ? parseInt(values.height_cm, 10) : null,
        current_weight_kg: values.current_weight_kg ? Number(values.current_weight_kg) : null,
        target_weight_kg: values.target_weight_kg ? Number(values.target_weight_kg) : null,
        goal: values.goal?.trim() || '',
        goal_type: values.goal_type,
        experience_level: values.experience_level,
        training_frequency_per_week: values.training_frequency_per_week ? Number(values.training_frequency_per_week) : 3,
        status: values.status,
      });
      form.reset();
      onCreated(athlete);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur de création");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nouvel athlète">
      {formError && <ErrorMessage message={formError} className="mb-4" />}
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Prénom"
            {...form.register('first_name')}
            error={form.formState.errors.first_name?.message}
          />
          <Input
            label="Nom"
            {...form.register('last_name')}
            error={form.formState.errors.last_name?.message}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            {...form.register('email')}
            error={form.formState.errors.email?.message}
          />
          <Input label="Téléphone" {...form.register('phone')} />
        </div>
        <Input
          label="Sport / discipline"
          {...form.register('sport')}
          error={form.formState.errors.sport?.message}
          placeholder="Ex : Rugby, Judo, Athlétisme…"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date de naissance" type="date" {...form.register('birth_date')} />
          <Input
            label="Taille (cm)"
            type="number"
            min={100}
            max={230}
            {...form.register('height_cm')}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Poids actuel (kg)" type="number" step="0.1" {...form.register('current_weight_kg')} />
          <Input label="Poids cible (kg)" type="number" step="0.1" {...form.register('target_weight_kg')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
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
        </div>
        <Input
          label="Fréquence entraînement / semaine"
          type="number"
          min={0}
          max={14}
          {...form.register('training_frequency_per_week')}
        />
        <Input
          label="Objectif"
          placeholder="Ex : Prise de masse, sèche compétition…"
          {...form.register('goal')}
        />
        <Select label="Statut" {...form.register('status')}>
          <option value="active">Actif</option>
          <option value="offseason">Intersaison</option>
          <option value="injured">Blessé</option>
        </Select>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            Créer l'athlète
          </Button>
        </div>
      </form>
    </Modal>
  );
}
