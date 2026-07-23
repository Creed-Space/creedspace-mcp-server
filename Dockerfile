# Container image for the Creed Space MCP server.
#
# Defaults to stdio (Docker MCP Catalog / `docker run -i`, Gemini CLI, etc.) so
# the Catalog and Glama sandboxed builds keep working unchanged. The hosted
# Render / Smithery-gateway deploy flips it to Streamable HTTP by setting
# CREEDSPACE_TRANSPORT=http in the service env, which the CLI reads.
#
# Builds from THIS repo's source (multi-stage), so deploys always ship the
# checked-out commit. Previously the image installed the pinned npm release,
# which silently decoupled deploys from the repo: the 1.1.4 release bumped every
# version surface except the pin, and Render kept shipping 1.1.3. Source builds
# make that failure class impossible; npm remains the distribution channel for
# end users, not for this image.
#
# NOTE: this Dockerfile lives in the public mirror. Sync any changes into the
# monorepo's creedspace-mcp-server/Dockerfile or the next sync-to-public.sh run
# will revert them. See _contprompts/creedspace_mcp_publishing.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Default transport. The hosted HTTP deploy overrides this to "http" via env.
ENV CREEDSPACE_TRANSPORT=stdio
# The HTTP deploy injects $PORT at runtime; expose a sensible default for local runs.
EXPOSE 8080

# stdio by default (clean stdin/stdout for the MCP protocol). In http mode, bind
# 0.0.0.0 so the gateway can reach us, honor the injected $PORT, and run one
# transport per request (stateless) so we don't depend on session affinity.
# `exec` replaces the shell so signals and stdio pass straight through.
ENTRYPOINT if [ "$CREEDSPACE_TRANSPORT" = "http" ]; then exec node /app/dist/cli.js --transport http --host 0.0.0.0 --port "${PORT:-8080}" --stateless; else exec node /app/dist/cli.js; fi
