/**
 * Launch the JerSuit Discord bot as a standalone process.
 *
 * Compiles the TypeScript bot entry with the local TypeScript compiler (which
 * resolves the @/ path alias for type-checking) then runs it headlessly. A
 * require hook maps the unresolved @/ module specifiers in the emitted JS to
 * the compiled output under .bot-out/, so the runtime boots independently of
 * the Next.js server. This is the preferred separation for production.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import module from 'node:module';

export {}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Load .env.local (if present) so the bot uses the project's configured
 * DISCORD_BOT_TOKEN. Values already set in the real environment win.
 */
function loadEnvFile() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnvFile();

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
console.log('[Bot] Compiling runtime...');
execFileSync(npx, ['tsc', '-p', 'tsconfig.bot.json'], {
  cwd: root,
  stdio: 'inherit',
});

// Rewrite @/X -> <root>/.bot-out/X.js so the emitted commonjs bundle resolves.
const originalResolve = module.Module._resolveFilename;
module.Module._resolveFilename = function (request, parent, isMain, options) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    const rest = request.slice(2);
    const jsPath = path.join(root, '.bot-out', `${rest}.js`);
    const tsPath = path.join(root, '.bot-out', `${rest}.ts`);
    if (fs.existsSync(jsPath)) request = jsPath;
    else if (fs.existsSync(tsPath)) request = tsPath;
  }
  // @ts-ignore - forwarded to the genuine resolver.
  return originalResolve.call(this, request, parent, isMain, options);
};

process.env.BOT_STANDALONE = '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
require(path.join(root, '.bot-out/bot/index.js'));
