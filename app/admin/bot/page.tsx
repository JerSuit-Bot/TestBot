'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bot, Save, Activity, Lock, Play, Square, RotateCcw,
  Cpu, MemoryStick, Clock, Wifi, Server, Gauge, FileText,
  RefreshCw, CheckCircle, AlertCircle, KeyRound, Shield,
} from 'lucide-react';

type TabId = 'identity' | 'presence' | 'credentials' | 'runtime' | 'statistics' | 'logs';

const TABS: { id: TabId; label: string; icon: typeof Bot }[] = [
  { id: 'identity', label: 'Identity', icon: Bot },
  { id: 'presence', label: 'Presence', icon: Activity },
  { id: 'credentials', label: 'Credentials', icon: KeyRound },
  { id: 'runtime', label: 'Runtime', icon: Gauge },
  { id: 'statistics', label: 'Statistics', icon: Server },
  { id: 'logs', label: 'Logs', icon: FileText },
];

export default function BotManagementPage() {
  const [tab, setTab] = useState<TabId>('identity');
  const [config, setConfig] = useState<Record<string, any> | null>(null);
  const [status, setStatus] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [configRes, statusRes] = await Promise.all([
        fetch('/api/admin/bot-config'),
        fetch('/api/bot/status'),
      ]);
      if (configRes.ok) setConfig((await configRes.json()).config);
      if (statusRes.ok) setStatus((await statusRes.json()).status);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading bot management...</div>;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">Bot management</h2>
        <p className="mt-2 text-sm text-[#708278]">Global JerSuit bot configuration. This controls the bot across all servers.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === t.id ? 'bg-[#199155] text-white' : 'border border-[#dfe8e1] bg-white text-[#50665a] hover:border-[#a7cdb1]'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'identity' && <IdentityTab config={config} onRefresh={loadData} />}
      {tab === 'presence' && <PresenceTab config={config} onRefresh={loadData} />}
      {tab === 'credentials' && <CredentialsTab config={config} onRefresh={loadData} />}
      {tab === 'runtime' && <RuntimeTab status={status} onRefresh={loadData} />}
      {tab === 'statistics' && <StatisticsTab status={status} />}
      {tab === 'logs' && <LogsTab status={status} />}
    </>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#dfe8e1] bg-white p-6">
      <h3 className="text-sm font-semibold text-[#11221b]">{title}</h3>
      <p className="mt-1 text-xs text-[#8b9a91]">{desc}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function IdentityTab({ config, onRefresh }: { config: any; onRefresh: () => void }) {
  const [username, setUsername] = useState(config?.bot_username || '');
  const [avatarUrl, setAvatarUrl] = useState(config?.bot_avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/bot-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_username: username, bot_avatar_url: avatarUrl }),
      });
      const data = await res.json();
      if (res.ok) { setMessage('Identity saved. Changes apply when the bot is online.'); onRefresh(); }
      else setMessage(data.error || 'Failed to save.');
    } catch { setMessage('Network error.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Bot identity" desc="Set the bot's username and avatar. Changes are applied through the Discord API when the bot is online.">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Bot username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} maxLength={32} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
            <p className="mt-1 text-xs text-[#8b9a91]">Discord rate-limits username changes to 2 per hour.</p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Avatar URL</label>
            <input type="text" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
          </div>
          <button onClick={save} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#199155] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(25,145,85,0.18)] transition hover:bg-[#147f49] disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save identity'}
          </button>
          {message && <p className="text-sm text-[#16814b]">{message}</p>}
        </div>
      </Section>

      <Section title="Preview" desc="How the bot appears on Discord.">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[#edf2ee] bg-[#fbfdfb] p-8">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Bot avatar" className="h-24 w-24 rounded-full object-cover shadow-lg" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#eaf7ed] text-[#199155]"><Bot size={40} /></div>
          )}
          <div className="text-center">
            <div className="text-lg font-semibold text-[#11221b]">{username || 'JerSuit'}</div>
            <div className="mt-1 flex items-center justify-center gap-1 text-xs text-[#199155]"><span className="h-2 w-2 rounded-full bg-[#29a65f]" /> Bot</div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function PresenceTab({ config, onRefresh }: { config: any; onRefresh: () => void }) {
  const [status, setStatus] = useState(config?.status || 'online');
  const [activityType, setActivityType] = useState(config?.activity_type || 'playing');
  const [activityName, setActivityName] = useState(config?.activity_name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/bot-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, activity_type: activityType, activity_name: activityName }),
      });
      const data = await res.json();
      if (res.ok) { setMessage('Presence saved. The bot applies changes on next heartbeat.'); onRefresh(); }
      else setMessage(data.error || 'Failed to save.');
    } catch { setMessage('Network error.'); }
    finally { setSaving(false); }
  };

  const statusColor = status === 'online' ? 'bg-[#29a65f]' : status === 'idle' ? 'bg-[#f5a623]' : status === 'dnd' ? 'bg-[#e23d3d]' : 'bg-[#8b9a91]';

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Presence settings" desc="Control how the bot appears to Discord users.">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]">
              <option value="online">Online</option>
              <option value="idle">Idle</option>
              <option value="dnd">Do Not Disturb</option>
              <option value="invisible">Invisible</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Activity type</label>
            <select value={activityType} onChange={e => setActivityType(e.target.value)} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]">
              <option value="playing">Playing</option>
              <option value="watching">Watching</option>
              <option value="listening">Listening</option>
              <option value="streaming">Streaming</option>
              <option value="competing">Competing</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Activity name</label>
            <input type="text" value={activityName} onChange={e => setActivityName(e.target.value)} maxLength={128} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" placeholder="e.g. /help | JerSuit" />
          </div>
          <button onClick={save} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#199155] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(25,145,85,0.18)] transition hover:bg-[#147f49] disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save presence'}
          </button>
          {message && <p className="text-sm text-[#16814b]">{message}</p>}
        </div>
      </Section>

      <Section title="Live preview" desc="How the bot's status appears on Discord.">
        <div className="flex items-center gap-4 rounded-xl border border-[#edf2ee] bg-[#fbfdfb] p-6">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf7ed] text-[#199155]"><Bot size={28} /></div>
            <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${statusColor}`} />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#11221b]">{config?.bot_username || 'JerSuit'}</div>
            <div className="mt-1 text-xs text-[#708278]">
              {activityType === 'playing' && 'Playing'}
              {activityType === 'watching' && 'Watching'}
              {activityType === 'listening' && 'Listening to'}
              {activityType === 'streaming' && 'Streaming'}
              {activityType === 'competing' && 'Competing in'}
              {' '}{activityName || '...'}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function CredentialsTab({ config, onRefresh }: { config: any; onRefresh: () => void }) {
  const [tokenInput, setTokenInput] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<string | null>(null);

  const tokenConfigured = config?.token_configured as boolean;

  const replaceToken = async () => {
    if (!tokenInput.trim()) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/bot-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord_bot_token: tokenInput }),
      });
      const data = await res.json();
      if (res.ok) { setMessage('Bot token updated. Restart the bot to apply.'); setTokenInput(''); setShowReplace(false); onRefresh(); }
      else setMessage(data.error || 'Failed to update token.');
    } catch { setMessage('Network error.'); }
    finally { setActionLoading(false); }
  };

  const validateToken = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch('/api/admin/bot-config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'validate_token' }) });
      const data = await res.json();
      if (res.ok && data.valid) setValidationResult('Token is valid. Bot can connect to Discord.');
      else setValidationResult(data.error || 'Token is invalid or expired.');
    } catch { setValidationResult('Failed to validate token.'); }
    finally { setValidating(false); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Section title="Token status" desc="The bot token is never displayed. Only its configuration status is shown.">
        <div className="flex items-center justify-between rounded-xl border border-[#edf2ee] bg-[#fbfdfb] p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tokenConfigured ? 'bg-[#eaf7ed] text-[#199155]' : 'bg-[#fff6df] text-[#b98921]'}`}>
              {tokenConfigured ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            </div>
            <div>
              <div className="text-sm font-semibold text-[#11221b]">{tokenConfigured ? 'Configured' : 'Not configured'}</div>
              <div className="text-xs text-[#8b9a91]">Stored as environment variable, never exposed to browser</div>
            </div>
          </div>
          {tokenConfigured && (
            <button onClick={validateToken} disabled={validating} className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#dfe8e1] bg-white px-3 text-xs font-semibold text-[#50665a] hover:border-[#a7cdb1] disabled:opacity-50">
              <RefreshCw size={14} className={validating ? 'animate-spin' : ''} /> Validate
            </button>
          )}
        </div>
        {validationResult && (
          <div className={`mt-3 rounded-xl p-3 text-sm ${validationResult.includes('valid') ? 'bg-[#eaf7ed] text-[#16814b]' : 'bg-[#fee] text-[#c44]'}`}>{validationResult}</div>
        )}
      </Section>

      <Section title="Replace token" desc="Enter a new bot token to replace the current one. The old token is immediately invalidated.">
        {!showReplace ? (
          <button onClick={() => setShowReplace(true)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#dfe8e1] bg-white px-5 text-sm font-semibold text-[#50665a] hover:border-[#a7cdb1] hover:text-[#199155]">
            <KeyRound size={16} /> Replace token
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">New bot token</label>
              <input type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" placeholder="Enter new bot token" />
            </div>
            <div className="flex gap-3">
              <button onClick={replaceToken} disabled={actionLoading || !tokenInput.trim()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#199155] px-5 text-sm font-semibold text-white disabled:opacity-50">
                <Lock size={16} /> {actionLoading ? 'Updating...' : 'Confirm replace'}
              </button>
              <button onClick={() => { setShowReplace(false); setTokenInput(''); }} className="inline-flex h-11 items-center rounded-xl border border-[#dfe8e1] bg-white px-5 text-sm font-semibold text-[#50665a] hover:border-[#a7cdb1]">Cancel</button>
            </div>
          </div>
        )}
        {message && <p className="mt-3 text-sm text-[#16814b]">{message}</p>}
      </Section>

      <div className="rounded-2xl border border-[#cce4d1] bg-[#eaf7ed] p-5">
        <div className="flex gap-3">
          <Shield className="shrink-0 text-[#199155]" size={20} />
          <div>
            <h4 className="text-sm font-semibold text-[#18452b]">Token security</h4>
            <p className="mt-1 text-xs leading-5 text-[#5f7c68]">The bot token is stored as an environment variable (DISCORD_BOT_TOKEN). It is never sent to the browser, stored as plain text in the database, or written to logs. Replacing the token immediately invalidates the old one.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuntimeTab({ status, onRefresh }: { status: any; onRefresh: () => void }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sendCommand = async (command: 'start' | 'stop' | 'restart') => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/runtime', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command }) });
      const data = await res.json();
      if (res.ok) { setMessage(`Command "${command}" sent.`); setTimeout(onRefresh, 2000); }
      else setMessage(data.error || 'Failed.');
    } catch { setMessage('Network error.'); }
    finally { setActionLoading(false); }
  };

  const state = status?.state || 'offline';
  const tokenConfigured = status?.token_configured as boolean;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={Server} label="Process state" value={state} healthy={state === 'online'} />
        <MetricCard icon={Clock} label="Uptime" value={formatUptime(status?.uptime_seconds || 0)} healthy={(status?.uptime_seconds || 0) > 0} />
        <MetricCard icon={Wifi} label="Gateway latency" value={status?.gateway_latency_ms != null ? `${status.gateway_latency_ms}ms` : '—'} healthy={status?.gateway_latency_ms != null && status.gateway_latency_ms < 500} />
      </div>

      <Section title="Process controls" desc="Start, stop, or restart the bot process.">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => sendCommand('start')} disabled={actionLoading || state === 'online' || !tokenConfigured} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#199155] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Play size={17} /> Start</button>
          <button onClick={() => sendCommand('stop')} disabled={actionLoading || state !== 'online'} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#e23d3d] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Square size={17} /> Stop</button>
          <button onClick={() => sendCommand('restart')} disabled={actionLoading || !tokenConfigured} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#dfe8e1] bg-white px-5 text-sm font-semibold text-[#50665a] disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={17} /> Restart</button>
        </div>
        {message && <p className="mt-3 text-sm text-[#16814b]">{message}</p>}
      </Section>
    </div>
  );
}

