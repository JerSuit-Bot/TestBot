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

export default function GuildLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const guildId = params.guildId as string;
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [guild, setGuild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [userRes, guildsRes] = await Promise.all([fetch('/api/auth/me'), fetch('/api/guilds')]);
      if (userRes.ok) {
        const ud = await userRes.json();
        if (!ud.authenticated) { router.push('/'); return; }
        setUser(ud.user);
      }
      if (guildsRes.ok) {
        const gd = await guildsRes.json();
        const g = (gd.guilds || []).find((x: any) => x.discord_id === guildId);
        if (!g) { router.push('/dashboard'); return; }
        setGuild(g);
      }
    } catch {} finally { setLoading(false); }
  }, [guildId, router]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f4f7f5] text-[#8b9a91]">Loading...</div>;

  const basePath = `/dashboard/${guildId}`;
  const isActive = (href: string) => pathname === (href ? `${basePath}${href}` : basePath);

  return (
    <main className="min-h-screen bg-[#f4f7f5] text-[#13221b]">
      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#dfe8e1]/90 bg-[#f9fcfa]/90 px-5 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileNavOpen(true)} className="rounded-xl p-2 text-[#597065] hover:bg-[#e8f3eb] lg:hidden"><Menu size={18} /></button>
          <Link href="/dashboard" className="hidden rounded-xl p-2 text-[#597065] hover:bg-[#e8f3eb] lg:block"><ArrowLeft size={18} /></Link>
          {guild?.icon ? <img src={discordIconUrl(guild.discord_id, guild.icon)} alt={guild.name} className="h-9 w-9 rounded-xl object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Globe2 size={18} /></div>}
          <span className="text-lg font-semibold tracking-[-0.03em]">{guild?.name || 'Server'}</span>
        </div>
        <div className="flex items-center gap-3">
          {user && <img src={discordAvatarUrl(user.discord_id, user.avatar, 64)} alt={user.username} className="h-8 w-8 rounded-full" />}
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/'); }} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#708278] hover:bg-[#edf5ef] hover:text-[#c44]"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="flex">
        <aside className={`fixed inset-y-0 left-0 top-[72px] z-20 w-[240px] overflow-y-auto border-r border-[#dfe8e1] bg-[#fbfdfb] transition-transform lg:static lg:top-0 lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} lg:z-10`}>
          <div className="px-3 py-4">
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#91a198]">Server management</div>
            <nav className="space-y-1">
              {NAV.map(item => {
                const fullHref = item.href ? `${basePath}${item.href}` : basePath;
                const active = pathname === fullHref;
                const Icon = item.icon;
                return (
                  <Link key={item.label} href={fullHref} onClick={() => setMobileNavOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${active ? 'bg-[#e7f5ea] text-[#16814b]' : 'text-[#718178] hover:bg-[#f0f6f1] hover:text-[#315b43]'}`}>
                    <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#29a65f]" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {mobileNavOpen && <button onClick={() => setMobileNavOpen(false)} className="fixed inset-0 top-[72px] z-10 bg-[#0e2819]/25 lg:hidden" />}

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1000px] px-5 py-8 sm:px-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
