import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { TOKENS } from '@/components/dashboard/kit';
import { useAthletes } from '@/hooks/useAthletes';
import { buildWhoopAuthorizeUrl, useHealthIntegrations } from '@/hooks/useHealthIntegrations';
import { formatDate, relativeFromNow, shiftDate, isoDate } from '@/lib/utils';
import type { AthleteRosterRow, HealthDailyMetric } from '@/types/database';

const SYNC_OPTIONS = [
  { label: '30 jours', days: 30 },
  { label: '12 mois', days: 365 },
  { label: 'Historique large', days: 1460 },
];

export function IntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { athletes, loading: athletesLoading, error: athletesError } = useAthletes();
  const selectedAthleteId = searchParams.get('athleteId') ?? athletes[0]?.id;
  const selectedAthlete = athletes.find(athlete => athlete.id === selectedAthleteId) ?? athletes[0] ?? null;
  const health = useHealthIntegrations(selectedAthlete?.id);
  const [connectError, setConnectError] = useState<string | null>(null);

  const latestMetric = health.dailyMetrics[0] ?? null;
  const summary = useMemo(() => summarizeMetrics(health.dailyMetrics), [health.dailyMetrics]);

  const handleAthleteChange = (athleteId: string) => {
    setSearchParams(athleteId ? { athleteId } : {});
  };

  const handleConnectWhoop = () => {
    if (!selectedAthlete) return;
    try {
      setConnectError(null);
      window.location.assign(buildWhoopAuthorizeUrl(selectedAthlete.id));
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Impossible de démarrer la connexion WHOOP.');
    }
  };

  const connected = health.whoopConnection?.status === 'connected';
  const pageError = athletesError ?? health.error ?? connectError;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Applications connectées</CardTitle>
              <p className="mt-1 text-[12px] text-slate-500">
                Connecte les données santé après la création du profil pour enrichir l'analyse sans bloquer l'onboarding.
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-slate-400 mb-2">
                Athlète
              </label>
              <select
                value={selectedAthlete?.id ?? ''}
                onChange={event => handleAthleteChange(event.target.value)}
                disabled={athletesLoading || athletes.length === 0}
                className="h-10 w-full max-w-md rounded-md bg-white px-3 text-[13px] text-slate-800 outline-none"
                style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
              >
                {athletes.length === 0 && <option value="">Aucun athlète</option>}
                {athletes.map(athlete => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.full_name}
                  </option>
                ))}
              </select>
            </div>

            {pageError && <ErrorMessage message={pageError} />}

            <div className="grid gap-3 md:grid-cols-3">
              <ProviderCard
                title="WHOOP"
                description="Récupère sommeil, recovery, strain, HRV, fréquence cardiaque, workouts et mesures corporelles."
                status={connected ? 'Connecté' : health.whoopConnection?.status === 'error' ? 'Erreur' : 'À connecter'}
                accent="#1D9E75"
              >
                <div className="flex flex-wrap gap-2">
                  {connected && health.whoopConnection ? (
                    SYNC_OPTIONS.map(option => (
                      <button
                        key={option.days}
                        type="button"
                        onClick={() => void health.syncWhoop(health.whoopConnection!.id, shiftDate(isoDate(), -option.days))}
                        disabled={health.syncing}
                        className="h-9 rounded-md bg-slate-900 px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {health.syncing ? 'Sync...' : option.label}
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectWhoop}
                      disabled={!selectedAthlete}
                      className="h-9 rounded-md bg-slate-900 px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Connecter WHOOP
                    </button>
                  )}
                </div>
              </ProviderCard>

              <ProviderCard
                title="Apple Health"
                description="Import iOS prévu pour centraliser activité, sommeil et biométrie."
                status="Bientôt disponible"
                accent="#64748B"
              >
                <span title="Bientôt disponible" className="inline-flex">
                  <button
                    type="button"
                    disabled
                    className="h-9 cursor-not-allowed rounded-md bg-slate-100 px-3 text-[12px] font-medium text-slate-400"
                  >
                    Connecter Apple
                  </button>
                </span>
              </ProviderCard>

              <ProviderCard
                title="Google Health"
                description="Support Google Fit / Health Connect prévu pour Android."
                status="Bientôt disponible"
                accent="#64748B"
              >
                <span title="Bientôt disponible" className="inline-flex">
                  <button
                    type="button"
                    disabled
                    className="h-9 cursor-not-allowed rounded-md bg-slate-100 px-3 text-[12px] font-medium text-slate-400"
                  >
                    Connecter Google
                  </button>
                </span>
              </ProviderCard>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flow recommandé</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-[13px] text-slate-600">
            <FlowStep index="01" title="Onboarding manuel" text="L'athlète remplit le profil sans attendre l'autorisation d'une app tierce." />
            <FlowStep index="02" title="Connexion santé" text="Le coach propose WHOOP au moment de finaliser les objectifs ou depuis les paramètres de l'athlète." />
            <FlowStep index="03" title="Backfill historique" text="La première sync importe 12 mois ou plus pour donner du contexte aux tendances." />
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard label="Dernière sync" value={health.whoopConnection?.last_sync_at ? relativeFromNow(health.whoopConnection.last_sync_at) : '—'} detail={health.whoopConnection?.last_sync_at ? new Date(health.whoopConnection.last_sync_at).toLocaleString('fr-FR') : 'Aucune synchronisation'} />
        <MetricCard label="Jours de métriques" value={health.dailyMetrics.length} detail={summary.dateRange} />
        <MetricCard label="Workouts importés" value={health.workouts.length} detail={health.workouts[0] ? `Dernier: ${formatDate(health.workouts[0].start_at)}` : 'Aucune séance WHOOP'} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Données WHOOP récentes</CardTitle>
            {health.loading && <span className="text-[12px] text-slate-400">Chargement...</span>}
          </CardHeader>
          <CardBody>
            {latestMetric ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <DataPoint label="Recovery" value={formatPercent(latestMetric.recovery_score)} />
                <DataPoint label="HRV" value={formatUnit(latestMetric.hrv_rmssd_ms, 'ms')} />
                <DataPoint label="Sommeil" value={formatMinutes(latestMetric.sleep_minutes)} />
                <DataPoint label="Strain" value={formatNumber(latestMetric.strain)} />
                <DataPoint label="FC repos" value={formatUnit(latestMetric.resting_heart_rate, 'bpm')} />
                <DataPoint label="Poids" value={formatUnit(latestMetric.weight_kg, 'kg')} />
              </div>
            ) : (
              <EmptyHealthState athlete={selectedAthlete} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Derniers workouts</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {health.workouts.length === 0 ? (
              <p className="text-[13px] text-slate-500">Aucun workout importé pour le moment.</p>
            ) : (
              health.workouts.slice(0, 6).map(workout => (
                <div
                  key={workout.id}
                  className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2"
                  style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
                >
                  <div>
                    <div className="text-[13px] font-medium text-slate-900">{workout.sport ?? 'Workout'}</div>
                    <div className="text-[11px] text-slate-500">{new Date(workout.start_at).toLocaleString('fr-FR')}</div>
                  </div>
                  <div className="text-right text-[12px] text-slate-600">
                    <div>{formatMinutes(workout.duration_seconds ? Math.round(workout.duration_seconds / 60) : null)}</div>
                    <div className="text-[11px] text-slate-400">{formatUnit(workout.average_heart_rate, 'bpm')}</div>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

function ProviderCard({
  title,
  description,
  status,
  accent,
  children,
}: {
  title: string;
  description: string;
  status: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[190px] flex-col justify-between rounded-md bg-white p-4" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-medium text-slate-900">{title}</h3>
          <span className="rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: accent, background: `${accent}14` }}>
            {status}
          </span>
        </div>
        <p className="mt-3 text-[12px] leading-5 text-slate-500">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function FlowStep({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="font-mono text-[10px] text-slate-400">{index}</span>
      <div>
        <div className="text-[13px] font-medium text-slate-900">{title}</div>
        <p className="mt-1 leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
        <div className="mt-2 text-[26px] font-light tracking-tight text-slate-900">{value}</div>
        <div className="mt-1 text-[12px] text-slate-500">{detail}</div>
      </CardBody>
    </Card>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-3" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-[18px] font-medium text-slate-900">{value}</div>
    </div>
  );
}

function EmptyHealthState({ athlete }: { athlete: AthleteRosterRow | null }) {
  if (!athlete) {
    return <p className="text-[13px] text-slate-500">Crée un athlète avant de connecter une application santé.</p>;
  }
  return (
    <div className="space-y-3 text-[13px] text-slate-500">
      <p>Aucune donnée santé importée pour {athlete.full_name}.</p>
      <Link to={`/athletes/${athlete.id}`} className="inline-flex text-[12px] font-medium" style={{ color: TOKENS.TEAL }}>
        Voir le profil athlète
      </Link>
    </div>
  );
}

function summarizeMetrics(metrics: HealthDailyMetric[]) {
  if (metrics.length === 0) return { dateRange: 'Aucune donnée' };
  const dates = metrics.map(metric => metric.metric_date).sort();
  return { dateRange: `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}` };
}

function formatPercent(value: number | null) {
  return typeof value === 'number' ? `${Math.round(value)}%` : '—';
}

function formatNumber(value: number | null) {
  return typeof value === 'number' ? value.toFixed(1) : '—';
}

function formatUnit(value: number | null, unit: string) {
  return typeof value === 'number' ? `${Math.round(value * 10) / 10} ${unit}` : '—';
}

function formatMinutes(value: number | null) {
  if (typeof value !== 'number') return '—';
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (hours <= 0) return `${minutes} min`;
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}
