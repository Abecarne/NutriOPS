import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { useAuth } from '@/context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Minimum 6 caractères'),
});
const signupSchema = loginSchema.extend({
  full_name: z.string().min(2, 'Votre nom est requis'),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

export function AuthPage() {
  const { session, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  if (!loading && session) return <Navigate to="/dashboard" replace />;

  const onLogin = async (values: LoginValues) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      navigate('/dashboard');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Connexion impossible');
    }
  };

  const onSignup = async (values: SignupValues) => {
    setFormError(null);
    setInfoMessage(null);
    try {
      await signUp(values.email, values.password, values.full_name);
      setInfoMessage('Compte créé. Vérifiez votre boîte mail si la confirmation est activée, sinon connectez-vous.');
      setMode('login');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Inscription impossible");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-lg bg-[var(--brand)] text-white flex items-center justify-center text-xl font-bold mb-3">
            N
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">NutriOps</h1>
          <p className="text-sm text-slate-500 mt-1">Nutrition + charge pour coachs performance</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-md">
            <button
              type="button"
              onClick={() => { setMode('login'); setFormError(null); }}
              className={`flex-1 h-9 text-sm rounded-md transition-colors ${
                mode === 'login' ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-600'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setFormError(null); }}
              className={`flex-1 h-9 text-sm rounded-md transition-colors ${
                mode === 'signup' ? 'bg-white shadow-sm text-slate-900 font-medium' : 'text-slate-600'
              }`}
            >
              Créer un compte
            </button>
          </div>

          {infoMessage && (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {infoMessage}
            </div>
          )}
          {formError && <ErrorMessage message={formError} className="mb-4" />}

          {mode === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                {...loginForm.register('email')}
                error={loginForm.formState.errors.email?.message}
              />
              <Input
                label="Mot de passe"
                type="password"
                autoComplete="current-password"
                {...loginForm.register('password')}
                error={loginForm.formState.errors.password?.message}
              />
              <Button type="submit" loading={loginForm.formState.isSubmitting}>
                Se connecter
              </Button>
            </form>
          ) : (
            <form onSubmit={signupForm.handleSubmit(onSignup)} className="flex flex-col gap-4">
              <Input
                label="Nom complet"
                autoComplete="name"
                {...signupForm.register('full_name')}
                error={signupForm.formState.errors.full_name?.message}
              />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                {...signupForm.register('email')}
                error={signupForm.formState.errors.email?.message}
              />
              <Input
                label="Mot de passe"
                type="password"
                autoComplete="new-password"
                {...signupForm.register('password')}
                error={signupForm.formState.errors.password?.message}
                hint="Minimum 6 caractères."
              />
              <Button type="submit" loading={signupForm.formState.isSubmitting}>
                Créer mon compte
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
