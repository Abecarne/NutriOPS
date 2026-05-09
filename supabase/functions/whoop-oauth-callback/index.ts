import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WHOOP_PROFILE_URL = 'https://api.prod.whoop.com/developer/v2/user/profile/basic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { code, redirectUri, athleteId, scopes } = await req.json();
    if (!code || !redirectUri || !athleteId) {
      return json({ error: 'Missing code, redirectUri or athleteId.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const clientId = Deno.env.get('WHOOP_CLIENT_ID')!;
    const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: athlete, error: athleteError } = await userClient
      .from('athletes')
      .select('id')
      .eq('id', athleteId)
      .single();
    if (athleteError || !athlete) return json({ error: 'Athlete not found or forbidden.' }, 403);

    const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!tokenResponse.ok) {
      return json({ error: 'WHOOP token exchange failed.', detail: await tokenResponse.text() }, 502);
    }

    const token = await tokenResponse.json();
    const profileResponse = await fetch(WHOOP_PROFILE_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const profile = profileResponse.ok ? await profileResponse.json() : null;

    const expiresAt = token.expires_in
      ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString()
      : null;

    const { data: connection, error: connectionError } = await serviceClient
      .from('health_connections')
      .upsert({
        athlete_id: athleteId,
        provider: 'whoop',
        status: 'connected',
        external_user_id: profile?.user_id ? String(profile.user_id) : null,
        external_email: profile?.email ?? null,
        scopes: Array.isArray(scopes) ? scopes : [],
        connected_at: new Date().toISOString(),
        error_message: null,
      }, { onConflict: 'athlete_id,provider' })
      .select('*')
      .single();
    if (connectionError) throw connectionError;

    const { error: tokenError } = await serviceClient
      .from('health_provider_tokens')
      .upsert({
        connection_id: connection.id,
        access_token: token.access_token,
        refresh_token: token.refresh_token ?? null,
        expires_at: expiresAt,
        token_type: token.token_type ?? 'Bearer',
      });
    if (tokenError) throw tokenError;

    return json({ connection });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
