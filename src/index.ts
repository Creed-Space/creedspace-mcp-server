// Main export file for programmatic usage
export { CreedSpaceMCPServer } from './server.js';
export { CreedSpaceClient } from './api-client.js';
export { CREEDSPACE_TOOLS } from './tools.js';
export * from './types.js';
export * from './version.js';
export * from './validation.js';

// Transport exports
export * from './transports/index.js';

// Quick start function for easy integration
export async function startCreedSpaceServer(options?: {
  persona?: string;
  apiUrl?: string;
  apiKey?: string;
  transport?: 'stdio' | 'http';
  port?: number;
  host?: string;
}): Promise<void> {
  const { CreedSpaceMCPServer } = await import('./server.js');
  const server = new CreedSpaceMCPServer({
    ...options,
    http: options?.transport === 'http' ? {
      port: options.port ?? 3100,
      host: options.host ?? 'localhost',
      cors: false,
    } : undefined,
  });
  await server.start();
}
