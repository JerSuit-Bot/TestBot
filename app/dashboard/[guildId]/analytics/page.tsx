'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Users, MessageSquare, Activity, TrendingUp } from 'lucide-react';
import { PageHeader } from '../_shared';

export default function AnalyticsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [modRes, ticketRes, settingsRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/moderation`),
        fetch(`/api/guilds/${guildId}/tickets`),
        fetch(`/api/guilds/${guildId}/settings`),
      ]);
      const s: any = {};
      if (modRes.ok) { const d = await modRes.json(); s.modCases = d.cases?.length || 0; }
      if (ticketRes.ok) { const d = await ticketRes.json(); s.tickets = d.tickets?.length || 0; s.openTickets = (d.tickets || []).filter((t: any) => t.status === 'open').length; }
      if (settingsRes.ok) { const d = await settingsRes.json(); s.features = countEnabledFeatures(d.settings); }
      setStats(s);
    } catch {}
    finally { setLoading(false); }
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading...</div>;

  const cards = [
    { icon: Activity, label: 'Moderation cases', value: stats?.modCases ?? '—', color: 'bg-[#eaf7ed] text-[#199155]' },
    { icon: MessageSquare, label: 'Total tickets', value: stats?.tickets ?? '—', color: 'bg-[#eaf7ed] text-[#199155]' },
    { icon: TrendingUp, label: 'Open tickets', value: stats?.openTickets ?? '—', color: 'bg-[#fff6df] text-[#b98921]' },
    { icon: Users, label: 'Enabled features', value: stats?.features ?? '—', color: 'bg-[#eaf7ed] text-[#199155]' },
  ];

  return (
    <>
      <PageHeader title="Analytics" desc="Server activity and metrics. Data is sourced from real database records." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-2xl border border-[#dfe8e1] bg-white p-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.color}`}><c.icon size={20} /></div>
            <div className="mt-4 text-2xl font-semibold text-[#11221a]">{c.value}</div>
            <div className="text-xs text-[#8b9a91]">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-[#edf2ee] bg-[#fbfdfb] p-6">
        <p className="text-sm text-[#708278]">Detailed analytics will be available once the bot is connected and collecting activity data. Metrics shown here are based on real database records.</p>
      </div>
    </>
  );
}

function countEnabledFeatures(settings: any): number {
  if (!settings) return 0;
  let count = 0;
  if (settings.moderation_enabled) count++;
  if (settings.automod_enabled) count++;
  if (settings.tickets_enabled) count++;
  if (settings.music_enabled) count++;
  if (settings.welcome_enabled) count++;
  if (settings.logging_enabled) count++;
  if (settings.automations_enabled) count++;
  return count;
}
