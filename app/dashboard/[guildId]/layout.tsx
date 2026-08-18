'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Globe2, ArrowLeft, Settings, Shield, Zap, Ticket,
  MessageSquare, Music, Users, Activity, Cog, BarChart3,
  LogOut, Menu, X,
} from 'lucide-react';
import { discordIconUrl, discordAvatarUrl } from '@/lib/constants';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV = [
  { label: 'Overview', icon: Settings, href: '' },
  { label: 'Moderation', icon: Shield, href: '/moderation' },
  { label: 'AutoMod', icon: Zap, href: '/automod' },
  { label: 'Tickets', icon: Ticket, href: '/tickets' },
  { label: 'Music', icon: Music, href: '/music' },
  { label: 'Welcome', icon: MessageSquare, href: '/welcome' },
  { label: 'Roles', icon: Users, href: '/roles' },
  { label: 'Logging', icon: Activity, href: '/logging' },
  { label: 'Automations', icon: Cog, href: '/automations' },
  { label: 'Analytics', icon: BarChart3, href: '/analytics' },
  { label: 'Settings', icon: Settings, href: '/settings' },
] as const;

interface GuildInfo {
  guild_id: string;
  discord_id: string;
  name: string;
  icon: string | null;
  member_count: number;
  bot_added: boolean;
  role: string;
}

export default function GuildLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const guildId = params.guildId as string;
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ discord_id: string; username: string; display_name: string | null; avatar: string | null } | null>(null);
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [userRes, guildsRes] = await Promise.all([fetch('/api/auth/me'), fetch('/api/guilds')]);
      if (userRes.ok) {
        const ud = await userRes.json();
        if (!ud.authenticated) { router.push('/sign-in'); return; }
        setUser(ud.user);
      }
      if (guildsRes.ok) {
        const gd = await guildsRes.json();
        const g = (gd.guilds || []).find((x: GuildInfo) => x.discord_id === guildId);
        if (!g) { router.push('/servers'); return; }
        setGuild(g);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [guildId, router]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const basePath = `/dashboard/${guildId}`;
  const isActive = (href: string) => pathname === (href ? `${basePath}${href}` : basePath);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent/50 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <Link href="/servers" className="hidden rounded-lg p-2 text-muted-foreground hover:bg-accent/50 lg:block" aria-label="Back to servers">
            <ArrowLeft size={18} />
          </Link>
          {guild?.icon ? (
            <img src={discordIconUrl(guild.discord_id, guild.icon)} alt={guild.name} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe2 size={16} />
            </div>
          )}
          <span className="text-sm font-semibold tracking-tight">{guild?.name || 'Server'}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && <img src={discordAvatarUrl(user.discord_id, user.avatar, 64)} alt={user.username} className="h-8 w-8 rounded-full" />}
          <button
            onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/'); }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:text-destructive hover:border-destructive/30"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 top-14 z-20 w-60 overflow-y-auto border-r border-border bg-card/50 transition-transform lg:static lg:top-0 lg:translate-x-0 lg:z-10 ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="px-3 py-4">
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Server management
            </div>
            <nav className="space-y-1">
              {NAV.map((item) => {
                const fullHref = item.href ? `${basePath}${item.href}` : basePath;
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={fullHref}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    }`}
                  >
                    <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileNavOpen && (
          <button
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 top-14 z-10 bg-black/30 lg:hidden"
            aria-label="Close navigation"
          />
        )}

        {/* Content */}
        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
