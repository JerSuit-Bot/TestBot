'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Shield, Lock, CheckCircle2 } from 'lucide-react';
import { discordAvatarUrl } from '@/lib/constants';
import { ThemeToggle } from '@/components/theme-toggle';

export default function SignInPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ discord_id: string; username: string; display_name: string | null; avatar: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUser(data.user);
          }
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    check();
  }, []);

  const handleSignIn = () => {
    setRedirecting(true);
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Left side - branding */}
        <div className="relative flex flex-col justify-between overflow-hidden border-b border-border bg-card/30 p-8 lg:w-1/2 lg:border-b-0 lg:border-r lg:p-12">
          {/* Background */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/4 top-1/4 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[100px]" />
          </div>

          {/* Logo */}
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/سس.png" alt="JerSuit" className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-base font-semibold tracking-tight">Jer<span className="text-primary">Suit</span></span>
            </Link>
            <ThemeToggle />
          </div>

          {/* Tagline */}
          <div className="flex flex-col gap-6 py-12 lg:py-0">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              The control center for your Discord community.
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              Manage moderation, automation, tickets, roles, logging, and more — all from one secure dashboard. Built for serious communities.
            </p>
            <div className="flex flex-col gap-3">
              {[
                'Server-side permission verification',
                'Per-server isolated configuration',
                'Complete audit trail of all actions',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle2 size={15} className="shrink-0 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="hidden text-xs text-muted-foreground lg:block">
            Built for serious communities.
          </div>
        </div>

        {/* Right side - auth card */}
        <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
              <img src="/سس.png" alt="JerSuit" className="h-9 w-9 rounded-lg object-cover" />
              <span className="text-lg font-semibold tracking-tight">Jer<span className="text-primary">Suit</span></span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : user ? (
              <div className="animate-fade-up space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">You&apos;re signed in</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Continue to your server dashboard.</p>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <img
                    src={discordAvatarUrl(user.discord_id, user.avatar, 64)}
                    alt={user.username}
                    className="h-12 w-12 rounded-full"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{user.display_name || user.username}</div>
                    <div className="truncate text-xs text-muted-foreground">@{user.username}</div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/servers')}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                >
                  Go to Dashboard <ArrowRight size={16} />
                </button>

                <button
                  onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); setUser(null); }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-muted-foreground transition hover:text-destructive hover:border-destructive/30"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="animate-fade-up space-y-6">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Sign in to manage your Discord servers.</p>
                </div>

                <button
                  onClick={handleSignIn}
                  disabled={redirecting}
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {redirecting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.872-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      Continue with Discord
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3">
                  <Shield size={16} className="shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    We only request access to your Discord username, avatar, and server list. We never see or store your password.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Lock size={12} />
                  Protected by OAuth 2.0 state validation
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  By signing in, you agree to use JerSuit responsibly in accordance with Discord&apos;s Terms of Service.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
