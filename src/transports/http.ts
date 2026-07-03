/**
 * HTTP Transport for Creed Space MCP Server
 *
 * Provides HTTP-based MCP transport using StreamableHTTPServerTransport from the MCP SDK.
 * This enables OpenAI Agents SDK, Codex, and other HTTP-based MCP clients to connect.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export interface HttpTransportConfig {
  port: number;
  host: string;
  corsEnabled: boolean;
  corsOrigins?: string[];
  enableJsonResponse?: boolean;
  apiKey?: string;
  stateless?: boolean;
}

export interface HttpTransportHandle {
  close: () => Promise<void>;
  port: number;
  host: string;
}

/**
 * Creates and starts an HTTP server for MCP transport.
 *
 * @param server - The MCP Server instance to connect
 * @param config - HTTP transport configuration
 * @returns Handle to control the HTTP server
 */
/**
 * Hostnames/addresses that bind only the local loopback interface. Binding to
 * one of these keeps the server unreachable from other machines, so running
 * without an API key is acceptable for local development.
 */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/**
 * Returns true when `host` binds only the loopback interface. Unknown,
 * empty, or undefined hosts are treated as NON-loopback (fail closed) so a
 * misconfiguration cannot silently expose an unauthenticated endpoint.
 * Note: all-interface binds (`0.0.0.0`, `::`) are deliberately NOT loopback.
 */
function isLoopbackHost(host: string | undefined): boolean {
  return LOOPBACK_HOSTS.has((host ?? '').trim().toLowerCase());
}

