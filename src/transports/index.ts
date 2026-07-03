/**
 * Transport modules for Creed Space MCP Server
 *
 * Exports different transport implementations for MCP communication:
 * - stdio: Standard input/output (default, for Claude Desktop)
 * - http: HTTP/Streamable HTTP (for OpenAI Agents SDK, Codex)
 */

export { startHttpTransport, type HttpTransportConfig, type HttpTransportHandle } from './http.js';

// Re-export SDK transports for convenience
export { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
export { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
export { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
