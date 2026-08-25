import { z } from 'zod';

const envSchema = z.object({
  DISCORD_CLIENT_ID: z.string().min(1,
    'DISCORD_CLIENT_ID is required. Get it from the Discord Developer Portal.'),
  DISCORD_CLIENT_SECRET: z.string().min(1,
    'DISCORD_CLIENT_SECRET is required. Get it from the Discord Developer Portal.'),
  DISCORD_REDIRECT_URI: z.string().url(
    'DISCORD_REDIRECT_URI must be a valid URL ending with /api/auth/callback'),
  SESSION_SECRET: z.string().min(16,
    'SESSION_SECRET must be at least 16 characters. Generate one with: openssl rand -hex 32'),
  JERSUIT_ADMIN_USERNAME: z.string().min(1,
    'JERSUIT_ADMIN_USERNAME is required for admin panel access.'),
  JERSUIT_ADMIN_PASSWORD_HASH: z.string().min(1,
    'JERSUIT_ADMIN_PASSWORD_HASH is required. Generate with: node -e "require(\'crypto\').createHash(\'sha256\').update(\'yourpassword\').digest(\'hex\')"'),
  PLATFORM_OWNER_DISCORD_ID: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal('')),
  NODE_ENV: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedConfig: EnvConfig | null = null;
let configError: string | null = null;

export function getConfig(): EnvConfig {
  if (cachedConfig) return cachedConfig;
  if (configError) throw new Error(configError);

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  - ${i.message}`)
      .join('\n');
    configError = `Configuration error:\n${missing}`;
    throw new Error(configError);
  }
  cachedConfig = result.data;
  return cachedConfig;
}

export function isConfigured(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

export function getConfigErrors(): string | null {
  try {
    getConfig();
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
