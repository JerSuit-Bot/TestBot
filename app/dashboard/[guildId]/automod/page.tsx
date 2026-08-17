'use client';

import { useState, useEffect } from 'react';
import { useGuildSettings, Section, Toggle, TextField, SaveButton, Message, PageHeader } from '../_shared';

export default function AutoModPage() {
  const { settings, loading, saving, message, save } = useGuildSettings();
  const [enabled, setEnabled] = useState(false);
  const [spamThreshold, setSpamThreshold] = useState('5');
  const [spamTimeframe, setSpamTimeframe] = useState('10');
  const [blockedWords, setBlockedWords] = useState('');
  const [blockedLinks, setBlockedLinks] = useState(false);
  const [blockedInvites, setBlockedInvites] = useState(false);
  const [mentionLimit, setMentionLimit] = useState('5');

  useEffect(() => {
    if (settings) {
      setEnabled(settings.automod_enabled || false);
      const cfg = settings.automod_config || {};
      setSpamThreshold(String(cfg.spam_threshold || 5));
      setSpamTimeframe(String(cfg.spam_timeframe || 10));
      setBlockedWords((cfg.blocked_words || []).join(', '));
      setBlockedLinks(cfg.block_links || false);
      setBlockedInvites(cfg.block_invites || false);
      setMentionLimit(String(cfg.mention_limit || 5));
    }
  }, [settings]);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading...</div>;

  return (
    <>
      <PageHeader title="AutoMod" desc="Automated message filtering and spam protection for this server." />
      <Message message={message} />
      <Section title="AutoMod settings" desc="Configure automated moderation rules. The bot will enforce these rules automatically.">
        <div className="space-y-5">
          <Toggle label="Enable AutoMod" checked={enabled} onChange={setEnabled} />
          <div className="border-t border-[#edf2ee] pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#708278]">Spam protection</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Message threshold" value={spamThreshold} onChange={setSpamThreshold} placeholder="5" maxLength={3} />
              <TextField label="Time window (seconds)" value={spamTimeframe} onChange={setSpamTimeframe} placeholder="10" maxLength={4} />
            </div>
          </div>
          <div className="border-t border-[#edf2ee] pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#708278]">Content filtering</div>
            <div className="space-y-1">
              <Toggle label="Block Discord invites" checked={blockedInvites} onChange={setBlockedInvites} />
              <Toggle label="Block links" checked={blockedLinks} onChange={setBlockedLinks} />
            </div>
            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#708278]">Blocked words (comma-separated)</label>
              <textarea value={blockedWords} onChange={(e) => setBlockedWords(e.target.value)} rows={3} placeholder="word1, word2, word3" className="w-full rounded-xl border border-[#dfe8e1] bg-[#fbfdfb] px-4 py-3 text-sm outline-none focus:border-[#199155]" />
            </div>
          </div>
          <div className="border-t border-[#edf2ee] pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#708278]">Mention limit</div>
            <TextField label="Max mentions per message" value={mentionLimit} onChange={setMentionLimit} placeholder="5" maxLength={3} />
          </div>
          <SaveButton saving={saving} onSave={() => save({
            automod_enabled: enabled,
            automod_config: {
              spam_threshold: parseInt(spamThreshold) || 5,
              spam_timeframe: parseInt(spamTimeframe) || 10,
              blocked_words: blockedWords.split(',').map(w => w.trim()).filter(Boolean),
              block_links: blockedLinks,
              block_invites: blockedInvites,
              mention_limit: parseInt(mentionLimit) || 5,
            },
          })} />
        </div>
      </Section>
    </>
  );
}
