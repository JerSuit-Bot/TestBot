'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Cog, Plus, Trash2, Zap } from 'lucide-react';
import { PageHeader } from '../_shared';

interface Automation {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  created_at: string;
}

export default function AutomationsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('member_join');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/automations`);
      const data = await res.json();
      if (res.ok) setAutomations(data.automations || []);
      else setError(data.error || 'Failed to load');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/automations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, trigger, conditions: [], actions: [] }),
      });
      const data = await res.json();
      if (res.ok) { setShowForm(false); setName(''); setTrigger('member_join'); load(); }
      else setError(data.error || 'Failed to create');
    } catch { setError('Network error.'); }
    finally { setCreating(false); }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/automations/${id}`, { method: 'DELETE' });
      if (res.ok) load();
    } catch {}
  };

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading...</div>;

  return (
    <>
      <PageHeader title="Automations" desc="Create trigger-based automated actions that fire on events in this server." />
      {error && <div className="mb-6 rounded-2xl border border-[#fcc] bg-[#fee] p-4 text-sm text-[#c44]">{error}</div>}

      <div className="mb-6">
        <button onClick={() => setShowForm(!showForm)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#199155] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(25,145,85,0.18)] transition hover:bg-[#147f49]">
          <Plus size={16} /> New automation
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-[#dfe8e1] bg-white p-6">
          <h3 className="text-sm font-semibold text-[#11221b]">Create automation</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Welcome new members" className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Trigger</label>
              <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]">
                <option value="member_join">Member joins</option>
                <option value="member_leave">Member leaves</option>
                <option value="message_contains">Message contains keyword</option>
                <option value="ticket_created">Ticket created</option>
                <option value="role_added">Role added</option>
                <option value="role_removed">Role removed</option>
              </select>
            </div>
            <button onClick={create} disabled={creating || !name.trim()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#199155] px-5 text-sm font-semibold text-white disabled:opacity-50">
              <Zap size={16} /> {creating ? 'Creating...' : 'Create automation'}
            </button>
          </div>
        </div>
      )}

      {automations.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-[#cddbd0] bg-[#fbfdfb] p-12 text-center">
          <Cog size={40} className="mx-auto text-[#c5d7c9]" />
          <p className="mt-4 text-sm text-[#8b9a91]">No automations configured yet. Create one to automate actions when events happen.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-2xl border border-[#dfe8e1] bg-white p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Zap size={18} /></div>
                <div>
                  <div className="text-sm font-semibold text-[#11221b]">{a.name}</div>
                  <div className="mt-0.5 text-xs text-[#8b9a91]">Trigger: {a.trigger.replace(/_/g, ' ')}</div>
                </div>
              </div>
              <button onClick={() => remove(a.id)} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#708278] hover:bg-[#fee] hover:text-[#c44]"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
