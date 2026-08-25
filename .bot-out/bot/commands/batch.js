"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batch = void 0;
const framework_1 = require("./framework");
function applyBuilder(b, opts) {
    for (const o of opts) {
        switch (o.type) {
            case 'string': {
                b.addStringOption((d) => {
                    let opt = d
                        .setName(o.name)
                        .setDescription(o.description)
                        .setRequired(o.required ?? false);
                    if (o.choices) {
                        opt = opt.addChoices(...o.choices.map((c) => ({ name: c.name, value: c.value })));
                    }
                    return opt;
                });
                break;
            }
            case 'integer':
                b.addIntegerOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
                break;
            case 'number':
                b.addNumberOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
                break;
            case 'boolean':
                b.addBooleanOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
                break;
            case 'user':
                b.addUserOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
                break;
            case 'channel':
                b.addChannelOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
                break;
            case 'role':
                b.addRoleOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
                break;
            case 'mentionable':
                b.addMentionableOption((d) => d.setName(o.name).setDescription(o.description).setRequired(o.required ?? false));
                break;
        }
    }
    return b;
}
function batch(defs) {
    for (const d of defs) {
        (0, framework_1.staticCommand)({
            name: d.name,
            description: d.description,
            category: d.category,
            cooldown: d.cooldown ?? 2,
            ownerOnly: d.ownerOnly,
            guildOnly: d.guildOnly ?? true,
            memberPermissions: d.memberPermissions ?? null,
            usage: d.usage,
            examples: d.examples,
            builder: (b) => (d.opts && d.opts.length > 0 ? applyBuilder(b, d.opts) : b),
            content: (i) => d.run(i),
        });
    }
}
exports.batch = batch;
