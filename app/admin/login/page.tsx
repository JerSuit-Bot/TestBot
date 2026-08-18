'use client';

import { useState, useEffect } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/me').then(res => res.json()).then(data => {
      if (data.authenticated) router.push('/admin');
    }).catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/admin');
      } else {
        setError(data.error || 'Login failed.');
        if (res.status === 503) setConfigError(data.error);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f5] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/سس.jpg" alt="JerSuit" className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-[0_8px_24px_rgba(25,145,85,0.22)]" />
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">Jer<span className="text-[#199155]">Suit</span> Control Center</h1>
          <p className="mt-2 text-sm text-[#708278]">Platform Owner access only.</p>
        </div>

        <div className="rounded-2xl border border-[#dfe8e1] bg-white p-8 shadow-[0_10px_40px_rgba(24,58,38,0.06)]">
          {configError && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#fff6df] bg-[#fffef5] p-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#b98921]" />
              <p className="text-xs text-[#a08a50]">{configError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none transition focus:border-[#199155] focus:ring-2 focus:ring-[#19915520]"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none transition focus:border-[#199155] focus:ring-2 focus:ring-[#19915520]"
                placeholder="Enter password"
              />
            </div>
            {error && <p className="text-sm text-[#c44]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#199155] text-sm font-semibold text-white shadow-[0_8px_18px_rgba(25,145,85,0.18)] transition hover:bg-[#147f49] disabled:opacity-50"
            >
              <Lock size={16} /> {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[#96a39b]">Authentication is enforced server-side. All access is audit-logged.</p>
      </div>
    </main>
  );
}
