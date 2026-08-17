'use client';

import { useEffect, useState, useCallback } from 'react';
import { Play, Square, RotateCcw, Gauge, Cpu, MemoryStick, Clock, Wifi, Server, AlertCircle } from 'lucide-react';

export default function RuntimePage() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/bot/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const sendCommand = async (command: 'start' | 'stop' | 'restart') => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/runtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Command "${command}" sent to bot process.`);
        setTimeout(fetchStatus, 2000);
      } else {
        setMessage(data.error || 'Failed to send command.');
      }
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading runtime status...</div>;
  }

  const state = (status?.state as string) || 'offline';
  const uptime = status?.uptime_seconds as number || 0;
  const latency = status?.gateway_latency_ms as number | null;
  const guilds = status?.connected_guilds as number || 0;
  const users = status?.total_users as number || 0;
  const cpu = status?.cpu_percent as number || 0;
  const memory = status?.memory_mb as number || 0;
  const tokenConfigured = status?.token_configured as boolean || false;
  const lastError = status?.last_error as string | null;
  const lastStarted = status?.last_started_at as string | null;
  const lastStopped = status?.last_stopped_at as string | null;
  const lastCrash = status?.last_crash_at as string | null;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">Runtime management</h2>
        <p className="mt-2 text-sm text-[#708278]">Start, stop, and monitor the JerSuit bot process in real time.</p>
      </div>

      {!tokenConfigured && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#fff6df] bg-[#fffef5] p-4">
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-[#b98921]" />
          <div>
            <div className="text-sm font-semibold text-[#8a6a10]">Bot token not configured</div>
            <p className="mt-1 text-xs text-[#a08a50]">Set the DISCORD_BOT_TOKEN environment variable to enable bot startup. The token is never exposed to the browser.</p>
          </div>
        </div>
      )}

      {message && (
        <div className="mb-6 rounded-2xl border border-[#cce4d1] bg-[#eaf7ed] p-4 text-sm font-medium text-[#16814b]">{message}</div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-[#dfe8e1] bg-white p-5">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${state === 'online' ? 'bg-[#eaf7ed] text-[#199155]' : 'bg-[#f0f4f1] text-[#7d9085]'}`}>
            <Server size={22} />
          </div>
          <div>
            <div className="text-2xl font-semibold capitalize tracking-[-0.03em] text-[#11271a]">{state}</div>
            <div className="text-xs text-[#8b9a91]">Process state</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[#dfe8e1] bg-white p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf7ef] text-[#199155]"><Clock size={22} /></div>
          <div>
            <div className="text-2xl font-semibold tracking-[-0.03em] text-[#11271a]">{formatUptime(uptime)}</div>
            <div className="text-xs text-[#8b9a91]">Uptime</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[#dfe8e1] bg-white p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf7ef] text-[#199155]"><Wifi size={22} /></div>
          <div>
            <div className="text-2xl font-semibold tracking-[-0.03em] text-[#11271a]">{latency != null ? `${latency}ms` : '—'}</div>
            <div className="text-xs text-[#8b9a91]">Gateway latency</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[#dfe8e1] bg-white p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf7ef] text-[#199155]"><Gauge size={22} /></div>
          <div>
            <div className="text-2xl font-semibold tracking-[-0.03em] text-[#11271a]">{guilds}</div>
            <div className="text-xs text-[#8b9a91]">Connected servers</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[#dfe8e1] bg-white p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf7ef] text-[#199155]"><Cpu size={22} /></div>
          <div>
            <div className="text-2xl font-semibold tracking-[-0.03em] text-[#11271a]">{cpu.toFixed(1)}%</div>
            <div className="text-xs text-[#8b9a91]">CPU usage</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-[#dfe8e1] bg-white p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf7ef] text-[#199155]"><MemoryStick size={22} /></div>
          <div>
            <div className="text-2xl font-semibold tracking-[-0.03em] text-[#11271a]">{memory.toFixed(0)}MB</div>
            <div className="text-xs text-[#8b9a91]">Memory usage</div>
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-[#dfe8e1] bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-[#11271a]">Process controls</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => sendCommand('start')} disabled={actionLoading || state === 'online' || !tokenConfigured} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#199155] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(25,145,85,0.18)] transition hover:bg-[#147f49] disabled:cursor-not-allowed disabled:opacity-40"><Play size={17} /> Start</button>
          <button onClick={() => sendCommand('stop')} disabled={actionLoading || state !== 'online'} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#e23d3d] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(226,61,61,0.18)] transition hover:bg-[#c93333] disabled:cursor-not-allowed disabled:opacity-40"><Square size={17} /> Stop</button>
          <button onClick={() => sendCommand('restart')} disabled={actionLoading || !tokenConfigured} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#dfe8e1] bg-white px-5 text-sm font-semibold text-[#50665a] transition hover:border-[#a7cdb1] hover:text-[#199155] disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={17} /> Restart</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-[#11271a]">Process events</h3>
          <div className="space-y-3 text-sm">
            <EventRow label="Last started" value={lastStarted} />
            <EventRow label="Last stopped" value={lastStopped} />
            <EventRow label="Last crash" value={lastCrash} />
          </div>
        </div>
        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-[#11271a]">Last error</h3>
          {lastError ? (
            <pre className="overflow-x-auto rounded-xl bg-[#f7faf7] p-4 text-xs text-[#c44] whitespace-pre-wrap">{lastError}</pre>
          ) : (
            <p className="text-sm text-[#8b9a91]">No errors recorded.</p>
          )}
        </div>
      </div>
    </>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function EventRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-[#edf2ee] pb-2">
      <span className="text-[#708278]">{label}</span>
      <span className="font-medium text-[#11271a]">{value ? new Date(value).toLocaleString() : '—'}</span>
    </div>
  );
}
