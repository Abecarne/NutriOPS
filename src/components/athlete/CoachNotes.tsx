import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/Textarea';
import { useDebouncedEffect } from '@/hooks/useDebounce';
import { upsertCoachNote, useCoachNote } from '@/hooks/useCoachNotes';
import { formatWeekRange } from '@/lib/utils';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

interface Props {
  athleteId: string;
  weekStart: string;
}

export function CoachNotes({ athleteId, weekStart }: Props) {
  const { note, loading, setNote } = useCoachNote(athleteId, weekStart);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    setValue(note?.content ?? '');
    dirty.current = false;
  }, [note?.id, note?.content, athleteId, weekStart]);

  useDebouncedEffect(
    () => {
      if (!dirty.current) return;
      (async () => {
        setSaving(true);
        setError(null);
        try {
          const saved = await upsertCoachNote(athleteId, weekStart, value);
          setNote(saved);
          setSavedAt(Date.now());
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur d'enregistrement");
        } finally {
          setSaving(false);
        }
      })();
    },
    [value],
    700,
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-900">Notes du coach</div>
          <div className="text-xs text-slate-500">Semaine {formatWeekRange(weekStart)}</div>
        </div>
        <div className="text-xs text-slate-500 h-4">
          {error ? <span className="text-red-600">{error}</span>
            : saving ? 'Sauvegarde…'
            : savedAt ? '✓ Sauvegardé'
            : loading ? 'Chargement…' : ''}
        </div>
      </div>
      <Textarea
        rows={4}
        value={value}
        onChange={e => { dirty.current = true; setValue(e.target.value); }}
        placeholder="Observations de la semaine, ajustements à prévoir…"
      />
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
