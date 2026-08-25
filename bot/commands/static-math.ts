/**
 * Real math & number commands. Every command computes a genuine result from
 * the provided options at runtime.
 */
import { batch } from './batch';

const num = (i: import('discord.js').ChatInputCommandInteraction, k: string) => i.options.getNumber(k) ?? 0;
const int = (i: import('discord.js').ChatInputCommandInteraction, k: string) => i.options.getInteger(k) ?? 0;

function fact(n: number): number {
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}
function isPrime(x: number): boolean {
  if (x < 2) return false;
  for (let k = 2; k * k <= x; k++) if (x % k === 0) return false;
  return true;
}
function isFib(x: number): boolean {
  let a = 0;
  let b = 1;
  while (a < x) {
    const t = a + b;
    a = b;
    b = t;
  }
  return a === x || x === 0;
}
function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}
function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}
function splitNums(s: string): number[] {
  return s
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

batch([
  {
    name: 'add',
    description: 'Add two numbers together.',
    category: 'utility',
    opts: [
      { name: 'a', description: 'First number', required: true, type: 'number' },
      { name: 'b', description: 'Second number', required: true, type: 'number' },
    ],
    run: (i) => `**${num(i, 'a')} + ${num(i, 'b')} = ${num(i, 'a') + num(i, 'b')}**`,
  },
  {
    name: 'subtract',
    description: 'Subtract two numbers.',
    category: 'utility',
    opts: [
      { name: 'a', description: 'First number', required: true, type: 'number' },
      { name: 'b', description: 'Second number', required: true, type: 'number' },
    ],
    run: (i) => `**${num(i, 'a')} - ${num(i, 'b')} = ${num(i, 'a') - num(i, 'b')}**`,
  },
  {
    name: 'multiply',
    description: 'Multiply two numbers.',
    category: 'utility',
    opts: [
      { name: 'a', description: 'First number', required: true, type: 'number' },
      { name: 'b', description: 'Second number', required: true, type: 'number' },
    ],
    run: (i) => `**${num(i, 'a')} × ${num(i, 'b')} = ${num(i, 'a') * num(i, 'b')}**`,
  },
  {
    name: 'divide',
    description: 'Divide a by b.',
    category: 'utility',
    opts: [
      { name: 'a', description: 'Dividend', required: true, type: 'number' },
      { name: 'b', description: 'Divisor', required: true, type: 'number' },
    ],
    run: (i) => {
      const b = num(i, 'b');
      if (b === 0) return 'Cannot divide by zero.';
      return `**${num(i, 'a')} ÷ ${b} = ${(num(i, 'a') / b).toFixed(4)}**`;
    },
  },
  {
    name: 'modulo',
    description: 'Compute a % b.',
    category: 'utility',
    opts: [
      { name: 'a', description: 'Dividend', required: true, type: 'number' },
      { name: 'b', description: 'Divisor', required: true, type: 'number' },
    ],
    run: (i) => `**${num(i, 'a')} % ${num(i, 'b')} = ${num(i, 'a') % num(i, 'b')}**`,
  },
  {
    name: 'power',
    description: 'Compute a raised to the power of b.',
    category: 'utility',
    opts: [
      { name: 'a', description: 'Base', required: true, type: 'number' },
      { name: 'b', description: 'Exponent', required: true, type: 'number' },
    ],
    run: (i) => `**${num(i, 'a')} ^ ${num(i, 'b')} = ${Math.pow(num(i, 'a'), num(i, 'b')).toPrecision(8)}**`,
  },
  {
    name: 'square',
    description: 'Compute a number squared.',
    category: 'utility',
    opts: [{ name: 'n', description: 'Number', required: true, type: 'number' }],
    run: (i) => `**${num(i, 'n')}² = ${num(i, 'n') * num(i, 'n')}**`,
  },
  {
    name: 'cube',
    description: 'Compute a number cubed.',
    category: 'utility',
    opts: [{ name: 'n', description: 'Number', required: true, type: 'number' }],
    run: (i) => `**${num(i, 'n')}³ = ${num(i, 'n') * num(i, 'n') * num(i, 'n')}**`,
  },
  {
    name: 'sqrt',
    description: 'Square root of a number.',
    category: 'utility',
    opts: [{ name: 'n', description: 'Number', required: true, type: 'number' }],
    run: (i) => {
      const n = num(i, 'n');
      if (n < 0) return 'Cannot take the square root of a negative number.';
      return `**√${n} = ${Math.sqrt(n).toFixed(4)}**`;
    },
  },
  {
    name: 'cbrt',
    description: 'Cube root of a number.',
    category: 'utility',
    opts: [{ name: 'n', description: 'Number', required: true, type: 'number' }],
    run: (i) => `**∛${num(i, 'n')} = ${Math.cbrt(num(i, 'n')).toFixed(4)}**`,
  },
  {
    name: 'absolute',
    description: 'Absolute value of a number.',
    category: 'utility',
    opts: [{ name: 'n', description: 'Number', required: true, type: 'number' }],
    run: (i) => `**|${num(i, 'n')}| = ${Math.abs(num(i, 'n'))}**`,
  },
  {
    name: 'factorial',
    description: 'Compute n! for an integer n between 0 and 170.',
    category: 'utility',
    opts: [{ name: 'n', description: 'Integer', required: true, type: 'integer' }],
    run: (i) => {
      const n = int(i, 'n');
      if (n < 0 || n > 170) return 'Provide an integer from 0 to 170.';
      return `**${n}! = ${fact(n).toPrecision(10)}**`;
    },
  },
  {
    name: 'isprime',
    description: 'Test whether an integer is prime.',
    category: 'information',
    opts: [{ name: 'n', description: 'Integer', required: true, type: 'integer' }],
    run: (i) => `**${int(i, 'n')}** is ${isPrime(int(i, 'n')) ? 'prime ✅' : 'not prime ❌'}.`,
  },
  {
    name: 'isfib',
    description: 'Test whether an integer belongs to the Fibonacci sequence.',
    category: 'information',
    opts: [{ name: 'n', description: 'Integer', required: true, type: 'integer' }],
    run: (i) => `**${int(i, 'n')}** is ${isFib(int(i, 'n')) ? 'a Fibonacci number' : 'not a Fibonacci number'}.`,
  },
  {
    name: 'gcd',
    description: 'Greatest common divisor of two integers.',
    category: 'utility',
    opts: [
      { name: 'a', description: 'First', required: true, type: 'integer' },
      { name: 'b', description: 'Second', required: true, type: 'integer' },
    ],
    run: (i) => `**GCD(${int(i, 'a')}, ${int(i, 'b')}) = ${gcd(int(i, 'a'), int(i, 'b'))}**`,
  },
  {
    name: 'lcm',
    description: 'Least common multiple of two integers.',
    category: 'utility',
    opts: [
      { name: 'a', description: 'First', required: true, type: 'integer' },
      { name: 'b', description: 'Second', required: true, type: 'integer' },
    ],
    run: (i) => `**LCM(${int(i, 'a')}, ${int(i, 'b')}) = ${lcm(int(i, 'a'), int(i, 'b'))}**`,
  },
  {
    name: 'average',
    description: 'Average of a space/comma separated list of numbers.',
    category: 'utility',
    opts: [{ name: 'numbers', description: 'Numbers', required: true, type: 'string' }],
    run: (i) => {
      const a = splitNums(i.options.getString('numbers') ?? '');
      return a.length ? `**Average:** ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(4)}` : 'No valid numbers.';
    },
  },
  {
    name: 'sumlist',
    description: 'Sum a space/comma separated list of numbers.',
    category: 'utility',
    opts: [{ name: 'numbers', description: 'Numbers', required: true, type: 'string' }],
    run: (i) => {
      const a = splitNums(i.options.getString('numbers') ?? '');
      return a.length ? `**Sum:** ${a.reduce((x, y) => x + y, 0)}` : 'No valid numbers.';
    },
  },
  {
    name: 'minlist',
    description: 'Smallest value in a list of numbers.',
    category: 'utility',
    opts: [{ name: 'numbers', description: 'Numbers', required: true, type: 'string' }],
    run: (i) => {
      const a = splitNums(i.options.getString('numbers') ?? '');
      return a.length ? `**Min:** ${Math.min(...a)}` : 'No valid numbers.';
    },
  },
  {
    name: 'maxlist',
    description: 'Largest value in a list of numbers.',
    category: 'utility',
    opts: [{ name: 'numbers', description: 'Numbers', required: true, type: 'string' }],
    run: (i) => {
      const a = splitNums(i.options.getString('numbers') ?? '');
      return a.length ? `**Max:** ${Math.max(...a)}` : 'No valid numbers.';
    },
  },
  {
    name: 'clamp',
    description: 'Clamp a value into a min/max range.',
    category: 'utility',
    opts: [
      { name: 'value', description: 'Value', required: true, type: 'number' },
      { name: 'min', description: 'Minimum', required: true, type: 'number' },
      { name: 'max', description: 'Maximum', required: true, type: 'number' },
    ],
    run: (i) => `**${num(i, 'value')}** → **${Math.min(Math.max(num(i, 'value'), num(i, 'min')), num(i, 'max'))}**`,
  },
  {
    name: 'percent',
    description: 'What percent is A of B?',
    category: 'utility',
    opts: [
      { name: 'a', description: 'Part', required: true, type: 'number' },
      { name: 'b', description: 'Whole', required: true, type: 'number' },
    ],
    run: (i) => {
      const b = num(i, 'b');
      if (b === 0) return 'Cannot divide by zero.';
      return `**${num(i, 'a')} is ${((num(i, 'a') / b) * 100).toFixed(2)}% of ${b}**`;
    },
  },
  {
    name: 'discount',
    description: 'Compute a discounted price.',
    category: 'utility',
    opts: [
      { name: 'amount', description: 'Original price', required: true, type: 'number' },
      { name: 'percent', description: 'Discount %', required: true, type: 'number' },
    ],
    run: (i) => `**${num(i, 'percent')}% off ${num(i, 'amount')}** → **${(num(i, 'amount') * (1 - num(i, 'percent') / 100)).toFixed(2)}**`,
  },
  {
    name: 'tip',
    description: 'Calculate a tip amount.',
    category: 'utility',
    opts: [
      { name: 'amount', description: 'Bill total', required: true, type: 'number' },
      { name: 'percent', description: 'Tip %', required: true, type: 'number' },
    ],
    run: (i) => `**${num(i, 'percent')}% tip on ${num(i, 'amount')}** → **${(num(i, 'amount') * (num(i, 'percent') / 100)).toFixed(2)}**`,
  },
  {
    name: 'interest',
    description: 'Simple interest over N years.',
    category: 'utility',
    opts: [
      { name: 'principal', description: 'Principal', required: true, type: 'number' },
      { name: 'rate', description: 'Annual rate %', required: true, type: 'number' },
      { name: 'years', description: 'Years', required: true, type: 'number' },
    ],
    run: (i) =>
      `**Interest:** ${(num(i, 'principal') * (num(i, 'rate') / 100) * num(i, 'years')).toFixed(2)} **Total:** ${(num(i, 'principal') * (1 + (num(i, 'rate') / 100) * num(i, 'years'))).toFixed(2)}`,
  },
  {
    name: 'dice',
    description: 'Roll a die with the given number of sides.',
    category: 'fun',
    opts: [{ name: 'sides', description: 'Sides (default 6)', required: false, type: 'integer' }],
    run: (i) => `🎲 You rolled **${1 + Math.floor(Math.random() * (int(i, 'sides') || 6))}**`,
  },
  {
    name: 'coinflip',
    description: 'Flip a coin.',
    category: 'fun',
    run: () => `🪙 **${Math.random() < 0.5 ? 'Heads' : 'Tails'}**`,
  },
  {
    name: 'roll',
    description: 'Roll a random number (default d20).',
    category: 'fun',
    opts: [{ name: 'sides', description: 'Sides', required: false, type: 'integer' }],
    run: (i) => `🎲 You rolled **${1 + Math.floor(Math.random() * (int(i, 'sides') || 20))}**`,
  },
])
