import { useMemo, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { useParams } from 'react-router-dom';
import { AthleteProfile } from '@/components/athlete/AthleteProfile';
import { AthleteProgress } from '@/components/athlete/AthleteProgress';
import { CheckinDetailModal } from '@/components/athlete/CheckinDetailModal';
import { CheckinsTable } from '@/components/athlete/CheckinsTable';
import { CoachNotes } from '@/components/athlete/CoachNotes';
import { WeekWorkbench } from '@/components/athlete/WeekWorkbench';
import { WeeklyCheckinsPanel } from '@/components/client/WeeklyCheckinsPanel';
import { AthleteReportPDF, type ReportData } from '@/components/pdf/AthleteReportPDF';
import { FilterChip, KPICard, SectionLabel, StatusDot, TOKENS } from '@/components/dashboard/kit';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useAthlete } from '@/hooks/useAthlete';
import { useCheckins } from '@/hooks/useCheckins';
import { useDailyNutritionTargets } from '@/hooks/useDailyNutritionTargets';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { computeAthleteAlerts } from '@/lib/alerts';
import { supabase } from '@/lib/supabase';
import { formatWeekRange, isoDate, isoWeekEnd, isoWeekStart } from '@/lib/utils';
import { NUTRITION_ADHERENCE_LABELS, TRAINING_SESSION_STATUS_LABELS, TRAINING_SESSION_TYPE_LABELS } from '@/types/database';
import type { Checkin, CoachNote, DailyNutritionTarget, NutritionMealItem, TrainingSession } from '@/types/database';

type Tab = 'overview' | 'checkins' | 'training' | 'nutrition' | 'progress' | 'notes' | 'reports';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'checkins', label: 'Check-ins' },
  { key: 'training', label: 'Training' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'progress', label: 'Progress' },
  { key: 'notes', label: 'Coach Notes' },
  { key: 'reports', label: 'Reports' },
];

