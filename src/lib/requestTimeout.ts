export const SUPABASE_REQUEST_TIMEOUT_MS = 12000;

export function createRequestTimeout(ms = SUPABASE_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timeout),
  };
}

export function requestErrorMessage(err: unknown, fallback = 'Erreur de chargement'): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'La requête Supabase met trop de temps à répondre. Vérifiez la configuration Supabase, la connexion réseau et les politiques RLS.';
  }
  return err instanceof Error ? err.message : fallback;
}
