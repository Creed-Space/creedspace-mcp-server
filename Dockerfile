# Container image for the Creed Space MCP server.
#
# Defaults to stdio (Docker MCP Catalog / `docker run -i`, Gemini CLI, etc.).
# Smithery flips it to Streamable HTTP by setting CREEDSPACE_TRANSPORT=http
# (declared in smithery.yaml `env`), which the CLI reads. Installs the
# published package from npm; no repo checkout is needed at runtime.
FROM node:20-slim

# Pin to the release matching this repo state. Bump alongside package.json version.
RUN npm install -g "@creedspace/mcp-server@1.1.1"

# Default transport. Smithery overrides this to "http" via smithery.yaml `env`.
ENV CREEDSPACE_TRANSPORT=stdio
# Smithery injects $PORT at runtime; expose a sensible default for local runs.
EXPOSE 8080

# stdio by default (clean stdin/stdout for the MCP protocol). In http mode, bind
# 0.0.0.0 so the gateway can reach us, honor Smithery's injected $PORT, and run
# one transport per request (stateless) so we don't depend on session affinity.
# `exec` replaces the shell so signals and stdio pass straight through.
ENTRYPOINT if [ "$CREEDSPACE_TRANSPORT" = "http" ]; then exec creedspace-mcp --transport http --host 0.0.0.0 --port "${PORT:-8080}" --stateless; else exec creedspace-mcp; fi
