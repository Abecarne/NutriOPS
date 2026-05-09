import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const WHOOP_BASE = 'https://api.prod.whoop.com/developer/v2';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  let connectionId: string | null = null;
  try {
    const body = await req.json();
    connectionId = body.connectionId;
    const { startDate, endDate } = body;
    if (!connectionId) return json({ error: 'Missing connectionId.' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: allowed, error: allowedError } = await userClient
      .from('health_connections')
      .select('id, athlete_id, provider')
      .eq('id', connectionId)
      .single();
    if (allowedError || !allowed || allowed.provider !== 'whoop') {
      return json({ error: 'Connection not found or forbidden.' }, 403);
    }

    const { data: tokenRow, error: tokenError } = await serviceClient
      .from('health_provider_tokens')
      .select('*')
      .eq('connection_id', connectionId)
      .single();
    if (tokenError || !tokenRow) return json({ error: 'Missing provider token.' }, 400);

    const token = await ensureAccessToken(serviceClient, connectionId, tokenRow);
    const end = endDate ? new Date(`${endDate}T23:59:59Z`) : new Date();
    const start = startDate ? new Date(`${startDate}T00:00:00Z`) : new Date(end.getTime() - 365 * 86_400_000);
    const range = { start: start.toISOString(), end: end.toISOString() };

    await serviceClient.from('health_connections').update({ status: 'syncing', error_message: null }).eq('id', connectionId);

    const [recoveries, sleeps, cycles, workouts, body] = await Promise.all([
      fetchCollection(token, '/recovery', range),
      fetchCollection(token, '/activity/sleep', range),
      fetchCollection(token, '/cycle', range),
      fetchCollection(token, '/activity/workout', range),
      fetchJson(token, '/user/measurement/body').catch(() => null),
    ]);

    const daily = mergeDaily(allowed.athlete_id, recoveries, sleeps, cycles, body);
    if (daily.length > 0) {
      const { error } = await serviceClient
        .from('health_daily_metrics')
        .upsert(daily, { onConflict: 'athlete_id,provider,metric_date' });
      if (error) throw error;
    }

    const workoutRows = workouts.map(workout => toWorkoutRow(allowed.athlete_id, workout));
    if (workoutRows.length > 0) {
      const { error } = await serviceClient
        .from('health_workouts')
        .upsert(workoutRows, { onConflict: 'athlete_id,provider,external_id' });
      if (error) throw error;
    }

    await serviceClient
      .from('health_connections')
      .update({
        status: 'connected',
        last_sync_at: new Date().toISOString(),
        sync_cursor: { start: range.start, end: range.end },
        error_message: null,
      })
      .eq('id', connectionId);

    return json({ dailyMetrics: daily.length, workouts: workoutRows.length });
  } catch (err) {
    try {
      if (connectionId) {
        const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        await serviceClient.from('health_connections').update({
          status: 'error',
          error_message: err instanceof Error ? err.message : 'Sync failed',
        }).eq('id', connectionId);
      }
    } catch {
      // ignore status update failure
    }
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});

async function ensureAccessToken(serviceClient: ReturnType<typeof createClient>, connectionId: string, tokenRow: any): Promise<string> {
  if (!tokenRow.expires_at || new Date(tokenRow.expires_at).getTime() > Date.now() + 60_000) {
    return tokenRow.access_token;
  }
  if (!tokenRow.refresh_token) return tokenRow.access_token;

  const response = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRow.refresh_token,
      client_id: Deno.env.get('WHOOP_CLIENT_ID')!,
      client_secret: Deno.env.get('WHOOP_CLIENT_SECRET')!,
    }),
  });
  if (!response.ok) throw new Error(`WHOOP refresh failed: ${await response.text()}`);
  const token = await response.json();
  await serviceClient.from('health_provider_tokens').update({
    access_token: token.access_token,
    refresh_token: token.refresh_token ?? tokenRow.refresh_token,
    expires_at: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : null,
    token_type: token.token_type ?? 'Bearer',
  }).eq('connection_id', connectionId);
  return token.access_token;
}

