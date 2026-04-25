import { supabase } from '@/lib/supabase';
import type { Coach } from '@/types/database';

export async function updateCoach(
  id: string,
  patch: Partial<Pick<Coach, 'full_name' | 'club_name' | 'primary_color' | 'logo_url'>>,
): Promise<Coach> {
  const { data, error } = await supabase
    .from('coaches')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Coach;
}

export async function uploadLogo(coachId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${coachId}/logo-${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('branding')
    .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });
  if (uploadErr) throw uploadErr;
  const { data } = supabase.storage.from('branding').getPublicUrl(path);
  return data.publicUrl;
}
