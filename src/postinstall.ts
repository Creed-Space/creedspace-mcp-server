#!/usr/bin/env node

// Postinstall script to provide helpful setup instructions
console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎯 Creed Space MCP Server Installed Successfully!       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Quick Start:
───────────
1. Test the connection:
   npx creedspace-mcp test

2. Generate configuration:
   npx creedspace-mcp --generate-config

3. Run with a persona:
   npx creedspace-mcp --persona ambassador

For Claude Desktop:
──────────────────
Add to your claude_desktop_config.json:

{
  "mcpServers": {
    "creedspace": {
      "command": "npx",
      "args": ["@creedspace/mcp-server", "--persona", "ambassador"]
    }
  }
}

Learn more: https://www.creed.space
`);
