'use client';

import { useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';

/**
 * DECISION: this is intentionally bare. The component library (StepWizard,
 * Form + RHF field components, AppShell) doesn't exist until M1.5, and the
 * real onboarding-adjacent /login layout is built once it does. This only
 * has to prove magic link + Google sign-in work end to end.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleMagicLink(formEvent: SubmitEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setStatus('sending');
    const { error } = await authClient.signIn.magicLink({ email, callbackURL: '/dashboard' });
    setStatus(error ? 'error' : 'sent');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <h1 className="text-lg font-medium text-foreground">Sign in</h1>

      <form onSubmit={handleMagicLink} className="flex w-full max-w-xs flex-col gap-3">
        <Input
          type="email"
          required
          placeholder="you@shop.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending...' : 'Send magic link'}
        </Button>
        {status === 'sent' && (
          <p className="text-sm text-muted-foreground">Check your email for a sign-in link.</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-destructive">Something went wrong. Try again.</p>
        )}
      </form>

      <Button
        variant="secondary"
        className="w-full max-w-xs"
        onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })}
      >
        Continue with Google
      </Button>
    </main>
  );
}
