/**
 * Moderation commands — barrel imports register every moderation command.
 *
 * Sub-modules use `defineCommand` for their registration side effects, so a
 * plain `import './x'` is sufficient.
 */
import './actions';
import './channels';
import './roles';
import './voice';
import './utility';
