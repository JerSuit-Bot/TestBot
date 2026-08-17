'use client';

import { useEffect, useState } from 'react';
import { Users, MoreHorizontal } from 'lucide-react';
import { discordAvatarUrl } from '@/lib/constants';

export default function ServerOwnersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading server owners...</div>;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">Server owners</h2>
        <p className="mt-2 text-sm text-[#708278]">Every Discord user who has authenticated with JerSuit and can manage at least one server.</p>
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cddbd0] bg-[#fbfdfb] p-12 text-center">
          <Users size={40} className="mx-auto text-[#c5d7c9]" />
          <p className="mt-4 text-sm text-[#8b9a91]">No server owners have authenticated yet. They appear here after logging in with Discord.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white shadow-[0_10px_30px_rgba(24,58,38,0.035)]">
          <table className="w-full">
            <thead className="border-b border-[#edf2ee] bg-[#fbfdfb]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8b9a91]">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8b9a91]">Discord ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8b9a91]">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#8b9a91]">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf2ee]">
              {users.map((u) => (
                <tr key={u.id} className="transition hover:bg-[#fbfdfb]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img src={discordAvatarUrl(u.discord_id, u.avatar, 64)} alt={u.username} className="h-8 w-8 rounded-full" />
                      <span className="text-sm font-medium text-[#11271a]">{u.display_name || u.username}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-[#8b9a91]">{u.discord_id}</td>
                  <td className="px-5 py-3">
                    {u.is_platform_owner ? (
                      <span className="rounded-full bg-[#e0f5e5] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#16814b]">Owner</span>
                    ) : (
                      <span className="rounded-full bg-[#f1f4f2] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#89988f]">User</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-[#8b9a91]">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
