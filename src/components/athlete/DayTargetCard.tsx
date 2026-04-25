import { useEffect, useRef, useState } from 'react';
import { TOKENS } from '@/components/dashboard/kit';
import { Textarea } from '@/components/ui/Textarea';
import { useDebouncedEffect } from '@/hooks/useDebounce';
import { distributeMacros, kcalFromMacros } from '@/lib/utils';
import { upsertDayTarget } from '@/hooks/useNutritionPlan';
import { DAY_TYPE_LABELS, type DayTarget, type DayType } from '@/types/database';

interface Props {
  planId: string;
  dayType: DayType;
  initial: DayTarget;
  onSaved: (t: DayTarget) => void;
}

export function DayTargetCard({ planId, dayType, initial, onSaved }: Props) {
  const [local, setLocal] = useState({
    calories: initial.calories,
    protein_g: initial.protein_g,
    carbs_g: initial.carbs_g,
    fat_g: initial.fat_g,
    notes: initial.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false);

  // Reset local state ONLY when the underlying target row changes
  // (e.g. plan creation pending→uuid, week change). We deliberately
  // do NOT depend on the value fields: a server echo after a save
  // could otherwise clobber a keystroke the user typed during the
  // in-flight upsert.
  useEffect(() => {
    setLocal({
      calories: initial.calories,
      protein_g: initial.protein_g,
      carbs_g: initial.carbs_g,
      fat_g: initial.fat_g,
      notes: initial.notes ?? '',
    });
    dirty.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  useDebouncedEffect(
    () => {
      if (!dirty.current) return;
      (async () => {
        setSaving(true);
        setError(null);
        try {
          const saved = await upsertDayTarget(planId, dayType, {
            calories: local.calories,
            protein_g: local.protein_g,
            carbs_g: local.carbs_g,
            fat_g: local.fat_g,
            notes: local.notes || null,
          });
          onSaved(saved);
          setSavedAt(Date.now());
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur d'enregistrement");
        } finally {
          setSaving(false);
        }
      })();
    },
    [local.calories, local.protein_g, local.carbs_g, local.fat_g, local.notes],
    600,
  );

  const update = (patch: Partial<typeof local>) => {
    dirty.current = true;
    setLocal(prev => ({ ...prev, ...patch }));
  };

  const handleCaloriesChange = (kcal: number) => {
    const macros = distributeMacros(kcal);
    dirty.current = true;
    setLocal(prev => ({ ...prev, calories: kcal, ...macros }));
  };

  const computedKcal = kcalFromMacros(local.protein_g, local.carbs_g, local.fat_g);
  const drift = Math.abs(computedKcal - local.calories);

  return (
    <div className="rounded-md bg-white p-4 flex flex-col gap-3" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-900">{DAY_TYPE_LABELS[dayType]}</div>
        <div className="text-xs text-slate-500 h-4">
          {error ? <span style={{ color: TOKENS.AMBER }}>{error}</span> : saving ? 'Sauvegarde…' : savedAt ? '✓ Sauvegardé' : ''}
        </div>
      </div>

      <MacroInput
        label="Calories"
        unit="kcal"
        value={local.calories}
        onChange={handleCaloriesChange}
        highlight
      />

      <div className="grid grid-cols-3 gap-2">
        <MacroInput
          label="Protéines"
          unit="g"
          value={local.protein_g}
          onChange={v => update({ protein_g: v })}
        />
        <MacroInput
          label="Glucides"
          unit="g"
          value={local.carbs_g}
          onChange={v => update({ carbs_g: v })}
        />
        <MacroInput
          label="Lipides"
          unit="g"
          value={local.fat_g}
          onChange={v => update({ fat_g: v })}
        />
      </div>

      {local.calories > 0 && drift > 50 && (
        <div className="text-xs rounded px-2 py-1" style={{ color: TOKENS.AMBER, background: '#FFF7E6', border: `1px solid ${TOKENS.HAIRLINE}` }}>
          Macros = {computedKcal} kcal ({drift > 0 ? `±${drift}` : '='} vs calories déclarées)
        </div>
      )}

      <Textarea
        label="Notes"
        rows={2}
        value={local.notes}
        onChange={e => update({ notes: e.target.value })}
        placeholder="Timing, hydratation, recommandations spécifiques…"
      />
    </div>
  );
}

function MacroInput({
  label,
  unit,
  value,
  onChange,
  highlight,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  highlight?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-[0.12em] font-medium text-slate-500">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => onChange(e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
          className={`w-full h-9 px-3 pr-10 rounded-md border text-[13px]
                      focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent
                      ${highlight ? 'border-slate-400 font-semibold' : 'border-[#EAE9E5]'}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {unit}
        </span>
      </div>
    </label>
  );
}
