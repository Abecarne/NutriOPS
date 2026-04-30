import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { updateAthlete } from '@/hooks/useAthlete';
import { ONBOARDING_FIELD_LABELS } from '@/components/client/OnboardingWizard';
import type { Athlete, ClientGoalType } from '@/types/database';

interface Props {
  athlete: Athlete;
  onSaved: (athlete: Athlete) => void;
}

export function OnboardingAnswersEditor({ athlete, onSaved }: Props) {
  const entries = useMemo(
    () => Object.entries(athlete.onboarding_data ?? {})
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
      .sort(([a], [b]) => labelFor(a).localeCompare(labelFor(b))),
    [athlete.onboarding_data],
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const startEditing = (key: string, value: unknown) => {
    setEditingKey(key);
    setDraft(String(value ?? ''));
  };

  const save = async () => {
    if (!editingKey) return;
    setSaving(true);
    try {
      const nextData = { ...(athlete.onboarding_data ?? {}), [editingKey]: draft };
      const updated = await updateAthlete(athlete.id, {
        onboarding_data: nextData,
        ...corePatchForField(editingKey, draft, athlete),
      });
      onSaved(updated);
      setEditingKey(null);
    } finally {
      setSaving(false);
    }
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[#EAE9E5] p-4 text-[13px] text-slate-500">
        Aucune réponse premium enregistrée pour le moment.
      </div>
    );
  }

  return (
    <div className="rounded-md overflow-hidden border border-[#EAE9E5]">
      {entries.map(([key, value], index) => (
        <div
          key={key}
          className="grid grid-cols-1 gap-3 px-4 py-3 text-[13px] sm:grid-cols-[220px_1fr_auto]"
          style={{ borderTop: index === 0 ? undefined : '1px solid #EAE9E5' }}
        >
          <div className="text-slate-500">{labelFor(key)}</div>
          {editingKey === key ? (
            <div>
              {String(value).length > 80 ? (
                <Textarea rows={4} value={draft} onChange={e => setDraft(e.target.value)} />
              ) : (
                <Input value={draft} onChange={e => setDraft(e.target.value)} />
              )}
            </div>
          ) : (
            <div className="text-slate-900 whitespace-pre-wrap">{String(value)}</div>
          )}
          <div className="flex justify-end gap-2">
            {editingKey === key ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => setEditingKey(null)} disabled={saving}>Annuler</Button>
                <Button size="sm" onClick={save} loading={saving}>Sauver</Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => startEditing(key, value)}>Modifier</Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function labelFor(key: string) {
  return ONBOARDING_FIELD_LABELS[key] ?? key.replace(/_/g, ' ');
}

function corePatchForField(key: string, value: string, athlete: Athlete): Parameters<typeof updateAthlete>[1] {
  const trimmed = value.trim();
  if (key === 'first_name') return { first_name: trimmed || null, full_name: `${trimmed} ${athlete.last_name ?? ''}`.trim() || athlete.full_name };
  if (key === 'last_name') return { last_name: trimmed || null, full_name: `${athlete.first_name ?? ''} ${trimmed}`.trim() || athlete.full_name };
  if (key === 'email') return { email: trimmed || null };
  if (key === 'phone') return { phone: trimmed || null };
  if (key === 'birth_date') return { birth_date: trimmed || null };
  if (key === 'gender') return { gender: trimmed || null };
  if (key === 'height_cm') return { height_cm: numberOrNull(trimmed) };
  if (key === 'current_weight_kg') return { current_weight_kg: numberOrNull(trimmed) };
  if (key === 'target_weight_kg') return { target_weight_kg: numberOrNull(trimmed) };
  if (key === 'goal_type') return { goal_type: trimmed as ClientGoalType || null };
  if (key === 'training_frequency_per_week') return { training_frequency_per_week: numberOrNull(trimmed) ?? 0 };
  return {};
}

function numberOrNull(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
