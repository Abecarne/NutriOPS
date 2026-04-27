import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { WeeklyCheckinForm } from '@/components/client/WeeklyCheckinForm';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useWeeklyCheckinContext } from '@/hooks/useWeeklyCheckins';
import { formatDate, isoWeekStart } from '@/lib/utils';

export function WeeklyCheckinPage() {
  const { token } = useParams<{ token: string }>();
  const weekStart = useMemo(() => isoWeekStart(), []);
  const { context, loading, error, refresh } = useWeeklyCheckinContext(token, weekStart);

  useEffect(() => {
    if (context?.primary_color) {
      document.documentElement.style.setProperty('--brand', context.primary_color || '#1D9E75');
    }
  }, [context?.primary_color]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (error || !context || !token) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ErrorMessage message={error ?? 'Check-in hebdomadaire introuvable.'} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] p-4 sm:p-6">
      <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
        <header className="bg-white rounded-md border border-[#EAE9E5] p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{context.club_name || 'NutriOps'}</div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Check-in hebdomadaire</h1>
          <p className="text-sm text-slate-600 mt-1">
            {context.full_name} · semaine du {formatDate(weekStart)}.
          </p>
        </header>

        {context.weekly_checkin?.coach_feedback && (
          <div className="bg-white rounded-md border border-[#EAE9E5] p-4">
            <div className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">Feedback coach</div>
            <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{context.weekly_checkin.coach_feedback}</div>
          </div>
        )}

        <WeeklyCheckinForm
          token={token}
          weekStart={weekStart}
          existing={context.weekly_checkin}
          onSubmitted={refresh}
        />
      </div>
    </div>
  );
}
