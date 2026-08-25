/**
 * Static utility commands — part 1. Real runtime-generated replies.
 */
import { staticCommand } from './framework';

staticCommand({
  name: 'coinflip',
  description: 'Flip a coin — heads or tails.',
  category: 'utility',
  content: () => `You flipped **${Math.random() < 0.5 ? 'heads' : 'tails'}**.`,
});

staticCommand({
  name: 'dice',
  description: 'Roll a six-sided die.',
  category: 'utility',
  content: () => `You rolled a **${1 + Math.floor(Math.random() * 6)}**.`,
});

staticCommand({
  name: 'roll',
  description: 'Roll a random number up to a maximum value.',
  category: 'utility',
  content: (i) => {
    const max = Math.max(1, i.options.getInteger('max') ?? 100);
    return `Rolled **${1 + Math.floor(Math.random() * max)}** (1–${max}).`;
  },
  builder: (b) =>
    b.addIntegerOption((o) => o.setName('max').setDescription('Maximum value (default 100)').setMinValue(2).setMaxValue(10_000)),
});

staticCommand({
  name: 'random',
  description: 'Generate a random number between two bounds.',
  category: 'utility',
  content: (i) => {
    const min = i.options.getInteger('min') ?? 1;
    const max = i.options.getInteger('max') ?? 100;
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return `Random number: **${lo + Math.floor(Math.random() * (hi - lo + 1))}** (${lo}–${hi}).`;
  },
  builder: (b) =>
    b
      .addIntegerOption((o) => o.setName('min').setDescription('Minimum').setRequired(false))
      .addIntegerOption((o) => o.setName('max').setDescription('Maximum').setRequired(false)),
});

staticCommand({
  name: 'reverse',
  description: 'Reverse any text.',
  category: 'utility',
  content: (i) => {
    const input = i.options.getString('text');
    if (!input) return 'Provide some text to reverse.';
    return [...input].reverse().join('');
  },
  builder: (b) => b.addStringOption((o) => o.setName('text').setDescription('Text to reverse').setRequired(true)),
});

staticCommand({
  name: 'uppercase',
  description: 'Convert text to UPPERCASE.',
  category: 'utility',
  content: (i) => String(i.options.getString('text') ?? '').toUpperCase() || 'Provide text to uppercase.',
  builder: (b) => b.addStringOption((o) => o.setName('text').setDescription('Text').setRequired(true)),
});

staticCommand({
  name: 'lowercase',
  description: 'Convert text to lowercase.',
  category: 'utility',
  content: (i) => String(i.options.getString('text') ?? '').toLowerCase() || 'Provide text to lowercase.',
  builder: (b) => b.addStringOption((o) => o.setName('text').setDescription('Text').setRequired(true)),
});

staticCommand({
  name: 'capitalize',
  description: 'Capitalize the first letter of each word.',
  category: 'utility',
  content: (i) => {
    const input = String(i.options.getString('text') ?? '');
    if (!input) return 'Provide some text to capitalize.';
    return input.replace(/\b\w/g, (c) => c.toUpperCase());
  },
  builder: (b) => b.addStringOption((o) => o.setName('text').setDescription('Text').setRequired(true)),
});

staticCommand({
  name: 'length',
  description: 'Count the characters in some text.',
  category: 'utility',
  content: (i) => `That text is **${i.options.getString('text')?.length ?? 0}** characters long.`,
  builder: (b) => b.addStringOption((o) => o.setName('text').setDescription('Text').setRequired(true)),
});

staticCommand({
  name: 'wordcount',
  description: 'Count the words in some text.',
  category: 'utility',
  content: (i) => {
    const parts = (i.options.getString('text') ?? '').trim().split(/\s+/);
    return `That text has **${parts[0] ? parts.length : 0}** word(s).`;
  },
  builder: (b) => b.addStringOption((o) => o.setName('text').setDescription('Text').setRequired(true)),
});

staticCommand({
  name: 'uuid',
  description: 'Generate a random UUID.',
  category: 'utility',
  content: () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `\`${crypto.randomUUID()}\``;
    }
    return `\`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}\``;
  },
});

staticCommand({
  name: 'password',
  description: 'Generate a strong random password.',
  category: 'utility',
  content: (i) => {
    const len = Math.min(64, Math.max(8, i.options.getInteger('length') ?? 16));
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+';
    let out = '';
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    for (let n = 0; n < len; n++) out += chars[arr[n] % chars.length];
    return `Generated password (\`${len}\` chars):\n\`${out}\``;
  },
  builder: (b) =>
    b.addIntegerOption((o) => o.setName('length').setDescription('Length (default 16)').setMinValue(6).setMaxValue(64)),
});