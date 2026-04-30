import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClientProfileForm } from '@/components/client/ClientProfileForm';
import { OnboardingAnswersEditor } from '@/components/client/OnboardingAnswersEditor';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { formatDate, getCheckinUrl, getWeeklyCheckinUrl } from '@/lib/utils';
import { regenerateCheckinToken } from '@/hooks/useAthlete';
import {
  CLIENT_EXPERIENCE_LEVEL_LABELS,
  CLIENT_GOAL_TYPE_LABELS,
} from '@/types/database';
import type { Athlete, ClientGoalType } from '@/types/database';

interface Props {
  athlete: Athlete;
  onUpdated: (a: Athlete) => void;
}

export function AthleteProfile({ athlete, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedWeekly, setCopiedWeekly] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getCheckinUrl(athlete.checkin_token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied */
    }
  };

  const copyWeeklyLink = async () => {
    try {
      await navigator.clipboard.writeText(getWeeklyCheckinUrl(athlete.checkin_token));
      setCopiedWeekly(true);
      setTimeout(() => setCopiedWeekly(false), 2000);
    } catch {
      /* clipboard denied */
    }
  };

  const regenerate = async () => {
    const ok = window.confirm(
      "Régénérer le lien de check-in invalidera l'URL actuellement partagée avec l'athlète. Continuer ?",
    );
    if (!ok) return;
    setRegenerating(true);
    setError(null);
    try {
      const updated = await regenerateCheckinToken(athlete.id);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Régénération impossible');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        {!editing && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Éditer
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {error && <ErrorMessage message={error} className="mb-4" />}

        {editing ? (
          <ClientProfileForm
            athlete={athlete}
            onSaved={updated => {
              onUpdated(updated);
              setEditing(false);
            }}
            onCancel={cancel}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Email" value={athlete.email || '—'} />
            <Field label="Téléphone" value={athlete.phone || '—'} />
            <Field label="Sport" value={athlete.sport} />
            <Field label="Statut" value={<StatusBadge status={athlete.status} />} />
            <Field label="Date de naissance" value={formatDate(athlete.birth_date)} />
            <Field label="Genre" value={athlete.gender || '—'} />
            <Field label="Taille" value={athlete.height_cm ? `${athlete.height_cm} cm` : '—'} />
            <Field label="Poids actuel" value={athlete.current_weight_kg ? `${Number(athlete.current_weight_kg).toFixed(1)} kg` : '—'} />
            <Field label="Poids cible" value={athlete.target_weight_kg ? `${Number(athlete.target_weight_kg).toFixed(1)} kg` : '—'} />
            <Field label="Objectif" value={athlete.goal_type ? CLIENT_GOAL_TYPE_LABELS[athlete.goal_type as ClientGoalType] : athlete.goal || '—'} />
            <Field label="Niveau" value={CLIENT_EXPERIENCE_LEVEL_LABELS[athlete.experience_level]} />
            <Field label="Fréquence" value={`${athlete.training_frequency_per_week ?? 0} séance(s) / semaine`} />
            <Field label="Sommeil moyen" value={athlete.sleep_average_hours ? `${athlete.sleep_average_hours} h` : '—'} />
            <Field label="Stress" value={`${athlete.stress_level ?? 3}/5`} />
            <Field label="Motivation" value={`${athlete.motivation_level ?? 3}/5`} />
            <Field label="Matériel" value={<InlineList values={athlete.available_equipment} />} className="sm:col-span-2" />
            <Field label="Blessures" value={<InlineList values={athlete.injuries} />} className="sm:col-span-2" />
            <Field label="Préférences alimentaires" value={<InlineList values={athlete.food_preferences} />} className="sm:col-span-2" />
            <Field label="Restrictions alimentaires" value={<InlineList values={athlete.dietary_restrictions} />} className="sm:col-span-2" />
            <Field label="Notes médicales" value={athlete.medical_notes || '—'} className="sm:col-span-2" />
            <Field label="Planning" value={athlete.work_schedule || '—'} className="sm:col-span-2" />
            <Field label="Lifestyle" value={athlete.lifestyle_notes || '—'} className="sm:col-span-2" />
            <Field label="Objectif détaillé" value={athlete.goal || '—'} className="sm:col-span-2" />
            <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-0.5">Onboarding</div>
                  <div className="text-sm text-slate-700">
                    {athlete.onboarding_completed_at ? `Complété le ${formatDate(athlete.onboarding_completed_at)}` : 'Questionnaire à compléter'}
                  </div>
                </div>
                <Link
                  to={`/athletes/${athlete.id}/onboarding`}
                  className="inline-flex h-8 items-center justify-center rounded-md border border-[#EAE9E5] bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-[#FAFAF8]"
                >
                  Ouvrir l'onboarding
                </Link>
              </div>
              <OnboardingAnswersEditor athlete={athlete} onSaved={onUpdated} />
            </div>
            <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-0.5">Lien de check-in</div>
                <div className="text-sm text-slate-700 truncate">{getCheckinUrl(athlete.checkin_token)}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={copyLink}>
                  {copied ? '✓ Copié' : 'Copier le lien'}
                </Button>
                <Button size="sm" variant="ghost" onClick={regenerate} loading={regenerating}>
                  Régénérer
                </Button>
              </div>
            </div>
            <div className="sm:col-span-2 border-t border-slate-100 pt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-0.5">Lien de check-in hebdomadaire</div>
                <div className="text-sm text-slate-700 truncate">{getWeeklyCheckinUrl(athlete.checkin_token)}</div>
              </div>
              <Button size="sm" variant="secondary" onClick={copyWeeklyLink}>
                {copiedWeekly ? '✓ Copié' : 'Copier le lien'}
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function InlineList({ values }: { values: string[] }) {
  if (!values || values.length === 0) return <>—</>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map(value => (
        <span key={value} className="rounded border border-[#EAE9E5] bg-[#FAFAF8] px-2 py-0.5 text-[12px] text-slate-700">
          {value}
        </span>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-0.5">{label}</div>
      <div className="text-slate-800">{value}</div>
    </div>
  );
}
