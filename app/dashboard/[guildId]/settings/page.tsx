'use client';

import { useState, useEffect } from 'react';
import { useGuildSettings, Section, TextField, SaveButton, Message, PageHeader } from '../_shared';

export default function SettingsPage() {
  const { settings, loading, saving, message, save } = useGuildSettings();
  const [lang, setLang] = useState('en');
  const [color, setColor] = useState('#199155');
  const [prefix, setPrefix] = useState('/');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    if (settings) {
      setLang(settings.language || 'en');
      setColor(settings.embed_color || '#199155');
      setPrefix(settings.prefix || '/');
      setNickname(settings.bot_nickname || '');
    }
  }, [settings]);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading...</div>;

  return (
    <>
      <PageHeader title="Server settings" desc="General configuration for this server only. These settings do not affect other servers." />
      <Message message={message} />
      <Section title="General" desc="Language, embed color, command prefix, and bot nickname for this server.">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Language</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="h-11 w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]">
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="tr">Turkish</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Embed color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-[#dfe8e1]" />
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 flex-1 rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 text-sm outline-none focus:border-[#199155]" />
            </div>
          </div>
          <TextField label="Command prefix" value={prefix} onChange={setPrefix} maxLength={5} />
          <TextField label="Bot nickname" value={nickname} onChange={setNickname} maxLength={32} />
          <SaveButton saving={saving} onSave={() => save({ language: lang, embed_color: color, prefix, bot_nickname: nickname })} />
        </div>
      </Section>
    </>
  );
}
