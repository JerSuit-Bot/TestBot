import fs from 'fs';
import path from 'path';

/**
 * Centralized, production-safe environment loading.
 *
 * The root cause of the recurring `invalid_client` OAuth failure is that
 * Next.js `@next/env` only fills process.env keys that are MISSING from the
 * surrounding process environment; it does NOT override an already-set shell
 * variable with the (authoritative) value from `.env.local`.
 *
 * In local/development this module makes `.env` + `.env.local` authoritative
 * by writing their values back into process.env BEFORE any OAuth / DB reader
 * runs. It also records conflicts (shell value differs from file value) using
 * only length/existence diagnostics - never secret contents.
 */

const SENSITIVE_KEYS = new Set([
  'DISCORD_CLIENT_SECRET',
  'DISCORD_BOT_TOKEN',
  'SESSION_SECRET',
  'JERSUIT_ADMIN_PASSWORD_HASH',
  'DATABASE_URL',
]);

/** Parse a dotenv-style file into a plain object. Never throws. */
export function parseDotEnv(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const PROJECT_ROOT = process.env.JERSUIT_PROJECT_ROOT || process.cwd();

function loadLocalEnvFiles(names: string[]): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const name of names) {
    try {
      const full = path.resolve(PROJECT_ROOT, name);
      if (!fs.existsSync(full)) continue;
      const parsed = parseDotEnv(fs.readFileSync(full, 'utf8'));
      for (const [k, v] of Object.entries(parsed)) merged[k] = v;
    } catch {
      // ignore unreadable files
    }
  }
  return merged;
}

const loadFiles = loadLocalEnvFiles;

export interface EnvConflict {
  key: string;
  fileLength: number;
  shellLength: number;
  /** true when the effective value came from the shell instead of the file. */
  resolvedFromShell: boolean;
}

export interface EnvDiagnostic {
  key: string;
  present: boolean;
  length: number;
  source: 'file' | 'shell' | 'shared' | 'unknown';
}

let initialized = false;
let conflicts: EnvConflict[] = [];

/**
 * Loads and normalizes environment once, mutating process.env so every
 * downstream reader (Next.js, discord.js, PGlite, bot) sees identical values.
 *
 * In dev: local files are authoritative. In production: real env wins.
 */
export function initializeEnv(): void {
  if (initialized) return;

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isDev = nodeEnv !== 'production';

  const fileValues =
    nodeEnv === 'test'
      ? loadFiles(['.env.test.local', '.env.local', `.env.${nodeEnv}`, '.env'])
      : loadFiles([`.env.${nodeEnv}.local`, '.env.local', `.env.${nodeEnv}`, '.env']);

  const resolved: Record<string, string> = {};
  const allKeys = new Set([...Object.keys(fileValues), ...Object.keys(process.env)]);
  conflicts = [];

  for (const key of allKeys) {
    const fileValue = fileValues[key];
    const shellValue = process.env[key];
    const shellPresent = typeof shellValue === 'string' && shellValue !== '';

    if (fileValue !== undefined && fileValue !== '') {
      if (shellPresent && shellValue !== fileValue) {
        conflicts.push({
          key,
          fileLength: fileValue.length,
          shellLength: (shellValue as string).length,
          resolvedFromShell: !isDev,
        });
      }
      resolved[key] = isDev ? fileValue : (shellValue as string);
      continue;
    }
    if (shellPresent) {
      resolved[key] = shellValue as string;
      continue;
    }
    resolved[key] = fileValue ?? '';
  }

  for (const [k, v] of Object.entries(resolved)) {
    if (v !== undefined && v !== null) process.env[k] = v;
  }

  initialized = true;
}

/** Safe existence/length diagnostics for the admin UI. Never reveals values. */
export function getEnvDiagnostics(keys: string[]): EnvDiagnostic[] {
  initializeEnv();
  const fileValues = loadFiles(['.env.local', '.env']);
  return keys.map((key) => {
    const shell = process.env[key];
    const filePresent = typeof fileValues[key] === 'string' && fileValues[key] !== '';
    const shellPresent = typeof shell === 'string' && shell !== '';
    let source: EnvDiagnostic['source'] = 'unknown';
    if (shellPresent && filePresent) source = shell === fileValues[key] ? 'shared' : 'file';
    else if (shellPresent) source = 'shell';
    else if (filePresent) source = 'file';
    return {
      key,
      present: shellPresent || filePresent,
      length: shellPresent ? (shell as string).length : filePresent ? (fileValues[key] as string).length : 0,
      source,
    };
  });
}

export function getEnvConflicts(): EnvConflict[] {
  return conflicts;
}

export function isEnvInitialized(): boolean {
  return initialized;
}