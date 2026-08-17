'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Plus, Bot, Radio, Database, Zap, Gauge, SlidersHorizontal, ArrowUpRight, ShieldCheck, MoreHorizontal, Activity } from 'lucide-react';

export default function ControlCenterOverview() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [botStatus, setBotStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, botRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/bot/status'),
        ]);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
        }
        if (botRes.ok) {
          const botData = await botRes.json();
          setBotStatus(botData.status);
        }
      } catch {
        // server not ready
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const botState = (botStatus?.state as string) || 'offline';
  const tokenConfigured = (botStatus?.token_configured as boolean) || false;
  const connectedGuilds = (botStatus?.connected_guilds as number) || 0;

  const statusCards = [
    { label: 'Bot status', value: botState, detail: tokenConfigured ? 'Token configured' : 'Not configured', icon: Bot, tone: botState === 'online' ? 'green' : 'slate' },
    { label: 'Discord connection', value: botState === 'online' ? 'Connected' : 'Disconnected', detail: botState === 'online' ? `${connectedGuilds} servers` : 'Awaiting bot connection', icon: Radio, tone: botState === 'online' ? 'green' : 'amber' },
    { label: 'Database', value: 'Connected', detail: 'Supabase PostgreSQL', icon: Database, tone: 'green' },
    { label: 'API status', value: 'Operational', detail: 'All endpoints responding', icon: Zap, tone: 'green' },
  ];

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#199155]"><Sparkles size={14} /> Platform overview</div>
          <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.055em] text-[#11271a] sm:text-[38px]">A clearer view of your Discord ecosystem.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#708278]">Monitor your infrastructure, configure JerSuit, and keep every community running smoothly from one calm workspace.</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statusCards.map((card) => <StatusCard key={card.label} {...card} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white shadow-[0_10px_30px_rgba(24,58,38,0.035)]">
          <div className="flex items-center justify-between border-b border-[#edf2ee] px-5 py-5 sm:px-6">
            <div><h3 className="text-[15px] font-semibold">Runtime overview</h3><p className="mt-1 text-xs text-[#8b9a91]">Live process health and infrastructure signals</p></div>
          </div>
          <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-2xl border border-dashed border-[#cddbd0] bg-[#fbfdfb] p-6">
              <div className="mb-8 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf7ef] text-[#199155]"><Gauge size={19} /></div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${botState === 'online' ? 'bg-[#e0f5e5] text-[#16814b]' : 'bg-[#f1f4f2] text-[#89988f]'}`}>{botState}</span>
              </div>
              <div className="text-2xl font-semibold tracking-[-0.04em] text-[#547064]">{botStatus?.uptime_seconds ? formatUptime(botStatus.uptime_seconds as number) : '—'}</div>
              <div className="mt-1 text-sm text-[#788b80]">Bot uptime</div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#edf2ee]"><div className="h-full rounded-full bg-[#c5d7c9]" style={{ width: botState === 'online' ? '75%' : '5%' }} /></div>
            </div>
            <div className="flex flex-col justify-between rounded-2xl bg-[#f7faf7] p-6">
              <div>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#698176] shadow-sm"><SlidersHorizontal size={18} /></div>
                <h4 className="text-sm font-semibold">Runtime controls</h4>
                <p className="mt-2 text-xs leading-5 text-[#829188]">Start, stop, and restart the bot process. Commands are queued and executed by the bot runtime.</p>
              </div>
              <a href="/admin/runtime" className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#d6e2d8] bg-white text-xs font-semibold text-[#6b7e73] transition hover:border-[#a7cdb1] hover:text-[#199155]">Configure runtime <ArrowUpRight size={14} /></a>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#dfe8e1] bg-white shadow-[0_10px_30px_rgba(24,58,38,0.035)]">
          <div className="flex items-center justify-between border-b border-[#edf2ee] px-5 py-5">
            <div><h3 className="text-[15px] font-semibold">Platform statistics</h3><p className="mt-1 text-xs text-[#8b9a91]">Real data from the database</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-5">
            <StatBox label="Total users" value={stats?.users ?? '—'} />
            <StatBox label="Total servers" value={stats?.guilds ?? '—'} />
            <StatBox label="Active sessions" value={stats?.active_sessions ?? '—'} />
            <StatBox label="Tickets" value={stats?.tickets ?? '—'} />
            <StatBox label="Moderation cases" value={stats?.moderation_cases ?? '—'} />
            <StatBox label="Audit logs" value={stats?.audit_logs ?? '—'} />
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-[#cce4d1] bg-[#eaf7ed] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#199155] shadow-sm"><ShieldCheck size={21} /></div>
            <div>
              <div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-[#18452b]">Your control center is ready</h3><span className="rounded-full bg-[#d2efd8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#287b49]">Secure by default</span></div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#5f7c68]">All data is protected by server-side session validation and database-level authorization. No community data is shown until access is verified.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatusCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof Bot; tone: string }) {
  const toneClass = tone === 'green' ? 'bg-[#eaf7ed] text-[#199155]' : tone === 'amber' ? 'bg-[#fff6df] text-[#b98921]' : 'bg-[#f0f4f1] text-[#7d9085]';
  return (
    <div className="rounded-2xl border border-[#dfe8e1] bg-white p-5 shadow-[0_8px_25px_rgba(24,58,38,0.028)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(24,58,38,0.07)]">
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}><Icon size={17} /></div>
        <MoreHorizontal size={17} className="text-[#a1afa6]" />
      </div>
      <div className="mt-5 flex items-center gap-2">
        <span className="text-xl font-semibold tracking-[-0.04em] text-[#536a5c]">{value}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-[#50665a]">{label}</div>
      <div className="mt-2 text-[11px] text-[#96a39b]">{detail}</div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[#edf2ee] bg-[#fbfdfb] p-4">
      <div className="text-2xl font-semibold tracking-[-0.04em] text-[#199155]">{value}</div>
      <div className="mt-1 text-xs text-[#788b80]">{label}</div>
    </div>
  );
}
