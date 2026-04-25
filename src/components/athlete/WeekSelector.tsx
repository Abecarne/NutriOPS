import { Button } from '@/components/ui/Button';
import { formatWeekRange, isoWeekStart, shiftWeek } from '@/lib/utils';

interface Props {
  weekStart: string;
  onChange: (weekStart: string) => void;
}

export function WeekSelector({ weekStart, onChange }: Props) {
  const current = isoWeekStart();
  return (
    <div className="inline-flex items-center gap-1 border border-slate-200 rounded-md bg-white">
      <button
        onClick={() => onChange(shiftWeek(weekStart, -1))}
        className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-l-md transition-colors"
        aria-label="Semaine précédente"
      >
        ‹
      </button>
      <div className="px-3 text-sm text-slate-700 min-w-[170px] text-center">
        {formatWeekRange(weekStart)}
      </div>
      <button
        onClick={() => onChange(shiftWeek(weekStart, 1))}
        className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-md transition-colors"
        aria-label="Semaine suivante"
      >
        ›
      </button>
      {weekStart !== current && (
        <Button
          size="sm"
          variant="ghost"
          className="ml-1"
          onClick={() => onChange(current)}
        >
          Aujourd'hui
        </Button>
      )}
    </div>
  );
}
