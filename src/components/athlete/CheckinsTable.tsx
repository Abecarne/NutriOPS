import type { Checkin } from '@/types/database';
import { formatDate } from '@/lib/utils';

export function CheckinsTable({ checkins }: { checkins: Checkin[] }) {
  if (checkins.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-6 text-center">
        Aucun check-in enregistré.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
            <th className="py-2 pr-4 font-medium">Semaine</th>
            <th className="py-2 pr-4 font-medium">Poids</th>
            <th className="py-2 pr-4 font-medium">Énergie</th>
            <th className="py-2 pr-4 font-medium">Sommeil</th>
            <th className="py-2 font-medium">Notes athlète</th>
          </tr>
        </thead>
        <tbody>
          {checkins.map(c => (
            <tr key={c.id} className="border-b border-slate-100">
              <td className="py-2 pr-4 text-slate-700">{formatDate(c.week_start)}</td>
              <td className="py-2 pr-4 text-slate-900 font-medium">{c.weight_kg} kg</td>
              <td className="py-2 pr-4 text-amber-600">{'★'.repeat(c.energy_level)}<span className="text-slate-200">{'★'.repeat(5 - c.energy_level)}</span></td>
              <td className="py-2 pr-4 text-blue-600">{'★'.repeat(c.sleep_quality)}<span className="text-slate-200">{'★'.repeat(5 - c.sleep_quality)}</span></td>
              <td className="py-2 text-slate-600">
                {c.notes ? (
                  <span className="line-clamp-2">{c.notes}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