export async function startHttpTransport(
  server: Server,
  config: HttpTransportConfig
): Promise<HttpTransportHandle> {
  // SECURITY: The Bearer-auth middleware below is only mounted when an apiKey is
  // configured. Without it, `/mcp` is fully unauthenticated, and CORS does not
  // protect non-browser HTTP clients. Refuse to start an unauthenticated server
  // on a network-reachable (non-loopback) host unless the operator explicitly
  // opts out via MCP_ALLOW_INSECURE_HTTP=true. Loopback binds remain key-free
  // for local development. Evaluated at call time so tests/operators can toggle.
  if (
    !config.apiKey &&
    !isLoopbackHost(config.host) &&
    process.env.MCP_ALLOW_INSECURE_HTTP !== 'true'
  ) {
    throw new Error(
      `Refusing to start the HTTP MCP transport on non-loopback host "${config.host}" ` +
        `without an API key: this would expose /mcp unauthenticated to the network. ` +
        `Set an API key (e.g. CREEDSPACE_API_KEY), bind to a loopback address ` +
        `(127.0.0.1 / localhost / ::1), or set MCP_ALLOW_INSECURE_HTTP=true to opt out.`
    );
  }
  if (
    config.corsEnabled &&
    !config.apiKey &&
    (config.corsOrigins ?? []).length === 0 &&
    process.env.MCP_ALLOW_INSECURE_HTTP !== 'true'
  ) {
    throw new Error(
      'Refusing to enable wildcard CORS without an API key. ' +
        'Set an API key, configure explicit CORS origins, or set ' +
        'MCP_ALLOW_INSECURE_HTTP=true to allow anonymous public access.'
    );
  }

  const app: Application = express();

  // Hardening for network-reachable HTTP exposure (Render / gateway-fronted).
  app.disable('x-powered-by');
  // Exactly one proxy sits in front of us (Render's load balancer / the gateway);
  // trust one hop so req.ip is the real client for rate limiting. Deliberately
  // NOT `true`, which would let any client spoof X-Forwarded-For and evade it.
  app.set('trust proxy', 1);

  // Minimal security headers appropriate for a JSON API (no HTML is served).
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // Parse JSON bodies with an explicit size cap to reject oversized-payload abuse.
  app.use(express.json({ limit: process.env.CREEDSPACE_MAX_BODY || '1mb' }));

  // CORS configuration
  if (config.corsEnabled) {
    const corsOptions: cors.CorsOptions = {
      origin: config.corsOrigins,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id', 'Last-Event-ID'],
      exposedHeaders: ['Mcp-Session-Id'],
      credentials: Boolean(config.apiKey && config.corsOrigins?.length),
    };
    app.use(cors(corsOptions));
  }

  // Bearer token authentication middleware
  if (config.apiKey) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Skip auth for OPTIONS requests (CORS preflight)
      if (req.method === 'OPTIONS') {
        return next();
      }

      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid Authorization header' });
        return;
      }

      const token = authHeader.slice(7);
      if (token !== config.apiKey) {
        res.status(403).json({ error: 'Invalid API key' });
        return;
      }

      next();
    });
  }

  // Session management for stateful mode
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'creedspace-mcp-server',
      transport: 'http',
      sessions: transports.size,
    });
  });

  // Per-IP rate limit on the MCP endpoint. In-memory store: correct for a single
  // instance (our deploy); horizontal scale-out would need a shared store. The
  // /health route is intentionally left unlimited so platform probes never trip
  // it. Override the ceiling via CREEDSPACE_RATE_LIMIT (requests/minute/IP).
  const parsedLimit = Number.parseInt(process.env.CREEDSPACE_RATE_LIMIT ?? '', 10);
  const mcpRateLimiter = rateLimit({
    windowMs: 60_000,
    limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      jsonrpc: '2.0',
      error: { code: -32029, message: 'Rate limit exceeded — slow down and retry shortly.' },
      id: null,
    },
  });

  // MCP endpoint - handles all MCP protocol messages
  app.all('/mcp', mcpRateLimiter, async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // For stateless mode, create a new transport for each request
    if (config.stateless) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // Stateless mode
        enableJsonResponse: config.enableJsonResponse ?? true,
      });

      await server.connect(transport);

      try {
        await transport.handleRequest(req, res, req.body);
      } finally {
        await transport.close();
      }
      return;
    }

    // Stateful mode - reuse or create transport per session
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      // Reuse existing transport
      transport = transports.get(sessionId)!;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // Create new transport for initialization
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: config.enableJsonResponse ?? true,
        onsessioninitialized: (sid) => {
          transports.set(sid, transport);
          console.error(`[HTTP] Session initialized: ${sid}`);
        },
        onsessionclosed: (sid) => {
          transports.delete(sid);
          console.error(`[HTTP] Session closed: ${sid}`);
        },
      });

      await server.connect(transport);
    } else if (sessionId) {
      // Session not found
      res.status(404).json({ error: 'Session not found' });
      return;
    } else {
      // Non-init request without session
      res.status(400).json({ error: 'Session ID required for non-initialization requests' });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  });

  // Start HTTP server
  return new Promise((resolve, reject) => {
    const httpServer = app.listen(config.port, config.host, () => {
      console.error(
        `[HTTP] Creed Space MCP Server listening on http://${config.host}:${config.port}`
      );
      console.error(`[HTTP] MCP endpoint: http://${config.host}:${config.port}/mcp`);
      console.error(`[HTTP] Health check: http://${config.host}:${config.port}/health`);

      resolve({
        port: config.port,
        host: config.host,
        close: async () => {
          // Close all active transports
          for (const transport of transports.values()) {
            await transport.close();
          }
          transports.clear();

          // Close HTTP server
          return new Promise<void>((resolveClose, rejectClose) => {
            httpServer.close((err) => {
              if (err) {
                rejectClose(err);
              } else {
                console.error('[HTTP] Server closed');
                resolveClose();
              }
            });
          });
        },
      });
    });

    httpServer.on('error', (err) => {
      console.error('[HTTP] Server error:', err);
      reject(err);
    });
  });
}

/**
 * Helper to check if a request body is an MCP initialize request
 */
function isInitializeRequest(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) {
    return false;
  }
  const msg = body as Record<string, unknown>;
  return msg.method === 'initialize' && msg.jsonrpc === '2.0';
}
