'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { discordIconUrl } from '@/lib/constants';
import { Shield, Zap, Ticket, Music, MessageSquare, Users, Activity, Cog, BarChart3, Settings, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function GuildOverview() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [settings, setSettings] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [settingsRes, modRes, ticketRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/settings`),
        fetch(`/api/guilds/${guildId}/moderation`),
        fetch(`/api/guilds/${guildId}/tickets`),
      ]);
      if (settingsRes.ok) {
        const sd = await settingsRes.json();
        if (sd.settings && !sd.settings.error) setSettings(sd.settings);
      }
      if (modRes.ok) { const d = await modRes.json(); setStats((s: any) => ({ ...s, modCases: d.cases?.length || 0 })); }
      if (ticketRes.ok) { const d = await ticketRes.json(); setStats((s: any) => ({ ...s, tickets: d.tickets?.length || 0 })); }
    } catch {} finally { setLoading(false); }
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading...</div>;

  const features = [
    { label: 'Moderation', icon: Shield, href: 'moderation', desc: 'Manage moderation commands and view recent cases', enabled: settings?.moderation_enabled ?? true },
    { label: 'AutoMod', icon: Zap, href: 'automod', desc: 'Automated message filtering and spam protection', enabled: settings?.automod_enabled || false },
    { label: 'Tickets', icon: Ticket, href: 'tickets', desc: 'Support ticket system', enabled: settings?.tickets_enabled || false },
    { label: 'Music', icon: Music, href: 'music', desc: 'Music playback configuration', enabled: settings?.music_enabled || false },
    { label: 'Welcome', icon: MessageSquare, href: 'welcome', desc: 'Greet new members and say goodbye', enabled: settings?.welcome_enabled || false },
    { label: 'Roles', icon: Users, href: 'roles', desc: 'Role management and reaction roles', enabled: true },
    { label: 'Logging', icon: Activity, href: 'logging', desc: 'Track member, message, voice, and role events', enabled: settings?.logging_enabled || false },
    { label: 'Automations', icon: Cog, href: 'automations', desc: 'Trigger-based automated actions', enabled: true },
    { label: 'Analytics', icon: BarChart3, href: 'analytics', desc: 'Server activity and growth metrics', enabled: true },
    { label: 'Settings', icon: Settings, href: 'settings', desc: 'General server configuration', enabled: true },
  ];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">Server overview</h1>
        <p className="mt-2 text-sm text-[#708278]">Manage your server&apos;s JerSuit features. Each feature is configured independently for this server only.</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Shield size={20} /></div>
          <div className="mt-4 text-2xl font-semibold text-[#11221a]">{stats?.modCases ?? '—'}</div>
          <div className="text-xs text-[#8b9a91]">Moderation cases</div>
        </div>
        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Ticket size={20} /></div>
          <div className="mt-4 text-2xl font-semibold text-[#11221a]">{stats?.tickets ?? '—'}</div>
          <div className="text-xs text-[#8b9a91]">Tickets</div>
        </div>
        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Activity size={20} /></div>
          <div className="mt-4 text-2xl font-semibold text-[#11221a]">{settings?.language?.toUpperCase() || 'EN'}</div>
          <div className="text-xs text-[#8b9a91]">Language</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(f => (
          <Link key={f.label} href={`/dashboard/${guildId}/${f.href}`} className="group rounded-2xl border border-[#dfe8e1] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(24,58,38,0.07)]">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><f.icon size={20} /></div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${f.enabled ? 'bg-[#e0f5e5] text-[#16814b]' : 'bg-[#f1f4f2] text-[#89988f]'}`}>{f.enabled ? 'On' : 'Off'}</span>
            </div>
            <div className="mt-4 text-sm font-semibold text-[#11221b]">{f.label}</div>
            <div className="mt-1 text-xs text-[#708278]">{f.desc}</div>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#199155] opacity-0 transition group-hover:opacity-100">Configure <ArrowRight size={12} /></div>
          </Link>
        ))}
      </div>
    </>
  );
}
