'use client';

import { useEffect, useState } from 'react';
import { Shield, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/audit-logs');
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading audit logs...</div>;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">Audit logs</h2>
        <p className="mt-2 text-sm text-[#708278]">Every sensitive platform action, recorded with actor, target, and result.</p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cddbd0] bg-[#fbfdfb] p-12 text-center">
          <Shield size={40} className="mx-auto text-[#c5d7c9]" />
          <p className="mt-4 text-sm text-[#8b9a91]">No audit entries yet. Actions will be recorded here as they occur.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white shadow-[0_10px_30px_rgba(24,58,38,0.035)]">
          <table className="w-full">
            <thead className="border-b border-[#edf2ee] bg-[#fbfdfb]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8b9a91]">Actor</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8b9a91]">Action</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8b9a91]">Target</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8b9a91]">Result</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8b9a91]">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee]">
              {logs.map((log) => (
                <tr key={log.id} className="transition hover:bg-[#fbfdfb]">
                  <td className="px-5 py-3 text-sm font-medium text-[#11271a]">{log.actor_name || 'System'}</td>
                  <td className="px-5 py-3 text-sm text-[#50665a]">{log.action}</td>
                  <td className="px-5 py-3 text-xs text-[#8b9a91]">{log.target || '—'}</td>
                  <td className="px-5 py-3">
                    {log.result === 'success' ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#16814b]"><CheckCircle size={14} /> Success</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#c44]"><XCircle size={14} /> {log.result}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-[#8b9a91]">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
