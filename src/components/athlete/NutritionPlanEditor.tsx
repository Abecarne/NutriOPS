import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { WeekSelector } from './WeekSelector';
import { DayTargetCard } from './DayTargetCard';
import {
  createNutritionPlan,
  findPreviousPlan,
  useNutritionPlan,
  type PlanWithTargets,
} from '@/hooks/useNutritionPlan';
import { DAY_TYPES, type DayTarget } from '@/types/database';

interface Props {
  athleteId: string;
  weekStart: string;
  onWeekChange: (w: string) => void;
}

export function NutritionPlanEditor({ athleteId, weekStart, onWeekChange }: Props) {
  const { data, loading, error, setData, refresh } = useNutritionPlan(athleteId, weekStart);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createPlan = async (copy: boolean) => {
    setCreating(true);
    setCreateError(null);
    try {
      const previous = copy ? await findPreviousPlan(athleteId, weekStart) : null;
      const result = await createNutritionPlan(athleteId, weekStart, {
        copyFromPlanId: previous?.id ?? null,
      });
      setData(result);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erreur de création');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan nutritionnel</CardTitle>
        <WeekSelector weekStart={weekStart} onChange={onWeekChange} />
      </CardHeader>
      <CardBody>
        {error && <ErrorMessage message={error} className="mb-4" />}

        {loading ? (
          <div className="py-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
        ) : !data ? (
          <EmptyPlan
            creating={creating}
            error={createError}
            onCreate={() => createPlan(false)}
            onCopy={() => createPlan(true)}
          />
        ) : (
          <PlanGrid data={data} onRefresh={refresh} onTargetSaved={t => {
            setData(prev => prev ? { ...prev, targets: { ...prev.targets, [t.day_type]: t } } : prev);
          }} />
        )}
      </CardBody>
    </Card>
  );
}

function EmptyPlan({
  creating,
  error,
  onCreate,
  onCopy,
}: {
  creating: boolean;
  error: string | null;
  onCreate: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="text-slate-600 mb-1">Aucun plan pour cette semaine.</div>
      <div className="text-sm text-slate-500 mb-5">
        Créez un nouveau plan vierge, ou copiez le dernier plan disponible.
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCopy} loading={creating}>
          Copier la semaine précédente
        </Button>
        <Button onClick={onCreate} loading={creating}>
          Créer un plan vierge
        </Button>
      </div>
      {error && <div className="mt-4 w-full max-w-md"><ErrorMessage message={error} /></div>}
    </div>
  );
}

function PlanGrid({
  data,
  onTargetSaved,
}: {
  data: PlanWithTargets;
  onRefresh: () => void;
  onTargetSaved: (t: DayTarget) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {DAY_TYPES.map(dt => (
        <DayTargetCard
          key={dt}
          planId={data.plan.id}
          dayType={dt}
          initial={data.targets[dt]}
          onSaved={onTargetSaved}
        />
      ))}
    </div>
  );
}
