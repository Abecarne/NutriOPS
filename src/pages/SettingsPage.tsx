import { useEffect, useState } from 'react';
import { SectionLabel, TOKENS } from '@/components/dashboard/kit';
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
      const { data: existing, error: listError } = await supabase.storage
        .from('branding')
        .list(coach.id, { limit: 100 });
      if (listError) throw listError;
      const stale = (existing ?? [])
        .filter(o => !o.name.startsWith('.'))
        .map(o => `${coach.id}/${o.name}`);

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
      if (stale.length > 0) {
        await supabase.storage.from('branding').remove(stale);
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload impossible');
    } finally {
      setUploading(false);
    }
  };

  if (!coach) return <ErrorMessage message="Profil coach introuvable." />;

  return (
    <div className="flex flex-col gap-8">
      {error && <ErrorMessage message={error} />}
      {saved && (
        <div
          className="rounded-md bg-white px-4 py-3 text-[13px]"
          style={{ border: `1px solid ${TOKENS.HAIRLINE}`, color: TOKENS.TEAL }}
        >
          Settings saved.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <section className="flex flex-col gap-4">
          <SectionLabel index="01" title="Coach account" />
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <Input
                label="Full name"
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
                  label="Color"
                  type="color"
                  value={form.primary_color}
                  onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
                  className="p-1"
                />
                <Input
                  label="Color code"
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
                  Save settings
                </Button>
              </div>
            </CardBody>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <SectionLabel index="02" title="PDF preview" />
          <Card>
            <CardBody>
              <div className="rounded-md overflow-hidden bg-white" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
              <div className="h-2" style={{ backgroundColor: form.primary_color }} />
              <div className="p-5 flex items-center gap-4">
                {coach.logo_url ? (
                  <img src={coach.logo_url} alt="" className="h-14 w-14 rounded-md object-cover" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }} />
                ) : (
                  <div
                    className="h-14 w-14 rounded-md text-white flex items-center justify-center font-semibold"
                    style={{ backgroundColor: form.primary_color }}
                  >
                    N
                  </div>
                )}
                <div>
                  <div className="text-[15px] font-medium text-slate-900">
                    {form.club_name || form.full_name || 'Votre structure'}
                  </div>
                  <div className="text-[12px] text-slate-500">Rapport de suivi — Athlète</div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <div className="grid grid-cols-4 gap-2 text-[11px]">
                  {['Intense', 'Léger', 'Repos', 'Compétition'].map(label => (
                    <div key={label} className="rounded-md p-2" style={{ border: `1px solid ${TOKENS.HAIRLINE}` }}>
                      <div className="font-medium" style={{ color: form.primary_color }}>{label}</div>
                      <div className="text-slate-500 mt-1">Macros hebdo</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  );
}
