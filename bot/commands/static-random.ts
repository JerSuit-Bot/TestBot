// Generated real command module.
import { batch } from './batch';

const gs = (i: import('discord.js').ChatInputCommandInteraction, k: string): string => i.options.getString(k) ?? '';
const gn = (i: import('discord.js').ChatInputCommandInteraction, k: string): number => i.options.getNumber(k) ?? 0;
const gi = (i: import('discord.js').ChatInputCommandInteraction, k: string): number => i.options.getInteger(k) ?? 0;
const gb = (i: import('discord.js').ChatInputCommandInteraction, k: string): boolean => i.options.getBoolean(k) ?? false;
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
function isPrime(x: number): boolean { if (x < 2) return false; for (let k = 2; k * k <= x; k++) if (x % k === 0) return false; return true; }
function revStr(s: string): string { return Array.from(s).reverse().join(''); }
function sh256(s: string): string { const { createHash } = require('node:crypto'); return createHash('sha256').update(s).digest('hex'); }

const WORDS = ['ember','quill','drift','meadow','cinder','falcon','ripple','summit','breeze','forest','lantern','orbit','cosmos','harbor'];

batch([
  {
    name: 'random-word',
    description: 'Get a random word from a small dictionary.',
    category: 'fun',
    run: () => '📚 **' + pick(WORDS) + '**',
  },
  {
    name: 'random-color',
    description: 'Generate a random hex color.',
    category: 'fun',
    run: () => '🎨 #' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0'),
  },
  {
    name: 'random-integer',
    description: 'Random integer within a range.',
    category: 'utility',
    run: () => { const lo = gi(i,'min'); const hi = gi(i,'max'); return '**' + (lo + Math.floor(Math.random() * (hi - lo + 1))) + '**'; },
  },
  {
    name: 'random-string',
    description: 'Random alphanumeric string of given length.',
    category: 'utility',
    run: () => { const len = Math.min(Math.max(gi(i,'length'), 1), 64); const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; let out = ''; for (let k = 0; k < len; k++) out += chars[Math.floor(Math.random() * chars.length)]; return '**' + out + '**'; },
  },
  {
    name: 'random-roll',
    description: 'Roll a die with custom sides.',
    category: 'fun',
    run: () => '🎲 **' + (1 + Math.floor(Math.random() * Math.max(gi(i,'sides'), 1))) + '**',
  },
  {
    name: 'isdigit',
    description: 'Check if input consists only of digits.',
    category: 'information',
    run: () => { const s = gs(i,'text'); return /^\d+$/.test(s) ? '✅ all digits' : '❌ not all digits'; },
  },
  {
    name: 'isnumeric',
    description: 'Check if input parses as a finite number.',
    category: 'information',
    run: () => { const s = gs(i,'text'); return Number.isFinite(Number(s)) ? '✅ numeric' : '❌ not numeric'; },
  },
  {
    name: 'isalpha',
    description: 'Check if input is letters only.',
    category: 'information',
    run: () => { const s = gs(i,'text'); return /^[a-zA-Z]+$/.test(s) ? '✅ letters only' : '❌ contains other characters'; },
  },
  {
    name: 'isalnum',
    description: 'Check if input is letters and digits only.',
    category: 'information',
    run: () => { const s = gs(i,'text'); return /^[a-zA-Z0-9]+$/.test(s) ? '✅ alphanumeric' : '❌ contains other characters'; },
  },
  {
    name: 'palindrome-check',
    description: 'Check whether input is a palindrome.',
    category: 'information',
    run: () => { const s = gs(i,'text'); const c = s.toLowerCase().replace(/[^a-z0-9]/g, ''); return (c && c === revStr(c)) ? '✅ palindrome' : '❌ not a palindrome'; },
  },
  {
    name: 'count-words',
    description: 'Count words in input.',
    category: 'information',
    run: () => { const w = gs(i,'text').trim() ? gs(i,'text').trim().split(/\s+/).length : 0; return '**' + w + '** words'; },
  },
  {
    name: 'count-chars',
    description: 'Count unicode characters.',
    category: 'information',
    run: () => '**' + Array.from(gs(i,'text')).length + '** characters'; },
  },
  {
    name: 'count-vowels',
    description: 'Count vowels.',
    category: 'information',
    run: () => '**' + (gs(i,'text').match(/[aeiouAEIOU]/g) ?? []).length + '** vowels'; },
  },
  {
    name: 'count-consonants',
    description: 'Count consonants.',
    category: 'information',
    run: () => '**' + (gs(i,'text').match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) ?? []).length + '** consonants'; },
  },
  {
    name: 'hash-sha256',
    description: 'Compute SHA-256 hash.',
    category: 'utility',
    run: () => '`' + shSplit(gs(i,'text')) + '`',
  },
  {
    name: 'reverse-text',
    description: 'Reverse given text.',
    category: 'utility',
    run: () => revStr(gs(i,'text')),
  },
  {
    name: 'random-hex',
    description: 'Random hex number.',
    category: 'fun',
    run: () => '0x' + Math.floor(Math.random() * 0xFFFFFF).toString(16),
  },
  {
    name: 'random-ipa',
    description: 'Random between two numbers showing percentage.',
    category: 'fun',
    run: () => { const v = gi(i,'n'); return v + ' value'; },
  },
])
