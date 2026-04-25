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
import type { Athlete, AthleteStatus } from '@/types/database';

const schema = z.object({
  full_name: z.string().min(2, 'Nom requis'),
  sport: z.string().min(2, 'Sport requis'),
  birth_date: z.string().optional(),
  height_cm: z.string().optional(),
  goal: z.string().optional(),
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
    defaultValues: { status: 'active' as AthleteStatus },
  });

  const onSubmit = async (values: FormValues) => {
    if (!coach) return;
    setFormError(null);
    try {
      const athlete = await createAthlete(coach.id, {
        full_name: values.full_name.trim(),
        sport: values.sport.trim(),
        birth_date: values.birth_date || null,
        height_cm: values.height_cm ? parseInt(values.height_cm, 10) : null,
        goal: values.goal?.trim() || '',
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
        <Input
          label="Nom complet"
          {...form.register('full_name')}
          error={form.formState.errors.full_name?.message}
        />
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
