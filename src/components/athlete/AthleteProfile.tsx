import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { formatDate, getCheckinUrl } from '@/lib/utils';
import { regenerateCheckinToken, updateAthlete } from '@/hooks/useAthlete';
import type { Athlete } from '@/types/database';

interface Props {
  athlete: Athlete;
  onUpdated: (a: Athlete) => void;
}

export function AthleteProfile({ athlete, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: athlete.full_name,
    sport: athlete.sport,
    birth_date: athlete.birth_date ?? '',
    height_cm: athlete.height_cm ? String(athlete.height_cm) : '',
    goal: athlete.goal ?? '',
    status: athlete.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAthlete(athlete.id, {
        full_name: form.full_name.trim(),
        sport: form.sport.trim(),
        birth_date: form.birth_date || null,
        height_cm: form.height_cm ? parseInt(form.height_cm, 10) : null,
        goal: form.goal.trim(),
        status: form.status,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setForm({
      full_name: athlete.full_name,
      sport: athlete.sport,
      birth_date: athlete.birth_date ?? '',
      height_cm: athlete.height_cm ? String(athlete.height_cm) : '',
      goal: athlete.goal ?? '',
      status: athlete.status,
    });
    setEditing(false);
    setError(null);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getCheckinUrl(athlete.checkin_token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied */
    }
  };

  const regenerate = async () => {
    const ok = window.confirm(
      "Régénérer le lien de check-in invalidera l'URL actuellement partagée avec l'athlète. Continuer ?",
    );
    if (!ok) return;
    setRegenerating(true);
    setError(null);
    try {
      const updated = await regenerateCheckinToken(athlete.id);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Régénération impossible');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        {!editing && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Éditer
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {error && <ErrorMessage message={error} className="mb-4" />}

        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nom complet"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            />
            <Input
              label="Sport"
              value={form.sport}
              onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}
            />
            <Input
              label="Date de naissance"
              type="date"
              value={form.birth_date}
              onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
            />
            <Input
              label="Taille (cm)"
              type="number"
              value={form.height_cm}
              onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))}
            />
            <Input
              label="Objectif"
              className="sm:col-span-2"
              value={form.goal}
              onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
            />
            <Select
              label="Statut"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as Athlete['status'] }))}
            >
              <option value="active">Actif</option>
              <option value="offseason">Intersaison</option>
              <option value="injured">Blessé</option>
            </Select>
            <div className="flex items-end gap-2 sm:col-span-2 justify-end">
              <Button variant="secondary" onClick={cancel} disabled={saving}>Annuler</Button>
              <Button onClick={save} loading={saving}>Enregistrer</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Sport" value={athlete.sport} />
            <Field label="Statut" value={<StatusBadge status={athlete.status} />} />
            <Field label="Date de naissance" value={formatDate(athlete.birth_date)} />
            <Field label="Taille" value={athlete.height_cm ? `${athlete.height_cm} cm` : '—'} />
            <Field label="Objectif" value={athlete.goal || '—'} className="sm:col-span-2" />
            <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-0.5">Lien de check-in</div>
                <div className="text-sm text-slate-700 truncate">{getCheckinUrl(athlete.checkin_token)}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={copyLink}>
                  {copied ? '✓ Copié' : 'Copier le lien'}
                </Button>
                <Button size="sm" variant="ghost" onClick={regenerate} loading={regenerating}>
                  Régénérer
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-0.5">{label}</div>
      <div className="text-slate-800">{value}</div>
    </div>
  );
}