export function AthletePage() {
  const { id } = useParams<{ id: string }>();
  const { coach } = useAuth();
  const { athlete, loading, error, setAthlete } = useAthlete(id);
  const [weekStart, setWeekStart] = useState(() => isoWeekStart());
  const weekEnd = useMemo(() => isoWeekEnd(weekStart), [weekStart]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [detailCheckin, setDetailCheckin] = useState<Checkin | null>(null);

  const checkins = useCheckins(id, 90);
  const training = useTrainingSessions(id, weekStart, weekEnd);
  const nutrition = useDailyNutritionTargets(id, weekStart, weekEnd);

  const alerts = useMemo(() => {
    if (!athlete) return [];
    return computeAthleteAlerts({
      athlete,
      checkins: checkins.checkins,
      sessions: training.sessions,
      targets: nutrition.targets,
      today: isoDate(),
    });
  }, [athlete, checkins.checkins, nutrition.targets, training.sessions]);

  const exportReport = async () => {
    if (!coach || !athlete) return;
    setExporting(true);
    setExportError(null);
    try {
      const latest = await loadReportData(athlete.id, weekStart, weekEnd);
      const reportData: ReportData = {
        coach,
        athlete,
        weekStart,
        dailyTargets: latest.dailyTargets,
        mealItems: latest.mealItems,
        trainingSessions: latest.trainingSessions,
        checkins: latest.checkins,
        coachNote: latest.coachNote,
        alerts,
      };
      const blob = await pdf(<AthleteReportPDF data={reportData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport-${athlete.full_name.toLowerCase().replace(/\s+/g, '-')}-${weekStart}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export PDF impossible');
    } finally {
      setExporting(false);
    }
  };

  if (!id) return <ErrorMessage message="Athlète introuvable : identifiant manquant." />;

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (error) return <ErrorMessage message={error} />;
  if (!athlete) return <ErrorMessage message="Athlète introuvable." />;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionLabel index="01" title={athlete.full_name} />
            <div className="mt-2 flex items-center gap-3 text-[13px] text-slate-500">
              <span>{athlete.sport}</span>
              <StatusDot status={athlete.status} />
              <span>{formatWeekRange(weekStart)}</span>
            </div>
          </div>
          <Button onClick={exportReport} loading={exporting}>
            Export report
          </Button>
        </div>
      </section>

      {exportError && <ErrorMessage message={exportError} />}

      <div className="flex flex-wrap items-center gap-1">
        {TABS.map(tab => (
          <FilterChip key={tab.key} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </FilterChip>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          athleteId={athlete.id}
          alerts={alerts}
          latestCheckin={checkins.checkins[0] ?? null}
          todaySessions={training.sessions.filter(session => session.session_date === isoDate())}
          todayTarget={nutrition.targets.find(target => target.target_date === isoDate()) ?? null}
          profile={<AthleteProfile athlete={athlete} onUpdated={setAthlete} />}
        />
      )}

      {activeTab === 'checkins' && (
        <div className="flex flex-col gap-4">
          <WeeklyCheckinsPanel
            athlete={athlete}
            missedSessionsCount={training.sessions.filter(session => session.status === 'missed').length}
          />
          <Card>
            <CardHeader>
              <CardTitle>Check-ins quotidiens</CardTitle>
              <span className="text-[11px] text-slate-500">
                Clique une ligne pour voir le détail soumis par le client.
              </span>
            </CardHeader>
            <CardBody>
              {checkins.error && <ErrorMessage message={checkins.error} className="mb-4" />}
              {checkins.loading ? (
                <div className="py-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
              ) : (
                <CheckinsTable
                  checkins={checkins.checkins}
                  onRowClick={setDetailCheckin}
                />
              )}
            </CardBody>
          </Card>
        </div>
      )}

      <CheckinDetailModal
        open={!!detailCheckin}
        onClose={() => setDetailCheckin(null)}
        checkin={detailCheckin}
        sessions={training.sessions}
      />

      {activeTab === 'training' && (
        <WeekWorkbench
          athleteId={athlete.id}
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          sessionsByDate={training.byDate}
          sessions={training.sessions}
          trainingLoading={training.loading}
          trainingError={training.error}
          upsertSession={training.upsertSession}
          deleteSession={training.deleteSession}
          duplicatePreviousWeek={training.duplicatePreviousWeek}
          targetsByDate={nutrition.byDate}
          mealItemsByTargetId={nutrition.mealItemsByTargetId}
          nutritionLoading={nutrition.loading}
          nutritionError={nutrition.error}
          upsertTarget={nutrition.upsertTarget}
          upsertMealItem={nutrition.upsertMealItem}
          deleteMealItem={nutrition.deleteMealItem}
          generateWeekFromSessions={nutrition.generateWeekFromSessions}
        />
      )}

      {activeTab === 'nutrition' && (
        <WeekWorkbench
          athleteId={athlete.id}
          weekStart={weekStart}
          onWeekChange={setWeekStart}
          sessionsByDate={training.byDate}
          sessions={training.sessions}
          trainingLoading={training.loading}
          trainingError={training.error}
          upsertSession={training.upsertSession}
          deleteSession={training.deleteSession}
          duplicatePreviousWeek={training.duplicatePreviousWeek}
          targetsByDate={nutrition.byDate}
          mealItemsByTargetId={nutrition.mealItemsByTargetId}
          nutritionLoading={nutrition.loading}
          nutritionError={nutrition.error}
          upsertTarget={nutrition.upsertTarget}
          upsertMealItem={nutrition.upsertMealItem}
          deleteMealItem={nutrition.deleteMealItem}
          generateWeekFromSessions={nutrition.generateWeekFromSessions}
        />
      )}

      {activeTab === 'progress' && (
        <AthleteProgress athleteId={athlete.id} />
      )}

      {activeTab === 'notes' && (
        <Card>
          <CardHeader>
            <CardTitle>Notes privées coach</CardTitle>
          </CardHeader>
          <CardBody>
            <CoachNotes athleteId={athlete.id} weekStart={weekStart} />
          </CardBody>
        </Card>
      )}

      {activeTab === 'reports' && (
        <Card>
          <CardHeader>
            <CardTitle>Rapport exportable</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div className="text-sm text-slate-600">
              Le PDF inclut readiness, alertes, cibles nutrition quotidiennes, séances de la semaine, check-ins et notes coach.
            </div>
            <Button className="w-fit" onClick={exportReport} loading={exporting}>Exporter le PDF</Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function OverviewTab({
  alerts,
  latestCheckin,
  todaySessions,
  todayTarget,
  profile,
}: {
  athleteId: string;
  alerts: ReturnType<typeof computeAthleteAlerts>;
  latestCheckin: Checkin | null;
  todaySessions: TrainingSession[];
  todayTarget: DailyNutritionTarget | null;
  profile: React.ReactNode;
}) {
  const readiness = latestCheckin
    ? Math.round(((latestCheckin.energy_level + latestCheckin.sleep_quality + (6 - (latestCheckin.soreness_level ?? 3))) / 15) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px rounded-md overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
        <KPICard label="Readiness" value={latestCheckin ? `${readiness}%` : '—'} subline={latestCheckin ? `Dernier check-in ${latestCheckin.checkin_date}` : 'Aucune donnée'} progress={readiness / 100} />
        <KPICard label="Poids" value={latestCheckin ? `${Number(latestCheckin.weight_kg).toFixed(1)}` : '—'} subline="kg au dernier check-in" badge="daily" />
        <KPICard label="Séances aujourd’hui" value={todaySessions.length} subline={todaySessions.map(session => session.title).join(' · ') || 'Aucune séance'} />
        <KPICard label="Calories aujourd’hui" value={todayTarget?.calories ?? '—'} subline={todayTarget ? `${todayTarget.protein_g}P ${todayTarget.carbs_g}G ${todayTarget.fat_g}L` : 'Cible manquante'} delta={{ value: String(alerts.length), tone: alerts.length ? 'neg' : 'mute', text: 'alerts' }} />
      </div>

      <ReadinessSignalsCard checkin={latestCheckin} />

      <TodayPlanCard target={todayTarget} sessions={todaySessions} />

      <Card>
        <CardHeader>
          <CardTitle>Alertes coach</CardTitle>
        </CardHeader>
        <CardBody>
          {alerts.length === 0 ? (
            <div className="text-sm text-slate-500">Aucun signal critique calculé avec les données disponibles.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {alerts.map(alert => (
                <div key={alert.id} className="rounded-md border border-[#EAE9E5] px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[13px] font-medium text-slate-900">{alert.title}</div>
                    <span
                      className="text-[10px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
                      style={{
                        color: alert.severity === 'critical' ? TOKENS.CRITICAL : alert.severity === 'warning' ? TOKENS.AMBER : TOKENS.SLATE,
                        background: alert.severity === 'critical' ? TOKENS.CRITICAL_BG : alert.severity === 'warning' ? TOKENS.WARNING_BG : TOKENS.PANEL_BG,
                      }}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500">{alert.description}</div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <section className="flex flex-col gap-4">
        <SectionLabel index="02" title="Profile" />
        {profile}
      </section>
    </div>
  );
}

// Latest check-in surfaced as a 8-tile readiness panel — energy / sleep
// / soreness / stress / motivation / hunger / digestion / nutrition.
function ReadinessSignalsCard({ checkin }: { checkin: Checkin | null }) {
  if (!checkin) {
    return (
      <Card>
        <CardHeader><CardTitle>Readiness signals</CardTitle></CardHeader>
        <CardBody>
          <div className="text-sm text-slate-500">Aucun check-in enregistré.</div>
        </CardBody>
      </Card>
    );
  }

  const tiles: Array<{ label: string; value: number | null; max?: number; suffix?: string; tone: 'pos' | 'neg' | 'mute'; raw?: string }> = [
    { label: 'Énergie',    value: checkin.energy_level,        max: 5, suffix: '/5', tone: checkin.energy_level >= 4 ? 'pos' : checkin.energy_level <= 2 ? 'neg' : 'mute' },
    { label: 'Sommeil',    value: checkin.sleep_quality,       max: 5, suffix: '/5', tone: checkin.sleep_quality >= 4 ? 'pos' : checkin.sleep_quality <= 2 ? 'neg' : 'mute' },
    { label: 'Soreness',   value: checkin.soreness_level,      max: 5, suffix: '/5', tone: (checkin.soreness_level ?? 0) >= 4 ? 'neg' : 'mute' },
    { label: 'Stress',     value: checkin.stress_level,        max: 5, suffix: '/5', tone: (checkin.stress_level ?? 0) >= 4 ? 'neg' : 'mute' },
    { label: 'Motivation', value: checkin.motivation_level,    max: 5, suffix: '/5', tone: (checkin.motivation_level ?? 0) >= 4 ? 'pos' : (checkin.motivation_level ?? 0) <= 2 ? 'neg' : 'mute' },
    { label: 'Faim',       value: checkin.hunger_level,        max: 5, suffix: '/5', tone: 'mute' },
    { label: 'Digestion',  value: checkin.digestion_quality,   max: 5, suffix: '/5', tone: (checkin.digestion_quality ?? 0) >= 4 ? 'pos' : (checkin.digestion_quality ?? 0) <= 2 ? 'neg' : 'mute' },
    {
      label: 'Adhérence nutrition',
      value: null,
      tone: checkin.nutrition_adherence === 'high' ? 'pos' : checkin.nutrition_adherence === 'low' ? 'neg' : 'mute',
      raw: checkin.nutrition_adherence ? NUTRITION_ADHERENCE_LABELS[checkin.nutrition_adherence] : '—',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Readiness signals — {checkin.checkin_date}</CardTitle>
        <span className="text-[11px] text-slate-500">soumis {new Date(checkin.submitted_at).toLocaleString('fr-FR')}</span>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-md overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
          {tiles.map(tile => (
            <SignalTile key={tile.label} {...tile} />
          ))}
        </div>
        {checkin.notes && (
          <div className="mt-4 rounded-md p-3" style={{ background: TOKENS.PANEL_BG, border: `1px solid ${TOKENS.HAIRLINE}` }}>
            <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">Notes athlète</div>
            <div className="mt-1 text-[13px] text-slate-700 whitespace-pre-wrap">{checkin.notes}</div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function SignalTile({
  label, value, max, suffix, tone, raw,
}: {
  label: string;
  value: number | null;
  max?: number;
  suffix?: string;
  tone: 'pos' | 'neg' | 'mute';
  raw?: string;
}) {
  const color =
    tone === 'pos' ? TOKENS.TEAL :
    tone === 'neg' ? TOKENS.AMBER :
    TOKENS.SLATE;
  const ratio = value !== null && max ? value / max : 0;

  return (
    <div className="bg-white px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-medium truncate">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span
          className="text-[24px] font-mono tabular-nums leading-none"
          style={{ color, fontFeatureSettings: '"tnum"' }}
        >
          {value !== null ? value : raw ?? '—'}
        </span>
        {suffix && value !== null && (
          <span className="text-[11px] font-mono tabular-nums text-slate-400">{suffix}</span>
        )}
      </div>
      {value !== null && max && (
        <div className="mt-2 h-[3px] rounded-full overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.round(ratio * 100)}%`, background: color }}
          />
        </div>
      )}
    </div>
  );
}

function TodayPlanCard({
  target, sessions,
}: { target: DailyNutritionTarget | null; sessions: TrainingSession[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan du jour</CardTitle>
        <span className="text-[11px] text-slate-500">
          {sessions.length} séance{sessions.length > 1 ? 's' : ''} · {target ? `${target.calories} kcal` : 'cible manquante'}
        </span>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
          <div className="flex flex-col gap-2">
            <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
              Cible nutrition
            </div>
            {target ? (
              <div className="rounded-md p-3 grid grid-cols-4 gap-3" style={{ background: TOKENS.PANEL_BG, border: `1px solid ${TOKENS.HAIRLINE}` }}>
                <Tile label="Kcal" value={`${target.calories}`} />
                <Tile label="Prot." value={`${target.protein_g} g`} />
                <Tile label="Gluc." value={`${target.carbs_g} g`} />
                <Tile label="Lip." value={`${target.fat_g} g`} />
              </div>
            ) : (
              <div className="rounded-md p-3 text-[12px] text-slate-500" style={{ background: TOKENS.PANEL_BG, border: `1px dashed ${TOKENS.HAIRLINE}` }}>
                Aucune cible définie pour aujourd'hui.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-slate-500">
              Séances
            </div>
            {sessions.length === 0 ? (
              <div className="rounded-md p-3 text-[12px] text-slate-500" style={{ background: TOKENS.PANEL_BG, border: `1px dashed ${TOKENS.HAIRLINE}` }}>
                Aucune séance planifiée aujourd'hui.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sessions.map(session => (
                  <div key={session.id} className="rounded-md bg-white p-3" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-[13px] font-medium text-slate-900 truncate">{session.title}</div>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                        {TRAINING_SESSION_STATUS_LABELS[session.status]}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {TRAINING_SESSION_TYPE_LABELS[session.session_type]}
                      {' · '}
                      {session.planned_duration_min ?? '—'} min
                      {' · '}
                      intensité {session.planned_intensity ?? '—'}/10
                      {session.rpe !== null && session.rpe !== undefined && ` · RPE ${session.rpe}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 text-[13px] font-mono tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

async function loadReportData(athleteId: string, weekStart: string, weekEnd: string): Promise<{
  dailyTargets: DailyNutritionTarget[];
  mealItems: NutritionMealItem[];
  trainingSessions: TrainingSession[];
  checkins: Checkin[];
  coachNote: CoachNote | null;
}> {
  const { data: targetRows, error: targetError } = await supabase
    .from('daily_nutrition_targets')
    .select('*')
    .eq('athlete_id', athleteId)
    .gte('target_date', weekStart)
    .lte('target_date', weekEnd)
    .order('target_date', { ascending: true });
  if (targetError) throw targetError;
  const targetRowsTyped = (targetRows ?? []) as DailyNutritionTarget[];

  const mealItems: NutritionMealItem[] = [];
  if (targetRowsTyped.length > 0) {
    const { data: mealRows, error: mealError } = await supabase
      .from('nutrition_meal_items')
      .select('*')
      .in('target_id', targetRowsTyped.map(target => target.id))
      .order('position', { ascending: true });
    if (mealError) throw mealError;
    mealItems.push(...((mealRows ?? []) as NutritionMealItem[]));
  }

  const { data: sessionRows, error: sessionError } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('athlete_id', athleteId)
    .gte('session_date', weekStart)
    .lte('session_date', weekEnd)
    .order('session_date', { ascending: true });
  if (sessionError) throw sessionError;

  const { data: checkinRows, error: checkinError } = await supabase
    .from('checkins')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('checkin_date', { ascending: false })
    .limit(30);
  if (checkinError) throw checkinError;

  const { data: noteRow, error: noteError } = await supabase
    .from('coach_notes')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (noteError) throw noteError;

  return {
    dailyTargets: targetRowsTyped,
    mealItems,
    trainingSessions: (sessionRows ?? []) as TrainingSession[],
    checkins: (checkinRows ?? []) as Checkin[],
    coachNote: (noteRow as CoachNote | null) ?? null,
  };
}
