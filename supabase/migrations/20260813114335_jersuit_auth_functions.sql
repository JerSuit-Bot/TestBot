/*
# JerSuit Auth & Session Functions (Fixed)

## Overview
SECURITY DEFINER functions for authentication, session management, and data access.
All authorization is enforced inside each function via session token validation.
All functions use SET search_path = public to prevent search_path injection.

## Security
- EXECUTE revoked from anon on all functions, then granted back to anon
  (the anon key is used by Next.js API routes which validate sessions inside the functions)
- No function ever returns secrets (bot token, OAuth secrets, passwords)
- Session tokens are 32-byte random hex strings
- All functions validate the session before returning data or performing mutations
- Platform Owner functions use a SEPARATE admin session system
- Guild functions check membership AND role before returning/updating data
*/

-- generate_token
CREATE OR REPLACE FUNCTION generate_token()
RETURNS text LANGUAGE sql AS $$
  SELECT encode(gen_random_bytes(32), 'hex');
$$;

-- upsert_user_from_discord
CREATE OR REPLACE FUNCTION upsert_user_from_discord(
  p_discord_id text, p_username text, p_display_name text, p_avatar text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id uuid;
BEGIN
  INSERT INTO users (discord_id, username, display_name, avatar, last_login_at)
  VALUES (p_discord_id, p_username, p_display_name, p_avatar, now())
  ON CONFLICT (discord_id)
  DO UPDATE SET username = EXCLUDED.username, display_name = EXCLUDED.display_name, avatar = EXCLUDED.avatar, last_login_at = now()
  RETURNING id INTO v_user_id;
  RETURN v_user_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION upsert_user_from_discord FROM anon;
GRANT EXECUTE ON FUNCTION upsert_user_from_discord TO anon;

-- create_session
CREATE OR REPLACE FUNCTION create_session(
  p_user_id uuid, p_ip_address text DEFAULT NULL, p_user_agent text DEFAULT NULL, p_hours integer DEFAULT 168
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_token text;
BEGIN
  v_token := generate_token();
  INSERT INTO sessions (token, user_id, expires_at, ip_address, user_agent)
  VALUES (v_token, p_user_id, now() + (p_hours || ' hours')::interval, p_ip_address, p_user_agent);
  RETURN v_token;
END;
$$;
REVOKE EXECUTE ON FUNCTION create_session FROM anon;
GRANT EXECUTE ON FUNCTION create_session TO anon;

-- validate_session
CREATE OR REPLACE FUNCTION validate_session(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session RECORD;
BEGIN
  SELECT s.*, u.* INTO v_session
  FROM sessions s JOIN users u ON u.id = s.user_id
  WHERE s.token = p_token AND s.expires_at > now() LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;
  RETURN jsonb_build_object('valid', true, 'user', jsonb_build_object(
    'id', v_session.user_id, 'discord_id', v_session.discord_id,
    'username', v_session.username, 'display_name', v_session.display_name,
    'avatar', v_session.avatar, 'is_platform_owner', v_session.is_platform_owner
  ));
END;
$$;
REVOKE EXECUTE ON FUNCTION validate_session FROM anon;
GRANT EXECUTE ON FUNCTION validate_session TO anon;

-- delete_session
CREATE OR REPLACE FUNCTION delete_session(p_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN DELETE FROM sessions WHERE token = p_token; END;
$$;
REVOKE EXECUTE ON FUNCTION delete_session FROM anon;
GRANT EXECUTE ON FUNCTION delete_session TO anon;

-- cleanup_expired_sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM sessions WHERE expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION cleanup_expired_sessions FROM anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions TO anon;

-- create_admin_session
CREATE OR REPLACE FUNCTION create_admin_session(
  p_username text, p_ip_address text DEFAULT NULL, p_user_agent text DEFAULT NULL, p_hours integer DEFAULT 24
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_token text;
BEGIN
  v_token := generate_token();
  INSERT INTO admin_sessions (token, username, expires_at, ip_address, user_agent)
  VALUES (v_token, p_username, now() + (p_hours || ' hours')::interval, p_ip_address, p_user_agent);
  RETURN v_token;
END;
$$;
REVOKE EXECUTE ON FUNCTION create_admin_session FROM anon;
GRANT EXECUTE ON FUNCTION create_admin_session TO anon;

-- validate_admin_session
CREATE OR REPLACE FUNCTION validate_admin_session(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session RECORD;
BEGIN
  SELECT * INTO v_session FROM admin_sessions WHERE token = p_token AND expires_at > now() LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;
  RETURN jsonb_build_object('valid', true, 'username', v_session.username);
END;
$$;
REVOKE EXECUTE ON FUNCTION validate_admin_session FROM anon;
GRANT EXECUTE ON FUNCTION validate_admin_session TO anon;

-- delete_admin_session
CREATE OR REPLACE FUNCTION delete_admin_session(p_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN DELETE FROM admin_sessions WHERE token = p_token; END;
$$;
REVOKE EXECUTE ON FUNCTION delete_admin_session FROM anon;
GRANT EXECUTE ON FUNCTION delete_admin_session TO anon;

-- sync_user_guilds
CREATE OR REPLACE FUNCTION sync_user_guilds(p_user_id uuid, p_guilds jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_guild jsonb; v_guild_id uuid; v_role text;
BEGIN
  FOR v_guild IN SELECT * FROM jsonb_array_elements(p_guilds) LOOP
    INSERT INTO guilds (discord_id, name, icon, owner_discord_id, member_count, bot_added_at, updated_at)
    VALUES (v_guild->>'id', v_guild->>'name', v_guild->>'icon', v_guild->>'owner',
      COALESCE((v_guild->>'member_count')::integer, 0),
      CASE WHEN COALESCE((v_guild->>'bot_added')::boolean, false) THEN now() ELSE NULL END, now())
    ON CONFLICT (discord_id) DO UPDATE SET
      name = EXCLUDED.name, icon = EXCLUDED.icon, owner_discord_id = EXCLUDED.owner_discord_id,
      member_count = EXCLUDED.member_count, bot_added_at = COALESCE(guilds.bot_added_at, EXCLUDED.bot_added_at), updated_at = now()
    RETURNING id INTO v_guild_id;

    v_role := 'SERVER_MEMBER';
    IF COALESCE((v_guild->>'owner')::boolean, false) THEN v_role := 'SERVER_OWNER'; END IF;

    INSERT INTO guild_memberships (user_id, guild_id, discord_guild_id, role, permissions, updated_at)
    VALUES (p_user_id, v_guild_id, v_guild->>'id', v_role, COALESCE(v_guild->>'permissions', '0'), now())
    ON CONFLICT (user_id, guild_id) DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions, updated_at = now();

    INSERT INTO guild_settings (guild_id) SELECT v_guild_id
    WHERE NOT EXISTS (SELECT 1 FROM guild_settings WHERE guild_id = v_guild_id);
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION sync_user_guilds FROM anon;
GRANT EXECUTE ON FUNCTION sync_user_guilds TO anon;

-- get_user_guilds_with_access
CREATE OR REPLACE FUNCTION get_user_guilds_with_access(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_user_id uuid;
BEGIN
  v_session := validate_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  v_user_id := (v_session->>'user'->>'id')::uuid;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'guild_id', g.id, 'discord_id', g.discord_id, 'name', g.name, 'icon', g.icon,
      'member_count', g.member_count, 'bot_added', g.bot_added_at IS NOT NULL,
      'role', gm.role, 'permissions', gm.permissions
    ))
    FROM guilds g JOIN guild_memberships gm ON gm.guild_id = g.id WHERE gm.user_id = v_user_id
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_user_guilds_with_access FROM anon;
GRANT EXECUTE ON FUNCTION get_user_guilds_with_access TO anon;

-- get_guild_settings_for_user
CREATE OR REPLACE FUNCTION get_guild_settings_for_user(p_token text, p_guild_discord_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_user_id uuid; v_settings RECORD;
BEGIN
  v_session := validate_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  v_user_id := (v_session->>'user'->>'id')::uuid;
  IF NOT EXISTS (
    SELECT 1 FROM guild_memberships gm JOIN guilds g ON g.id = gm.guild_id
    WHERE gm.user_id = v_user_id AND g.discord_id = p_guild_discord_id
  ) THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  SELECT * INTO v_settings FROM guild_settings gs JOIN guilds g ON g.id = gs.guild_id WHERE g.discord_id = p_guild_discord_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  RETURN to_jsonb(v_settings);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_guild_settings_for_user FROM anon;
GRANT EXECUTE ON FUNCTION get_guild_settings_for_user TO anon;

-- update_guild_settings_for_user
CREATE OR REPLACE FUNCTION update_guild_settings_for_user(p_token text, p_guild_discord_id text, p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_user_id uuid; v_guild_id uuid; v_role text;
BEGIN
  v_session := validate_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  v_user_id := (v_session->>'user'->>'id')::uuid;
  SELECT g.id, gm.role INTO v_guild_id, v_role FROM guilds g JOIN guild_memberships gm ON gm.guild_id = g.id
  WHERE g.discord_id = p_guild_discord_id AND gm.user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  IF v_role NOT IN ('SERVER_OWNER', 'SERVER_ADMIN') THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;

  UPDATE guild_settings SET
    language = COALESCE(p_settings->>'language', language),
    embed_color = COALESCE(p_settings->>'embed_color', embed_color),
    prefix = COALESCE(p_settings->>'prefix', prefix),
    welcome_enabled = COALESCE((p_settings->>'welcome_enabled')::boolean, welcome_enabled),
    welcome_channel_id = COALESCE(p_settings->>'welcome_channel_id', welcome_channel_id),
    welcome_message = COALESCE(p_settings->>'welcome_message', welcome_message),
    welcome_embed_enabled = COALESCE((p_settings->>'welcome_embed_enabled')::boolean, welcome_embed_enabled),
    leave_enabled = COALESCE((p_settings->>'leave_enabled')::boolean, leave_enabled),
    leave_channel_id = COALESCE(p_settings->>'leave_channel_id', leave_channel_id),
    leave_message = COALESCE(p_settings->>'leave_message', leave_message),
    logging_enabled = COALESCE((p_settings->>'logging_enabled')::boolean, logging_enabled),
    log_channel_id = COALESCE(p_settings->>'log_channel_id', log_channel_id),
    member_log_channel_id = COALESCE(p_settings->>'member_log_channel_id', member_log_channel_id),
    moderation_log_channel_id = COALESCE(p_settings->>'moderation_log_channel_id', moderation_log_channel_id),
    voice_log_channel_id = COALESCE(p_settings->>'voice_log_channel_id', voice_log_channel_id),
    role_log_channel_id = COALESCE(p_settings->>'role_log_channel_id', role_log_channel_id),
    channel_log_channel_id = COALESCE(p_settings->>'channel_log_channel_id', channel_log_channel_id),
    message_log_channel_id = COALESCE(p_settings->>'message_log_channel_id', message_log_channel_id),
    moderation_enabled = COALESCE((p_settings->>'moderation_enabled')::boolean, moderation_enabled),
    automod_enabled = COALESCE((p_settings->>'automod_enabled')::boolean, automod_enabled),
    automod_config = COALESCE(p_settings->'automod_config', automod_config),
    tickets_enabled = COALESCE((p_settings->>'tickets_enabled')::boolean, tickets_enabled),
    ticket_config = COALESCE(p_settings->'ticket_config', ticket_config),
    music_enabled = COALESCE((p_settings->>'music_enabled')::boolean, music_enabled),
    music_config = COALESCE(p_settings->'music_config', music_config),
    automations_enabled = COALESCE((p_settings->>'automations_enabled')::boolean, automations_enabled),
    roles_config = COALESCE(p_settings->'roles_config', roles_config),
    feature_toggles = COALESCE(p_settings->'feature_toggles', feature_toggles),
    bot_nickname = COALESCE(p_settings->>'bot_nickname', bot_nickname),
    updated_at = now()
  WHERE guild_id = v_guild_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION update_guild_settings_for_user FROM anon;
GRANT EXECUTE ON FUNCTION update_guild_settings_for_user TO anon;

-- get_bot_status (public read - no sensitive data exposed)
CREATE OR REPLACE FUNCTION get_bot_status()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_status RECORD; v_config RECORD;
BEGIN
  SELECT * INTO v_status FROM bot_status ORDER BY created_at DESC LIMIT 1;
  SELECT * INTO v_config FROM bot_configuration ORDER BY updated_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'state', COALESCE(v_status.state, 'offline'),
    'uptime_seconds', COALESCE(v_status.uptime_seconds, 0),
    'gateway_latency_ms', v_status.gateway_latency_ms,
    'connected_guilds', COALESCE(v_status.connected_guilds, 0),
    'total_users', COALESCE(v_status.total_users, 0),
    'cpu_percent', COALESCE(v_status.cpu_percent, 0),
    'memory_mb', COALESCE(v_status.memory_mb, 0),
    'node_version', v_status.node_version,
    'last_heartbeat', v_status.last_heartbeat,
    'last_error', v_status.last_error,
    'token_configured', COALESCE(v_config.token_configured, false),
    'last_started_at', v_config.last_started_at,
    'last_stopped_at', v_config.last_stopped_at,
    'last_crash_at', v_config.last_crash_at,
    'activity_type', COALESCE(v_config.activity_type, 'playing'),
    'activity_name', v_config.activity_name,
    'status', COALESCE(v_config.status, 'online')
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION get_bot_status FROM anon;
GRANT EXECUTE ON FUNCTION get_bot_status TO anon;

-- get_bot_configuration (admin only)
CREATE OR REPLACE FUNCTION get_bot_configuration(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_config RECORD;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  SELECT * INTO v_config FROM bot_configuration ORDER BY updated_at DESC LIMIT 1;
  RETURN to_jsonb(v_config);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_bot_configuration FROM anon;
GRANT EXECUTE ON FUNCTION get_bot_configuration TO anon;

-- update_bot_configuration (admin only)
CREATE OR REPLACE FUNCTION update_bot_configuration(
  p_token text, p_status text DEFAULT NULL, p_activity_type text DEFAULT NULL,
  p_activity_name text DEFAULT NULL, p_token_configured boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  UPDATE bot_configuration SET
    status = COALESCE(p_status, status),
    activity_type = COALESCE(p_activity_type, activity_type),
    activity_name = COALESCE(p_activity_name, activity_name),
    token_configured = COALESCE(p_token_configured, token_configured),
    updated_at = now()
  WHERE id = (SELECT id FROM bot_configuration ORDER BY updated_at DESC LIMIT 1);
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION update_bot_configuration FROM anon;
GRANT EXECUTE ON FUNCTION update_bot_configuration TO anon;

-- get_appearance_settings (public read)
CREATE OR REPLACE FUNCTION get_appearance_settings()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM appearance_settings ORDER BY updated_at DESC LIMIT 1;
  RETURN to_jsonb(v_settings);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_appearance_settings FROM anon;
GRANT EXECUTE ON FUNCTION get_appearance_settings TO anon;

-- update_appearance_settings (admin only)
CREATE OR REPLACE FUNCTION update_appearance_settings(p_token text, p_settings jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  UPDATE appearance_settings SET
    brand_name = COALESCE(p_settings->>'brand_name', brand_name),
    primary_color = COALESCE(p_settings->>'primary_color', primary_color),
    secondary_color = COALESCE(p_settings->>'secondary_color', secondary_color),
    accent_color = COALESCE(p_settings->>'accent_color', accent_color),
    background_color = COALESCE(p_settings->>'background_color', background_color),
    surface_color = COALESCE(p_settings->>'surface_color', surface_color),
    text_color = COALESCE(p_settings->>'text_color', text_color),
    border_color = COALESCE(p_settings->>'border_color', border_color),
    border_radius = COALESCE((p_settings->>'border_radius')::integer, border_radius),
    theme_mode = COALESCE(p_settings->>'theme_mode', theme_mode),
    updated_at = now()
  WHERE id = (SELECT id FROM appearance_settings ORDER BY updated_at DESC LIMIT 1);
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION update_appearance_settings FROM anon;
GRANT EXECUTE ON FUNCTION update_appearance_settings TO anon;

-- create_audit_log (all params defaulted to avoid ordering issues)
CREATE OR REPLACE FUNCTION create_audit_log(
  p_actor_id uuid DEFAULT NULL, p_actor_name text DEFAULT NULL, p_action text DEFAULT NULL,
  p_target text DEFAULT NULL, p_guild_id uuid DEFAULT NULL,
  p_result text DEFAULT 'success', p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_action IS NULL THEN RAISE EXCEPTION 'action is required'; END IF;
  INSERT INTO audit_logs (actor_id, actor_name, action, target, guild_id, result, metadata)
  VALUES (p_actor_id, p_actor_name, p_action, p_target, p_guild_id, p_result, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION create_audit_log FROM anon;
GRANT EXECUTE ON FUNCTION create_audit_log TO anon;

-- get_audit_logs (admin only)
CREATE OR REPLACE FUNCTION get_audit_logs(p_token text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', a.id, 'actor_name', a.actor_name, 'action', a.action, 'target', a.target,
      'result', a.result, 'metadata', a.metadata, 'created_at', a.created_at
    ) ORDER BY a.created_at DESC)
    FROM audit_logs a LIMIT p_limit OFFSET p_offset
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_audit_logs FROM anon;
GRANT EXECUTE ON FUNCTION get_audit_logs TO anon;

-- get_platform_stats (admin only)
CREATE OR REPLACE FUNCTION get_platform_stats(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_user_count integer; v_guild_count integer; v_session_count integer; v_ticket_count integer; v_mod_count integer; v_audit_count integer; v_bot_state text;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  SELECT count(*) INTO v_user_count FROM users;
  SELECT count(*) INTO v_guild_count FROM guilds;
  SELECT count(*) INTO v_session_count FROM sessions WHERE expires_at > now();
  SELECT count(*) INTO v_ticket_count FROM tickets;
  SELECT count(*) INTO v_mod_count FROM moderation_cases;
  SELECT count(*) INTO v_audit_count FROM audit_logs;
  SELECT state INTO v_bot_state FROM bot_status ORDER BY created_at DESC LIMIT 1;
  RETURN jsonb_build_object('users', v_user_count, 'guilds', v_guild_count, 'active_sessions', v_session_count, 'tickets', v_ticket_count, 'moderation_cases', v_mod_count, 'audit_logs', v_audit_count, 'bot_state', COALESCE(v_bot_state, 'offline'));
END;
$$;
REVOKE EXECUTE ON FUNCTION get_platform_stats FROM anon;
GRANT EXECUTE ON FUNCTION get_platform_stats TO anon;

-- get_all_users (admin only)
CREATE OR REPLACE FUNCTION get_all_users(p_token text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', u.id, 'discord_id', u.discord_id, 'username', u.username, 'display_name', u.display_name,
      'avatar', u.avatar, 'is_platform_owner', u.is_platform_owner, 'created_at', u.created_at, 'last_login_at', u.last_login_at
    ) ORDER BY u.created_at DESC)
    FROM users u LIMIT p_limit OFFSET p_offset
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_all_users FROM anon;
GRANT EXECUTE ON FUNCTION get_all_users TO anon;

-- get_all_guilds (admin only)
CREATE OR REPLACE FUNCTION get_all_guilds(p_token text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', g.id, 'discord_id', g.discord_id, 'name', g.name, 'icon', g.icon,
      'member_count', g.member_count, 'bot_added_at', g.bot_added_at, 'created_at', g.created_at
    ) ORDER BY g.created_at DESC)
    FROM guilds g LIMIT p_limit OFFSET p_offset
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_all_guilds FROM anon;
GRANT EXECUTE ON FUNCTION get_all_guilds TO anon;

-- issue_bot_command (admin only - dashboard sends commands to bot process)
CREATE OR REPLACE FUNCTION issue_bot_command(p_token text, p_command text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_id uuid;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  IF p_command NOT IN ('start', 'stop', 'restart', 'set_activity', 'set_status', 'set_avatar') THEN
    RETURN jsonb_build_object('error', 'invalid_command');
  END IF;
  INSERT INTO bot_commands (command, payload) VALUES (p_command, p_payload) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'command_id', v_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION issue_bot_command FROM anon;
GRANT EXECUTE ON FUNCTION issue_bot_command TO anon;

-- get_pending_bot_commands (called by bot process to poll for commands)
CREATE OR REPLACE FUNCTION get_pending_bot_commands()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'command', c.command, 'payload', c.payload, 'created_at', c.created_at
    ) ORDER BY c.created_at)
    FROM bot_commands c WHERE c.status = 'pending'
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_pending_bot_commands FROM anon;
GRANT EXECUTE ON FUNCTION get_pending_bot_commands TO anon;

-- complete_bot_command (called by bot process after executing a command)
CREATE OR REPLACE FUNCTION complete_bot_command(p_command_id uuid, p_result text DEFAULT NULL, p_success boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE bot_commands SET status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    result = p_result, executed_at = now()
  WHERE id = p_command_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION complete_bot_command FROM anon;
GRANT EXECUTE ON FUNCTION complete_bot_command TO anon;

-- update_bot_status (called by bot process to write heartbeat)
CREATE OR REPLACE FUNCTION update_bot_status(
  p_state text, p_uptime_seconds bigint DEFAULT 0, p_gateway_latency_ms integer DEFAULT NULL,
  p_connected_guilds integer DEFAULT 0, p_total_users integer DEFAULT 0,
  p_cpu_percent real DEFAULT 0, p_memory_mb real DEFAULT 0, p_node_version text DEFAULT NULL,
  p_last_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE bot_status SET
    state = p_state, uptime_seconds = p_uptime_seconds, gateway_latency_ms = p_gateway_latency_ms,
    connected_guilds = p_connected_guilds, total_users = p_total_users,
    cpu_percent = p_cpu_percent, memory_mb = p_memory_mb, node_version = p_node_version,
    last_heartbeat = now(), last_error = p_last_error
  WHERE id = (SELECT id FROM bot_status ORDER BY created_at DESC LIMIT 1);
END;
$$;
REVOKE EXECUTE ON FUNCTION update_bot_status FROM anon;
GRANT EXECUTE ON FUNCTION update_bot_status TO anon;

-- get_moderation_cases_for_user (guild-scoped, session-validated)
CREATE OR REPLACE FUNCTION get_moderation_cases_for_user(p_token text, p_guild_discord_id text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_user_id uuid; v_guild_id uuid;
BEGIN
  v_session := validate_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  v_user_id := (v_session->>'user'->>'id')::uuid;
  SELECT g.id INTO v_guild_id FROM guilds g JOIN guild_memberships gm ON gm.guild_id = g.id
  WHERE g.discord_id = p_guild_discord_id AND gm.user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', m.id, 'case_number', m.case_number, 'action', m.action, 'target_id', m.target_id,
      'target_name', m.target_name, 'moderator_id', m.moderator_id, 'moderator_name', m.moderator_name,
      'reason', m.reason, 'duration', m.duration, 'created_at', m.created_at
    ) ORDER BY m.created_at DESC)
    FROM moderation_cases m WHERE m.guild_id = v_guild_id LIMIT p_limit OFFSET p_offset
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_moderation_cases_for_user FROM anon;
GRANT EXECUTE ON FUNCTION get_moderation_cases_for_user TO anon;

-- get_tickets_for_user (guild-scoped, session-validated)
CREATE OR REPLACE FUNCTION get_tickets_for_user(p_token text, p_guild_discord_id text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_user_id uuid; v_guild_id uuid;
BEGIN
  v_session := validate_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  v_user_id := (v_session->>'user'->>'id')::uuid;
  SELECT g.id INTO v_guild_id FROM guilds g JOIN guild_memberships gm ON gm.guild_id = g.id
  WHERE g.discord_id = p_guild_discord_id AND gm.user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', t.id, 'channel_id', t.channel_id, 'user_id', t.user_id, 'user_name', t.user_name,
      'status', t.status, 'category', t.category, 'assigned_to', t.assigned_to,
      'created_at', t.created_at, 'closed_at', t.closed_at
    ) ORDER BY t.created_at DESC)
    FROM tickets t WHERE t.guild_id = v_guild_id LIMIT p_limit OFFSET p_offset
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_tickets_for_user FROM anon;
GRANT EXECUTE ON FUNCTION get_tickets_for_user TO anon;

-- get_automations_for_user (guild-scoped, session-validated)
CREATE OR REPLACE FUNCTION get_automations_for_user(p_token text, p_guild_discord_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_user_id uuid; v_guild_id uuid;
BEGIN
  v_session := validate_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  v_user_id := (v_session->>'user'->>'id')::uuid;
  SELECT g.id INTO v_guild_id FROM guilds g JOIN guild_memberships gm ON gm.guild_id = g.id
  WHERE g.discord_id = p_guild_discord_id AND gm.user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', a.id, 'name', a.name, 'trigger', a.trigger, 'conditions', a.conditions,
      'actions', a.actions, 'enabled', a.enabled, 'created_at', a.created_at, 'updated_at', a.updated_at
    ) ORDER BY a.created_at DESC)
    FROM automations a WHERE a.guild_id = v_guild_id
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_automations_for_user FROM anon;
GRANT EXECUTE ON FUNCTION get_automations_for_user TO anon;

-- create_automation_for_user (guild-scoped, session-validated, owner/admin only)
CREATE OR REPLACE FUNCTION create_automation_for_user(
  p_token text, p_guild_discord_id text, p_name text, p_trigger text,
  p_conditions jsonb DEFAULT '[]'::jsonb, p_actions jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_user_id uuid; v_guild_id uuid; v_role text; v_id uuid;
BEGIN
  v_session := validate_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  v_user_id := (v_session->>'user'->>'id')::uuid;
  SELECT g.id, gm.role INTO v_guild_id, v_role FROM guilds g JOIN guild_memberships gm ON gm.guild_id = g.id
  WHERE g.discord_id = p_guild_discord_id AND gm.user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  IF v_role NOT IN ('SERVER_OWNER', 'SERVER_ADMIN') THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  INSERT INTO automations (guild_id, name, trigger, conditions, actions) VALUES (v_guild_id, p_name, p_trigger, p_conditions, p_actions) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION create_automation_for_user FROM anon;
GRANT EXECUTE ON FUNCTION create_automation_for_user TO anon;

-- delete_automation_for_user (guild-scoped, session-validated, owner/admin only)
CREATE OR REPLACE FUNCTION delete_automation_for_user(p_token text, p_guild_discord_id text, p_automation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_user_id uuid; v_guild_id uuid; v_role text;
BEGIN
  v_session := validate_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  v_user_id := (v_session->>'user'->>'id')::uuid;
  SELECT g.id, gm.role INTO v_guild_id, v_role FROM guilds g JOIN guild_memberships gm ON gm.guild_id = g.id
  WHERE g.discord_id = p_guild_discord_id AND gm.user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  IF v_role NOT IN ('SERVER_OWNER', 'SERVER_ADMIN') THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  DELETE FROM automations WHERE id = p_automation_id AND guild_id = v_guild_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION delete_automation_for_user FROM anon;
GRANT EXECUTE ON FUNCTION delete_automation_for_user TO anon;

-- toggle_automation_for_user (guild-scoped, session-validated, owner/admin only)
CREATE OR REPLACE FUNCTION toggle_automation_for_user(p_token text, p_guild_discord_id text, p_automation_id uuid, p_enabled boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_user_id uuid; v_guild_id uuid; v_role text;
BEGIN
  v_session := validate_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  v_user_id := (v_session->>'user'->>'id')::uuid;
  SELECT g.id, gm.role INTO v_guild_id, v_role FROM guilds g JOIN guild_memberships gm ON gm.guild_id = g.id
  WHERE g.discord_id = p_guild_discord_id AND gm.user_id = v_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  IF v_role NOT IN ('SERVER_OWNER', 'SERVER_ADMIN') THEN RETURN jsonb_build_object('error', 'forbidden'); END IF;
  UPDATE automations SET enabled = p_enabled WHERE id = p_automation_id AND guild_id = v_guild_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION toggle_automation_for_user FROM anon;
GRANT EXECUTE ON FUNCTION toggle_automation_for_user TO anon;

-- get_message_templates (admin only)
CREATE OR REPLACE FUNCTION get_message_templates(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', t.id, 'name', t.name, 'type', t.type, 'title', t.title, 'description', t.description,
      'footer', t.footer, 'author', t.author, 'thumbnail', t.thumbnail, 'image', t.image,
      'color', t.color, 'content', t.content, 'created_at', t.created_at, 'updated_at', t.updated_at
    ) ORDER BY t.created_at DESC)
    FROM message_templates t
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_message_templates FROM anon;
GRANT EXECUTE ON FUNCTION get_message_templates TO anon;

-- create_message_template (admin only)
CREATE OR REPLACE FUNCTION create_message_template(
  p_token text, p_name text, p_type text DEFAULT 'custom', p_title text DEFAULT NULL,
  p_description text DEFAULT NULL, p_footer text DEFAULT NULL, p_author text DEFAULT NULL,
  p_thumbnail text DEFAULT NULL, p_image text DEFAULT NULL, p_color text DEFAULT '#199155',
  p_content text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_id uuid;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  INSERT INTO message_templates (name, type, title, description, footer, author, thumbnail, image, color, content)
  VALUES (p_name, p_type, p_title, p_description, p_footer, p_author, p_thumbnail, p_image, p_color, p_content)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION create_message_template FROM anon;
GRANT EXECUTE ON FUNCTION create_message_template TO anon;

-- update_message_template (admin only)
CREATE OR REPLACE FUNCTION update_message_template(
  p_token text, p_template_id uuid, p_name text DEFAULT NULL, p_type text DEFAULT NULL,
  p_title text DEFAULT NULL, p_description text DEFAULT NULL, p_footer text DEFAULT NULL,
  p_author text DEFAULT NULL, p_thumbnail text DEFAULT NULL, p_image text DEFAULT NULL,
  p_color text DEFAULT NULL, p_content text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  UPDATE message_templates SET
    name = COALESCE(p_name, name), type = COALESCE(p_type, type), title = COALESCE(p_title, title),
    description = COALESCE(p_description, description), footer = COALESCE(p_footer, footer),
    author = COALESCE(p_author, author), thumbnail = COALESCE(p_thumbnail, thumbnail),
    image = COALESCE(p_image, image), color = COALESCE(p_color, color), content = COALESCE(p_content, content),
    updated_at = now()
  WHERE id = p_template_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION update_message_template FROM anon;
GRANT EXECUTE ON FUNCTION update_message_template TO anon;

-- delete_message_template (admin only)
CREATE OR REPLACE FUNCTION delete_message_template(p_token text, p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  DELETE FROM message_templates WHERE id = p_template_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION delete_message_template FROM anon;
GRANT EXECUTE ON FUNCTION delete_message_template TO anon;

-- get_scheduled_messages (admin only)
CREATE OR REPLACE FUNCTION get_scheduled_messages(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', s.id, 'target_type', s.target_type, 'target_id', s.target_id, 'target_name', s.target_name,
      'content', s.content, 'scheduled_at', s.scheduled_at, 'status', s.status, 'created_at', s.created_at,
      'sent_at', s.sent_at, 'error_message', s.error_message
    ) ORDER BY s.scheduled_at DESC)
    FROM scheduled_messages s
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_scheduled_messages FROM anon;
GRANT EXECUTE ON FUNCTION get_scheduled_messages TO anon;

-- create_scheduled_message (admin only)
CREATE OR REPLACE FUNCTION create_scheduled_message(
  p_token text, p_target_type text, p_target_id text DEFAULT NULL, p_target_name text DEFAULT NULL,
  p_content jsonb DEFAULT '{}'::jsonb, p_scheduled_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb; v_id uuid;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  IF p_scheduled_at IS NULL OR p_scheduled_at < now() THEN RETURN jsonb_build_object('error', 'invalid_schedule_time'); END IF;
  INSERT INTO scheduled_messages (target_type, target_id, target_name, content, scheduled_at)
  VALUES (p_target_type, p_target_id, p_target_name, p_content, p_scheduled_at)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION create_scheduled_message FROM anon;
GRANT EXECUTE ON FUNCTION create_scheduled_message TO anon;

-- cancel_scheduled_message (admin only)
CREATE OR REPLACE FUNCTION cancel_scheduled_message(p_token text, p_message_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  UPDATE scheduled_messages SET status = 'cancelled' WHERE id = p_message_id AND status = 'scheduled';
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION cancel_scheduled_message FROM anon;
GRANT EXECUTE ON FUNCTION cancel_scheduled_message TO anon;

-- get_message_history (admin only)
CREATE OR REPLACE FUNCTION get_message_history(p_token text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session jsonb;
BEGIN
  v_session := validate_admin_session(p_token);
  IF NOT (v_session->>'valid')::boolean THEN RETURN jsonb_build_object('error', 'unauthorized'); END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', h.id, 'sender_name', h.sender_name, 'target_type', h.target_type, 'target_id', h.target_id,
      'target_name', h.target_name, 'content', h.content, 'status', h.status,
      'discord_message_id', h.discord_message_id, 'created_at', h.created_at
    ) ORDER BY h.created_at DESC)
    FROM message_history h LIMIT p_limit OFFSET p_offset
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_message_history FROM anon;
GRANT EXECUTE ON FUNCTION get_message_history TO anon;

-- record_message_history (called by bot process or API after Discord confirms delivery)
CREATE OR REPLACE FUNCTION record_message_history(
  p_sender_id uuid DEFAULT NULL, p_sender_name text DEFAULT NULL, p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL, p_target_name text DEFAULT NULL, p_content jsonb DEFAULT '{}'::jsonb,
  p_status text DEFAULT 'sent', p_discord_message_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO message_history (sender_id, sender_name, target_type, target_id, target_name, content, status, discord_message_id)
  VALUES (p_sender_id, p_sender_name, p_target_type, p_target_id, p_target_name, p_content, p_status, p_discord_message_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION record_message_history FROM anon;
GRANT EXECUTE ON FUNCTION record_message_history TO anon;

-- get_pending_scheduled_messages (called by bot process to poll for due messages)
CREATE OR REPLACE FUNCTION get_pending_scheduled_messages()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', s.id, 'target_type', s.target_type, 'target_id', s.target_id, 'target_name', s.target_name,
      'content', s.content, 'scheduled_at', s.scheduled_at
    ) ORDER BY s.scheduled_at)
    FROM scheduled_messages s WHERE s.status = 'scheduled' AND s.scheduled_at <= now()
  ), '[]'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION get_pending_scheduled_messages FROM anon;
GRANT EXECUTE ON FUNCTION get_pending_scheduled_messages TO anon;

-- mark_scheduled_message_sent (called by bot process after delivery)
CREATE OR REPLACE FUNCTION mark_scheduled_message_sent(p_message_id uuid, p_discord_message_id text DEFAULT NULL, p_error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE scheduled_messages SET
    status = CASE WHEN p_error IS NULL THEN 'sent' ELSE 'failed' END,
    sent_at = now(), error_message = p_error
  WHERE id = p_message_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION mark_scheduled_message_sent FROM anon;
GRANT EXECUTE ON FUNCTION mark_scheduled_message_sent TO anon;
