#!/usr/bin/env bash
# Mirror the authored Creed Space MCP server (this directory) to its PUBLIC
# GitHub repo. The private Creed-Space/creedspace monorepo is the source of
# truth; the public repo (github.com/Creed-Space/creedspace-mcp-server) is a publish
# target — like npm — so MCP directories/registries can crawl it and Glama/Docker
# can clone it.
#
# The public repo commits src/ (+ config, README, LICENSE, server.json,
# Dockerfile, glama.json, CONTRIBUTING.md) but NOT node_modules/ or dist/
# (installers build from npm). Preserves the public repo's history
# (clones + diffs, no force-push).
set -euo pipefail

SERVER_DIR="$(cd "$(dirname "$0")/.." && pwd)"          # creedspace-mcp-server
PUBLIC_REPO="https://github.com/Creed-Space/creedspace-mcp-server.git"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Cloning $PUBLIC_REPO"
git clone -q "$PUBLIC_REPO" "$WORK"

# Preflight guard (added after the 1.1.2/1.1.3 hardening drift): this script
# mirrors the monorepo working tree over the public repo DESTRUCTIVELY. If the
# monorepo is BEHIND the published npm 'latest' or the current public repo, a sync
# would silently REVERT shipped security hardening (rate limiting, the clean error
# handler, security headers) on the public repo and the live Render deploy. Refuse
# unless the monorepo is the newest of the three. Override with SYNC_FORCE=1 only
# after confirming the monorepo is intentionally authoritative.
MONO_VER="$(node -p "require('$SERVER_DIR/package.json').version" 2>/dev/null || echo 0.0.0)"
PUB_VER="$(node -p "require('$WORK/package.json').version" 2>/dev/null || echo 0.0.0)"
NPM_VER="$(npm view @creedspace/mcp-server version 2>/dev/null || true)"
if [ -z "$NPM_VER" ]; then
  # Fail CLOSED: a registry/auth hiccup must not silently disable the very check
  # this guard exists for (which a `|| echo 0.0.0` default would do).
  echo "ABORT: could not read npm 'latest' for @creedspace/mcp-server (registry/auth issue?)." >&2
  echo "Refusing to sync without the safety check. Re-run with SYNC_FORCE=1 to override." >&2
  [ "${SYNC_FORCE:-}" = "1" ] || exit 1
  NPM_VER=0.0.0
fi
NEWEST="$(printf '%s\n%s\n%s\n' "$MONO_VER" "$PUB_VER" "$NPM_VER" | sort -V | tail -1)"
if [ "$MONO_VER" != "$NEWEST" ]; then
  echo "ABORT: monorepo package.json ($MONO_VER) is BEHIND public ($PUB_VER) / npm latest ($NPM_VER)." >&2
  echo "Syncing now would revert the published hardening. Port the newer source into the" >&2
  echo "monorepo first, or re-run with SYNC_FORCE=1 if the monorepo is intentionally authoritative." >&2
  [ "${SYNC_FORCE:-}" = "1" ] || exit 1
fi

echo "==> Refreshing tracked files from $SERVER_DIR"
find "$WORK" -mindepth 1 -maxdepth 1 -not -name '.git' -exec rm -rf {} +
rsync -a \
  --exclude '.git/' --exclude 'node_modules/' --exclude 'dist/' \
  --exclude 'coverage/' --exclude '.turbo/' --exclude '*.tsbuildinfo' \
  --exclude 'logs/' --exclude '*.mcpb' --exclude '.DS_Store' \
  --exclude '.env' --exclude '.env.mcp' \
  "$SERVER_DIR/" "$WORK/"

# Public .gitignore: commit src/, ignore build artefacts + local env.
cat > "$WORK/.gitignore" <<'EOF'
# Dependencies & build artefacts
node_modules/
dist/
coverage/
.turbo/
*.tsbuildinfo
# Local env & OS cruft
.env
.env.mcp
.DS_Store
logs/
# MCPB bundle artefacts
*.mcpb
EOF

cd "$WORK"
git add -A
if git diff --cached --quiet; then
  echo "==> No changes to mirror."
  exit 0
fi
MONO_SHA="$(cd "$SERVER_DIR" && git rev-parse --short HEAD 2>/dev/null || echo local)"
git -c user.name="Creed-Space" -c user.email="nell@nellwatson.com" \
  commit -qm "Sync from monorepo ${MONO_SHA}"
git push -q origin HEAD:main
echo "==> Mirrored $SERVER_DIR -> $PUBLIC_REPO"
