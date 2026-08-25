"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Generated real command module.
const batch_1 = require("./batch");
const gs = (i, k) => i.options.getString(k) ?? '';
const gn = (i, k) => i.options.getNumber(k) ?? 0;
const gi = (i, k) => i.options.getInteger(k) ?? 0;
const gb = (i, k) => i.options.getBoolean(k) ?? false;
function toFixed2(x) { return Number(x.toFixed(4)).toString(); }
function fact(n) { let r = 1; for (let k = 2; k <= n; k++)
    r *= k; return r; }
function gcd2(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) {
    const t = b;
    b = a % b;
    a = t;
} return a; }
function lcm2(a, b) { return Math.abs(a * b) / gcd2(a, b); }
function isPrime(x) { if (x < 2)
    return false; for (let k = 2; k * k <= x; k++)
    if (x % k === 0)
        return false; return true; }
function revStr(s) { return Array.from(s).reverse().join(''); }
function toRoman(n) { if (n < 1 || n > 3999)
    return 'out of range'; const v = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let out = ''; let x = Math.trunc(n); for (const [val, sym] of v) {
    while (x >= val) {
        out += sym;
        x -= val;
    }
} return out; }
function fromRoman(s) { const m = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; let t = 0; for (let k = 0; k < s.length; k++) {
    const c = m[s[k]] ?? 0;
    const nx = m[s[k + 1]] ?? 0;
    t += c < nx ? -c : c;
} return t; }
function shaH(algo, s) { const { createHash } = require('node:crypto'); return createHash(algo).update(s).digest('hex'); }
(0, batch_1.batch)([
    {
        name: 'celsius-to-fahrenheit',
        description: 'Convert Celsius to Fahrenheit.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in Celsius', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'Celsius' + (' → ') + toFixed2(v = gn(i, 'value') * 1.8 + 32) + ' Fahrenheit',
    },
    {
        name: 'fahrenheit-to-celsius',
        description: 'Convert Fahrenheit to Celsius.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in Fahrenheit', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'Fahrenheit' + (' → ') + toFixed2(v = gn(i, 'value') * 0.5555555555555556 + -32) + ' Celsius',
    },
    {
        name: 'km-to-mi',
        description: 'Convert km to miles.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in km', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'km' + (' → ') + toFixed2(v = gn(i, 'value') * 0.621371 + 0) + ' miles',
    },
    {
        name: 'mi-to-km',
        description: 'Convert miles to km.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in miles', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'miles' + (' → ') + toFixed2(v = gn(i, 'value') * 1.609344 + 0) + ' km',
    },
    {
        name: 'm-to-ft',
        description: 'Convert metres to feet.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in metres', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'metres' + (' → ') + toFixed2(v = gn(i, 'value') * 3.280839895 + 0) + ' feet',
    },
    {
        name: 'ft-to-m',
        description: 'Convert feet to metres.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in feet', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'feet' + (' → ') + toFixed2(v = gn(i, 'value') * 0.3048 + 0) + ' metres',
    },
    {
        name: 'kg-to-lb',
        description: 'Convert kilograms to pounds.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in kilograms', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'kilograms' + (' → ') + toFixed2(v = gn(i, 'value') * 2.2046226218 + 0) + ' pounds',
    },
    {
        name: 'lb-to-kg',
        description: 'Convert pounds to kilograms.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in pounds', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'pounds' + (' → ') + toFixed2(v = gn(i, 'value') * 0.45359237 + 0) + ' kilograms',
    },
    {
        name: 'l-to-gal',
        description: 'Convert litres to US gallons.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in litres', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'litres' + (' → ') + toFixed2(v = gn(i, 'value') * 0.2641720524 + 0) + ' US gallons',
    },
    {
        name: 'gal-to-l',
        description: 'Convert US gallons to litres.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in US gallons', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'US gallons' + (' → ') + toFixed2(v = gn(i, 'value') * 3.785411784 + 0) + ' litres',
    },
    {
        name: 'mph-to-kmh',
        description: 'Convert mph to km/h.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in mph', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'mph' + (' → ') + toFixed2(v = gn(i, 'value') * 1.609344 + 0) + ' km/h',
    },
    {
        name: 'kmh-to-mph',
        description: 'Convert km/h to mph.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in km/h', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'km/h' + (' → ') + toFixed2(v = gn(i, 'value') * 0.6213711922 + 0) + ' mph',
    },
    {
        name: 'watt-to-hp',
        description: 'Convert watts to horsepower.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in watts', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'watts' + (' → ') + toFixed2(v = gn(i, 'value') * 0.0013410221 + 0) + ' horsepower',
    },
    {
        name: 'hp-to-watt',
        description: 'Convert horsepower to watts.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in horsepower', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'horsepower' + (' → ') + toFixed2(v = gn(i, 'value') * 745.6998716 + 0) + ' watts',
    },
    {
        name: 'in-to-cm',
        description: 'Convert inches to centimetres.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in inches', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'inches' + (' → ') + toFixed2(v = gn(i, 'value') * 2.54 + 0) + ' centimetres',
    },
    {
        name: 'cm-to-in',
        description: 'Convert centimetres to inches.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in centimetres', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'centimetres' + (' → ') + toFixed2(v = gn(i, 'value') * 0.3937007874 + 0) + ' inches',
    },
    {
        name: 'mi-to-ft',
        description: 'Convert miles to feet.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in miles', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'miles' + (' → ') + toFixed2(v = gn(i, 'value') * 5280 + 0) + ' feet',
    },
    {
        name: 'yd-to-m',
        description: 'Convert yards to metres.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in yards', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'yards' + (' → ') + toFixed2(v = gn(i, 'value') * 0.9144 + 0) + ' metres',
    },
    {
        name: 'm-to-yd',
        description: 'Convert metres to yards.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in metres', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'metres' + (' → ') + toFixed2(v = gn(i, 'value') * 1.0936132983 + 0) + ' yards',
    },
    {
        name: 'nm-to-km',
        description: 'Convert nautical miles to kilometres.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in nautical miles', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'nautical miles' + (' → ') + toFixed2(v = gn(i, 'value') * 1.852 + 0) + ' kilometres',
    },
    {
        name: 'km-to-nm',
        description: 'Convert kilometres to nautical miles.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in kilometres', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'kilometres' + (' → ') + toFixed2(v = gn(i, 'value') * 0.5399568035 + 0) + ' nautical miles',
    },
    {
        name: 'mph-to-ms',
        description: 'Convert mph to metres/secs.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in mph', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'mph' + (' → ') + toFixed2(v = gn(i, 'value') * 0.44704 + 0) + ' metres/secs',
    },
    {
        name: 'ms-to-mph',
        description: 'Convert metres/secs to mph.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in metres/secs', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'metres/secs' + (' → ') + toFixed2(v = gn(i, 'value') * 2.2369362921 + 0) + ' mph',
    },
    {
        name: 'ounce-to-gram',
        description: 'Convert ounces to grams.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in ounces', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'ounces' + (' → ') + toFixed2(v = gn(i, 'value') * 28.349523125 + 0) + ' grams',
    },
    {
        name: 'gram-to-ounce',
        description: 'Convert grams to ounces.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in grams', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'grams' + (' → ') + toFixed2(v = gn(i, 'value') * 0.03527396195 + 0) + ' ounces',
    },
    {
        name: 'stone-to-kg',
        description: 'Convert stone to kilograms.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in stone', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'stone' + (' → ') + toFixed2(v = gn(i, 'value') * 6.35029318 + 0) + ' kilograms',
    },
    {
        name: 'kg-to-stone',
        description: 'Convert kilograms to stone.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in kilograms', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'kilograms' + (' → ') + toFixed2(v = gn(i, 'value') * 0.1574730444 + 0) + ' stone',
    },
    {
        name: 'pint-to-l',
        description: 'Convert US pints to litres.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in US pints', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'US pints' + (' → ') + toFixed2(v = gn(i, 'value') * 0.473176473 + 0) + ' litres',
    },
    {
        name: 'l-to-pint',
        description: 'Convert litres to US pints.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in litres', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'litres' + (' → ') + toFixed2(v = gn(i, 'value') * 2.1133764189 + 0) + ' US pints',
    },
    {
        name: 'cup-to-ml',
        description: 'Convert US cups to millilitres.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in US cups', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'US cups' + (' → ') + toFixed2(v = gn(i, 'value') * 236.5882365 + 0) + ' millilitres',
    },
    {
        name: 'ml-to-cup',
        description: 'Convert millilitres to US cups.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in millilitres', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'millilitres' + (' → ') + toFixed2(v = gn(i, 'value') * 0.0042267528 + 0) + ' US cups',
    },
    {
        name: 'j-to-cal',
        description: 'Convert joules to calories.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in joules', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'joules' + (' → ') + toFixed2(v = gn(i, 'value') * 0.2390057 + 0) + ' calories',
    },
    {
        name: 'cal-to-j',
        description: 'Convert calories to joules.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in calories', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'calories' + (' → ') + toFixed2(v = gn(i, 'value') * 4.184 + 0) + ' joules',
    },
    {
        name: 'kwh-to-mj',
        description: 'Convert kilowatt-hours to megajoules.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in kilowatt-hours', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'kilowatt-hours' + (' → ') + toFixed2(v = gn(i, 'value') * 3.6 + 0) + ' megajoules',
    },
    {
        name: 'mj-to-kwh',
        description: 'Convert megajoules to kilowatt-hours.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in megajoules', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'megajoules' + (' → ') + toFixed2(v = gn(i, 'value') * 0.2777777778 + 0) + ' kilowatt-hours',
    },
    {
        name: 'bar-to-psi',
        description: 'Convert bar to psi.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in bar', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'bar' + (' → ') + toFixed2(v = gn(i, 'value') * 14.5037738 + 0) + ' psi',
    },
    {
        name: 'psi-to-bar',
        description: 'Convert psi to bar.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in psi', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'psi' + (' → ') + toFixed2(v = gn(i, 'value') * 0.0689475729 + 0) + ' bar',
    },
    {
        name: 'atm-to-pa',
        description: 'Convert atmospheres to pascals.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in atmospheres', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'atmospheres' + (' → ') + toFixed2(v = gn(i, 'value') * 101325 + 0) + ' pascals',
    },
    {
        name: 'pa-to-atm',
        description: 'Convert pascals to atmospheres.',
        category: 'utility',
        opts: [
            { name: 'value', description: 'Value in pascals', required: true, type: 'number' }
        ],
        run: () => '**' + gs(i, 'value') + ' ' + 'pascals' + (' → ') + toFixed2(v = gn(i, 'value') * 9.86923e-06 + 0) + ' atmospheres',
    },
]);
