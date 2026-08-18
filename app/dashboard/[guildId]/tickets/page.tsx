'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Ticket, CheckCircle, Clock, XCircle } from 'lucide-react';
import { PageHeader } from '../_shared';

interface TicketData {
  id: string;
  ticket_number: number;
  subject: string;
  created_by_name: string;
  status: string;
  priority: string;
  created_at: string;
  closed_at: string | null;
}

export default function TicketsPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/tickets`);
      const data = await res.json();
      if (res.ok) setTickets(data.tickets || []);
      else setError(data.error || 'Failed to load');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock size={14} className="text-[#b98921]" />;
      case 'closed': return <CheckCircle size={14} className="text-[#199155]" />;
      default: return <XCircle size={14} className="text-[#8b9a91]" />;
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading...</div>;

  return (
    <>
      <PageHeader title="Tickets" desc="Support tickets created in this server. The bot creates tickets when users use the ticket command." />
      {error && <div className="mb-6 rounded-2xl border border-[#fcc] bg-[#fee] p-4 text-sm text-[#c44]">{error}</div>}

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cddbd0] bg-[#fbfdfb] p-12 text-center">
          <Ticket size={40} className="mx-auto text-[#c5d7c9]" />
          <p className="mt-4 text-sm text-[#8b9a91]">No support tickets have been created in this server yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-[#edf2ee] bg-[#fbfdfb]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Ticket</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Subject</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Created by</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Priority</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#708278]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee]">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-[#fbfdfb]">
                  <td className="px-5 py-3 font-medium text-[#11221b]">#{t.ticket_number}</td>
                  <td className="px-5 py-3 text-[#50665a]">{t.subject || '—'}</td>
                  <td className="px-5 py-3 text-[#50665a]">{t.created_by_name || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.priority === 'high' ? 'bg-[#fee] text-[#c44]' : t.priority === 'medium' ? 'bg-[#fff6df] text-[#b98921]' : 'bg-[#eaf7ed] text-[#199155]'}`}>{t.priority || 'low'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#50665a]">{statusIcon(t.status)} {t.status}</span>
                  </td>
                  <td className="px-5 py-3 text-[#8b9a91]">{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
