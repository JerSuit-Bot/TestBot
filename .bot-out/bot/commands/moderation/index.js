"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Moderation commands — barrel imports register every moderation command.
 *
 * Sub-modules use `defineCommand` for their registration side effects, so a
 * plain `import './x'` is sufficient.
 */
require("./actions");
require("./channels");
require("./roles");
require("./voice");
require("./utility");
