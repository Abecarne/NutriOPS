import { Link, useParams } from 'react-router-dom';
import { OnboardingWizard } from '@/components/client/OnboardingWizard';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Spinner } from '@/components/ui/Spinner';
import { useAthlete } from '@/hooks/useAthlete';

export function OnboardingPage() {
  const { id } = useParams<{ id: string }>();
  const { athlete, loading, error, setAthlete } = useAthlete(id);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (error) return <ErrorMessage message={error} />;
  if (!athlete) return <ErrorMessage message="Client introuvable." />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">Profil client</div>
          <h1 className="mt-1 text-2xl font-medium text-slate-900">{athlete.full_name}</h1>
          <p className="mt-1 text-sm text-slate-500">Questionnaire structuré pour individualiser le suivi premium.</p>
        </div>
        <Link
          to={`/athletes/${athlete.id}`}
          className="inline-flex h-9 items-center justify-center rounded-md border border-[#EAE9E5] bg-white px-4 text-[12px] font-medium text-slate-700 hover:bg-[#FAFAF8]"
        >
          Retour au profil
        </Link>
      </div>
      <OnboardingWizard athlete={athlete} onSaved={setAthlete} />
    </div>
  );
}
