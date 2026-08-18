'use client';

import { useState, useEffect } from 'react';
import { useGuildSettings, Section, Toggle, TextField, SaveButton, Message, PageHeader } from '../_shared';

export default function MusicPage() {
  const { settings, loading, saving, message, save } = useGuildSettings();
  const [enabled, setEnabled] = useState(false);
  const [maxQueue, setMaxQueue] = useState('100');
  const [defaultVolume, setDefaultVolume] = useState('50');
  const [djOnly, setDjOnly] = useState(false);
  const [djRoleId, setDjRoleId] = useState('');

  useEffect(() => {
    if (settings) {
      setEnabled(settings.music_enabled || false);
      const cfg = settings.music_config || {};
      setMaxQueue(String(cfg.max_queue || 100));
      setDefaultVolume(String(cfg.default_volume || 50));
      setDjOnly(cfg.dj_only || false);
      setDjRoleId(cfg.dj_role_id || '');
    }
  }, [settings]);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading...</div>;

  return (
    <>
      <PageHeader title="Music" desc="Configure music playback settings for this server." />
      <Message message={message} />
      <Section title="Music settings" desc="Control how the bot handles music playback in voice channels.">
        <div className="space-y-5">
          <Toggle label="Enable music commands" checked={enabled} onChange={setEnabled} />
          <div className="border-t border-[#edf2ee] pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Max queue size" value={maxQueue} onChange={setMaxQueue} placeholder="100" maxLength={4} />
              <TextField label="Default volume (0-100)" value={defaultVolume} onChange={setDefaultVolume} placeholder="50" maxLength={3} />
            </div>
          </div>
          <div className="border-t border-[#edf2ee] pt-4">
            <Toggle label="DJ-only mode" checked={djOnly} onChange={setDjOnly} />
            {djOnly && (
              <div className="mt-4">
                <TextField label="DJ role ID" value={djRoleId} onChange={setDjRoleId} placeholder="Discord role ID" maxLength={20} />
              </div>
            )}
          </div>
          <SaveButton saving={saving} onSave={() => save({
            music_enabled: enabled,
            music_config: {
              max_queue: parseInt(maxQueue) || 100,
              default_volume: parseInt(defaultVolume) || 50,
              dj_only: djOnly,
              dj_role_id: djRoleId || null,
            },
          })} />
        </div>
      </Section>
    </>
  );
}
