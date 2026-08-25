#!/usr/bin/env bash
cd /workspaces/TestBot || exit 1
# Source .env.local so its values override the injected (stale) shell env
set -a
. ./.env.local
set +a
# Start the production server detached
exec npx next start -p 3000