import { Button } from '@/components/ui/Button';
import { TOKENS } from '@/components/dashboard/kit';
import { formatWeekRange, isoWeekStart, shiftWeek } from '@/lib/utils';

interface Props {
  weekStart: string;
  onChange: (weekStart: string) => void;
}

export function WeekSelector({ weekStart, onChange }: Props) {
  const current = isoWeekStart();
  return (
    <div className="inline-flex items-center gap-1 rounded-md bg-white" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <button
        onClick={() => onChange(shiftWeek(weekStart, -1))}
        className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-[#FAFAF8] rounded-l-md transition-colors"
        aria-label="Semaine précédente"
      >
        ‹
      </button>
      <div className="px-3 text-[12px] text-slate-700 min-w-[170px] text-center">
        {formatWeekRange(weekStart)}
      </div>
      <button
        onClick={() => onChange(shiftWeek(weekStart, 1))}
        className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-[#FAFAF8] rounded-r-md transition-colors"
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
