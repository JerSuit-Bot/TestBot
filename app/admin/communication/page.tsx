'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Send, Clock, FileText, Search } from 'lucide-react';

export default function CommunicationPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'compose' | 'templates' | 'scheduled' | 'history'>('compose');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [tmplRes, histRes, schedRes] = await Promise.all([
          fetch('/api/admin/templates'),
          fetch('/api/admin/message-history'),
          fetch('/api/admin/scheduled-messages'),
        ]);
        if (tmplRes.ok) setTemplates((await tmplRes.json()).templates || []);
        if (histRes.ok) setHistory((await histRes.json()).messages || []);
        if (schedRes.ok) setScheduled((await schedRes.json()).messages || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading communication center...</div>;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#11271a]">Communication center</h2>
        <p className="mt-2 text-sm text-[#708278]">Send messages, manage templates, schedule delivery, and track message history through the JerSuit bot.</p>
      </div>

      {message && <div className="mb-6 rounded-2xl border border-[#cce4d1] bg-[#eaf7ed] p-4 text-sm font-medium text-[#16814b]">{message}</div>}

      <div className="mb-6 flex flex-wrap gap-2">
        {(['compose', 'templates', 'scheduled', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition ${tab === t ? 'bg-[#199155] text-white' : 'border border-[#dfe8e1] bg-white text-[#50665a] hover:border-[#a7cdb1]'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'compose' && <ComposeTab onSent={(m) => { setMessage(m); setTab('history'); }} />}
      {tab === 'templates' && <TemplatesTab templates={templates} />}
      {tab === 'scheduled' && <ScheduledTab messages={scheduled} />}
      {tab === 'history' && <HistoryTab messages={history} />}
    </>
  );
}

function ComposeTab({ onSent }: { onSent: (msg: string) => void }) {
  const [targetType, setTargetType] = useState('channel');
  const [targetId, setTargetId] = useState('');
  const [content, setContent] = useState({ text: '', title: '', description: '', footer: '', color: '#199155' });
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!targetId) { onSent('Please enter a target ID.'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/admin/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, content }),
      });
      const data = await res.json();
      if (res.ok) onSent('Message sent successfully.');
      else onSent(data.error || 'Failed to send message.');
    } catch {
      onSent('Network error.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-[#dfe8e1] bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold">Compose message</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Target type</label>
            <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]">
              <option value="channel">Channel</option>
              <option value="dm">Direct message</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Target ID</label>
            <input type="text" value={targetId} onChange={(e) => setTargetId(e.target.value)} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" placeholder="Discord channel or user ID" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Text content</label>
            <textarea value={content.text} onChange={(e) => setContent({ ...content, text: e.target.value })} rows={2} className="w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 py-3 text-sm outline-none focus:border-[#199155]" placeholder="Optional plain text" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Embed title</label>
            <input type="text" value={content.title} onChange={(e) => setContent({ ...content, title: e.target.value })} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Embed description</label>
            <textarea value={content.description} onChange={(e) => setContent({ ...content, description: e.target.value })} rows={4} className="w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 py-3 text-sm outline-none focus:border-[#199155]" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Embed footer</label>
            <input type="text" value={content.footer} onChange={(e) => setContent({ ...content, footer: e.target.value })} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Embed color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={content.color} onChange={(e) => setContent({ ...content, color: e.target.value })} className="h-11 w-14 cursor-pointer rounded-lg border border-[#dfe8e1]" />
              <input type="text" value={content.color} onChange={(e) => setContent({ ...content, color: e.target.value })} className="h-11 flex-1 rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
            </div>
          </div>
          <button onClick={send} disabled={sending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#199155] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(25,145,85,0.18)] transition hover:bg-[#147f49] disabled:opacity-50">
            <Send size={16} /> {sending ? 'Sending...' : 'Send message'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#dfe8e1] bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold">Preview</h3>
        <div className="rounded-xl border border-[#dfe8e1] p-4">
          {content.text && <p className="mb-3 text-sm text-[#11221b]">{content.text}</p>}
          {(content.title || content.description) && (
            <div className="rounded-xl border-l-4 p-4" style={{ borderLeftColor: content.color }}>
              {content.title && <div className="text-sm font-semibold text-[#11221b]">{content.title}</div>}
              {content.description && <div className="mt-1 text-sm text-[#50665a]">{content.description}</div>}
              {content.footer && <div className="mt-3 text-xs text-[#8b9a91]">{content.footer}</div>}
            </div>
          )}
          {!content.text && !content.title && !content.description && <p className="text-sm text-[#8b9a91]">Start typing to see a preview.</p>}
        </div>
        <p className="mt-4 text-xs text-[#8b9a91]">Messages are sent through the JerSuit bot. Delivery is confirmed by Discord before reporting success. Rate limiting and queueing are applied for multiple messages.</p>
      </div>
    </div>
  );
}

function TemplatesTab({ templates }: { templates: any[] }) {
  return (
    <div>
      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cddbd0] bg-[#fbfdfb] p-12 text-center">
          <FileText size={40} className="mx-auto text-[#c5d7c9]" />
          <p className="mt-4 text-sm text-[#8b9a91]">No templates created yet. Templates let you reuse message formats across communications.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-2xl border border-[#dfe8e1] bg-white p-5">
              <div className="text-sm font-semibold text-[#11221b]">{t.name}</div>
              <div className="mt-1 text-xs text-[#8b9a91] capitalize">{t.type}</div>
              {t.title && <div className="mt-3 text-sm font-medium text-[#50665a]">{t.title}</div>}
              {t.description && <div className="mt-1 text-xs text-[#708278]">{t.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduledTab({ messages }: { messages: any[] }) {
  return (
    <div>
      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cddbd0] bg-[#fbfdfb] p-12 text-center">
          <Clock size={40} className="mx-auto text-[#c5d7c9]" />
          <p className="mt-4 text-sm text-[#8b9a91]">No scheduled messages. Schedule messages for future delivery through the compose tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-[#dfe8e1] bg-white p-4">
              <div>
                <div className="text-sm font-medium text-[#11221b]">{m.target_name || m.target_id}</div>
                <div className="text-xs text-[#8b9a91]">Scheduled for {new Date(m.scheduled_at).toLocaleString()}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase ${m.status === 'scheduled' ? 'bg-[#fff6df] text-[#b98921]' : m.status === 'sent' ? 'bg-[#e0f5e5] text-[#16814b]' : 'bg-[#fee] text-[#c44]'}`}>{m.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryTab({ messages }: { messages: any[] }) {
  return (
    <div>
      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cddbd0] bg-[#fbfdfb] p-12 text-center">
          <MessageSquare size={40} className="mx-auto text-[#c5d7c9]" />
          <p className="mt-4 text-sm text-[#8b9a91]">No messages sent yet. Sent messages will appear here with delivery status.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="rounded-xl border border-[#dfe8e1] bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-[#11221b]">{m.target_name || m.target_id}</div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase ${m.status === 'sent' ? 'bg-[#e0f5e5] text-[#16814b]' : 'bg-[#fee] text-[#c44]'}`}>{m.status}</span>
              </div>
              <div className="mt-1 text-xs text-[#8b9a91]">Sent by {m.sender_name || 'System'} on {new Date(m.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
