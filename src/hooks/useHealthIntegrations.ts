import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createRequestTimeout, requestErrorMessage } from '@/lib/requestTimeout';
import { isoDate, shiftDate } from '@/lib/utils';
import type { HealthConnection, HealthDailyMetric, HealthWorkout } from '@/types/database';

const WHOOP_SCOPES = [
  'read:profile',
  'read:body_measurement',
  'read:recovery',
  'read:cycles',
  'read:sleep',
  'read:workout',
];

export function useHealthIntegrations(athleteId: string | undefined) {
  const [connections, setConnections] = useState<HealthConnection[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<HealthDailyMetric[]>([]);
  const [workouts, setWorkouts] = useState<HealthWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    if (!athleteId) {
      setConnections([]);
      setDailyMetrics([]);
      setWorkouts([]);
      setLoading(false);
      return;
    }
    const timeout = createRequestTimeout();
    setLoading(true);
    setError(null);
    try {
      const [{ data: connectionRows, error: connectionError }, { data: metricRows, error: metricError }, { data: workoutRows, error: workoutError }] = await Promise.all([
        supabase
          .from('health_connections')
          .select('*')
          .eq('athlete_id', athleteId)
          .order('connected_at', { ascending: false })
          .abortSignal(timeout.signal),
        supabase
          .from('health_daily_metrics')
          .select('*')
          .eq('athlete_id', athleteId)
          .gte('metric_date', shiftDate(isoDate(), -365))
          .order('metric_date', { ascending: false })
          .abortSignal(timeout.signal),
        supabase
          .from('health_workouts')
          .select('*')
          .eq('athlete_id', athleteId)
          .gte('start_at', `${shiftDate(isoDate(), -365)}T00:00:00Z`)
          .order('start_at', { ascending: false })
          .limit(100)
          .abortSignal(timeout.signal),
      ]);
      if (connectionError) throw connectionError;
      if (metricError) throw metricError;
      if (workoutError) throw workoutError;
      setConnections((connectionRows ?? []) as HealthConnection[]);
      setDailyMetrics((metricRows ?? []) as HealthDailyMetric[]);
      setWorkouts((workoutRows ?? []) as HealthWorkout[]);
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      timeout.clear();
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const whoopConnection = useMemo(
    () => connections.find(connection => connection.provider === 'whoop') ?? null,
    [connections],
  );

  const syncWhoop = useCallback(async (connectionId: string, startDate?: string) => {
    setSyncing(true);
    setError(null);
    try {
      const { error: syncError } = await supabase.functions.invoke('whoop-sync', {
        body: {
          connectionId,
          startDate: startDate ?? shiftDate(isoDate(), -365),
          endDate: isoDate(),
        },
      });
      if (syncError) throw syncError;
      await refresh();
    } catch (err) {
      setError(requestErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  return {
    connections,
    whoopConnection,
    dailyMetrics,
    workouts,
    loading,
    error,
    syncing,
    refresh,
    syncWhoop,
  };
}

export function buildWhoopAuthorizeUrl(athleteId: string) {
  const clientId = import.meta.env.VITE_WHOOP_CLIENT_ID;
  if (!clientId) throw new Error('VITE_WHOOP_CLIENT_ID manquant.');

  const redirectUri = whoopRedirectUri();
  const state = crypto.randomUUID();
  sessionStorage.setItem('whoop_oauth_state', state);
  sessionStorage.setItem('whoop_oauth_athlete_id', athleteId);
  sessionStorage.setItem('whoop_oauth_redirect_uri', redirectUri);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: WHOOP_SCOPES.join(' '),
    state,
  });
  return `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`;
}

export function whoopRedirectUri() {
  const configuredBase = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  const runtimeBase = typeof window !== 'undefined' ? window.location.origin : '';
  return `${(configuredBase || runtimeBase).replace(/\/+$/, '')}/integrations/whoop/callback`;
}

export { WHOOP_SCOPES };
