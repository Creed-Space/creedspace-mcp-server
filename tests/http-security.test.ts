/**
 * HTTP Transport Security Tests
 *
 * Negative tests for the HTTP transport auth + CORS controls (finding #26:
 * "HTTP MCP transport is unauthenticated with permissive CORS when apiKey is
 * absent"). These start the real `startHttpTransport` server on a fixed local
 * port and probe it with `fetch`. Every request here is short-circuited by the
 * auth/CORS middleware before any MCP tool dispatch, so no live API/DB is
 * needed.
 *
 * Properties under test:
 *  - CORS defaults to disabled: no `Access-Control-Allow-Origin` is emitted, so
 *    a browser cross-origin read is blocked (the browser-vector half of #26).
 *  - When CORS is explicitly enabled, an API key or explicit allowlist is required.
 *  - When an apiKey is set, `/mcp` requires a valid Bearer token:
 *      * missing Authorization header -> 401
 *      * wrong token -> 403
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { startHttpTransport, type HttpTransportConfig } from '../src/transports/http';
import type { HttpTransportHandle } from '../src/transports/http';
import { CreedSpaceMCPServer } from '../src/server';

// Each server instance binds a UNIQUE port. startHttpTransport resolves its
// handle with config.port (not the OS-assigned port), so port 0 would not tell
// us where it bound — a fixed, known port is required to address it. But reusing
// ONE fixed port across the suite is unsafe: the global `fetch` (undici) pools
// keep-alive sockets by host:port, so a later request can reuse a socket left
// over from a previously-closed server on that port and fail with
// `SocketError: other side closed` (older bundled undici does not retry the
// idempotent GET; newer undici does — a flaky, Node-version-dependent failure).
// A monotonic counter gives every server its own port, keeping each test hermetic.
let nextTestPort = 31199;

function makeServer(): Server {
  // A bare MCP Server is enough: the auth/CORS middleware runs before any tool
  // dispatch, so handlers are never invoked in these negative tests.
  return new Server(
    { name: 'creedspace-test', version: '0.0.0' },
    { capabilities: { tools: {} } }
  );
}

async function startTransport(
  overrides: Partial<HttpTransportConfig>
): Promise<HttpTransportHandle> {
  const config: HttpTransportConfig = {
    port: nextTestPort++,
    host: '127.0.0.1',
    corsEnabled: false,
    stateless: true,
    enableJsonResponse: true,
    ...overrides,
  };
  return startHttpTransport(makeServer(), config);
}

describe('HTTP Transport Security', () => {
  let handle: HttpTransportHandle | undefined;
  // Suppress (and later restore) console.error noise without depending on the
  // `jest` namespace type: the spy is captured locally and restored via a closure.
  let restoreConsoleError: () => void = () => {};

  beforeEach(() => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    restoreConsoleError = () => spy.mockRestore();
  });

  afterEach(async () => {
    if (handle) {
      await handle.close();
      handle = undefined;
    }
    restoreConsoleError();
  });

  describe('Source default (secure-by-default)', () => {
    it('defaults httpConfig.cors to false when no http config is provided', () => {
      // Regression for finding #26: the server default must NOT enable CORS.
      // This assertion fails on the old `cors: true` default.
      const server = new CreedSpaceMCPServer();
      const httpConfig = (server as unknown as { httpConfig: { cors: boolean } })
        .httpConfig;
      expect(httpConfig.cors).toBe(false);
    });

    it('programmatic quick-start helper does not enable CORS by default', () => {
      const source = readFileSync(path.resolve(__dirname, '../src/index.ts'), 'utf8');
      const quickStart = source.slice(source.indexOf('export async function startCreedSpaceServer'));

      expect(quickStart).not.toContain('cors: true');
      expect(quickStart).toContain('cors: false');
    });
  });

  describe('CORS default (secure-by-default)', () => {
    it('does not emit Access-Control-Allow-Origin when CORS is disabled', async () => {
      handle = await startTransport({ corsEnabled: false });

      // A browser cross-origin request carries an Origin header. With CORS off,
      // the server must not reflect/allow the origin, so the browser blocks the
      // cross-origin read.
      const res = await fetch(`http://${handle.host}:${handle.port}/health`, {
        headers: { Origin: 'http://evil.example' },
      });

      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('refuses wildcard CORS without an API key', async () => {
      await expect(startTransport({ corsEnabled: true })).rejects.toThrow(/wildcard CORS|API key/i);
    });

    it('emits Access-Control-Allow-Origin when CORS has an explicit allowlist', async () => {
      handle = await startTransport({
        corsEnabled: true,
        corsOrigins: ['http://localhost:3000'],
      });

      const res = await fetch(`http://${handle.host}:${handle.port}/health`, {
        headers: { Origin: 'http://localhost:3000' },
      });

      expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    });
  });

  describe('Startup guard: unauthenticated non-loopback bind (finding REWIND-FRESH-004)', () => {
    // The guard reads MCP_ALLOW_INSECURE_HTTP at call time; isolate it so one
    // test cannot leak the opt-out into a later one (which would silently stop
    // the throwing tests from throwing).
    let savedAllowInsecure: string | undefined;

    beforeEach(() => {
      savedAllowInsecure = process.env.MCP_ALLOW_INSECURE_HTTP;
      delete process.env.MCP_ALLOW_INSECURE_HTTP;
    });

    afterEach(() => {
      if (savedAllowInsecure === undefined) {
        delete process.env.MCP_ALLOW_INSECURE_HTTP;
      } else {
        process.env.MCP_ALLOW_INSECURE_HTTP = savedAllowInsecure;
      }
    });

    it('THROWS on a non-loopback host (0.0.0.0) with no apiKey', async () => {
      // On the old code this resolves a live, unauthenticated server bound to
      // all interfaces; the guard now refuses to start. No handle is created,
      // so nothing needs cleanup.
      await expect(
        startTransport({ host: '0.0.0.0', corsEnabled: false })
      ).rejects.toThrow(/MCP_ALLOW_INSECURE_HTTP|API key/i);
    });

    it('does NOT throw on a non-loopback host when an apiKey is set', async () => {
      handle = await startTransport({
        host: '0.0.0.0',
        corsEnabled: false,
        apiKey: 'test-secret-key',
      });
      expect(handle).toBeDefined();
    });

    it('does NOT throw on a loopback host (127.0.0.1) with no apiKey', async () => {
      handle = await startTransport({ host: '127.0.0.1', corsEnabled: false });
      expect(handle).toBeDefined();
    });

    it('does NOT throw on a non-loopback host with no apiKey when MCP_ALLOW_INSECURE_HTTP=true', async () => {
      process.env.MCP_ALLOW_INSECURE_HTTP = 'true';
      handle = await startTransport({ host: '0.0.0.0', corsEnabled: false });
      expect(handle).toBeDefined();
    });

    it('does NOT refuse wildcard CORS when MCP_ALLOW_INSECURE_HTTP=true', async () => {
      // The public / gateway-fronted deploy runs cors-enabled, no apiKey, and no
      // explicit origins; the same opt-out that relaxes the non-loopback bind
      // guard must also relax the wildcard-CORS guard, or the service fails to
      // boot (regression guard for the hosted Render/Smithery endpoint).
      process.env.MCP_ALLOW_INSECURE_HTTP = 'true';
      handle = await startTransport({ host: '0.0.0.0', corsEnabled: true });
      expect(handle).toBeDefined();
    });
  });

  describe('Bearer auth when apiKey is configured', () => {
    const apiKey = 'test-secret-key';

    it('rejects /mcp POST with no Authorization header (401)', async () => {
      handle = await startTransport({ corsEnabled: false, apiKey });

      const res = await fetch(`http://${handle.host}:${handle.port}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        }),
      });

      expect(res.status).toBe(401);
    });

    it('rejects /mcp POST with an incorrect Bearer token (403)', async () => {
      handle = await startTransport({ corsEnabled: false, apiKey });

      const res = await fetch(`http://${handle.host}:${handle.port}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer wrong-token',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        }),
      });

      expect(res.status).toBe(403);
    });
  });

  describe('v1.1.3 error handling & method restriction (public-endpoint hardening)', () => {
    it('returns a clean JSON-RPC parse error (no stack trace / install paths) on malformed JSON', async () => {
      handle = await startTransport({ corsEnabled: false });

      const res = await fetch(`http://${handle.host}:${handle.port}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: '{"jsonrpc":"2.0", bad json',
      });
      const text = await res.text();

      expect(res.status).toBe(400);
      // CWE-209 regression: the response must not leak stack frames or the
      // server's absolute install path.
      expect(text).not.toMatch(/SyntaxError|at JSON\.parse|node_modules|\/usr\/local|node:internal/);
      expect(JSON.parse(text).error.code).toBe(-32700);
    });

    it('rejects GET /mcp in stateless mode with 405 (kills the idle-SSE hold)', async () => {
      handle = await startTransport({ corsEnabled: false, stateless: true });

      const res = await fetch(`http://${handle.host}:${handle.port}/mcp`, {
        method: 'GET',
        headers: { Accept: 'application/json, text/event-stream' },
      });

      expect(res.status).toBe(405);
      expect(res.headers.get('allow')).toBe('POST');
      expect(JSON.parse(await res.text()).error.code).toBe(-32600);
    });

    it('sets Strict-Transport-Security on responses', async () => {
      handle = await startTransport({ corsEnabled: false });

      const res = await fetch(`http://${handle.host}:${handle.port}/health`);

      expect(res.headers.get('strict-transport-security')).toMatch(/max-age=\d+/);
    });
  });
});
