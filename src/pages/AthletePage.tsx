import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { useParams } from 'react-router-dom';
import { AthleteProfile } from '@/components/athlete/AthleteProfile';
import { NutritionPlanEditor } from '@/components/athlete/NutritionPlanEditor';
import { ProgressSection } from '@/components/athlete/ProgressSection';
import { AthleteReportPDF, type ReportData } from '@/components/pdf/AthleteReportPDF';
import { SectionLabel, StatusDot } from '@/components/dashboard/kit';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useAthlete } from '@/hooks/useAthlete';
import { supabase } from '@/lib/supabase';
import { isoWeekStart } from '@/lib/utils';
import type { Checkin, CoachNote, DayTarget, DayType } from '@/types/database';

export function AthletePage() {
  const { id } = useParams<{ id: string }>();
  const { coach } = useAuth();
  const { athlete, loading, error, setAthlete } = useAthlete(id);
  const [weekStart, setWeekStart] = useState(() => isoWeekStart());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportReport = async () => {
    if (!coach || !athlete) return;
    setExporting(true);
    setExportError(null);
    try {
      const latest = await loadReportData(athlete.id, weekStart);
      const reportData: ReportData = {
        coach,
        athlete,
        weekStart,
        targets: latest.targets,
        checkins: latest.checkins,
        coachNote: latest.coachNote,
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
      setExportError(err instanceof Error ? err.message : "Export PDF impossible");
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
            </div>
          </div>
          <Button onClick={exportReport} loading={exporting}>
            Export report
          </Button>
        </div>
      </section>

      {exportError && <ErrorMessage message={exportError} />}

      <section className="flex flex-col gap-4">
        <SectionLabel index="02" title="Profile" />
        <AthleteProfile athlete={athlete} onUpdated={setAthlete} />
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel index="03" title="Weekly nutrition plan" />
        <NutritionPlanEditor athleteId={athlete.id} weekStart={weekStart} onWeekChange={setWeekStart} />
      </section>

      <section className="flex flex-col gap-4">
        <SectionLabel index="04" title="Progression" />
        <ProgressSection athleteId={athlete.id} weekStart={weekStart} />
      </section>
    </div>
  );
}

async function loadReportData(athleteId: string, weekStart: string): Promise<{
  targets: Partial<Record<DayType, DayTarget>>;
  checkins: Checkin[];
  coachNote: CoachNote | null;
}> {
  const { data: plan, error: planError } = await supabase
    .from('nutrition_plans')
    .select('id')
    .eq('athlete_id', athleteId)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (planError) throw planError;

  const targets: Partial<Record<DayType, DayTarget>> = {};
  if (plan) {
    const { data: targetRows, error: targetError } = await supabase
      .from('day_targets')
      .select('*')
      .eq('plan_id', plan.id);
    if (targetError) throw targetError;
    for (const row of (targetRows ?? []) as DayTarget[]) {
      targets[row.day_type] = row;
    }
  }

  const { data: checkinRows, error: checkinError } = await supabase
    .from('checkins')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('checkin_date', { ascending: false })
    .limit(12);
  if (checkinError) throw checkinError;

  const { data: noteRow, error: noteError } = await supabase
    .from('coach_notes')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('week_start', weekStart)
    .maybeSingle();
  if (noteError) throw noteError;

  return {
    targets,
    checkins: (checkinRows ?? []) as Checkin[],
    coachNote: (noteRow as CoachNote | null) ?? null,
  };
}
