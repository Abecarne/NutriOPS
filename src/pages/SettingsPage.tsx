import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { isValidHexColor } from '@/lib/utils';

export function SettingsPage() {
  const { coach, refreshCoach } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    club_name: '',
    primary_color: '#1D9E75',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!coach) return;
    setForm({
      full_name: coach.full_name,
      club_name: coach.club_name ?? '',
      primary_color: coach.primary_color || '#1D9E75',
    });
    document.documentElement.style.setProperty('--brand', coach.primary_color || '#1D9E75');
  }, [coach]);

  const save = async () => {
    if (!coach) return;
    setError(null);
    setSaved(false);
    if (!isValidHexColor(form.primary_color)) {
      setError('La couleur doit être un code hexadécimal valide, ex : #1D9E75.');
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('coaches')
        .update({
          full_name: form.full_name.trim(),
          club_name: form.club_name.trim() || null,
          primary_color: form.primary_color,
        })
        .eq('id', coach.id);
      if (updateError) throw updateError;
      document.documentElement.style.setProperty('--brand', form.primary_color);
      await refreshCoach();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sauvegarde impossible');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File | null) => {
    if (!coach || !file) return;
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${coach.id}/logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('branding').getPublicUrl(path);
      const { error: updateError } = await supabase
        .from('coaches')
        .update({ logo_url: data.publicUrl })
        .eq('id', coach.id);
      if (updateError) throw updateError;
      await refreshCoach();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload impossible');
    } finally {
      setUploading(false);
    }
  };

  if (!coach) return <ErrorMessage message="Profil coach introuvable." />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Paramètres</h1>
        <p className="text-sm text-slate-500">Branding et informations utilisées dans les rapports PDF.</p>
      </div>

      {error && <ErrorMessage message={error} />}
      {saved && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Paramètres enregistrés.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compte coach</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <Input
              label="Nom complet"
              value={form.full_name}
              onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))}
            />
            <Input
              label="Club / structure"
              value={form.club_name}
              onChange={e => setForm(prev => ({ ...prev, club_name: e.target.value }))}
            />
            <div className="grid grid-cols-[80px_1fr] gap-3 items-end">
              <Input
                label="Couleur"
                type="color"
                value={form.primary_color}
                onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                className="p-1"
              />
              <Input
                label="Code couleur"
                value={form.primary_color}
                onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
              />
            </div>
            <Input
              label="Logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={e => uploadLogo(e.target.files?.[0] ?? null)}
            />
            <div className="flex justify-end">
              <Button onClick={save} loading={saving || uploading}>
                Enregistrer
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview PDF</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
              <div className="h-2" style={{ backgroundColor: form.primary_color }} />
              <div className="p-5 flex items-center gap-4">
                {coach.logo_url ? (
                  <img src={coach.logo_url} alt="" className="h-14 w-14 rounded-md object-cover border border-slate-200" />
                ) : (
                  <div
                    className="h-14 w-14 rounded-md text-white flex items-center justify-center font-semibold"
                    style={{ backgroundColor: form.primary_color }}
                  >
                    N
                  </div>
                )}
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    {form.club_name || form.full_name || 'Votre structure'}
                  </div>
                  <div className="text-sm text-slate-500">Rapport de suivi — Athlète</div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {['Intense', 'Léger', 'Repos', 'Compétition'].map(label => (
                    <div key={label} className="rounded border border-slate-200 p-2">
                      <div className="font-medium" style={{ color: form.primary_color }}>{label}</div>
                      <div className="text-slate-500 mt-1">Macros hebdo</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
