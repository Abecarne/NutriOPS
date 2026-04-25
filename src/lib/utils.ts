import { format, startOfISOWeek, endOfISOWeek, addWeeks, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Returns the Monday (ISO start) of the week containing `date`, as YYYY-MM-DD. */
export function isoWeekStart(date: Date = new Date()): string {
  return format(startOfISOWeek(date), 'yyyy-MM-dd');
}

export function shiftWeek(weekStart: string, delta: number): string {
  return format(addWeeks(parseISO(weekStart), delta), 'yyyy-MM-dd');
}

export function formatWeekRange(weekStart: string): string {
  const start = parseISO(weekStart);
  const end = endOfISOWeek(start);
  return `${format(start, 'dd MMM', { locale: fr })} – ${format(end, 'dd MMM yyyy', { locale: fr })}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return format(parseISO(value), 'dd MMM yyyy', { locale: fr });
}

export function formatDateShort(value: string | null | undefined): string {
  if (!value) return '—';
  return format(parseISO(value), 'dd/MM', { locale: fr });
}

export function relativeFromNow(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  const now = Date.now();
  const diff = Math.round((now - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff < 7) return `Il y a ${diff} j`;
  if (diff < 30) return `Il y a ${Math.round(diff / 7)} sem`;
  return format(d, 'dd MMM yyyy', { locale: fr });
}

/** Split total calories into macros given ratios (protein/carbs/fat). 4/4/9 kcal/g. */
export function distributeMacros(
  calories: number,
  ratios: { protein: number; carbs: number; fat: number } = { protein: 0.3, carbs: 0.4, fat: 0.3 },
): { protein_g: number; carbs_g: number; fat_g: number } {
  return {
    protein_g: Math.round((calories * ratios.protein) / 4),
    carbs_g: Math.round((calories * ratios.carbs) / 4),
    fat_g: Math.round((calories * ratios.fat) / 9),
  };
}

export function kcalFromMacros(p: number, c: number, f: number): number {
  return Math.round(p * 4 + c * 4 + f * 9);
}

export function isValidHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export function getCheckinUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/checkin/${token}`;
}
