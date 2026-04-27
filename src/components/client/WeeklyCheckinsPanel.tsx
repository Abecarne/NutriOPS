import { useMemo, useState } from 'react';
import { generateClientAlerts } from '@/lib/clientAlerts';
import { formatDate, getWeeklyCheckinUrl } from '@/lib/utils';
import { useWeeklyCheckins } from '@/hooks/useWeeklyCheckins';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { TOKENS } from '@/components/dashboard/kit';
import type { Athlete, WeeklyCheckIn } from '@/types/database';

export function WeeklyCheckinsPanel({
  athlete,
  missedSessionsCount = 0,
}: {
  athlete: Athlete;
  missedSessionsCount?: number;
}) {
  const weekly = useWeeklyCheckins(athlete.id, 24);
  const [copied, setCopied] = useState(false);
  const alerts = useMemo(
    () => generateClientAlerts({ athlete, weeklyCheckins: weekly.checkins, missedSessionsCount }),
    [athlete, missedSessionsCount, weekly.checkins],
  );

  const copyLink = async () => {
    await navigator.clipboard.writeText(getWeeklyCheckinUrl(athlete.checkin_token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Check-ins hebdomadaires</CardTitle>
          <Button size="sm" variant="secondary" onClick={copyLink}>
            {copied ? 'Lien copié' : 'Copier le lien client'}
          </Button>
        </CardHeader>
        <CardBody>
          {weekly.error && <ErrorMessage message={weekly.error} className="mb-4" />}
          {weekly.loading ? (
            <div className="py-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
          ) : weekly.checkins.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#EAE9E5] p-8 text-center text-sm text-slate-500">
              Aucun check-in hebdomadaire. Partage le lien client pour démarrer le suivi premium.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {weekly.checkins.map(checkin => (
                <WeeklyCheckinCard
                  key={checkin.id}
                  checkin={checkin}
                  onFeedback={weekly.updateCoachFeedback}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alertes d'adhérence</CardTitle>
          <span className="text-[11px] text-slate-500">{alerts.length} signal{alerts.length > 1 ? 's' : ''}</span>
        </CardHeader>
        <CardBody>
          {alerts.length === 0 ? (
            <div className="text-sm text-slate-500">Aucune alerte hebdomadaire avec les données disponibles.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {alerts.map(alert => (
                <div key={alert.id} className="rounded-md border border-[#EAE9E5] px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-[13px] font-medium text-slate-900">{alert.title}</div>
                    <Badge className={severityClass(alert.severity)}>{alert.severity}</Badge>
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500">{alert.description}</div>
                  <div className="mt-2 text-[12px] text-slate-700">{alert.suggestedAction}</div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function WeeklyCheckinCard({
  checkin,
  onFeedback,
}: {
  checkin: WeeklyCheckIn;
  onFeedback: (id: string, feedback: string | null) => Promise<WeeklyCheckIn>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(checkin.coach_feedback ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await onFeedback(checkin.id, draft.trim() || null);
      setDraft(saved.coach_feedback ?? '');
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <div className="px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between" style={{ background: TOKENS.PANEL_BG }}>
        <div>
          <div className="text-[13px] font-medium text-slate-900">Semaine du {formatDate(checkin.week_start_date)}</div>
          <div className="mt-1 text-[12px] text-slate-500">
            Poids {Number(checkin.weight_kg).toFixed(1)} kg
            {checkin.waist_cm ? ` · taille ${Number(checkin.waist_cm).toFixed(1)} cm` : ''}
            {checkin.steps_average ? ` · ${checkin.steps_average} pas/j` : ''}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <AdherenceBadge label="Training" value={checkin.training_adherence_percent} />
          <AdherenceBadge label="Nutrition" value={checkin.nutrition_adherence_percent} />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Metric label="Sommeil" value={`${checkin.sleep_quality}/5`} />
          <Metric label="Énergie" value={`${checkin.energy_level}/5`} />
          <Metric label="Stress" value={`${checkin.stress_level}/5`} />
          <Metric label="Soreness" value={`${checkin.soreness_level}/5`} />
          <Metric label="Motivation" value={`${checkin.motivation_level}/5`} />
        </div>

        {(checkin.wins || checkin.difficulties || checkin.client_comment || checkin.pain_notes) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
            <TextBlock label="Victoires" value={checkin.wins} />
            <TextBlock label="Difficultés" value={checkin.difficulties} />
            <TextBlock label="Douleurs" value={checkin.pain_notes} />
            <TextBlock label="Commentaire client" value={checkin.client_comment} />
          </div>
        )}

        <div className="rounded-md p-3" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">Feedback coach</div>
            {!editing && (
              <button type="button" className="text-[12px] text-slate-600 hover:text-slate-900" onClick={() => setEditing(true)}>
                Ajouter / modifier
              </button>
            )}
          </div>
          {error && <ErrorMessage message={error} className="mt-3" />}
          {editing ? (
            <div className="mt-3 flex flex-col gap-2">
              <Textarea rows={4} value={draft} onChange={e => setDraft(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Annuler</Button>
                <Button size="sm" onClick={save} loading={saving}>Enregistrer</Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[13px] text-slate-700 whitespace-pre-wrap">
              {checkin.coach_feedback || 'Aucun feedback envoyé au client.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdherenceBadge({ label, value }: { label: string; value: number }) {
  const className = value < 70
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return <Badge className={className}>{label} {value}%</Badge>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#EAE9E5] bg-[#FAFAF8] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-[15px] text-slate-900">{value}</div>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 text-slate-700 whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function severityClass(severity: 'low' | 'medium' | 'high') {
  if (severity === 'high') return 'border-red-200 bg-red-50 text-red-700';
  if (severity === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}
