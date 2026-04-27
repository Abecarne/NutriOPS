import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Checkin, DailyNutritionTarget, TrainingSession } from '@/types/database';
import { formatDateShort } from '@/lib/utils';

interface Props {
  checkins: Checkin[];
  sessions?: TrainingSession[];
  targets?: DailyNutritionTarget[];
  primaryColor: string;
}

export function ProgressChart({ checkins, sessions = [], targets = [], primaryColor }: Props) {
  const data = useMemo(
    () => {
      const loadByDate = new Map<string, number>();
      for (const session of sessions) {
        const load = session.internal_load ?? ((session.planned_duration_min ?? 0) * (session.planned_intensity ?? 0));
        loadByDate.set(session.session_date, (loadByDate.get(session.session_date) ?? 0) + load);
      }
      const caloriesByDate = new Map(targets.map(target => [target.target_date, target.calories]));
      return [...checkins]
        .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
        .map(c => ({
          date: formatDateShort(c.checkin_date),
          poids: c.weight_kg,
          energie: c.energy_level,
          sommeil: c.sleep_quality,
          soreness: c.soreness_level,
          charge: loadByDate.get(c.checkin_date) ?? null,
          calories: caloriesByDate.get(c.checkin_date) ?? null,
        }));
    },
    [checkins, sessions, targets],
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
        Aucun check-in pour tracer la courbe.
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            stroke="#64748b"
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            width={45}
            label={{ value: 'kg', position: 'insideTopLeft', fontSize: 11, fill: '#64748b' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#64748b"
            tick={{ fontSize: 12 }}
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            width={28}
          />
          <YAxis
            yAxisId="load"
            orientation="right"
            hide
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            labelStyle={{ color: '#0f172a', fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="poids"
            name="Poids (kg)"
            stroke={primaryColor}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="energie"
            name="Énergie (1-5)"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={{ r: 2 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="sommeil"
            name="Sommeil (1-5)"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={{ r: 2 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="soreness"
            name="Soreness (1-5)"
            stroke="#C2772A"
            strokeWidth={1.5}
            strokeDasharray="2 4"
            dot={{ r: 2 }}
            connectNulls
          />
          <Line
            yAxisId="load"
            type="monotone"
            dataKey="charge"
            name="Charge interne"
            stroke="#64748b"
            strokeWidth={1.5}
            dot={{ r: 2 }}
            connectNulls
          />
          <Line
            yAxisId="load"
            type="monotone"
            dataKey="calories"
            name="Calories cible"
            stroke="#16a34a"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={{ r: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
