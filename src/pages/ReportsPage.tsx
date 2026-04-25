import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Link } from 'react-router-dom';
import {
  Avatar,
  KPICard,
  SectionLabel,
  StatusDot,
  TOKENS,
  initialsOf,
} from '@/components/dashboard/kit';
import { AthleteReportPDF, type ReportData } from '@/components/pdf/AthleteReportPDF';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useAthletes } from '@/hooks/useAthletes';
import { supabase } from '@/lib/supabase';
import { formatWeekRange, isoDate, isoWeekStart, relativeFromNow } from '@/lib/utils';
import type { AthleteRosterRow, Checkin, CoachNote, DayTarget, DayType } from '@/types/database';

export function ReportsPage() {
  const { coach } = useAuth();
  const { athletes, loading, error } = useAthletes();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const weekStart = isoWeekStart();
  const today = isoDate();

  const readyCount = athletes.filter(a => a.last_checkin?.checkin_date === today).length;

  const exportReport = async (athlete: AthleteRosterRow) => {
    if (!coach) {
      setExportError('Profil coach introuvable.');
      return;
    }
    setExportingId(athlete.id);
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
      setExportError(err instanceof Error ? err.message : 'Export PDF impossible');
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionLabel index="01" title="Report exports" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px mt-4 rounded-md overflow-hidden" style={{ background: TOKENS.HAIRLINE }}>
          <KPICard label="Report period" value={athletes.length} subline={formatWeekRange(weekStart)} badge="athletes" />
          <KPICard label="Checked in today" value={readyCount} subline="Daily check-in submitted" progress={athletes.length ? readyCount / athletes.length : 0} />
          <KPICard label="Pending today" value={athletes.length - readyCount} subline="No daily check-in yet" delta={{ value: String(athletes.length - readyCount), tone: athletes.length - readyCount ? 'neg' : 'mute', text: 'open' }} />
          <KPICard label="PDF format" value="3" subline="Cover · nutrition · progression" badge="pages" />
        </div>
      </section>

      <section>
        <SectionLabel index="02" title="Athlete reports" count={athletes.length} />
        {error && <ErrorMessage message={error} className="mt-4" />}
        {exportError && <ErrorMessage message={exportError} className="mt-4" />}

        <div
          className="mt-4 bg-white rounded-md overflow-hidden"
          style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}
        >
          {loading ? (
            <div className="p-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
          ) : athletes.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No athletes available for report export.</div>
          ) : (
            <div className="overflow-x-auto">
              <ReportsTable
                athletes={athletes}
                exportingId={exportingId}
                onExport={exportReport}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ReportsTable({
  athletes,
  exportingId,
  onExport,
}: {
  athletes: AthleteRosterRow[];
  exportingId: string | null;
  onExport: (athlete: AthleteRosterRow) => void;
}) {
  const cols = '40px minmax(220px,1.4fr) 110px 150px 160px 110px 110px';

  return (
    <div className="min-w-[960px]">
      <div
        className="grid items-center px-5 h-10 text-[10px] uppercase tracking-[0.12em] text-slate-400 font-medium"
        style={{ gridTemplateColumns: cols, borderBottom: `1px solid ${TOKENS.HAIRLINE}`, background: TOKENS.PANEL_BG }}
      >
        <div />
        <div>Athlete</div>
        <div>Status</div>
        <div>Latest check-in</div>
        <div>Report contents</div>
        <div>Preview</div>
        <div className="text-right">Export</div>
      </div>

      {athletes.map((athlete, index) => (
        <div
          key={athlete.id}
          className="grid items-center px-5 h-[60px] text-[13px] hover:bg-[#FAFAF8] transition-colors"
          style={{
            gridTemplateColumns: cols,
            borderBottom: index === athletes.length - 1 ? undefined : `1px solid ${TOKENS.HAIRLINE}`,
          }}
        >
          <Avatar initials={initialsOf(athlete.full_name)} status={athlete.status} />
          <div className="min-w-0">
            <div className="font-medium text-slate-900 truncate">{athlete.full_name}</div>
            <div className="mt-0.5 text-[11px] text-slate-500 truncate">{athlete.sport}</div>
          </div>
          <StatusDot status={athlete.status} />
          <div className="font-mono tabular-nums text-[12px] text-slate-700">
            {relativeFromNow(athlete.last_checkin?.submitted_at)}
          </div>
          <div className="flex items-center gap-1.5">
            <ContentDot active />
            <ContentDot active />
            <ContentDot active={Boolean(athlete.last_checkin)} />
            <span className="ml-1 text-[11px] text-slate-500">profile · plan · progress</span>
          </div>
          <Link
            to={`/athletes/${athlete.id}`}
            className="text-[11px] uppercase tracking-[0.1em] font-medium text-slate-500 hover:text-slate-900"
          >
            Open →
          </Link>
          <div className="text-right">
            <Button size="sm" variant="secondary" loading={exportingId === athlete.id} onClick={() => onExport(athlete)}>
              PDF
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContentDot({ active }: { active: boolean }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full"
      style={{ background: active ? TOKENS.TEAL : TOKENS.HAIRLINE }}
    />
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
