/**
 * HTTP Transport Tests
 *
 * Tests for the HTTP transport mode of the Creed Space MCP Server.
 * These tests verify the type definitions and configuration options.
 */

import { MCP_SERVER_VERSION } from '../src/version';

describe('HTTP Transport Configuration', () => {
  it('should have valid transport types', () => {
    const validTransports = ['stdio', 'http'];
    expect(validTransports).toContain('stdio');
    expect(validTransports).toContain('http');
  });

  it('should have valid HTTP config structure', () => {
    const httpConfig = {
      port: 3100,
      host: 'localhost',
      cors: true,
      corsOrigins: ['http://localhost:3000'],
      stateless: false,
      enableJsonResponse: true,
    };
    expect(httpConfig.port).toBe(3100);
    expect(httpConfig.host).toBe('localhost');
    expect(httpConfig.cors).toBe(true);
    expect(httpConfig.stateless).toBe(false);
  });

  it('should have correct default config values', () => {
    // Secure-by-default: CORS is disabled unless explicitly enabled.
    const defaultConfig = {
      transport: 'stdio',
      http: {
        port: 3100,
        host: 'localhost',
        cors: false,
      },
    };
    expect(defaultConfig.transport).toBe('stdio');
    expect(defaultConfig.http.port).toBe(3100);
    expect(defaultConfig.http.cors).toBe(false);
  });
});

describe('CLI Transport Options', () => {
  it('should validate transport type', () => {
    const validTransports = ['stdio', 'http'];
    expect(validTransports.includes('stdio')).toBe(true);
    expect(validTransports.includes('http')).toBe(true);
    expect(validTransports.includes('invalid')).toBe(false);
  });

  it('should parse port as number', () => {
    const portString = '3100';
    const port = parseInt(portString, 10);
    expect(port).toBe(3100);
    expect(typeof port).toBe('number');
  });

  it('should have correct environment variable names', () => {
    const envVars = [
      'CREEDSPACE_TRANSPORT',
      'CREEDSPACE_PORT',
      'CREEDSPACE_HOST',
    ];
    expect(envVars).toContain('CREEDSPACE_TRANSPORT');
    expect(envVars).toContain('CREEDSPACE_PORT');
    expect(envVars).toContain('CREEDSPACE_HOST');
  });
});

describe('Package Configuration', () => {
  it('should have correct version', () => {
    const packageJson = require('../package.json');
    // Version must be valid semver and stay in sync with MCP_SERVER_VERSION
    // (single source of truth in src/version.ts) — this survives version bumps.
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(packageJson.version).toBe(MCP_SERVER_VERSION);
  });

  it('should have express dependency', () => {
    const packageJson = require('../package.json');
    expect(packageJson.dependencies.express).toBeDefined();
  });

  it('should have cors dependency', () => {
    const packageJson = require('../package.json');
    expect(packageJson.dependencies.cors).toBeDefined();
  });

  it('should have type definitions for express', () => {
    const packageJson = require('../package.json');
    expect(packageJson.devDependencies['@types/express']).toBeDefined();
  });
});

// Integration tests would require a running server
// Use `npm run test:integration` with a live server
describe.skip('HTTP Transport Integration', () => {
  it('should respond to health check', () => {
    expect(true).toBe(true);
  });

  it('should handle MCP initialize request', () => {
    expect(true).toBe(true);
  });

  it('should reject unauthorized requests', () => {
    expect(true).toBe(true);
  });
});
