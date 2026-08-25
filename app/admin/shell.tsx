'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Gauge, Bot, Globe2, Users,
  MessageSquare, Palette, ShieldCheck, Shield,
  Activity, Database, Boxes, Menu, PanelLeftClose,
  PanelLeftOpen, LogOut, Server, Settings, TerminalSquare,
  Command, Sparkles, RadioTower, Wrench, FileText, KeyRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
      { label: 'System Health', icon: RadioTower, href: '/admin/system-health' },
      { label: 'Activity', icon: Activity, href: '/admin/analytics' },
      { label: 'Logs', icon: Boxes, href: '/admin/logs' },
    ],
  },
  {
    label: 'Bot',
    items: [
      { label: 'Runtime', icon: Gauge, href: '/admin/runtime' },
      { label: 'Presence', icon: Sparkles, href: '/admin/presence' },
      { label: 'Commands', icon: Command, href: '/admin/commands' },
      { label: 'Bot Config', icon: Bot, href: '/admin/bot' },
    ],
  },
  {
    label: 'Discord',
    items: [
      { label: 'Servers', icon: Globe2, href: '/admin/servers' },
      { label: 'Server Owners', icon: Users, href: '/admin/server-owners' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Custom Commands', icon: Wrench, href: '/admin/custom-commands' },
      { label: 'Embed Builder', icon: FileText, href: '/admin/embeds' },
      { label: 'Communication', icon: MessageSquare, href: '/admin/communication' },
      { label: 'Appearance', icon: Palette, href: '/admin/appearance' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Database', icon: Database, href: '/admin/database' },
      { label: 'Security', icon: ShieldCheck, href: '/admin/security' },
      { label: 'Configuration', icon: Settings, href: '/admin/configuration' },
      { label: 'Settings', icon: TerminalSquare, href: '/admin/settings' },
    ],
  },
  {
    label: 'Owner',
    items: [
      { label: 'Admin Users', icon: KeyRound, href: '/admin/admin-users' },
      { label: 'Audit Logs', icon: Shield, href: '/admin/audit-logs' },
      { label: 'Servers Mgmt', icon: Server, href: '/admin/servers' },
    ],
  },
];

const flatNav = navGroups.flatMap((g) => g.items);

function pageTitle(pathname: string): string {
  const found = flatNav.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'));
  return found?.label || 'Control Center';
}

export function AdminShell({ children, sessionUsername }: { children: React.ReactNode; sessionUsername: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-border bg-card/50 transition-transform duration-300 lg:static lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarOpen ? '' : 'lg:w-[72px]'}`}
        >
          <div className={`flex h-16 items-center border-b border-border px-4 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            <Link href="/admin" className="flex items-center gap-2.5">
              <img src="/سس.png" alt="JerSuit" className="h-8 w-8 rounded-lg object-cover" />
              {sidebarOpen && <span className="text-base font-semibold tracking-tight">Jer<span className="text-primary">Suit</span></span>}
            </Link>
            {sidebarOpen && <button className="hidden rounded-lg p-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground lg:block" onClick={() => setSidebarOpen(false)} aria-label="Collapse sidebar"><PanelLeftClose size={16} /></button>}
          </div>

          <div className="flex-1 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.label} className="border-b border-border px-3 py-3">
                {sidebarOpen ? (
                  <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</div>
                ) : null}
                <nav className="space-y-1">
                  {group.items.map((item) =>
                    sidebarOpen ? (
                      <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
                    ) : (
                      <IconLink key={item.href} item={item} active={isActive(item.href)} />
                    ),
                  )}
                </nav>
              </div>
            ))}
          </div>

          <div className={`border-t border-border p-3 ${sidebarOpen ? '' : 'flex justify-center'}`}>
            {sidebarOpen ? (
              <div className="flex items-center gap-3 rounded-lg p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">JS</div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{sessionUsername}</div><div className="text-xs text-muted-foreground">Owner access</div></div>
                <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive" aria-label="Logout"><LogOut size={16} /></button>
              </div>
            ) : (
              <button onClick={handleLogout} className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary hover:bg-destructive hover:text-destructive-foreground" aria-label="Logout"><LogOut size={16} /></button>
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
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}>
      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
      <span>{item.label}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
    </Link>
  );
}

function IconLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`} aria-label={item.label} title={item.label}>
      <Icon size={17} />
    </Link>
  );
}
