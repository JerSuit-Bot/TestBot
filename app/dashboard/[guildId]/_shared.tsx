'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Save } from 'lucide-react';

export function useGuildSettings() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.settings && !data.settings.error) setSettings(data.settings);
      }
    } catch {} finally { setLoading(false); }
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  const save = async (partial: Record<string, unknown>) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      const data = await res.json();
      if (res.ok) setMessage('Settings saved.');
      else setMessage(data.error || 'Failed to save.');
    } catch { setMessage('Network error.'); }
    finally { setSaving(false); }
  };

  return { guildId, settings, loading, saving, message, save, setSettings };
}

export function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#dfe8e1] bg-white p-6">
      <h3 className="text-sm font-semibold text-[#11221b]">{title}</h3>
      <p className="mt-1 text-xs text-[#8b9a91]">{desc}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-[#50665a]">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-[#199155]' : 'bg-[#dfe8e1]'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder, maxLength }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">{label}</label>
      <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
    </div>
  );
}

export function TextAreaField({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">{label}</label>
      <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 py-3 text-sm outline-none focus:border-[#199155]" />
    </div>
  );
}

export function SaveButton({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return <button onClick={onSave} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#199155] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(25,145,85,0.18)] transition hover:bg-[#147f49] disabled:opacity-50"><Save size={16} /> {saving ? 'Saving...' : 'Save'}</button>;
}

export function Message({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="mb-6 rounded-2xl border border-[#cce4d1] bg-[#eaf7ed] p-4 text-sm font-medium text-[#16814b]">{message}</div>;
}

export function PageHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">{title}</h1>
      <p className="mt-2 text-sm text-[#708278]">{desc}</p>
    </div>
  );
}
