import { z } from 'zod';

export const guildSettingsSchema = z.object({
  language: z.string().max(10).optional(),
  embed_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  prefix: z.string().max(5).optional(),
  welcome_enabled: z.boolean().optional(),
  welcome_channel_id: z.string().optional().nullable(),
  welcome_message: z.string().max(2000).optional().nullable(),
  welcome_embed_enabled: z.boolean().optional(),
  leave_enabled: z.boolean().optional(),
  leave_channel_id: z.string().optional().nullable(),
  leave_message: z.string().max(2000).optional().nullable(),
  logging_enabled: z.boolean().optional(),
  log_channel_id: z.string().optional().nullable(),
  member_log_channel_id: z.string().optional().nullable(),
  moderation_log_channel_id: z.string().optional().nullable(),
  voice_log_channel_id: z.string().optional().nullable(),
  role_log_channel_id: z.string().optional().nullable(),
  channel_log_channel_id: z.string().optional().nullable(),
  message_log_channel_id: z.string().optional().nullable(),
  moderation_enabled: z.boolean().optional(),
  automod_enabled: z.boolean().optional(),
  automod_config: z.record(z.any()).optional(),
  tickets_enabled: z.boolean().optional(),
  ticket_config: z.record(z.any()).optional(),
  music_enabled: z.boolean().optional(),
  music_config: z.record(z.any()).optional(),
  automations_enabled: z.boolean().optional(),
  roles_config: z.record(z.any()).optional(),
  feature_toggles: z.record(z.any()).optional(),
  bot_nickname: z.string().max(32).optional().nullable(),
}).strict();

export const botConfigSchema = z.object({
  status: z.enum(['online', 'idle', 'dnd', 'invisible']).optional(),
  activity_type: z.enum(['playing', 'watching', 'listening', 'streaming', 'competing']).optional(),
  activity_name: z.string().max(128).optional().nullable(),
}).strict();

export const appearanceSchema = z.object({
  brand_name: z.string().max(50).optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  surface_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  border_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  border_radius: z.number().int().min(0).max(24).optional(),
  theme_mode: z.enum(['light', 'dark']).optional(),
}).strict();

export const automationSchema = z.object({
  name: z.string().min(1).max(100),
  trigger: z.enum(['member_join', 'member_leave', 'message_contains', 'ticket_created', 'role_added', 'role_removed']),
  conditions: z.array(z.record(z.any())).default([]),
  actions: z.array(z.record(z.any())).default([]),
}).strict();

export const messageTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['announcement', 'maintenance', 'update', 'warning', 'event', 'system', 'custom']).default('custom'),
  title: z.string().max(256).optional().nullable(),
  description: z.string().max(4096).optional().nullable(),
  footer: z.string().max(256).optional().nullable(),
  author: z.string().max(256).optional().nullable(),
  thumbnail: z.string().url().optional().nullable(),
  image: z.string().url().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#199155'),
  content: z.string().max(2000).optional().nullable(),
}).strict();

export const scheduledMessageSchema = z.object({
  target_type: z.enum(['channel', 'dm']),
  target_id: z.string().optional().nullable(),
  target_name: z.string().optional().nullable(),
  content: z.record(z.any()),
  scheduled_at: z.string().datetime(),
}).strict();

export const adminLoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
}).strict();

export const sendMessageSchema = z.object({
  target_type: z.enum(['channel', 'dm']),
  target_id: z.string().min(1),
  target_name: z.string().optional().nullable(),
  content: z.object({
    text: z.string().max(2000).optional().nullable(),
    title: z.string().max(256).optional().nullable(),
    description: z.string().max(4096).optional().nullable(),
    footer: z.string().max(256).optional().nullable(),
    author: z.string().max(256).optional().nullable(),
    thumbnail: z.string().url().optional().nullable(),
    image: z.string().url().optional().nullable(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#199155'),
  }),
}).strict();

export const discordIdSchema = z.string().regex(/^\d{17,20}$/);
