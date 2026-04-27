import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { ProgressChart } from './ProgressChart';
import { CheckinsTable } from './CheckinsTable';
import { CoachNotes } from './CoachNotes';
import { useCheckins } from '@/hooks/useCheckins';
import { useAuth } from '@/context/AuthContext';
import type { DailyNutritionTarget, TrainingSession } from '@/types/database';

interface Props {
  athleteId: string;
  weekStart: string;
  sessions?: TrainingSession[];
  targets?: DailyNutritionTarget[];
}

export function ProgressSection({ athleteId, weekStart, sessions = [], targets = [] }: Props) {
  const { coach } = useAuth();
  const { checkins, loading, error } = useCheckins(athleteId, 12);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progression — 12 derniers check-ins</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-6">
        {error && <ErrorMessage message={error} />}
        {loading ? (
          <div className="py-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
        ) : (
          <>
            <ProgressChart
              checkins={checkins}
              sessions={sessions}
              targets={targets}
              primaryColor={coach?.primary_color ?? '#1D9E75'}
            />
            <CheckinsTable checkins={checkins} />
          </>
        )}
        <div className="border-t border-slate-100 pt-4">
          <CoachNotes athleteId={athleteId} weekStart={weekStart} />
        </div>
      </CardBody>
    </Card>
  );
}
