# Container image for the Creed Space MCP server.
#
# Defaults to stdio (Docker MCP Catalog / `docker run -i`, Gemini CLI, etc.) so
# the Catalog and Glama sandboxed builds keep working unchanged. The hosted
# Render / Smithery-gateway deploy flips it to Streamable HTTP by setting
# CREEDSPACE_TRANSPORT=http in the service env, which the CLI reads. Installs the
# published package from npm; no repo checkout is needed at runtime.
#
# NOTE: the HTTP dual-mode below currently lives only in this public mirror. It
# must be added to the monorepo's creedspace-mcp-server/Dockerfile, or the next
# sync-to-public.sh run will revert it to stdio-only and a Render redeploy will
# then fail its /health check. See _contprompts/creedspace_mcp_publishing.
FROM node:20-slim

# Pin to the release matching this repo state. Bump alongside package.json version.
RUN npm install -g "@creedspace/mcp-server@1.1.4"

# Default transport. The hosted HTTP deploy overrides this to "http" via env.
ENV CREEDSPACE_TRANSPORT=stdio
# The HTTP deploy injects $PORT at runtime; expose a sensible default for local runs.
EXPOSE 8080

# stdio by default (clean stdin/stdout for the MCP protocol). In http mode, bind
# 0.0.0.0 so the gateway can reach us, honor the injected $PORT, and run one
# transport per request (stateless) so we don't depend on session affinity.
# `exec` replaces the shell so signals and stdio pass straight through.
ENTRYPOINT if [ "$CREEDSPACE_TRANSPORT" = "http" ]; then exec creedspace-mcp --transport http --host 0.0.0.0 --port "${PORT:-8080}" --stateless; else exec creedspace-mcp; fi
