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
import { ThemeToggle } from '@/components/theme-toggle';

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-border bg-card/50 transition-transform duration-300 lg:static lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarOpen ? '' : 'lg:w-[72px]'}`}
        >
          <div className={`flex h-16 items-center border-b border-border px-4 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            <Link href="/admin" className="flex items-center gap-2.5">
              <img src="/سس.jpg" alt="JerSuit" className="h-8 w-8 rounded-lg object-cover" />
              {sidebarOpen && <span className="text-base font-semibold tracking-tight">Jer<span className="text-primary">Suit</span></span>}
            </Link>
            {sidebarOpen && <button className="hidden rounded-lg p-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground lg:block" onClick={() => setSidebarOpen(false)} aria-label="Collapse sidebar"><PanelLeftClose size={16} /></button>}
          </div>

          {sidebarOpen ? (
            <div className="border-b border-border px-3 py-4">
              <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Platform control</div>
              <nav className="space-y-1">
                {primaryNav.map((item) => <SidebarLink key={item.label} item={item} active={isActive(item.href)} />)}
              </nav>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 border-b border-border py-4">
              {primaryNav.map((item) => <IconLink key={item.label} item={item} active={isActive(item.href)} />)}
            </div>
          )}

          {sidebarOpen ? (
            <div className="flex-1 px-3 py-4">
              <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Workspace</div>
              <nav className="space-y-1">
                {workspaceNav.map((item) => <SidebarLink key={item.label} item={item} active={isActive(item.href)} />)}
              </nav>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center gap-2 py-4">
              {workspaceNav.map((item) => <IconLink key={item.label} item={item} active={isActive(item.href)} />)}
            </div>
          )}

          {sidebarOpen && (
            <div className="px-3 pb-3">
              <Link href="/servers" className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/15">
                <Server size={14} /> Server Dashboard
              </Link>
            </div>
          )}

          <div className={`border-t border-border p-3 ${sidebarOpen ? '' : 'flex justify-center'}`}>
            {sidebarOpen ? (
              <div className="flex items-center gap-3 rounded-lg p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">JS</div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">Platform owner</div><div className="text-xs text-muted-foreground">Owner access</div></div>
                <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/admin/login'; }} className="text-muted-foreground hover:text-destructive" aria-label="Logout"><LogOut size={16} /></button>
              </div>
            ) : (
              <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/admin/login'; }} className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-destructive hover:text-destructive-foreground"><LogOut size={16} /></button>
            )}
          </div>
        </aside>

        {mobileNavOpen && <button onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-black/30 lg:hidden" aria-label="Close navigation" />}

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileNavOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent/50 lg:hidden" aria-label="Open navigation"><Menu size={18} /></button>
              {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="hidden rounded-lg p-2 text-muted-foreground hover:bg-accent/50 lg:block" aria-label="Expand sidebar"><PanelLeftOpen size={18} /></button>}
              <div><div className="text-xs text-muted-foreground">JerSuit Control Center</div><h1 className="text-lg font-semibold tracking-tight">{pageTitle(pathname)}</h1></div>
            </div>
            <ThemeToggle />
          </header>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </section>
      </div>
    </div>
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
    <Link href={item.href} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}>
      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
      <span>{item.label}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
    </Link>
  );
}

function IconLink({ item, active }: { item: { label: string; icon: typeof LayoutDashboard; href: string }; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`} aria-label={item.label} title={item.label}>
      <Icon size={17} />
    </Link>
  );
}
