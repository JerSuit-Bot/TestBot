'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Shield, Ban, UserMinus, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { PageHeader } from '../_shared';

interface ModCase {
  id: string;
  case_number: number;
  type: string;
  target_id: string;
  target_name: string;
  moderator_name: string;
  reason: string | null;
  duration: string | null;
  created_at: string;
  active: boolean;
}

export default function ModerationPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [cases, setCases] = useState<ModCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/moderation`);
      const data = await res.json();
      if (res.ok) setCases(data.cases || []);
      else setError(data.error || 'Failed to load');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  const typeIcon = (type: string) => {
    switch (type) {
      case 'ban': return Ban;
      case 'kick': return UserMinus;
      case 'timeout': return Clock;
      case 'warn': return AlertTriangle;
      default: return Shield;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'ban': return 'bg-[#fee] text-[#c44]';
      case 'kick': return 'bg-[#fff4e6] text-[#d97706]';
      case 'timeout': return 'bg-[#fff6df] text-[#b98921]';
      case 'warn': return 'bg-[#fff6df] text-[#b98921]';
      default: return 'bg-[#eaf7ed] text-[#199155]';
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading...</div>;

  return (
    <>
      <PageHeader title="Moderation" desc="View moderation cases for this server. Cases are created by the bot when moderators use commands." />
      {error && <div className="mb-6 rounded-2xl border border-[#fcc] bg-[#fee] p-4 text-sm text-[#c44]">{error}</div>}

      {cases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cddbd0] bg-[#fbfdfb] p-12 text-center">
          <Shield size={40} className="mx-auto text-[#c5d7c9]" />
          <p className="mt-4 text-sm text-[#8b9a91]">No moderation cases recorded for this server yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-[#edf2ee] bg-[#fbfdfb]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Case</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Target</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Moderator</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Reason</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee]">
              {cases.map((c) => {
                const Icon = typeIcon(c.type);
                return (
                  <tr key={c.id} className="hover:bg-[#fbfdfb]">
                    <td className="px-5 py-3 font-medium text-[#11221b]">#{c.case_number}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${typeColor(c.type)}`}>
                        <Icon size={12} /> {c.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#50665a]">{c.target_name || c.target_id}</td>
                    <td className="px-5 py-3 text-[#50665a]">{c.moderator_name || '—'}</td>
                    <td className="px-5 py-3 text-[#708278] max-w-[200px] truncate">{c.reason || '—'}</td>
                    <td className="px-5 py-3 text-[#8b9a91]">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      {c.active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#c44]"><XCircle size={12} /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-[#199155]"><CheckCircle size={12} /> Resolved</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
