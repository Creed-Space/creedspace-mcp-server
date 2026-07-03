#!/usr/bin/env node

import { Command } from 'commander';
import { CreedSpaceMCPServer } from './server.js';
import { CreedSpaceConfig, HttpConfig } from './types.js';
import { config as loadEnv } from 'dotenv';
import * as fs from 'fs';
import { sanitizeMcpServerConfigForLog } from './cli-logging.js';

// Load environment variables
loadEnv();

const program = new Command();

type ConfigWithPartialHttp = Partial<Omit<CreedSpaceConfig, 'http'>> & {
  http?: Partial<HttpConfig>;
};

const DEFAULT_HTTP_CONFIG: HttpConfig = {
  port: 3100,
  host: 'localhost',
  cors: false,
  stateless: false,
};

function mergeHttpConfig(
  base: HttpConfig | undefined,
  override: Partial<HttpConfig> | undefined = undefined
): HttpConfig {
  const merged: HttpConfig = {
    port: override?.port ?? base?.port ?? DEFAULT_HTTP_CONFIG.port,
    host: override?.host ?? base?.host ?? DEFAULT_HTTP_CONFIG.host,
    cors: override?.cors ?? base?.cors ?? DEFAULT_HTTP_CONFIG.cors,
  };
  merged.stateless = override?.stateless ?? base?.stateless ?? DEFAULT_HTTP_CONFIG.stateless;
  const corsOrigins = override?.corsOrigins ?? base?.corsOrigins;
  if (corsOrigins !== undefined) {
    merged.corsOrigins = corsOrigins;
  }
  const enableJsonResponse = override?.enableJsonResponse ?? base?.enableJsonResponse;
  if (enableJsonResponse !== undefined) {
    merged.enableJsonResponse = enableJsonResponse;
  }
  return merged;
}

