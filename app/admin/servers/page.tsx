'use client';

import { useEffect, useState } from 'react';
import { Globe2, MoreHorizontal } from 'lucide-react';
import { discordIconUrl } from '@/lib/constants';

export default function ServersPage() {
  const [guilds, setGuilds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/guilds');
        if (res.ok) {
          const data = await res.json();
          setGuilds(data.guilds || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading servers...</div>;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">All servers</h2>
        <p className="mt-2 text-sm text-[#708278]">Every Discord server known to the JerSuit platform.</p>
      </div>

      {guilds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cddbd0] bg-[#fbfdfb] p-12 text-center">
          <Globe2 size={40} className="mx-auto text-[#c5d7c9]" />
          <p className="mt-4 text-sm text-[#8b9a91]">No servers have been synced yet. Servers appear here after a user logs in with Discord and their guilds are synced.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guilds.map((g) => (
            <div key={g.id} className="rounded-2xl border border-[#dfe8e1] bg-white p-5 shadow-[0_8px_25px_rgba(24,58,38,0.028)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(24,58,38,0.07)]">
              <div className="flex items-start justify-between">
                {g.icon ? (
                  <img src={discordIconUrl(g.discord_id, g.icon)} alt={g.name} className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Globe2 size={22} /></div>
                )}
                <MoreHorizontal size={17} className="text-[#a1afa6]" />
              </div>
              <div className="mt-4 text-sm font-semibold text-[#11271a]">{g.name}</div>
              <div className="mt-1 text-xs text-[#8b9a91]">{g.member_count || 0} members</div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${g.bot_added_at ? 'bg-[#e0f5e5] text-[#16814b]' : 'bg-[#f1f4f2] text-[#89988f]'}`}>
                  {g.bot_added_at ? 'Bot added' : 'Bot not added'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
