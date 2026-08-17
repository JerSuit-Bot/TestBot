'use client';

import { useEffect, useState } from 'react';
import { Activity, Cpu, MemoryStick, Clock, Wifi, Server } from 'lucide-react';

export default function HealthPage() {
  const [status, setStatus] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/bot/status');
        if (res.ok) setStatus((await res.json()).status);
      } catch {} finally { setLoading(false); }
    }
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading health data...</div>;

  const checks = [
    { label: 'Bot process', value: status?.state || 'offline', healthy: status?.state === 'online', icon: Server },
    { label: 'Gateway latency', value: status?.gateway_latency_ms != null ? `${status.gateway_latency_ms}ms` : '—', healthy: status?.gateway_latency_ms != null && status.gateway_latency_ms < 500, icon: Wifi },
    { label: 'Uptime', value: status?.uptime_seconds ? formatUptime(status.uptime_seconds) : '—', healthy: status?.uptime_seconds > 0, icon: Clock },
    { label: 'CPU usage', value: `${(status?.cpu_percent || 0).toFixed(1)}%`, healthy: (status?.cpu_percent || 0) < 80, icon: Cpu },
    { label: 'Memory', value: `${(status?.memory_mb || 0).toFixed(0)}MB`, healthy: (status?.memory_mb || 0) < 512, icon: MemoryStick },
    { label: 'Last heartbeat', value: status?.last_heartbeat ? new Date(status.last_heartbeat).toLocaleTimeString() : '—', healthy: status?.last_heartbeat && Date.now() - new Date(status.last_heartbeat).getTime() < 30000, icon: Activity },
  ];

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">System health</h2>
        <p className="mt-2 text-sm text-[#708278]">Real-time monitoring of the JerSuit bot process and infrastructure.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((c) => (
          <div key={c.label} className="rounded-2xl border border-[#dfe8e1] bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><c.icon size={20} /></div>
              <span className={`h-3 w-3 rounded-full ${c.healthy ? 'bg-[#29a65f]' : 'bg-[#e23d3d]'}`} />
            </div>
            <div className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#11221a]">{c.value}</div>
            <div className="mt-1 text-xs text-[#8b9a91]">{c.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