program
  .name('creedspace-mcp')
  .description('Universal MCP server for Creed Space - AI safety guardrails in 10 seconds')
  .version('1.1.0')
  .option('-p, --persona <id>', 'Set the active persona', 'ambassador')
  .option(
    '-u, --url <url>',
    'API base URL',
    process.env.CREEDSPACE_API_URL || 'https://api.creed.space'
  )
  .option('-k, --api-key <key>', 'API key for authentication', process.env.CREEDSPACE_API_KEY)
  .option('--offline', 'Enable offline mode with cached data')
  .option('--no-cache', 'Disable caching')
  .option('--cache-ttl <ms>', 'Cache TTL in milliseconds', '300000')
  .option('--config <file>', 'Load configuration from JSON file')
  .option('--generate-config', 'Generate example configuration files')
  // Transport options
  .option(
    '-t, --transport <type>',
    'Transport type: stdio (default) or http',
    process.env.CREEDSPACE_TRANSPORT || 'stdio'
  )
  .option(
    '--port <number>',
    'HTTP server port (for http transport)',
    process.env.CREEDSPACE_PORT || '3100'
  )
  .option(
    '--host <hostname>',
    'HTTP server host (for http transport)',
    process.env.CREEDSPACE_HOST || 'localhost'
  )
  .option('--cors', 'Enable CORS for HTTP transport (disabled by default)', false)
  .option('--cors-origin <origin...>', 'Allowed CORS origin(s) for HTTP transport')
  .option('--no-cors', 'Disable CORS for HTTP transport')
  .option('--stateless', 'Run HTTP transport in stateless mode (new session per request)')
  .action(async (options) => {
    if (options.generateConfig) {
      generateConfigFiles();
      return;
    }

    // Validate transport type
    const validTransports = ['stdio', 'http'];
    if (!validTransports.includes(options.transport)) {
      console.error(
        `Invalid transport type: ${options.transport}. Must be one of: ${validTransports.join(', ')}`
      );
      process.exit(1);
    }

    let config: Partial<CreedSpaceConfig> = {
      persona: 'ambassador',
      apiUrl: 'https://api.creed.space',
      cacheEnabled: true,
      cacheTtl: 300000,
      offlineMode: false,
      transport: 'stdio',
      http: { ...DEFAULT_HTTP_CONFIG },
    };

    // Load config from file if specified
    if (options.config) {
      try {
        const configFile = fs.readFileSync(options.config, 'utf-8');
        const fileConfig = JSON.parse(configFile) as ConfigWithPartialHttp;
        config = {
          ...config,
          ...fileConfig,
          http: mergeHttpConfig(config.http, fileConfig.http),
        };
      } catch (error) {
        // SECURITY: Log config file access failures with context
        const errorContext = {
          configPath: options.config,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        };
        console.error('[CONFIG_LOAD_ERROR]', JSON.stringify(errorContext));

        // Provide actionable error message
        if (error instanceof Error) {
          const enhancedError = new Error(
            `Failed to load config file '${options.config}': ${error.message}`
          );
          enhancedError.cause = error;
          throw enhancedError;
        }
        process.exit(1);
      }
    }

    const envConfig: ConfigWithPartialHttp = {};
    if (process.env.CREEDSPACE_API_URL) envConfig.apiUrl = process.env.CREEDSPACE_API_URL;
    if (process.env.CREEDSPACE_API_KEY) envConfig.apiKey = process.env.CREEDSPACE_API_KEY;
    if (process.env.CREEDSPACE_TRANSPORT) {
      envConfig.transport = process.env.CREEDSPACE_TRANSPORT as 'stdio' | 'http';
    }
    if (process.env.CREEDSPACE_PORT || process.env.CREEDSPACE_HOST) {
      envConfig.http = {
        ...(process.env.CREEDSPACE_PORT ? { port: parseInt(process.env.CREEDSPACE_PORT) } : {}),
        ...(process.env.CREEDSPACE_HOST ? { host: process.env.CREEDSPACE_HOST } : {}),
      };
    }
    if (process.env.CREEDSPACE_CORS_ORIGINS) {
      envConfig.http = {
        ...envConfig.http,
        corsOrigins: process.env.CREEDSPACE_CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
      };
    }
    config = {
      ...config,
      ...envConfig,
      http: mergeHttpConfig(config.http, envConfig.http),
    };

    const cliSource = (name: string): boolean => program.getOptionValueSource(name) === 'cli';
    const httpConfig = mergeHttpConfig(config.http);
    if (cliSource('persona')) config.persona = options.persona;
    if (cliSource('url')) config.apiUrl = options.url;
    if (cliSource('apiKey')) config.apiKey = options.apiKey;
    if (cliSource('cache')) config.cacheEnabled = options.cache;
    if (cliSource('cacheTtl')) config.cacheTtl = parseInt(options.cacheTtl);
    if (cliSource('offline')) config.offlineMode = options.offline;
    if (cliSource('transport')) config.transport = options.transport as 'stdio' | 'http';
    if (cliSource('port')) httpConfig.port = parseInt(options.port);
    if (cliSource('host')) httpConfig.host = options.host;
    if (cliSource('cors')) httpConfig.cors = options.cors;
    if (cliSource('corsOrigin')) httpConfig.corsOrigins = options.corsOrigin;
    if (cliSource('stateless')) httpConfig.stateless = options.stateless;
    config.http = httpConfig;

    if (!validTransports.includes(config.transport ?? 'stdio')) {
      console.error(
        `Invalid transport type: ${config.transport}. Must be one of: ${validTransports.join(', ')}`
      );
      process.exit(1);
    }

    try {
      const server = new CreedSpaceMCPServer(config);
      await server.start();
    } catch (error) {
      // SECURITY: Log server startup failures with full context
      const errorContext = {
        config: sanitizeMcpServerConfigForLog(config),
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      };
      console.error('[SERVER_START_ERROR]', JSON.stringify(errorContext));

      if (error instanceof Error) {
        console.error('Failed to start MCP server:', error.message);
        console.error('Stack trace:', error.stack);
      } else {
        console.error('Failed to start server with unknown error:', String(error));
      }
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Test connection to Creed Space API')
  .option('-u, --url <url>', 'API base URL', 'http://localhost:8000')
  .action(async (options) => {
    console.log('Testing connection to Creed Space API...');
    console.log(`URL: ${options.url}`);

    try {
      const { CreedSpaceClient } = await import('./api-client.js');
      const client = new CreedSpaceClient({ apiUrl: options.url });

      console.log('\nFetching personas...');
      const personas = await client.getPersonas();
      console.log(`✓ Found ${personas.length} personas:`);
      personas.forEach((p) => console.log(`  - ${p.name} (${p.id})`));

      console.log('\nFetching ambassador constitution...');
      const constitution = await client.getMergedConstitution('ambassador');
      console.log(`✓ Constitution loaded: ${constitution.totalRules} rules`);

      console.log('\n✅ API connection successful!');
    } catch (error) {
      // SECURITY: Log API connection test failures with context
      const errorContext = {
        testUrl: options.url,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      };
      console.error('[API_CONNECTION_TEST_ERROR]', JSON.stringify(errorContext));

      console.error(
        '\n❌ API connection failed:',
        error instanceof Error ? error.message : String(error)
      );
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  });

function generateConfigFiles(): void {
  // Generate Claude Desktop config (stdio transport)
  const claudeConfig = {
    mcpServers: {
      creedspace: {
        command: 'npx',
        args: ['@creedspace/mcp-server', '--persona', 'ambassador'],
        env: {
          CREEDSPACE_API_KEY: '${CREEDSPACE_API_KEY}',
        },
      },
    },
  };

  // Generate OpenAI Codex config (stdio transport)
  const codexConfig = `# ~/.codex/config.toml
[mcp_servers.creedspace]
command = "npx"
args = ["@creedspace/mcp-server", "--persona", "ambassador"]

[mcp_servers.creedspace.env]
CREEDSPACE_API_URL = "https://api.creed.space"
CREEDSPACE_API_KEY = "your-api-key-here"
`;

  // Generate OpenAI Agents SDK config (HTTP transport)
  const agentsSdkExample = `# Python - OpenAI Agents SDK with HTTP transport
from agents import Agent
from agents.mcp import MCPServerStreamableHttp

# First, start the server: npx @creedspace/mcp-server --transport http --port 3100

server = MCPServerStreamableHttp(
    url="http://localhost:3100/mcp",
    name="creedspace"
)

agent = Agent(
    name="safe-agent",
    tools=[server.get_tools()]
)
`;

  // Generate example .env file
  const envExample = `# Creed Space MCP Server Configuration
CREEDSPACE_API_URL=https://api.creed.space
CREEDSPACE_API_KEY=your-api-key-here
CREEDSPACE_DEFAULT_PERSONA=ambassador

# HTTP Transport Options (optional)
CREEDSPACE_TRANSPORT=stdio
CREEDSPACE_PORT=3100
CREEDSPACE_HOST=localhost
`;

  // Generate package.json script examples
  const packageJsonExample = {
    scripts: {
      'mcp:stdio': 'creedspace-mcp --persona ambassador',
      'mcp:http': 'creedspace-mcp --transport http --port 3100 --persona ambassador',
      'mcp:nanny': 'creedspace-mcp --persona nanny',
      'mcp:sentinel': 'creedspace-mcp --persona sentinel',
      'mcp:test': 'creedspace-mcp test',
    },
  };

  console.log('📁 Claude Desktop Configuration (claude_desktop_config.json):');
  console.log('='.repeat(60));
  console.log(JSON.stringify(claudeConfig, null, 2));

  console.log('\n📁 OpenAI Codex Configuration (~/.codex/config.toml):');
  console.log('='.repeat(60));
  console.log(codexConfig);

  console.log('\n📁 OpenAI Agents SDK Example (Python):');
  console.log('='.repeat(60));
  console.log(agentsSdkExample);

  console.log('\n📁 Environment Variables (.env):');
  console.log('='.repeat(60));
  console.log(envExample);

  console.log('\n📁 Package.json Scripts:');
  console.log('='.repeat(60));
  console.log(JSON.stringify(packageJsonExample, null, 2));

  console.log('\n✅ Configuration files generated!');
  console.log('\nQuick Start:');
  console.log('');
  console.log('STDIO Transport (Claude Desktop, Codex):');
  console.log('  npx @creedspace/mcp-server --persona ambassador');
  console.log('');
  console.log('HTTP Transport (OpenAI Agents SDK):');
  console.log('  npx @creedspace/mcp-server --transport http --port 3100');
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run the CLI
program.parse(process.argv);
