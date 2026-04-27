import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TOKENS } from '@/components/dashboard/kit';

export interface WeekDaySummary {
  date: string;
  label: string;
  subline: string;
  tone?: 'ok' | 'warn' | 'mute';
}

export function WeekDayPicker({
  days,
  selectedDate,
  onSelect,
}: {
  days: WeekDaySummary[];
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px] grid grid-cols-7 gap-2">
        {days.map(day => {
          const selected = selectedDate === day.date;
          const color =
            day.tone === 'ok' ? TOKENS.TEAL :
            day.tone === 'warn' ? TOKENS.AMBER :
            TOKENS.SLATE;

          return (
            <button
              key={day.date}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(day.date)}
              className="rounded-md border bg-white px-3 py-3 text-left transition-colors hover:bg-[#FAFAF8]"
              style={{
                borderColor: selected ? color : TOKENS.HAIRLINE,
                boxShadow: selected ? `inset 0 0 0 1px ${color}` : undefined,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  {format(parseISO(day.date), 'EEE', { locale: fr })}
                </span>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              </div>
              <div className="mt-2 font-mono text-[15px] text-slate-900 tabular-nums">
                {format(parseISO(day.date), 'dd/MM')}
              </div>
              <div className="mt-2 text-[12px] font-medium text-slate-700 truncate">{day.label}</div>
              <div className="mt-0.5 text-[11px] text-slate-400 truncate">{day.subline}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