async function fetchCollection(token: string, path: string, range: { start: string; end: string }) {
  const records: any[] = [];
  let nextToken: string | undefined;
  do {
    const params = new URLSearchParams({ limit: '25', start: range.start, end: range.end });
    if (nextToken) params.set('nextToken', nextToken);
    const data = await fetchJson(token, `${path}?${params.toString()}`);
    records.push(...(data.records ?? []));
    nextToken = data.next_token;
  } while (nextToken);
  return records;
}

async function fetchJson(token: string, path: string) {
  const response = await fetch(`${WHOOP_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`WHOOP request failed ${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

function mergeDaily(athleteId: string, recoveries: any[], sleeps: any[], cycles: any[], body: any | null) {
  const byDate = new Map<string, any>();
  const ensure = (date: string) => {
    const row = byDate.get(date) ?? {
      athlete_id: athleteId,
      provider: 'whoop',
      metric_date: date,
      raw_payload: {},
    };
    byDate.set(date, row);
    return row;
  };

  for (const recovery of recoveries) {
    const date = dateOf(recovery.created_at ?? recovery.updated_at);
    const row = ensure(date);
    row.recovery_score = recovery.score?.recovery_score ?? null;
    row.resting_heart_rate = recovery.score?.resting_heart_rate ?? null;
    row.hrv_rmssd_ms = recovery.score?.hrv_rmssd_milli ?? null;
    row.spo2_percent = recovery.score?.spo2_percentage ?? null;
    row.skin_temp_celsius = recovery.score?.skin_temp_celsius ?? null;
    row.raw_payload.recovery = recovery;
  }

  for (const sleep of sleeps) {
    const date = dateOf(sleep.end ?? sleep.start);
    const row = ensure(date);
    row.sleep_minutes = millisToMinutes(sleep.score?.stage_summary?.total_in_bed_time_milli);
    row.sleep_efficiency_percent = sleep.score?.sleep_efficiency_percentage ?? null;
    row.sleep_performance_percent = sleep.score?.sleep_performance_percentage ?? null;
    row.respiratory_rate = sleep.score?.respiratory_rate ?? row.respiratory_rate ?? null;
    row.raw_payload.sleep = sleep;
  }

  for (const cycle of cycles) {
    const date = dateOf(cycle.end ?? cycle.start);
    const row = ensure(date);
    row.strain = cycle.score?.strain ?? row.strain ?? null;
    row.active_calories = cycle.score?.kilojoule ? Number(cycle.score.kilojoule) * 0.239006 : row.active_calories ?? null;
    row.raw_payload.cycle = cycle;
  }

  if (body?.weight_kilogram) {
    const date = new Date().toISOString().slice(0, 10);
    const row = ensure(date);
    row.weight_kg = body.weight_kilogram;
    row.raw_payload.body = body;
  }

  return Array.from(byDate.values());
}

function toWorkoutRow(athleteId: string, workout: any) {
  const start = new Date(workout.start);
  const end = workout.end ? new Date(workout.end) : null;
  return {
    athlete_id: athleteId,
    provider: 'whoop',
    external_id: String(workout.id),
    sport: workout.sport_name ?? null,
    start_at: start.toISOString(),
    end_at: end?.toISOString() ?? null,
    timezone_offset: workout.timezone_offset ?? null,
    duration_seconds: end ? Math.round((end.getTime() - start.getTime()) / 1000) : null,
    calories: workout.score?.kilojoule ? Number(workout.score.kilojoule) * 0.239006 : null,
    distance_meters: workout.score?.distance_meter ?? null,
    average_heart_rate: workout.score?.average_heart_rate ?? null,
    max_heart_rate: workout.score?.max_heart_rate ?? null,
    strain: workout.score?.strain ?? null,
    raw_payload: workout,
  };
}

function dateOf(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function millisToMinutes(value: number | undefined) {
  return typeof value === 'number' ? Math.round(value / 60_000) : null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
