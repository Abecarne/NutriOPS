import { NUTRITION_ADHERENCE_LABELS } from '@/types/database';
import type { Checkin } from '@/types/database';
import { formatDate } from '@/lib/utils';

interface Props {
  checkins: Checkin[];
  onRowClick?: (checkin: Checkin) => void;
}

export function CheckinsTable({ checkins, onRowClick }: Props) {
  if (checkins.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-6 text-center">
        Aucun check-in enregistré.
      </div>
    );
  }
  const interactive = !!onRowClick;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
            <th className="py-2 pr-4 font-medium">Date</th>
            <th className="py-2 pr-4 font-medium">Poids</th>
            <th className="py-2 pr-4 font-medium">Énergie</th>
            <th className="py-2 pr-4 font-medium">Sommeil</th>
            <th className="py-2 pr-4 font-medium">Soreness</th>
            <th className="py-2 pr-4 font-medium">Stress</th>
            <th className="py-2 pr-4 font-medium">Nutrition</th>
            <th className="py-2 pr-4 font-medium">Notes athlète</th>
            {interactive && <th className="py-2 font-medium text-right pr-2">Détail</th>}
          </tr>
        </thead>
        <tbody>
          {checkins.map(c => (
            <tr
              key={c.id}
              className={`border-b border-slate-100 ${interactive ? 'cursor-pointer hover:bg-[#FAFAF8] transition-colors' : ''}`}
              onClick={interactive ? () => onRowClick!(c) : undefined}
            >
              <td className="py-2 pr-4 text-slate-700">{formatDate(c.checkin_date)}</td>
              <td className="py-2 pr-4 text-slate-900 font-medium">{c.weight_kg} kg</td>
              <td className="py-2 pr-4 text-amber-600">{'★'.repeat(c.energy_level)}<span className="text-slate-200">{'★'.repeat(5 - c.energy_level)}</span></td>
              <td className="py-2 pr-4 text-blue-600">{'★'.repeat(c.sleep_quality)}<span className="text-slate-200">{'★'.repeat(5 - c.sleep_quality)}</span></td>
              <td className="py-2 pr-4 text-slate-700">{c.soreness_level ?? '—'}/5</td>
              <td className="py-2 pr-4 text-slate-700">{c.stress_level ?? '—'}/5</td>
              <td className="py-2 pr-4 text-slate-700">
                {c.nutrition_adherence ? NUTRITION_ADHERENCE_LABELS[c.nutrition_adherence] : '—'}
              </td>
              <td className="py-2 pr-4 text-slate-600">
                {c.notes ? (
                  <span className="line-clamp-2">{c.notes}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              {interactive && (
                <td className="py-2 text-right pr-2 text-[11px] uppercase tracking-[0.1em] font-medium text-slate-500">
                  Voir →
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
