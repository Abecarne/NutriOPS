import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { supabase } from '@/lib/supabase';
import { isoWeekStart } from '@/lib/utils';

const schema = z.object({
  weight_kg: z.coerce.number().min(30, 'Poids trop bas').max(250, 'Poids trop élevé'),
  energy_level: z.coerce.number().int().min(1).max(5),
  sleep_quality: z.coerce.number().int().min(1).max(5),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PublicAthlete {
  athlete_id: string;
  full_name: string;
  sport: string;
  club_name: string | null;
  primary_color: string;
}

interface ExistingCheckin {
  id: string;
  weight_kg: number;
  energy_level: number;
  sleep_quality: number;
  notes: string | null;
  submitted_at: string;
}

export function CheckinPage() {
  const { token } = useParams<{ token: string }>();
  const weekStart = useMemo(() => isoWeekStart(), []);
  const [athlete, setAthlete] = useState<PublicAthlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { energy_level: 3, sleep_quality: 3, notes: '' },
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!token) {
        setLoadError('Lien de check-in invalide.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError(null);
      try {
        const { data: athleteRows, error: athleteError } = await supabase.rpc('get_athlete_by_token', {
          p_token: token,
        });
        if (athleteError) throw athleteError;
        const publicAthlete = (athleteRows?.[0] ?? null) as PublicAthlete | null;
        if (!publicAthlete) throw new Error('Lien de check-in invalide ou expiré.');

        const { data: checkinRows, error: checkinError } = await supabase.rpc('get_checkin_by_token', {
          p_token: token,
          p_week_start: weekStart,
        });
        if (checkinError) throw checkinError;
        const existing = (checkinRows?.[0] ?? null) as ExistingCheckin | null;

        if (!mounted) return;
        setAthlete(publicAthlete);
        document.documentElement.style.setProperty('--brand', publicAthlete.primary_color || '#1D9E75');
        if (existing) {
          form.reset({
            weight_kg: Number(existing.weight_kg),
            energy_level: existing.energy_level,
            sleep_quality: existing.sleep_quality,
            notes: existing.notes ?? '',
          });
        }
      } catch (err) {
        if (mounted) setLoadError(err instanceof Error ? err.message : 'Chargement impossible');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [form, token, weekStart]);

  const firstName = athlete?.full_name.split(' ')[0] ?? '';

  const onSubmit = async (values: FormValues) => {
    if (!token) return;
    setSubmitted(false);
    try {
      const { error } = await supabase.rpc('submit_checkin', {
        p_token: token,
        p_week_start: weekStart,
        p_weight_kg: values.weight_kg,
        p_energy_level: values.energy_level,
        p_sleep_quality: values.sleep_quality,
        p_notes: values.notes?.trim() || null,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Enregistrement impossible',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (loadError || !athlete) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ErrorMessage message={loadError ?? 'Check-in introuvable.'} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="mb-6">
          <div className="text-sm text-slate-500">{athlete.club_name || 'NutriOps'}</div>
          <h1 className="text-2xl font-semibold text-slate-900">Check-in hebdomadaire</h1>
          <p className="text-sm text-slate-600 mt-1">
            Bonjour {firstName}, renseigne tes données de la semaine.
          </p>
        </div>

        {submitted && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Check-in enregistré. Tu peux modifier puis renvoyer le formulaire si besoin.
          </div>
        )}

        {form.formState.errors.root?.message && (
          <ErrorMessage message={form.formState.errors.root.message} className="mb-4" />
        )}

        <form
          className="flex flex-col gap-5"
          onSubmit={form.handleSubmit(onSubmit, undefined)}
        >
          <Input
            label="Poids du matin (kg)"
            type="number"
            step="0.1"
            {...form.register('weight_kg')}
            error={form.formState.errors.weight_kg?.message}
          />

          <RatingField
            label="Niveau d'énergie"
            value={form.watch('energy_level')}
            onChange={value => form.setValue('energy_level', value, { shouldValidate: true })}
          />

          <RatingField
            label="Qualité du sommeil"
            value={form.watch('sleep_quality')}
            onChange={value => form.setValue('sleep_quality', value, { shouldValidate: true })}
          />

          <Textarea
            label="Notes libres"
            rows={4}
            placeholder="Fatigue, digestion, entraînements, contexte particulier…"
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
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map(n => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`h-10 rounded-md border text-sm font-medium transition-colors ${
                active
                  ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
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
