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
