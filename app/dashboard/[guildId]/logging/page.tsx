'use client';

import { useState, useEffect } from 'react';
import { useGuildSettings, Section, Toggle, TextField, SaveButton, Message, PageHeader } from '../_shared';

export default function LoggingPage() {
  const { settings, loading, saving, message, save } = useGuildSettings();
  const [enabled, setEnabled] = useState(false);
  const [logChannel, setLogChannel] = useState('');
  const [memberLogChannel, setMemberLogChannel] = useState('');
  const [modLogChannel, setModLogChannel] = useState('');
  const [voiceLogChannel, setVoiceLogChannel] = useState('');
  const [roleLogChannel, setRoleLogChannel] = useState('');
  const [messageLogChannel, setMessageLogChannel] = useState('');

  useEffect(() => {
    if (settings) {
      setEnabled(settings.logging_enabled || false);
      setLogChannel(settings.log_channel_id || '');
      setMemberLogChannel(settings.member_log_channel_id || '');
      setModLogChannel(settings.moderation_log_channel_id || '');
      setVoiceLogChannel(settings.voice_log_channel_id || '');
      setRoleLogChannel(settings.role_log_channel_id || '');
      setMessageLogChannel(settings.message_log_channel_id || '');
    }
  }, [settings]);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading...</div>;

  return (
    <>
      <PageHeader title="Logging" desc="Track member, message, voice, and role events. Each category can log to a separate channel." />
      <Message message={message} />
      <Section title="Logging settings" desc="Set up channel IDs for each log category. Leave blank to use the general log channel.">
        <div className="space-y-5">
          <Toggle label="Enable logging" checked={enabled} onChange={setEnabled} />
          <div className="border-t border-[#edf2ee] pt-4">
            <TextField label="General log channel ID" value={logChannel} onChange={setLogChannel} placeholder="Discord channel ID" maxLength={20} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Member log channel" value={memberLogChannel} onChange={setMemberLogChannel} placeholder="Channel ID" maxLength={20} />
            <TextField label="Moderation log channel" value={modLogChannel} onChange={setModLogChannel} placeholder="Channel ID" maxLength={20} />
            <TextField label="Voice log channel" value={voiceLogChannel} onChange={setVoiceLogChannel} placeholder="Channel ID" maxLength={20} />
            <TextField label="Role log channel" value={roleLogChannel} onChange={setRoleLogChannel} placeholder="Channel ID" maxLength={20} />
            <TextField label="Message log channel" value={messageLogChannel} onChange={setMessageLogChannel} placeholder="Channel ID" maxLength={20} />
          </div>
          <SaveButton saving={saving} onSave={() => save({
            logging_enabled: enabled,
            log_channel_id: logChannel || null,
            member_log_channel_id: memberLogChannel || null,
            moderation_log_channel_id: modLogChannel || null,
            voice_log_channel_id: voiceLogChannel || null,
            role_log_channel_id: roleLogChannel || null,
            message_log_channel_id: messageLogChannel || null,
          })} />
        </div>
      </Section>
    </>
  );
}
