"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Command entry — imports every command module for its registration side
 * effects. New command files only need to be imported here.
 */
require("./info/ping");
require("./info/botinfo");
require("./info/help");
require("./info.meta");
require("./moderation");
require("./static-fun");
require("./static-utility");
require("./static-utility2");
require("./static-math");
require("./static-encode");
require("./static-convert");
