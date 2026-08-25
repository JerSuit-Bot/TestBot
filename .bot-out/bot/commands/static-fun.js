"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Static fun commands — part 1. Real randomness and transforms (no fake data).
 */
const framework_1 = require("./framework");
const EIGHTBALL = [
    'It is certain.', 'Without a doubt.', 'Yes — definitely.', 'You may rely on it.',
    'As I see it, yes.', 'Most likely.', 'Outlook good.', 'Yes.',
    'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.',
    'Cannot predict now.', 'Concentrate and ask again.', 'Do not count on it.',
    'My reply is no.', 'My sources say no.', 'Outlook not so good.', 'Very doubtful.',
];
(0, framework_1.staticCommand)({
    name: '8ball',
    description: 'Ask the magic 8-ball a question.',
    category: 'fun',
    content: (i) => {
        const q = i.options.getString('question') ?? '...';
        return `> ${q}\n🎱 **${EIGHTBALL[Math.floor(Math.random() * EIGHTBALL.length)]}**`;
    },
    builder: (b) => b.addStringOption((o) => o.setName('question').setDescription('Your question').setRequired(true)),
});
(0, framework_1.staticCommand)({
    name: 'rps',
    description: 'Play rock-paper-scissors against the bot.',
    category: 'fun',
    content: (i) => {
        const user = i.options.getString('choice') ?? 'rock';
        const bot = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
        let result;
        if (user === bot)
            result = 'It’s a tie!';
        else if ((user === 'rock' && bot === 'scissors') ||
            (user === 'paper' && bot === 'rock') ||
            (user === 'scissors' && bot === 'paper')) {
            result = 'You win!';
        }
        else {
            result = 'I win!';
        }
        return `You chose **${user}**, I chose **${bot}**.\n${result}`;
    },
    builder: (b) => b.addStringOption((o) => o
        .setName('choice')
        .setDescription('Your move')
        .setRequired(true)
        .addChoices({ name: '🪨 Rock', value: 'rock' }, { name: '📄 Paper', value: 'paper' }, { name: '✂️ Scissors', value: 'scissors' })),
});
(0, framework_1.staticCommand)({
    name: 'morse',
    description: 'Convert text into Morse code.',
    category: 'utility',
    content: (i) => {
        const text = (i.options.getString('text') ?? '').toUpperCase();
        const map = {
            A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
            I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
            Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
            Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
            '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
        };
        const out = Array.from(text)
            .map((c) => (c === ' ' ? '/' : map[c] ? map[c] : c))
            .join(' ');
        return `\`${out.slice(0, 1900)}\``;
    },
    builder: (b) => b.addStringOption((o) => o.setName('text').setDescription('Text to convert').setRequired(true)),
});
(0, framework_1.staticCommand)({
    name: 'joke',
    description: 'Tell a random JerSuit-flavoured joke.',
    category: 'fun',
    content: () => randomOf([
        'Why did the Discord bot go to therapy? Too many unhandled promises.',
        'Why don’t developers like nature? Too many bugs.',
        'How many moderators does it take to change a lightbulb? One — with a warning first.',
        'I told my server a UDP joke… you probably didn’t get it.',
        'Why did the bot break up with the CDN? Connection issues.',
    ]),
});
(0, framework_1.staticCommand)({
    name: 'compliment',
    description: 'Get a sincere compliment.',
    category: 'fun',
    content: (i) => {
        const target = i.options.getUser('user');
        const name = target ? target.username : i.user.username;
        return `**${name}**, ${randomOf([
            'you have great taste in servers.',
            'you make this community better.',
            'you debug like a legend.',
            'your patience is inspiring.',
            'you light up the chat.',
        ])}`;
    },
    builder: (b) => b.addUserOption((o) => o.setName('user').setDescription('Person to compliment').setRequired(false)),
});
(0, framework_1.staticCommand)({
    name: 'mock',
    description: 'Convert text to SpongeBob mocking case.',
    category: 'fun',
    content: (i) => {
        const text = String(i.options.getString('text') ?? '');
        let out = '';
        let upper = true;
        for (const ch of text) {
            if (/[a-zA-Z]/.test(ch)) {
                out += upper ? ch.toUpperCase() : ch.toLowerCase();
                upper = !upper;
            }
            else {
                out += ch;
            }
        }
        return out || 'Provide text to mock.';
    },
    builder: (b) => b.addStringOption((o) => o.setName('text').setDescription('Text').setRequired(true)),
});
(0, framework_1.staticCommand)({
    name: 'textflip',
    description: 'Flip text upside down.',
    category: 'fun',
    content: (i) => {
        const text = String(i.options.getString('text') ?? '');
        const flip = {
            a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ı',
            j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ',
            s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
            '?': '¿', '!': '¡', '.': '˙',
        };
        return [...text].reverse().map((c) => flip[c.toLowerCase()] ?? c).join('') || 'Provide text to flip.';
    },
    builder: (b) => b.addStringOption((o) => o.setName('text').setDescription('Text').setRequired(true)),
});
(0, framework_1.staticCommand)({
    name: 'ship',
    description: 'Compute the compatibility between two users.',
    category: 'fun',
    content: (i) => {
        const a = i.options.getUser('first')?.username ?? 'A';
        const b = i.options.getUser('second')?.username ?? 'B';
        const score = 10 + Math.floor(Math.random() * 91);
        const heart = score > 80 ? '💚💚💚💚💚' : score > 60 ? '💚💚💚💚' : score > 40 ? '💚💚💚' : score > 20 ? '💚💚' : '💚';
        return `${a} + ${b} = **${score}%**\n${heart}`;
    },
    builder: (b) => b
        .addUserOption((o) => o.setName('first').setDescription('First user').setRequired(true))
        .addUserOption((o) => o.setName('second').setDescription('Second user').setRequired(true)),
});
function randomOf(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
