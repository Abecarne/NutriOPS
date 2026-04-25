import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { ProgressChart } from './ProgressChart';
import { CheckinsTable } from './CheckinsTable';
import { CoachNotes } from './CoachNotes';
import { useCheckins } from '@/hooks/useCheckins';
import { useAuth } from '@/context/AuthContext';

interface Props {
  athleteId: string;
  weekStart: string;
}

export function ProgressSection({ athleteId, weekStart }: Props) {
  const { coach } = useAuth();
  const { checkins, loading, error } = useCheckins(athleteId, 12);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progression — 12 dernières semaines</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-6">
        {error && <ErrorMessage message={error} />}
        {loading ? (
          <div className="py-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
        ) : (
          <>
            <ProgressChart checkins={checkins} primaryColor={coach?.primary_color ?? '#1D9E75'} />
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
