'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, Server, ArrowRight, LogOut, Bot, Users, Zap, Ticket,
  Music, MessageSquare, Activity, Cog, BarChart3, Lock, Globe2,
  CheckCircle2, Sparkles, ChevronRight,
} from 'lucide-react';
import { discordAvatarUrl } from '@/lib/constants';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LandingPage() {
  const [user, setUser] = useState<{ discord_id: string; username: string; display_name: string | null; avatar: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) setUser(data.user);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    check();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Security', href: '#security' },
    { label: 'Dashboard', href: '#dashboard-preview' },
  ];

  const features = [
    { icon: Shield, title: 'Moderation', desc: 'Warn, kick, ban, timeout, and track every case with full audit history.' },
    { icon: Zap, title: 'AutoMod', desc: 'Automated message filtering, spam protection, and raid defense.' },
    { icon: Ticket, title: 'Tickets', desc: 'Complete support ticket system with categories, transcripts, and staff assignment.' },
    { icon: Music, title: 'Music', desc: 'High-quality music playback with queues, playlists, and volume control.' },
    { icon: MessageSquare, title: 'Welcome', desc: 'Greet new members with custom messages and embeds. Say goodbye on leave.' },
    { icon: Users, title: 'Roles', desc: 'Reaction roles, self-assignable roles, and automated role management.' },
    { icon: Activity, title: 'Logging', desc: 'Track member, message, voice, and role events with detailed audit logs.' },
    { icon: Cog, title: 'Automations', desc: 'Trigger-based automated actions that fire on member join, messages, and more.' },
    { icon: BarChart3, title: 'Analytics', desc: 'Server activity, growth metrics, and engagement insights over time.' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'border-b border-border bg-background/80 backdrop-blur-xl h-14'
            : 'border-b border-transparent bg-transparent h-16'
        }`}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/سس.jpg" alt="JerSuit" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-base font-semibold tracking-tight">Jer<span className="text-primary">Suit</span></span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground hover:bg-accent/50"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {loading ? null : user ? (
              <div className="flex items-center gap-2">
                <img
                  src={discordAvatarUrl(user.discord_id, user.avatar, 64)}
                  alt={user.username}
                  className="h-8 w-8 rounded-full"
                />
                <button
                  onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); setUser(null); router.push('/'); }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:text-destructive hover:border-destructive/30"
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute right-0 top-40 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm animate-fade-in">
            <Sparkles size={13} className="text-primary" />
            Discord management platform
          </div>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl animate-fade-up">
            Power your Discord.
            <br />
            <span className="text-primary">Control everything.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg animate-fade-up" style={{ animationDelay: '0.1s' }}>
            JerSuit gives you powerful moderation, automation, server management, security, and customization — all from one unified dashboard.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <Link
              href={user ? '/servers' : '/sign-in'}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
            >
              Get Started <ArrowRight size={16} />
            </Link>
            <a
              href="#dashboard-preview"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card/50 px-7 text-sm font-semibold text-foreground backdrop-blur-sm transition hover:bg-accent/50"
            >
              Explore Dashboard
            </a>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div id="dashboard-preview" className="mx-auto mt-20 max-w-5xl px-4 sm:px-6">
          <DashboardPreview />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Powerful management</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Manage your Discord servers from a centralized control center with enterprise-grade tools.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/30 hover:shadow-lg animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
                  <f.icon size={20} />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Lock size={12} className="text-primary" /> Security
              </div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Security designed from the start
              </h2>
              <p className="mt-4 text-muted-foreground">
                Every action is validated server-side. Sessions are protected, audit-logged, and revocable. No client-side permission checks — ever.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Secure HTTP-only session cookies',
                  'Server-side permission verification',
                  'OAuth state validation on every login',
                  'Complete audit log of all actions',
                  'Rate limiting on authentication endpoints',
                  'Security event tracking and alerts',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 size={16} className="shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="space-y-4">
                {[
                  { label: 'Session Security', value: 'HttpOnly · Secure · SameSite', icon: Lock, color: 'text-primary' },
                  { label: 'Permission Checks', value: 'Server-side validated', icon: Shield, color: 'text-success' },
                  { label: 'Audit Logging', value: 'All actions tracked', icon: Activity, color: 'text-warning' },
                  { label: 'Rate Limiting', value: 'Active on all endpoints', icon: Zap, color: 'text-destructive' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-card ${item.color}`}>
                      <item.icon size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Server Control Section */}
      <section className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="space-y-3">
                  {[
                    { name: 'Gaming Community', role: 'OWNER', members: '12,482', status: 'JerSuit Installed', icon: Bot, active: true },
                    { name: 'Dev Hub', role: 'ADMINISTRATOR', members: '3,941', status: 'Needs Setup', icon: Server, active: false },
                    { name: 'Art Studio', role: 'OWNER', members: '876', status: 'JerSuit Installed', icon: Globe2, active: true },
                  ].map((server) => (
                    <div key={server.name} className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <server.icon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{server.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${server.role === 'OWNER' ? 'bg-primary/15 text-primary' : 'bg-accent text-muted-foreground'}`}>
                            {server.role}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{server.members} members · {server.status}</div>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Server size={12} className="text-primary" /> Server Control
              </div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Every server gets its own isolated environment
              </h2>
              <p className="mt-4 text-muted-foreground">
                JerSuit only shows servers where you have sufficient Discord permissions. Server A never affects Server B. Each server has independent settings, moderation, and configuration.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Per-server isolation and settings',
                  'Owner and administrator detection',
                  'Bot installation status tracking',
                  'Server switching without re-authentication',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 size={16} className="shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to power your Discord?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Sign in with Discord and start managing your servers in minutes.
          </p>
          <Link
            href={user ? '/servers' : '/sign-in'}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
          >
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <img src="/سس.png" alt="JerSuit" className="h-7 w-7 rounded-lg object-cover" />
            <span className="text-sm font-medium">Jer<span className="text-primary">Suit</span></span>
          </div>
          <p className="text-xs text-muted-foreground">Built for serious communities.</p>
        </div>
      </footer>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-2xl shadow-black/10 animate-scale-in">
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {/* Window bar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-destructive/60" />
            <div className="h-3 w-3 rounded-full bg-warning/60" />
            <div className="h-3 w-3 rounded-full bg-success/60" />
          </div>
          <div className="ml-3 text-xs text-muted-foreground">JerSuit Dashboard</div>
        </div>

        {/* Dashboard content */}
        <div className="flex min-h-[320px]">
          {/* Sidebar */}
          <div className="hidden w-44 shrink-0 border-r border-border bg-card/50 p-3 sm:block">
            <div className="mb-3 flex items-center gap-2 px-2">
              <div className="h-6 w-6 rounded-md bg-primary/15" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
            <div className="space-y-1">
              {['Overview', 'Moderation', 'AutoMod', 'Tickets', 'Welcome', 'Logging', 'Settings'].map((item, i) => (
                <div
                  key={item}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${i === 0 ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}
                >
                  <div className="h-3 w-3 rounded bg-current opacity-50" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="mt-2 h-3 w-48 rounded bg-muted/60" />
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/15" />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'Members', value: '12,482', icon: Users, color: 'text-primary' },
                { label: 'Bot Status', value: 'Online', icon: Bot, color: 'text-success' },
                { label: 'Mod Cases', value: '342', icon: Shield, color: 'text-warning' },
                { label: 'Open Tickets', value: '7', icon: Ticket, color: 'text-destructive' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-card p-3">
                  <div className={`flex items-center gap-1.5 text-xs ${stat.color}`}>
                    <stat.icon size={12} />
                    <span className="text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="mt-2 text-lg font-semibold">{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 text-xs font-medium text-muted-foreground">Recent Activity</div>
                <div className="space-y-2">
                  {['Member joined', 'Message deleted', 'Role updated', 'Ticket closed'].map((activity) => (
                    <div key={activity} className="flex items-center gap-2 text-xs">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="text-muted-foreground">{activity}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 text-xs font-medium text-muted-foreground">Security Status</div>
                <div className="space-y-2">
                  {[
                    { label: 'AutoMod', status: 'Active', color: 'text-success' },
                    { label: 'Rate Limiting', status: 'Enabled', color: 'text-success' },
                    { label: 'Audit Logging', status: 'Active', color: 'text-success' },
                    { label: '2FA Requirement', status: 'Optional', color: 'text-warning' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={item.color}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
