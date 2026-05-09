import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { TOKENS } from '@/components/dashboard/kit';
import { supabase } from '@/lib/supabase';
import { requestErrorMessage } from '@/lib/requestTimeout';
import { WHOOP_SCOPES } from '@/hooks/useHealthIntegrations';

type CallbackStatus = 'loading' | 'success' | 'error';

export function WhoopCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasRun = useRef(false);
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [message, setMessage] = useState('Connexion WHOOP en cours...');
  const [athleteId, setAthleteId] = useState<string | null>(null);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const completeOAuth = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const providerError = searchParams.get('error');
        const expectedState = sessionStorage.getItem('whoop_oauth_state');
        const storedAthleteId = sessionStorage.getItem('whoop_oauth_athlete_id');
        const redirectUri = sessionStorage.getItem('whoop_oauth_redirect_uri');

        if (providerError) throw new Error(`WHOOP a refusé la connexion: ${providerError}.`);
        if (!code || !state) throw new Error('Code OAuth WHOOP manquant.');
        if (!expectedState || state !== expectedState) throw new Error('État OAuth invalide. Relance la connexion WHOOP.');
        if (!storedAthleteId || !redirectUri) throw new Error('Contexte athlète manquant. Relance la connexion WHOOP.');

        setAthleteId(storedAthleteId);
        const { error } = await supabase.functions.invoke('whoop-oauth-callback', {
          body: {
            code,
            redirectUri,
            athleteId: storedAthleteId,
            scopes: WHOOP_SCOPES,
          },
        });
        if (error) throw error;

        sessionStorage.removeItem('whoop_oauth_state');
        sessionStorage.removeItem('whoop_oauth_athlete_id');
        sessionStorage.removeItem('whoop_oauth_redirect_uri');
        setStatus('success');
        setMessage('WHOOP est connecté. Tu peux maintenant lancer une synchronisation historique.');
        window.setTimeout(() => navigate(`/integrations?athleteId=${storedAthleteId}`), 1200);
      } catch (err) {
        setStatus('error');
        setMessage(requestErrorMessage(err));
      }
    };

    void completeOAuth();
  }, [navigate, searchParams]);

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Connexion WHOOP</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {status === 'loading' && (
            <div className="flex items-center gap-3 text-[13px] text-slate-600">
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: TOKENS.TEAL }} />
              {message}
            </div>
          )}

          {status === 'success' && (
            <div className="rounded-md bg-emerald-50 px-3 py-3 text-[13px] text-emerald-800">
              {message}
            </div>
          )}

          {status === 'error' && (
            <>
              <ErrorMessage message={message} />
              <Link
                to={athleteId ? `/integrations?athleteId=${athleteId}` : '/integrations'}
                className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-[12px] font-medium text-white"
              >
                Retour aux intégrations
              </Link>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
