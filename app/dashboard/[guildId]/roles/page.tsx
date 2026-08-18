'use client';

import { useState, useEffect } from 'react';
import { useGuildSettings, Section, Toggle, TextField, SaveButton, Message, PageHeader } from '../_shared';

export default function RolesPage() {
  const { settings, loading, saving, message, save } = useGuildSettings();
  const [selfRolesEnabled, setSelfRolesEnabled] = useState(false);
  const [reactionRolesEnabled, setReactionRolesEnabled] = useState(false);
  const [autoRoleOnJoin, setAutoRoleOnJoin] = useState('');
  const [roleMessageId, setRoleMessageId] = useState('');

  useEffect(() => {
    if (settings) {
      const cfg = settings.roles_config || {};
      setSelfRolesEnabled(cfg.self_roles_enabled || false);
      setReactionRolesEnabled(cfg.reaction_roles_enabled || false);
      setAutoRoleOnJoin(cfg.auto_role_id || '');
      setRoleMessageId(cfg.reaction_role_message_id || '');
    }
  }, [settings]);

  if (loading) return <div className="flex h-64 items-center justify-center text-[#8b9a91]">Loading...</div>;

  return (
    <>
      <PageHeader title="Roles" desc="Configure self-assignable roles, reaction roles, and automatic role assignment." />
      <Message message={message} />
      <Section title="Role settings" desc="Control how members can assign roles to themselves.">
        <div className="space-y-5">
          <Toggle label="Enable self-assignable roles" checked={selfRolesEnabled} onChange={setSelfRolesEnabled} />
          <Toggle label="Enable reaction roles" checked={reactionRolesEnabled} onChange={setReactionRolesEnabled} />
          {reactionRolesEnabled && (
            <TextField label="Reaction role message ID" value={roleMessageId} onChange={setRoleMessageId} placeholder="Discord message ID" maxLength={20} />
          )}
          <div className="border-t border-[#edf2ee] pt-4">
            <TextField label="Auto-role on join (role ID)" value={autoRoleOnJoin} onChange={setAutoRoleOnJoin} placeholder="Discord role ID" maxLength={20} />
            <p className="mt-2 text-xs text-[#8b9a91]">Members will automatically receive this role when they join the server.</p>
          </div>
          <SaveButton saving={saving} onSave={() => save({
            roles_config: {
              self_roles_enabled: selfRolesEnabled,
              reaction_roles_enabled: reactionRolesEnabled,
              reaction_role_message_id: roleMessageId || null,
              auto_role_id: autoRoleOnJoin || null,
            },
          })} />
        </div>
      </Section>
    </>
  );
}
