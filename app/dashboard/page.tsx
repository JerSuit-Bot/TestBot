'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Globe2, ArrowRight, LogOut } from 'lucide-react';
import { discordIconUrl, discordAvatarUrl } from '@/lib/constants';
import { ThemeToggle } from '@/components/theme-toggle';

interface GuildInfo {
  guild_id: string;
  discord_id: string;
  name: string;
  icon: string | null;
  member_count: number;
  bot_added: boolean;
  role: string;
}

export default function DashboardHome() {
  const [user, setUser] = useState<{ discord_id: string; username: string; display_name: string | null; avatar: string | null } | null>(null);
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const [userRes, guildsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/guilds'),
        ]);
        if (userRes.ok) {
          const userData = await userRes.json();
          if (!userData.authenticated) { router.push('/sign-in'); return; }
          setUser(userData.user);
        }
        if (guildsRes.ok) {
          const guildsData = await guildsRes.json();
          setGuilds(guildsData.guilds || []);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/سس.jpg" alt="JerSuit" className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-base font-semibold tracking-tight">Jer<span className="text-primary">Suit</span></span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <div className="flex items-center gap-2">
                <img src={discordAvatarUrl(user.discord_id, user.avatar, 64)} alt={user.username} className="h-8 w-8 rounded-full" />
                <span className="hidden text-sm font-medium sm:block">{user.display_name || user.username}</span>
              </div>
            )}
            <button
              onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/'); }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:text-destructive hover:border-destructive/30"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your servers</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a server to manage its JerSuit configuration. You only see servers where you have management permissions.
          </p>
        </div>

        {guilds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Globe2 size={36} className="mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              No accessible servers found. Make sure you have management permissions in at least one Discord server.
            </p>
            <Link href="/servers" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Go to server selection
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guilds.map((g) => (
              <button
                key={g.guild_id}
                onClick={() => router.push(`/dashboard/${g.discord_id}`)}
                className="group rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/30 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  {g.icon ? (
                    <img src={discordIconUrl(g.discord_id, g.icon)} alt={g.name} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Globe2 size={22} />
                    </div>
                  )}
                  <ArrowRight size={18} className="text-muted-foreground/50 transition group-hover:text-primary" />
                </div>
                <div className="mt-4 text-sm font-semibold">{g.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{g.member_count || 0} members</div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${
                    g.bot_added ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                  }`}>
                    {g.bot_added ? 'Installed' : 'Not Installed'}
                  </span>
                  <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    {g.role?.replace('SERVER_', '')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
