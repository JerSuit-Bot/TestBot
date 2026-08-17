'use client';

import { Database, Table, Lock, KeyRound } from 'lucide-react';

const tables = [
  { name: 'users', desc: 'Discord user accounts synced via OAuth2' },
  { name: 'sessions', desc: 'Secure server-side user session tokens' },
  { name: 'admin_sessions', desc: 'Platform Owner session store (separate)' },
  { name: 'guilds', desc: 'Discord servers known to the platform' },
  { name: 'guild_memberships', desc: 'User ↔ guild relationships with roles' },
  { name: 'guild_settings', desc: 'Per-server independent configuration' },
  { name: 'moderation_cases', desc: 'Moderation action history per guild' },
  { name: 'tickets', desc: 'Support ticket records per guild' },
  { name: 'automations', desc: 'Trigger → Action rules per guild' },
  { name: 'message_templates', desc: 'Reusable embed templates' },
  { name: 'scheduled_messages', desc: 'Queued messages with delivery status' },
  { name: 'message_history', desc: 'Log of all bot-sent messages' },
  { name: 'audit_logs', desc: 'Sensitive action audit trail' },
  { name: 'appearance_settings', desc: 'Platform branding configuration' },
  { name: 'bot_configuration', desc: 'Bot presence/activity config' },
  { name: 'bot_status', desc: 'Live bot runtime health' },
  { name: 'bot_commands', desc: 'Dashboard → bot process command queue' },
  { name: 'platform_settings', desc: 'Key-value platform configuration' },
];

export default function DatabasePage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">Database</h2>
        <p className="mt-2 text-sm text-[#708278]">PostgreSQL schema on Supabase. All tables have RLS enabled with no direct anon access.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Database size={20} /></div>
          <div className="mt-4 text-2xl font-semibold text-[#11221a]">{tables.length}</div>
          <div className="text-xs text-[#8b9a91]">Tables</div>
        </div>
        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><Lock size={20} /></div>
          <div className="mt-4 text-2xl font-semibold text-[#11221a]">RLS</div>
          <div className="text-xs text-[#8b9a91]">Enabled on all tables</div>
        </div>
        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><KeyRound size={20} /></div>
          <div className="mt-4 text-2xl font-semibold text-[#11221a]">SECURITY DEFINER</div>
          <div className="text-xs text-[#8b9a91]">All data access functions</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white">
        <table className="w-full">
          <thead className="border-b border-[#edf2ee] bg-[#fbfdfb]">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8b9a91]">Table</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8b9a91]">Description</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8b9a91]">RLS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf2ee]">
            {tables.map((t) => (
              <tr key={t.name} className="hover:bg-[#fbfdfb]">
                <td className="px-5 py-3 text-sm font-medium text-[#11221b]"><code className="rounded bg-[#f0f6f1] px-2 py-0.5 text-xs">{t.name}</code></td>
                <td className="px-5 py-3 text-xs text-[#708278]">{t.desc}</td>
                <td className="px-5 py-3"><span className="rounded-full bg-[#e0f5e5] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#16814b]">Enabled</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
