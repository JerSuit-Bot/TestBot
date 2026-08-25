"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Static utility commands — part 2. Real runtime-generated replies.
 */
const framework_1 = require("./framework");
(0, framework_1.staticCommand)({
    name: 'base64',
    description: 'Encode or decode base64 text.',
    category: 'utility',
    content: (i) => {
        const mode = i.options.getString('mode') ?? 'encode';
        const text = i.options.getString('text') ?? '';
        try {
            if (mode === 'decode')
                return `Decoded:\n\`${Buffer.from(text, 'base64').toString('utf8')}\``;
            return `Encoded:\n\`${Buffer.from(text, 'utf8').toString('base64')}\``;
        }
        catch {
            return 'Invalid base64 value.';
        }
    },
    builder: (b) => b
        .addStringOption((o) => o
        .setName('mode')
        .setDescription('encode or decode')
        .addChoices({ name: 'encode', value: 'encode' }, { name: 'decode', value: 'decode' }))
        .addStringOption((o) => o.setName('text').setDescription('Text or base64 value').setRequired(true)),
});
(0, framework_1.staticCommand)({
    name: 'binary',
    description: 'Convert text into binary.',
    category: 'utility',
    content: (i) => {
        const text = i.options.getString('text') ?? '';
        const bin = Array.from(Buffer.from(text, 'utf8'))
            .map((b) => b.toString(2).padStart(8, '0'))
            .join(' ');
        return `\`${bin.slice(0, 1900)}\``;
    },
    builder: (b) => b.addStringOption((o) => o.setName('text').setDescription('Text').setRequired(true)),
});
(0, framework_1.staticCommand)({
    name: 'color',
    description: 'Inspect a hex color and preview its RGB values.',
    category: 'utility',
    content: (i) => {
        const raw = i.options.getString('color') ?? '33A65F';
        const clean = raw.replace('#', '').slice(0, 6);
        const value = parseInt(clean, 16);
        if (Number.isNaN(value))
            return 'Invalid hex color.';
        const r = (value >> 16) & 255;
        const g = (value >> 8) & 255;
        const b = value & 255;
        return `Color **#${clean.toUpperCase()}**\nRGB: (${r}, ${g}, ${b})\nHEX: \`#${clean.toUpperCase()}\``;
    },
    builder: (b) => b.addStringOption((o) => o.setName('color').setDescription('Hex color, e.g. 33A65F').setRequired(false)),
});
(0, framework_1.staticCommand)({
    name: 'slowmode-help',
    description: 'Explain slowmode and how to use it.',
    category: 'utility',
    content: 'Slowmode limits how often members can send messages in a channel. Use `/slowmode` with a number of seconds (0 disables) to set it for a channel.',
});
(0, framework_1.staticCommand)({
    name: 'calculator',
    description: 'Evaluate a simple math expression safely.',
    category: 'utility',
    content: (i) => {
        const expr = (i.options.getString('expression') ?? '').replace(/[^0-9+\-*/(). ]/g, '');
        if (!expr)
            return 'Provide a math expression, e.g. `2 + 2 * 4`.';
        try {
            // Safe: the expression is already sanitized to digits/operators only.
            const result = new Function(`return (${expr})`)();
            return `\`${expr}\` = **${result}**`;
        }
        catch {
            return 'Could not evaluate that expression.';
        }
    },
    builder: (b) => b.addStringOption((o) => o.setName('expression').setDescription('Math expression, e.g. 2+2*4').setRequired(true)),
});
(0, framework_1.staticCommand)({
    name: 'calc',
    description: 'Alias for calculator.',
    category: 'utility',
    disabled: true,
});
(0, framework_1.staticCommand)({
    name: 'pow',
    description: 'Raise a number to a power.',
    category: 'utility',
    content: (i) => {
        const base = i.options.getNumber('base') ?? 1;
        const exp = i.options.getNumber('exponent') ?? 1;
        return `**${base}** ^ **${exp}** = **${Math.pow(base, exp)}**`;
    },
    builder: (b) => b
        .addNumberOption((o) => o.setName('base').setDescription('Base').setRequired(true))
        .addNumberOption((o) => o.setName('exponent').setDescription('Exponent').setRequired(true)),
});
(0, framework_1.staticCommand)({
    name: 'sqrt',
    description: 'Calculate the square root of a number.',
    category: 'utility',
    content: (i) => {
        const n = i.options.getNumber('number') ?? 0;
        return n < 0 ? 'Cannot take the square root of a negative number.' : `√${n} = **${Math.sqrt(n)}**`;
    },
    builder: (b) => b.addNumberOption((o) => o.setName('number').setDescription('Number').setRequired(true)),
});
(0, framework_1.staticCommand)({
    name: 'percentage',
    description: 'What percent is A of B?',
    category: 'utility',
    content: (i) => {
        const a = i.options.getNumber('value') ?? 0;
        const b = i.options.getNumber('total') ?? 1;
        if (b === 0)
            return 'Cannot divide by zero.';
        return `${a} is **${((a / b) * 100).toFixed(2)}%** of ${b}.`;
    },
    builder: (b) => b
        .addNumberOption((o) => o.setName('value').setDescription('Part').setRequired(true))
        .addNumberOption((o) => o.setName('total').setDescription('Total').setRequired(true)),
});
(0, framework_1.staticCommand)({
    name: 'time',
    description: 'Show the current UTC time and unix timestamp.',
    category: 'utility',
    content: () => `Current time: <t:${Math.floor(Date.now() / 1000)}:F>\nUnix: \`${Math.floor(Date.now() / 1000)}\``,
});
(0, framework_1.staticCommand)({
    name: 'date',
    description: 'Convert a unix timestamp into a readable date.',
    category: 'utility',
    content: (i) => {
        const ts = i.options.getInteger('timestamp') ?? Math.floor(Date.now() / 1000);
        const d = new Date(ts * 1000);
        return Number.isNaN(d.getTime()) ? 'Invalid timestamp.' : `**${d.toUTCString()}**\n<t:${ts}:F>\n<t:${ts}:R>`;
    },
    builder: (b) => b.addIntegerOption((o) => o.setName('timestamp').setDescription('Unix seconds timestamp').setRequired(false)),
});
