#!/usr/bin/env bash
set -u

echo "=========================================="
echo "   JerSuit V2 - Full Repair & Audit"
echo "=========================================="

ROOT="$(pwd)"

echo
echo "[1/9] Checking project..."
test -f package.json || {
  echo "❌ package.json not found. Run this from project root."
  exit 1
}

echo
echo "[2/9] Creating backup..."
BACKUP=".repair-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

for f in \
  package.json \
  package-lock.json \
  tsconfig.json \
  next.config.js \
  next.config.mjs \
  lib/db.ts \
  lib/services.ts \
  lib/auth.ts
do
  if [ -f "$f" ]; then
    mkdir -p "$BACKUP/$(dirname "$f")"
    cp "$f" "$BACKUP/$f"
  fi
done

echo "✓ Backup: $BACKUP"

echo
echo "[3/9] Installing required local database dependency..."

if ! npm list @electric-sql/pglite >/dev/null 2>&1; then
  npm install @electric-sql/pglite
else
  echo "✓ PGlite already installed"
fi

echo
echo "[4/9] Scanning for Supabase imports..."

grep -RIn \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude='*.lock' \
  -E "@/?lib/supabase|from ['\"]@supabase|createClient\\(" \
  . 2>/dev/null || true

echo
echo "[5/9] Scanning OAuth routes..."

find app/api/auth -type f -print 2>/dev/null || true

echo
echo "[6/9] Scanning database files..."

find . \
  -path ./node_modules -prune -o \
  -path ./.next -prune -o \
  -type f \
  \( -name 'db.ts' -o -name '*database*' -o -name 'schema.prisma' -o -name 'drizzle.config.*' \) \
  -print

echo
echo "[7/9] Clearing Next.js cache..."

rm -rf .next

echo "✓ .next removed"

echo
echo "[8/9] Running TypeScript check..."

if npm run typecheck; then
  echo "✓ TypeScript passed"
else
  echo "⚠ TypeScript has errors."
fi

echo
echo "[9/9] Running production build..."

if npm run build; then
  echo
  echo "=========================================="
  echo "       ✅ BUILD PASSED SUCCESSFULLY"
  echo "=========================================="
else
  echo
  echo "=========================================="
  echo "       ⚠ BUILD STILL HAS ERRORS"
  echo "=========================================="
  echo
  echo "Showing remaining suspicious imports:"
  grep -RIn \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    -E "@/?lib/supabase|@supabase" \
    . 2>/dev/null || true
fi

echo
echo "Backup kept at:"
echo "$BACKUP"

echo
echo "Done."
