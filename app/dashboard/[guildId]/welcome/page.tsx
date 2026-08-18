'use client';

import { useState, useEffect } from 'react';
import { useGuildSettings, Section, Toggle, TextField, TextAreaField, SaveButton, Message, PageHeader } from '../_shared';

export default function WelcomePage() {
  const { settings, loading, saving, message, save } = useGuildSettings();
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeChannel, setWelcomeChannel] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [welcomeEmbed, setWelcomeEmbed] = useState(false);
  const [leaveEnabled, setLeaveEnabled] = useState(false);
  const [leaveChannel, setLeaveChannel] = useState('');
  const [leaveMessage, setLeaveMessage] = useState('');

  useEffect(() => {
    if (settings) {
      setWelcomeEnabled(settings.welcome_enabled || false);
      setWelcomeChannel(settings.welcome_channel_id || '');
      setWelcomeMessage(settings.welcome_message || '');
      setWelcomeEmbed(settings.welcome_embed_enabled || false);
      setLeaveEnabled(settings.leave_enabled || false);
      setLeaveChannel(settings.leave_channel_id || '');
      setLeaveMessage(settings.leave_message || '');
    }
  }, [settings]);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading...</div>;

  return (
    <>
      <PageHeader title="Welcome & Leave" desc="Greet new members when they join and say goodbye when they leave." />
      <Message message={message} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Welcome message" desc="Sent when a new member joins the server.">
          <div className="space-y-4">
            <Toggle label="Enable welcome message" checked={welcomeEnabled} onChange={setWelcomeEnabled} />
            <TextField label="Welcome channel ID" value={welcomeChannel} onChange={setWelcomeChannel} placeholder="Discord channel ID" maxLength={20} />
            <TextAreaField label="Welcome message" value={welcomeMessage} onChange={setWelcomeMessage} placeholder="Welcome {user} to {server}!" rows={3} />
            <Toggle label="Use embed" checked={welcomeEmbed} onChange={setWelcomeEmbed} />
          </div>
        </Section>

        <Section title="Leave message" desc="Sent when a member leaves the server.">
          <div className="space-y-4">
            <Toggle label="Enable leave message" checked={leaveEnabled} onChange={setLeaveEnabled} />
            <TextField label="Leave channel ID" value={leaveChannel} onChange={setLeaveChannel} placeholder="Discord channel ID" maxLength={20} />
            <TextAreaField label="Leave message" value={leaveMessage} onChange={setLeaveMessage} placeholder="Goodbye {user}!" rows={3} />
          </div>
        </Section>
      </div>

      <div className="mt-6">
        <SaveButton saving={saving} onSave={() => save({
          welcome_enabled: welcomeEnabled,
          welcome_channel_id: welcomeChannel || null,
          welcome_message: welcomeMessage || null,
          welcome_embed_enabled: welcomeEmbed,
          leave_enabled: leaveEnabled,
          leave_channel_id: leaveChannel || null,
          leave_message: leaveMessage || null,
        })} />
      </div>

      <div className="mt-6 rounded-2xl border border-[#edf2ee] bg-[#fbfdfb] p-4">
        <p className="text-xs text-[#8b9a91]">Placeholders: {'{user}'} = member mention, {'{server}'} = server name, {'{memberCount}'} = total members.</p>
      </div>
    </>
  );
}
