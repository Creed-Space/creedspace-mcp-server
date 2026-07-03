# Container image for the Creed Space MCP server (stdio transport).
# Installs the published package from npm; no repo checkout needed at runtime.
# Used by the Docker MCP Catalog and to de-risk Glama's sandboxed build.
FROM node:20-slim

# Pin to the release matching this repo state. Bump alongside package.json version.
RUN npm install -g "@creedspace/mcp-server@1.1.1"

# The server speaks MCP over stdio; the bin from package.json is the entry point.
ENTRYPOINT ["creedspace-mcp"]
