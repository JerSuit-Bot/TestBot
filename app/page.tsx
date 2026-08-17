'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Server, ArrowRight, LogOut, Globe2, Bot, Users, Zap, Ticket, Music, MessageSquare, Activity, Cog, BarChart3 } from 'lucide-react';
import { discordAvatarUrl } from '@/lib/constants';

export default function LandingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) setUser(data.user);
        }
      } catch {} finally { setLoading(false); }
    }
    check();
  }, []);

  const features = [
    { icon: Shield, title: 'Moderation', desc: 'Warn, kick, ban, timeout, and track all moderation cases with full audit history.' },
    { icon: Zap, title: 'AutoMod', desc: 'Automated message filtering, spam protection, and raid defense for your community.' },
    { icon: Ticket, title: 'Tickets', desc: 'A complete support ticket system with categories, transcripts, and staff assignment.' },
    { icon: Music, title: 'Music', desc: 'High-quality music playback with queues, playlists, and volume control.' },
    { icon: MessageSquare, title: 'Welcome', desc: 'Greet new members with custom messages and embeds. Say goodbye when they leave.' },
    { icon: Users, title: 'Roles', desc: 'Reaction roles, self-assignable roles, and automated role management.' },
    { icon: Activity, title: 'Logging', desc: 'Track member, message, voice, and role events with detailed audit logs.' },
    { icon: Cog, title: 'Automations', desc: 'Trigger-based automated actions that fire on member join, message, and more.' },
    { icon: BarChart3, title: 'Analytics', desc: 'Server activity, growth metrics, and engagement insights over time.' },
  ];

  return (
    <main className="min-h-screen bg-[#f4f7f5] text-[#13221b]">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#dfe8e1]/90 bg-[#f9fcfa]/90 px-5 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <img src="/سس.jpg" alt="JerSuit" className="h-9 w-9 rounded-xl object-cover shadow-[0_4px_12px_rgba(25,145,85,0.18)]" />
          <span className="text-lg font-semibold tracking-[-0.03em]">Jer<span className="text-[#199155]">Suit</span></span>
        </div>
        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <img src={discordAvatarUrl(user.discord_id, user.avatar, 64)} alt={user.username} className="h-8 w-8 rounded-full" />
              <span className="hidden text-sm font-medium sm:block">{user.display_name || user.username}</span>
              <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); setUser(null); }} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#708278] hover:bg-[#edf5ef] hover:text-[#c44]"><LogOut size={18} /></button>
            </>
          ) : (
            <button onClick={() => router.push('/api/auth/login')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#199155] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(25,145,85,0.18)] transition hover:bg-[#147f49]">
              <Globe2 size={16} /> Login with Discord
            </button>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8">
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#199155]">
            <Shield size={14} /> Discord management platform
          </div>
          <h1 className="max-w-2xl mx-auto text-4xl font-semibold tracking-[-0.05em] text-[#11271a] sm:text-5xl">
            One platform for your bot, your servers, and your community.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#708278]">
            Connect your Discord account and manage the servers you are authorized to manage. JerSuit gives you moderation, tickets, music, automations, and more — all in one clean dashboard.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => router.push(user ? '/dashboard' : '/api/auth/login')}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#199155] px-7 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(25,145,85,0.18)] transition hover:bg-[#147f49]"
            >
              <Server size={18} /> {user ? 'Go to Dashboard' : 'Login with Discord'} <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(f => (
            <div key={f.title} className="rounded-2xl border border-[#dfe8e1] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(24,58,38,0.07)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><f.icon size={20} /></div>
              <h3 className="mt-4 text-sm font-semibold text-[#11221b]">{f.title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#708278]">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Bot, title: 'Per-Server Isolation', desc: 'Each server has independent settings. Server A never affects Server B.' },
            { icon: Users, title: 'Only Your Servers', desc: 'You only see servers where you have Manage Guild or Administrator permissions.' },
            { icon: Shield, title: 'Server-Side Security', desc: 'All access is validated server-side. Database-level authorization on every request.' },
          ].map(f => (
            <div key={f.title} className="rounded-2xl border border-[#cce4d1] bg-[#eaf7ed] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#199155]"><f.icon size={20} /></div>
              <h3 className="mt-4 text-sm font-semibold text-[#18452b]">{f.title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#5f7c68]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