function StatisticsTab({ status }: { status: any }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard icon={Server} label="Connected servers" value={String(status?.connected_guilds || 0)} healthy={true} />
      <MetricCard icon={Activity} label="Total users" value={String(status?.total_users || 0)} healthy={true} />
      <MetricCard icon={Cpu} label="CPU usage" value={`${(status?.cpu_percent || 0).toFixed(1)}%`} healthy={(status?.cpu_percent || 0) < 80} />
      <MetricCard icon={MemoryStick} label="Memory" value={`${(status?.memory_mb || 0).toFixed(0)}MB`} healthy={(status?.memory_mb || 0) < 512} />
      <MetricCard icon={Clock} label="Uptime" value={formatUptime(status?.uptime_seconds || 0)} healthy={(status?.uptime_seconds || 0) > 0} />
      <MetricCard icon={Wifi} label="Gateway latency" value={status?.gateway_latency_ms != null ? `${status.gateway_latency_ms}ms` : '—'} healthy={status?.gateway_latency_ms != null && status.gateway_latency_ms < 500} />
    </div>
  );
}

function LogsTab({ status }: { status: any }) {
  const lastError = status?.last_error as string | null;
  const lastStarted = status?.last_started_at as string | null;
  const lastStopped = status?.last_stopped_at as string | null;
  const lastCrash = status?.last_crash_at as string | null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Process events" desc="Recent bot lifecycle events.">
        <div className="space-y-3 text-sm">
          <EventRow label="Last started" value={lastStarted} />
          <EventRow label="Last stopped" value={lastStopped} />
          <EventRow label="Last crash" value={lastCrash} />
        </div>
      </Section>
      <Section title="Last error" desc="The most recent error from the bot process.">
        {lastError ? (
          <pre className="overflow-x-auto rounded-xl bg-[#f7faf7] p-4 text-xs text-[#c44] whitespace-pre-wrap">{lastError}</pre>
        ) : (
          <p className="text-sm text-[#8b9a91]">No errors recorded.</p>
        )}
      </Section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, healthy }: { icon: typeof Bot; label: string; value: string; healthy: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#dfe8e1] bg-white p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${healthy ? 'bg-[#eaf7ed] text-[#199155]' : 'bg-[#f0f4f1] text-[#7d9085]'}`}><Icon size={22} /></div>
      <div>
        <div className="text-2xl font-semibold tracking-[-0.03em] text-[#11221a]">{value}</div>
        <div className="text-xs text-[#8b9a91]">{label}</div>
      </div>
    </div>
  );
}

function EventRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-[#edf2ee] pb-2">
      <span className="text-[#708278]">{label}</span>
      <span className="font-medium text-[#11221a]">{value ? new Date(value).toLocaleString() : '—'}</span>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
