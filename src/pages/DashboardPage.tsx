import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { AddAthleteModal } from '@/components/AddAthleteModal';
import { useAthletes } from '@/hooks/useAthletes';
import { relativeFromNow } from '@/lib/utils';
import type { AthleteStatus } from '@/types/database';

type Filter = 'all' | AthleteStatus;

export function DashboardPage() {
  const { athletes, loading, error, refresh } = useAthletes();
  const [filter, setFilter] = useState<Filter>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(
    () => (filter === 'all' ? athletes : athletes.filter(a => a.status === filter)),
    [athletes, filter],
  );

  const countByStatus = useMemo(() => {
    const counts: Record<Filter, number> = { all: athletes.length, active: 0, offseason: 0, injured: 0 };
    for (const a of athletes) counts[a.status] += 1;
    return counts;
  }, [athletes]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Roster</h1>
          <p className="text-sm text-slate-500">{athletes.length} athlète(s) suivis.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Ajouter un athlète</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterTab current={filter} value="all" onSelect={setFilter} label={`Tous (${countByStatus.all})`} />
        <FilterTab current={filter} value="active" onSelect={setFilter} label={`Actifs (${countByStatus.active})`} />
        <FilterTab current={filter} value="offseason" onSelect={setFilter} label={`Intersaison (${countByStatus.offseason})`} />
        <FilterTab current={filter} value="injured" onSelect={setFilter} label={`Blessés (${countByStatus.injured})`} />
      </div>

      {error && <ErrorMessage message={error} />}

      <Card>
        {loading ? (
          <div className="p-10 flex justify-center"><Spinner className="h-6 w-6" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            {athletes.length === 0
              ? "Aucun athlète pour l'instant. Ajoutez-en un pour démarrer."
              : "Aucun athlète pour ce filtre."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Athlète</th>
                  <th className="px-5 py-3">Sport</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3">Dernier poids</th>
                  <th className="px-5 py-3">Dernier check-in</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link to={`/athletes/${a.id}`} className="font-medium text-slate-900 hover:text-[var(--brand)]">
                        {a.full_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{a.sport}</td>
                    <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-3 text-slate-700">
                      {a.last_checkin ? `${a.last_checkin.weight_kg} kg` : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {relativeFromNow(a.last_checkin?.submitted_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/athletes/${a.id}`} className="text-sm text-[var(--brand)] hover:underline">
                        Fiche →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddAthleteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => refresh()}
      />
    </div>
  );
}

function FilterTab({
  current,
  value,
  onSelect,
  label,
}: {
  current: Filter;
  value: Filter;
  onSelect: (v: Filter) => void;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`h-8 px-3 text-xs rounded-full border transition-colors ${
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  );
}
