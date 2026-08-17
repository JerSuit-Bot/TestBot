'use client';

import { ShieldCheck, Lock, KeyRound, Database, Eye, FileLock2 } from 'lucide-react';

export default function SecurityPage() {
  const features = [
    { icon: Lock, title: 'Server-side session validation', desc: 'Every API request validates a secure HttpOnly cookie session token against the database before processing.' },
    { icon: KeyRound, title: 'Separate auth systems', desc: 'Platform Owner authentication uses a separate session store from Discord user sessions. The two never share tokens or permissions.' },
    { icon: ShieldCheck, title: 'Database-level authorization', desc: 'All data access goes through SECURITY DEFINER PostgreSQL functions that validate the session and check permissions internally — not in frontend code.' },
    { icon: Database, title: 'Row Level Security enabled', desc: 'Every table has RLS enabled with no direct anon access. The browser never talks to the database directly.' },
    { icon: Eye, title: 'Audit logging', desc: 'Sensitive administrative actions — login, bot control, configuration changes — are recorded with actor, target, and result.' },
    { icon: FileLock2, title: 'Secret management', desc: 'Bot tokens, OAuth secrets, and admin passwords are stored as environment variables — never in the database as plain text, never exposed to the browser.' },
    { icon: Lock, title: 'Rate limiting', desc: 'Admin login attempts are rate-limited per IP. Bot command issuance is throttled to prevent abuse.' },
    { icon: ShieldCheck, title: 'Guild isolation', desc: 'Server Owner Dashboard enforces per-guild membership and role checks. Users can only access servers where they have Manage Guild or Administrator permissions.' },
  ];

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">Security</h2>
        <p className="mt-2 text-sm text-[#708278]">JerSuit is built with defense-in-depth. Here is every security layer currently active.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-[#dfe8e1] bg-white p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf7ed] text-[#199155]"><f.icon size={20} /></div>
              <div>
                <h3 className="text-sm font-semibold text-[#11221b]">{f.title}</h3>
                <p className="mt-1 text-xs leading-5 text-[#708278]">{f.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
