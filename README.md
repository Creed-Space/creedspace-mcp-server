# creedspace-mcp-server

Universal MCP server for Creed Space - AI safety guardrails in 10 seconds.

[![npm version](https://img.shields.io/npm/v/@creedspace/mcp-server.svg)](https://www.npmjs.com/package/@creedspace/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Available in

The server is published to the canonical MCP catalogues, so registry-aware clients can discover and install it directly — or use any command in [Quick Start](#quick-start) below.

- **[npm](https://www.npmjs.com/package/@creedspace/mcp-server)** — `@creedspace/mcp-server`, the package every install path resolves to.
- **[Official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.Creed-Space/creedspace-mcp-server)** — `io.github.Creed-Space/creedspace-mcp-server`.
- **[GitHub](https://github.com/Creed-Space/creedspace-mcp-server)** — source, issues, and the `server.json` manifest.

Also rolling out across the wider MCP ecosystem: [mcp.directory](https://mcp.directory), [mcpservers.org](https://mcpservers.org), [PulseMCP](https://www.pulsemcp.com) (via the registry ingest), [mcp.so](https://mcp.so), and [Smithery](https://smithery.ai).

## Quick Start

```bash
# STDIO transport (Claude Desktop, OpenAI Codex)
npx @creedspace/mcp-server --persona ambassador

# HTTP transport (OpenAI Agents SDK)
npx @creedspace/mcp-server --transport http --port 3100

# Test API connection
npx @creedspace/mcp-server test
```

## What is Creed Space?

Creed Space provides personalized AI safety guardrails through Constitutional AI personas. Each persona enforces specific values and behaviors, ensuring AI assistants operate within defined ethical boundaries.

- 🛡️ **Reduces harmful AI outputs** via constitutional evaluation of every response
- 🎯 **Refuses dangerous prompts** according to the active persona's values
- 🚀 **10-second setup** with any MCP-compatible AI

## Available Personas

| Persona | Icon | Purpose |
|---------|------|---------|
| Ambassador | 🤝 | Professional communication |
| Nanny | 👶 | Child-safe interactions |
| Sentinel | 🛡️ | Privacy and security focus |
| Godparent | 🕊️ | Religious and ethical guidance |
| Muse | 🎨 | Creative exploration |
| Anchor | ⚓ | Reality grounding |

## Installation

### Option 1: Use with npx (Recommended)
```bash
# No installation needed - just run!
npx @creedspace/mcp-server --persona ambassador
```

### Option 2: Global Installation
```bash
npm install -g @creedspace/mcp-server
creedspace-mcp --persona ambassador
```

### Option 3: Project Dependency
```bash
npm install @creedspace/mcp-server
```

## Claude Desktop Integration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "creedspace": {
      "command": "npx",
      "args": ["@creedspace/mcp-server", "--persona", "ambassador"]
    }
  }
}
```

Then restart Claude Desktop to load the Creed Space guardrails.

## Configuration

### Environment Variables
```bash
# .env file
CREEDSPACE_API_URL=https://api.creed.space
CREEDSPACE_API_KEY=your-api-key-here  # Optional
CREEDSPACE_DEFAULT_PERSONA=ambassador
```

### Command Line Options
```bash
creedspace-mcp \
  --persona ambassador \
  --url https://api.creed.space \
  --api-key YOUR_KEY \
  --cache-ttl 300000 \
  --offline

# HTTP Transport Options
creedspace-mcp \
  --transport http \
  --port 3100 \
  --host localhost \
  --api-key YOUR_KEY \
  --cors \
  --cors-origin http://localhost:3000 \
  --stateless
```

### Transport Types

| Transport | Use Case | Platforms |
|-----------|----------|-----------|
| `stdio` (default) | Local subprocess communication | Claude Desktop, OpenAI Codex |
| `http` | HTTP server for remote/local connections | OpenAI Agents SDK, custom integrations |

### Configuration File
```bash
# Generate example configs
creedspace-mcp --generate-config

# Use config file
creedspace-mcp --config creedspace.json
```

## Available MCP Tools

The server provides 16 tools to MCP clients:

**Constitutions**
- `get_constitution` - Get the merged constitution for a persona
- `get_constitution_by_id` - Get a specific constitution by ID
- `search_constitutions` - Search the constitution library

**Personas**
- `list_personas` - List all available personas
- `set_persona` - Switch the active persona
- `get_active_persona` - Get the currently active persona
- `get_uvc_qualities` - Get desired/disliked/never qualities
- `get_system_prompt` - Get a complete persona system prompt
- `preview_export` - Preview the export configuration

**Runtime guardrails**
- `adjudicate` - Get a policy decision kernel for a request
- `attest_response` - Validate a response against the active creed
- `get_anchor` - Get a compact non-negotiable-rules anchor
- `heartbeat` - Periodic re-anchoring to prevent context drift
- `clear_cache` - Clear the local cache

**Multi-scale value handshake**
- `perform_multi_scale_handshake` - N-party value handshake across micro/meso/macro scales
- `get_scale_attestation` - Get an attestation record with hash chain

## Programmatic Usage

```javascript
import { CreedSpaceMCPServer } from '@creedspace/mcp-server';

// Start server programmatically
const server = new CreedSpaceMCPServer({
  persona: 'ambassador',
  apiUrl: 'https://api.creed.space',
  cacheEnabled: true
});

await server.start();
```

```javascript
// Use the API client directly
import { CreedSpaceClient } from '@creedspace/mcp-server';

const client = new CreedSpaceClient();
const personas = await client.getPersonas();
const constitution = await client.getMergedConstitution('ambassador');
```

## Platform Integration Examples

### OpenAI Agents SDK (HTTP Transport)

```python
from agents import Agent
from agents.mcp import MCPServerStreamableHttp

# Start the server first:
# npx @creedspace/mcp-server --transport http --port 3100

server = MCPServerStreamableHttp(
    url="http://localhost:3100/mcp",
    name="creedspace"
)

agent = Agent(
    name="safe-agent",
    tools=[server.get_tools()]
)

# The agent now has access to Creed Space safety tools
```

### OpenAI Codex (STDIO Transport)

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.creedspace]
command = "npx"
args = ["@creedspace/mcp-server", "--persona", "ambassador"]

[mcp_servers.creedspace.env]
CREEDSPACE_API_URL = "https://api.creed.space"
```

### VS Code / Cursor
```json
{
  "mcp.servers": {
    "creedspace": {
      "command": "npx",
      "args": ["@creedspace/mcp-server", "--persona", "ambassador"]
    }
  }
}
```

### Continue.dev
```json
{
  "models": [{
    "provider": "openai",
    "mcp_servers": [{
      "command": "npx",
      "args": ["@creedspace/mcp-server"]
    }]
  }]
}
```

### LangChain
```python
from langchain.tools import MCPTool

creedspace = MCPTool(
    command="npx",
    args=["@creedspace/mcp-server", "--persona", "ambassador"]
)
```

## Testing

```bash
# Test API connection
npx @creedspace/mcp-server test

# Test with specific URL
npx @creedspace/mcp-server test --url http://localhost:8000
```

## Offline Mode

The server includes intelligent caching for offline usage:

```bash
# Enable offline mode with cached data
creedspace-mcp --offline --persona ambassador
```

## Development

```bash
# Clone the repository
git clone https://github.com/Creed-Space/creedspace-mcp-server.git
cd creedspace-mcp-server

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## API Documentation

Full API documentation available at [https://api.creed.space/api-docs](https://api.creed.space/api-docs)

## Support

- 🌐 Website: [https://www.creed.space](https://www.creed.space)
- 📧 Email: support@creed.space
- 🐛 Issues: [GitHub Issues](https://github.com/Creed-Space/creedspace-mcp-server/issues)
- 💬 Discord: [Join our community](https://discord.gg/creedspace)

## License

MIT © [Nell Watson](https://github.com/nellwatson)

---

*Building critical AI safety infrastructure that shapes autonomous AI-human value interaction.*
