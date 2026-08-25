"use strict";
/**
 * Shared runtime types for the JerSuit Discord Bot Runtime.
 *
 * These types are intentionally small and free of imports so that any module
 * (events, services, or Dashboard bridges) can reference them without creating
 * import cycles.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUNTIME_STATES = void 0;
/**
 * Safety-critical state transitions. Guards are implemented in the runtime
 * manager itself; this documentation doubles as the single reference for the
 * allowed transitions.
 */
exports.RUNTIME_STATES = [
    'stopped',
    'starting',
    'online',
    'stopping',
    'restarting',
    'error',
];
