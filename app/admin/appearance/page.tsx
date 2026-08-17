'use client';

import { useEffect, useState } from 'react';
import { Palette, Save, Eye } from 'lucide-react';

export default function AppearancePage() {
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/appearance');
        if (res.ok) {
          const data = await res.json();
          setSettings(data.appearance);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/appearance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Appearance settings saved.');
      } else {
        setMessage(data.error || 'Failed to save.');
      }
    } catch {
      setMessage('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: string | number) => {
    setSettings({ ...settings, [key]: value });
  };

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading appearance...</div>;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">Appearance</h2>
        <p className="mt-2 text-sm text-[#708278]">Customize the JerSuit brand colors and theme.</p>
      </div>

      {message && <div className="mb-6 rounded-2xl border border-[#cce4d1] bg-[#eaf7ed] p-4 text-sm font-medium text-[#16814b]">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Palette size={20} /></div>
            <h3 className="text-sm font-semibold">Brand settings</h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Brand name</label>
              <input type="text" value={settings?.brand_name || ''} onChange={(e) => update('brand_name', e.target.value)} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
            </div>

            <ColorField label="Primary color" value={settings?.primary_color} onChange={(v) => update('primary_color', v)} />
            <ColorField label="Secondary color" value={settings?.secondary_color} onChange={(v) => update('secondary_color', v)} />
            <ColorField label="Accent color" value={settings?.accent_color} onChange={(v) => update('accent_color', v)} />
            <ColorField label="Background color" value={settings?.background_color} onChange={(v) => update('background_color', v)} />
            <ColorField label="Surface color" value={settings?.surface_color} onChange={(v) => update('surface_color', v)} />
            <ColorField label="Text color" value={settings?.text_color} onChange={(v) => update('text_color', v)} />
            <ColorField label="Border color" value={settings?.border_color} onChange={(v) => update('border_color', v)} />

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Border radius</label>
              <input type="number" value={settings?.border_radius ?? 12} onChange={(e) => update('border_radius', parseInt(e.target.value) || 0)} min={0} max={24} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Theme mode</label>
              <select value={settings?.theme_mode || 'light'} onChange={(e) => update('theme_mode', e.target.value)} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <button onClick={handleSave} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#199155] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(25,145,85,0.18)] transition hover:bg-[#147f49] disabled:opacity-50">
              <Save size={16} /> {saving ? 'Saving...' : 'Save appearance'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Eye size={20} /></div>
            <h3 className="text-sm font-semibold">Live preview</h3>
          </div>
          <div className="rounded-2xl border border-[#dfe8e1] p-6" style={{ backgroundColor: settings?.background_color || '#f5faf5' }}>
            <div className="rounded-2xl border p-6" style={{ backgroundColor: settings?.surface_color || '#fff', borderColor: settings?.border_color || '#dfe8e1', borderRadius: `${settings?.border_radius || 12}px` }}>
              <h4 className="text-lg font-semibold" style={{ color: settings?.text_color || '#13221b' }}>{settings?.brand_name || 'JerSuit'}</h4>
              <p className="mt-2 text-sm" style={{ color: settings?.text_color || '#13221b', opacity: 0.7 }}>Preview of your brand appearance.</p>
              <button className="mt-4 inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-white" style={{ backgroundColor: settings?.primary_color || '#199155', borderRadius: `${settings?.border_radius || 12}px` }}>Primary button</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">{label}</label>
      <div className="flex items-center gap-3">
        <input type="color" value={value || '#199155'} onChange={(e) => onChange(e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-[#dfe8e1]" />
        <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className="h-11 flex-1 rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
      </div>
    </div>
  );
}
