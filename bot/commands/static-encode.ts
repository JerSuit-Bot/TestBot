/**
 * Real encoding / hashing / text-transform commands.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { batch } from './batch';

const gs = (i: import('discord.js').ChatInputCommandInteraction, k: string) => i.options.getString(k) ?? '';
const gi = (i: import('discord.js').ChatInputCommandInteraction, k: string) => i.options.getInteger(k) ?? 0;

function b64e(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64');
}
function b64d(s: string): string {
  try {
    return Buffer.from(s, 'base64').toString('utf8');
  } catch {
    return 'Invalid base64.';
  }
}
function hexe(s: string): string {
  return Buffer.from(s, 'utf8').toString('hex');
}
function hexd(s: string): string {
  try {
    return Buffer.from(s, 'hex').toString('utf8');
  } catch {
    return 'Invalid hex.';
  }
}
function binaryToText(s: string): string {
  const parts = s.split(/\s+/).filter(Boolean);
  let out = '';
  for (const p of parts) {
    if (!/^[01]{1,8}$/.test(p)) return 'Invalid binary input (8-bit chunks).';
    out += String.fromCharCode(parseInt(p, 2));
  }
  return out;
}
function rot13(s: string): string {
  return s.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + 13) % 26) + base);
  });
}
function caesar(s: string, shift: number): string {
  const sh = ((shift % 26) + 26) % 26;
  return s.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + sh) % 26) + base);
  });
}
function atbash(s: string): string {
  return s.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97;
    return String.fromCharCode(25 - (ch.charCodeAt(0) - base) + base);
  });
}
const reverseStr = (s: string) => Array.from(s).reverse().join('');
const toTitle = (s: string) => s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
const toCamel = (s: string) =>
  s
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w, idx) => (idx === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
const toSnake = (s: string) => s.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((w) => w.toLowerCase()).join('_');
const toKebab = (s: string) => s.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((w) => w.toLowerCase()).join('-');
const toPascal = (s: string) =>
  s
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');

batch([
  {
    name: 'base64-encode',
    description: 'Encode text to base64.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text to encode', required: true, type: 'string' }],
    run: (i) => `\`${b64e(gs(i, 'text'))}\``,
  },
  {
    name: 'base64-decode',
    description: 'Decode base64 text.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text to decode', required: true, type: 'string' }],
    run: (i) => {
      const out = b64d(gs(i, 'text'));
      return out || 'Invalid base64 input.';
    },
  },
  {
    name: 'hex-encode',
    description: 'Encode text to hex.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => `\`${hexe(gs(i, 'text'))}\``,
  },
  {
    name: 'hex-decode',
    description: 'Decode hex to text.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Hex', required: true, type: 'string' }],
    run: (i) => hexd(gs(i, 'text')) || 'Invalid hex input.',
  },
  {
    name: 'binary-encode',
    description: 'Encode text into 8-bit binary.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => Array.from(Buffer.from(gs(i, 'text'), 'utf8')).map((b) => b.toString(2).padStart(8, '0')).join(' '),
  },
  {
    name: 'binary-decode',
    description: 'Decode 8-bit binary into text.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Binary chunks', required: true, type: 'string' }],
    run: (i) => binaryToText(gs(i, 'text')),
  },
  {
    name: 'rot13',
    description: 'Apply the ROT13 cipher.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => rot13(gs(i, 'text')),
  },
  {
    name: 'caesar',
    description: 'Apply a Caesar shift cipher.',
    category: 'utility',
    opts: [
      { name: 'text', description: 'Text', required: true, type: 'string' },
      { name: 'shift', description: 'Shift (integer)', required: true, type: 'integer' },
    ],
    run: (i) => caesar(gs(i, 'text'), gi(i, 'shift')),
  },
  {
    name: 'atbash',
    description: 'Apply the atbash cipher.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => atbash(gs(i, 'text')),
  },
  {
    name: 'reverse',
    description: 'Reverse a string.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => reverseStr(gs(i, 'text')),
  },
  {
    name: 'uppercase',
    description: 'Convert text to uppercase.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => gs(i, 'text').toUpperCase(),
  },
  {
    name: 'lowercase',
    description: 'Convert text to lowercase.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => gs(i, 'text').toLowerCase(),
  },
  {
    name: 'titlecase',
    description: 'Convert text to Title Case.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => toTitle(gs(i, 'text')),
  },
  {
    name: 'camelcase',
    description: 'Convert text to camelCase.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => toCamel(gs(i, 'text')),
  },
  {
    name: 'snakecase',
    description: 'Convert text to snake_case.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => toSnake(gs(i, 'text')),
  },
  {
    name: 'kebabcase',
    description: 'Convert text to kebab-case.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => toKebab(gs(i, 'text')),
  },
  {
    name: 'pascalcase',
    description: 'Convert text to PascalCase.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => toPascal(gs(i, 'text')),
  },
  {
    name: 'wordcount',
    description: 'Count words in a string.',
    category: 'information',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => {
      const s = gs(i, 'text').trim();
      return `**${s ? s.split(/\s+/).length : 0}** words.`;
    },
  },
  {
    name: 'charcount',
    description: 'Count characters in a string.',
    category: 'information',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => `**${Array.from(gs(i, 'text')).length}** characters.`,
  },
  {
    name: 'vowelcount',
    description: 'Count vowels in a string.',
    category: 'information',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => `**${(gs(i, 'text').match(/[aeiouAEIOU]/g) ?? []).length}** vowels.`,
  },
  {
    name: 'consonantcount',
    description: 'Count consonants in a string.',
    category: 'information',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => `**${(gs(i, 'text').match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) ?? []).length}** consonants.`,
  },
  {
    name: 'md5',
    description: 'Compute the MD5 hash of a string.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => `\`${hashOf('md5', gs(i, 'text'))}\``,
  },
  {
    name: 'sha1',
    description: 'Compute the SHA-1 hash of a string.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => `\`${hashOf('sha1', gs(i, 'text'))}\``,
  },
  {
    name: 'sha256',
    description: 'Compute the SHA-256 hash of a string.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => `\`${hashOf('sha256', gs(i, 'text'))}\``,
  },
  {
    name: 'sha512',
    description: 'Compute the SHA-512 hash of a string.',
    category: 'utility',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => `\`${hashOf('sha512', gs(i, 'text'))}\``,
  },
  {
    name: 'uuid',
    description: 'Generate a random UUID v4.',
    category: 'utility',
    run: () => `\`${randomUUID()}\``,
  },
  {
    name: 'palindrome',
    description: 'Check whether text is a palindrome.',
    category: 'information',
    opts: [{ name: 'text', description: 'Word or phrase', required: true, type: 'string' }],
    run: (i) => {
      const raw = gs(i, 'text');
      const c = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
      return `${raw} is ${c && c === reverseStr(c) ? 'a palindrome ✅' : 'not a palindrome ❌'}.`;
    },
  },
  {
    name: 'password',
    description: 'Generate a secure random password.',
    category: 'utility',
    opts: [{ name: 'length', description: 'Length (4-128)', required: false, type: 'integer' }],
    run: (i) => {
      const len = Math.min(Math.max(gi(i, 'length') || 16, 4), 128);
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
      const bytes = randomBytes(len);
      let out = '';
      for (let k = 0; k < len; k++) out += chars[bytes[k] % chars.length];
      return `\`${out}\``;
    },
  },
  {
    name: 'clapify',
    description: 'Insert 👏 between words.',
    category: 'fun',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => gs(i, 'text').split(/\s+/).join(' 👏 '),
  },
  {
    name: 'emojify',
    description: 'Replace common words with emojis.',
    category: 'fun',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => {
      const m: Record<string, string> = {
        love: '❤️', like: '👍', dislike: '👎', happy: '😄', sad: '😢', fire: '🔥',
        cool: '😎', star: '⭐', rocket: '🚀', yes: '✅', no: '❌', heart: '💚',
      };
      return gs(i, 'text').split(/\b/).map((w) => m[w.toLowerCase()] ?? w).join('');
    },
  },
  {
    name: 'leet',
    description: 'Convert text to leetspeak.',
    category: 'fun',
    opts: [{ name: 'text', description: 'Text', required: true, type: 'string' }],
    run: (i) => {
      const m: Record<string, string> = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7', g: '9' };
      return gs(i, 'text').split('').map((ch) => m[ch.toLowerCase()] ?? ch).join('');
    },
  },
])

function hashOf(algo: 'md5' | 'sha1' | 'sha256' | 'sha512', s: string): string {
  return createHashOf(algo).update(s).digest('hex');
}
function createHashOf(algo: string) {
  return (require('node:crypto') as typeof import('node:crypto')).createHash(algo as 'md5');
}
