'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe2, ArrowRight, LogOut, Bot } from 'lucide-react';
import { discordIconUrl, discordAvatarUrl } from '@/lib/constants';

export default function DashboardHome() {
  const [user, setUser] = useState<any>(null);
  const [guilds, setGuilds] = useState<any[]>([]);
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
          if (!userData.authenticated) { router.push('/'); return; }
          setUser(userData.user);
        }
        if (guildsRes.ok) {
          const guildsData = await guildsRes.json();
          setGuilds(guildsData.guilds || []);
        }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [router]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f4f7f5] text-[#8b9a91]">Loading...</div>;

  return (
    <main className="min-h-screen bg-[#f4f7f5] text-[#13221b]">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#dfe8e1]/90 bg-[#f9fcfa]/90 px-5 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <img src="/سس.jpg" alt="JerSuit" className="h-9 w-9 rounded-xl object-cover" />
          <span className="text-lg font-semibold tracking-[-0.03em]">Jer<span className="text-[#199155]">Suit</span></span>
          <span className="ml-2 rounded-full bg-[#eaf7ed] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#16814b]">Server Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <img src={discordAvatarUrl(user.discord_id, user.avatar, 64)} alt={user.username} className="h-8 w-8 rounded-full" />
              <span className="hidden text-sm font-medium sm:block">{user.display_name || user.username}</span>
            </div>
          )}
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/'); }} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#708278] hover:bg-[#edf5ef] hover:text-[#c44]" aria-label="Logout"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#11271a]">Your servers</h1>
          <p className="mt-2 text-sm text-[#708278]">Select a server to manage its JerSuit configuration. You can only see servers where you have Manage Guild or Administrator permissions.</p>
        </div>

        {guilds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cddbd0] bg-[#fbfdfb] p-12 text-center">
            <Globe2 size={40} className="mx-auto text-[#c5d7c9]" />
            <p className="mt-4 text-sm text-[#8b9a91]">No accessible servers found. Make sure JerSuit has been added to your Discord server, or that you have management permissions in at least one server.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guilds.map((g) => (
              <button key={g.guild_id} onClick={() => router.push(`/dashboard/${g.discord_id}`)} className="group rounded-2xl border border-[#dfe8e1] bg-white p-5 text-left shadow-[0_8px_25px_rgba(24,58,38,0.028)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(24,58,38,0.07)]">
                <div className="flex items-start justify-between">
                  {g.icon ? <img src={discordIconUrl(g.discord_id, g.icon)} alt={g.name} className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Globe2 size={22} /></div>}
                  <ArrowRight size={18} className="text-[#c5d7c9] transition group-hover:text-[#199155]" />
                </div>
                <div className="mt-4 text-sm font-semibold text-[#11221a]">{g.name}</div>
                <div className="mt-1 text-xs text-[#8b9a91]">{g.member_count || 0} members</div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${g.bot_added ? 'bg-[#e0f5e5] text-[#16814b]' : 'bg-[#f1f4f2] text-[#89988f]'}`}>{g.bot_added ? 'Bot added' : 'Bot not added'}</span>
                  <span className="rounded-full bg-[#f0f6f1] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#708278]">{g.role?.replace('SERVER_', '')}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
