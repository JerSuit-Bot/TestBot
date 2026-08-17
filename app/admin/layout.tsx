'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Gauge, Bot, Globe2, Users,
  MessageSquare, Palette, ShieldCheck, Shield,
  Activity, Database, Boxes, Menu, PanelLeftClose,
  PanelLeftOpen, LogOut, Server, Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const primaryNav = [
  { label: 'Overview', icon: LayoutDashboard, href: '/admin' },
  { label: 'Bot', icon: Bot, href: '/admin/bot' },
  { label: 'Runtime', icon: Gauge, href: '/admin/runtime' },
  { label: 'Servers', icon: Globe2, href: '/admin/servers' },
  { label: 'Server Owners', icon: Users, href: '/admin/server-owners' },
];

const workspaceNav = [
  { label: 'Communication', icon: MessageSquare, href: '/admin/communication' },
  { label: 'Appearance', icon: Palette, href: '/admin/appearance' },
  { label: 'Security', icon: ShieldCheck, href: '/admin/security' },
  { label: 'Audit logs', icon: Shield, href: '/admin/audit-logs' },
  { label: 'System health', icon: Activity, href: '/admin/system-health' },
  { label: 'Database', icon: Database, href: '/admin/database' },
  { label: 'Logs', icon: Boxes, href: '/admin/logs' },
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <main className="min-h-screen bg-[#f4f7f5] text-[#13221b]">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-[#dfe8e1] bg-[#fbfdfb] transition-transform duration-300 lg:static lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarOpen ? '' : 'lg:w-[88px]'}`}
        >
          <div className={`flex h-[88px] items-center border-b border-[#e6eee8] px-6 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            <Link href="/admin" className="flex items-center gap-3 text-left">
              <img src="/سس.jpg" alt="JerSuit" className="h-10 w-10 rounded-[13px] object-cover shadow-[0_6px_16px_rgba(25,145,85,0.22)]" />
              {sidebarOpen && <span className="text-[17px] font-semibold tracking-[-0.03em]">Jer<span className="text-[#199155]">Suit</span></span>}
            </Link>
            {sidebarOpen && <button className="hidden rounded-lg p-2 text-[#789087] hover:bg-[#edf5ef] hover:text-[#199155] lg:block" onClick={() => setSidebarOpen(false)} aria-label="Collapse sidebar"><PanelLeftClose size={17} /></button>}
          </div>

          {sidebarOpen ? (
            <div className="border-b border-[#e6eee8] px-4 py-5">
              <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#91a198]">Platform control</div>
              <nav className="space-y-1">
                {primaryNav.map((item) => <SidebarLink key={item.label} item={item} active={isActive(item.href)} />)}
              </nav>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 border-b border-[#e6eee8] py-5">
              {primaryNav.map((item) => <IconLink key={item.label} item={item} active={isActive(item.href)} />)}
            </div>
          )}

          {sidebarOpen ? (
            <div className="flex-1 px-4 py-5">
              <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#91a198]">Workspace</div>
              <nav className="space-y-1">
                {workspaceNav.map((item) => <SidebarLink key={item.label} item={item} active={isActive(item.href)} />)}
              </nav>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center gap-3 py-5">
              {workspaceNav.map((item) => <IconLink key={item.label} item={item} active={isActive(item.href)} />)}
            </div>
          )}

          {sidebarOpen && (
            <div className="px-4 pb-3">
              <Link href="/dashboard" className="flex items-center gap-2 rounded-xl bg-[#eaf6ed] px-3 py-2.5 text-xs font-semibold text-[#16814b] hover:bg-[#d8f0df]">
                <Server size={15} /> Server Owner Dashboard
              </Link>
            </div>
          )}

          <div className={`border-t border-[#e6eee8] p-4 ${sidebarOpen ? '' : 'flex justify-center'}`}>
            {sidebarOpen ? (
              <div className="flex items-center gap-3 rounded-xl p-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dcefe1] text-sm font-semibold text-[#187d49]">JS</div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">Platform owner</div><div className="text-xs text-[#83948a]">Owner access</div></div>
                <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/admin/login'; }} className="text-[#8fa098] hover:text-[#c44]" aria-label="Logout"><LogOut size={16} /></button>
              </div>
            ) : (
              <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/admin/login'; }} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dcefe1] text-sm font-semibold text-[#187d49] hover:bg-[#c44] hover:text-white"><LogOut size={16} /></button>
            )}
          </div>
        </aside>

        {mobileNavOpen && <button onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-[#0e2819]/25 lg:hidden" aria-label="Close navigation" />}

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[88px] items-center justify-between border-b border-[#dfe8e1]/90 bg-[#f9fcfa]/90 px-5 backdrop-blur-xl sm:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileNavOpen(true)} className="rounded-xl p-2 text-[#597065] hover:bg-[#e8f3eb] lg:hidden" aria-label="Open navigation"><Menu size={20} /></button>
              {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="hidden rounded-xl p-2 text-[#597065] hover:bg-[#e8f3eb] lg:block" aria-label="Expand sidebar"><PanelLeftOpen size={19} /></button>}
              <div><div className="text-xs font-medium text-[#8a9a90]">JerSuit Owner Control Center</div><h1 className="mt-1 text-xl font-semibold tracking-[-0.035em]">{pageTitle(pathname)}</h1></div>
            </div>
          </header>
          <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function pageTitle(pathname: string): string {
  const all = [...primaryNav, ...workspaceNav];
  const found = all.find(n => pathname === n.href);
  return found?.label || 'Control Center';
}

function SidebarLink({ item, active }: { item: { label: string; icon: typeof LayoutDashboard; href: string }; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${active ? 'bg-[#e7f5ea] text-[#16814b]' : 'text-[#718178] hover:bg-[#f0f6f1] hover:text-[#315b43]'}`}>
      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
      <span>{item.label}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#29a65f]" />}
    </Link>
  );
}

function IconLink({ item, active }: { item: { label: string; icon: typeof LayoutDashboard; href: string }; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${active ? 'bg-[#e7f5ea] text-[#16814b]' : 'text-[#718178] hover:bg-[#f0f6f1] hover:text-[#315b43]'}`} aria-label={item.label} title={item.label}>
      <Icon size={17} />
    </Link>
  );
}
