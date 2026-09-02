'use client';

import { type SyntheticEvent, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Check,
  Eye,
  EyeOff,
  LineChart,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Mode = 'sign-in' | 'sign-up';

export function LoginForm({
  configured,
  initialError,
  setupPending,
}: {
  configured: boolean;
  initialError?: string;
  setupPending: boolean;
}) {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialError ?? '');

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!configured) return;
    setLoading(true);
    setMessage('');

    const supabase = createClient();
    const result =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

    setLoading(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === 'sign-up' && !result.data.session) {
      setMessage('Check your inbox to confirm your account, then sign in.');
      return;
    }

    window.location.assign('/');
  };

  return (
    <main className="app-canvas grid min-h-screen bg-background text-foreground lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden border-r border-border p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -left-32 top-24 size-[420px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 right-0 size-[420px] rounded-full bg-secondary/15 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#3A86FF] to-[#706DFF] text-xl font-black text-white shadow-[0_14px_40px_rgba(58,134,255,.3)]">
            P
          </span>
          <div>
            <p className="font-semibold">Potato Journal</p>
            <p className="text-[10px] uppercase tracking-[.22em] text-muted-foreground">
              Trading OS
            </p>
          </div>
        </div>

        <div className="relative max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-secondary/10 px-3 py-1.5 text-xs text-secondary">
            <Sparkles className="size-3.5" /> Built for disciplined execution
          </div>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.04] tracking-[-.05em] xl:text-6xl">
            Every account. Every rule. One clear edge.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
            Keep prop-firm limits, personal capital, backtests, and live results
            separate—then compare what actually compounds.
          </p>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {[
              [LineChart, 'Equity curves'],
              [ShieldCheck, 'Risk controls'],
              [BarChart3, 'Backtesting'],
            ].map(([Icon, label]) => {
              const FeatureIcon = Icon as typeof LineChart;
              return (
                <div
                  key={label as string}
                  className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur"
                >
                  <FeatureIcon className="mb-6 size-5 text-primary" />
                  <p className="text-xs font-medium">{label as string}</p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative text-xs text-muted-foreground">
          Private by default · Your journal rows are protected per user
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[430px]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#3A86FF] to-[#706DFF] font-black text-white">
              P
            </span>
            <span className="font-semibold">Potato Journal</span>
          </div>

          <div className="mb-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-[.18em] text-primary">
              Secure workspace
            </p>
            <h2 className="text-3xl font-semibold tracking-[-.035em]">
              {mode === 'sign-in' ? 'Welcome back' : 'Create your journal'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {mode === 'sign-in'
                ? 'Sign in to your accounts, rules, and performance history.'
                : 'Start with one account and build your trading operating system.'}
            </p>
          </div>

          {!configured && (
            <Alert className="mb-5 border-secondary/35 bg-secondary/10">
              <LockKeyhole className="size-4" />
              <AlertDescription>
                {setupPending
                  ? 'Supabase is ready in the codebase and waiting for the project connection.'
                  : 'Authentication is temporarily unavailable while Supabase is connected.'}
              </AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="mb-5 border-primary/30 bg-primary/8">
              <Check className="size-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-12 rounded-xl bg-card"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={!configured || loading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === 'sign-in' && (
                  <span className="text-xs text-muted-foreground">
                    Minimum 8 characters
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={
                    mode === 'sign-in' ? 'current-password' : 'new-password'
                  }
                  minLength={8}
                  className="h-12 rounded-xl bg-card pr-12"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={!configured || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="h-12 w-full rounded-xl font-semibold"
              disabled={!configured || loading}
            >
              {loading
                ? 'Connecting…'
                : mode === 'sign-in'
                  ? 'Sign in'
                  : 'Create account'}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {mode === 'sign-in'
              ? 'New to Potato Journal?'
              : 'Already trading here?'}{' '}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                setMessage('');
              }}
            >
              {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
