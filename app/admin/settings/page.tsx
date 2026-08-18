'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, Globe, Bell, Shield } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setSettings(data.platform_settings || {});
        }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/stats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) setMessage('Platform settings saved.');
      else setMessage('Failed to save settings.');
    } catch { setMessage('Network error.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading settings...</div>;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">Platform settings</h2>
        <p className="mt-2 text-sm text-[#708278]">Global JerSuit platform configuration. These settings affect the entire platform, not individual servers.</p>
      </div>

      {message && <div className="mb-6 rounded-2xl border border-[#cce4d1] bg-[#eaf7ed] p-4 text-sm font-medium text-[#16814b]">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Globe size={20} /></div>
            <h3 className="text-sm font-semibold">General</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Platform name</label>
              <input type="text" value={settings.platform_name || 'JerSuit'} onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Support URL</label>
              <input type="text" value={settings.support_url || ''} onChange={(e) => setSettings({ ...settings, support_url: e.target.value })} placeholder="https://discord.gg/..." className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Default language</label>
              <select value={settings.default_language || 'en'} onChange={(e) => setSettings({ ...settings, default_language: e.target.value })} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]">
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="tr">Turkish</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Bell size={20} /></div>
            <h3 className="text-sm font-semibold">Notifications</h3>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-[#50665a]">New server owner alerts</span>
              <button type="button" onClick={() => setSettings({ ...settings, notify_new_owner: !settings.notify_new_owner })} className={`relative h-6 w-11 rounded-full transition ${settings.notify_new_owner ? 'bg-[#199155]' : 'bg-[#dfe8e1]'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${settings.notify_new_owner ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-[#50665a]">Bot crash alerts</span>
              <button type="button" onClick={() => setSettings({ ...settings, notify_crashes: !settings.notify_crashes })} className={`relative h-6 w-11 rounded-full transition ${settings.notify_crashes ? 'bg-[#199155]' : 'bg-[#dfe8e1]'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${settings.notify_crashes ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </label>
            <label className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-[#50665a]">Weekly summary reports</span>
              <button type="button" onClick={() => setSettings({ ...settings, notify_weekly: !settings.notify_weekly })} className={`relative h-6 w-11 rounded-full transition ${settings.notify_weekly ? 'bg-[#199155]' : 'bg-[#dfe8e1]'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${settings.notify_weekly ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Shield size={20} /></div>
            <h3 className="text-sm font-semibold">Security</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Session timeout (hours)</label>
              <input type="number" value={settings.session_timeout_hours || 24} onChange={(e) => setSettings({ ...settings, session_timeout_hours: parseInt(e.target.value) || 24 })} min={1} max={168} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Max login attempts</label>
              <input type="number" value={settings.max_login_attempts || 5} onChange={(e) => setSettings({ ...settings, max_login_attempts: parseInt(e.target.value) || 5 })} min={3} max={20} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button onClick={save} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#199155] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(25,145,85,0.18)] transition hover:bg-[#147f49] disabled:opacity-50">
          <Save size={16} /> {saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </>
  );
}
