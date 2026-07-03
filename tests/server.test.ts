import { CreedSpaceMCPServer } from '../src/server';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCP_SERVER_VERSION } from '../src/version';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('../src/api-client');
jest.mock('../src/transports/index');

describe('CreedSpaceMCPServer', () => {
  let server: CreedSpaceMCPServer;
  let mockServerInstance: any;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    // Setup server mock
    mockServerInstance = {
      setRequestHandler: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
    };
    (Server as unknown as jest.Mock).mockImplementation(() => mockServerInstance);

    server = new CreedSpaceMCPServer();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Initialization', () => {
    it('should create SDK server instance', () => {
      expect(Server).toHaveBeenCalledWith(
        { name: 'creedspace', version: MCP_SERVER_VERSION },
        { capabilities: { tools: {} } }
      );
    });

    it('should register request handlers', () => {
      expect(mockServerInstance.setRequestHandler).toHaveBeenCalledWith(
        ListToolsRequestSchema,
        expect.any(Function)
      );
      expect(mockServerInstance.setRequestHandler).toHaveBeenCalledWith(
        CallToolRequestSchema,
        expect.any(Function)
      );
    });

    it('should start stdio transport by default', async () => {
      await server.start();
      expect(mockServerInstance.connect).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(
        1,
        'Creed Space MCP Server started (stdio transport)'
      );
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, 'Active persona: ambassador');
    });
  });

  describe('Tool Handling', () => {
    let callToolHandler: (request: any) => Promise<any>;

    beforeEach(() => {
      // Extract the registered handler
      const calls = mockServerInstance.setRequestHandler.mock.calls;
      const callToolArgs = calls.find((args: any) => args[0] === CallToolRequestSchema);
      callToolHandler = callToolArgs[1];
    });

    it('should handle unknown tools gracefully', async () => {
      const request = {
        params: {
          name: 'unknown_tool',
          arguments: {},
        },
      };

      await expect(callToolHandler(request)).rejects.toThrow('Unknown tool: unknown_tool');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[MCP_SERVER_ERROR]', expect.any(String));

      const [, errorPayload] = consoleErrorSpy.mock.calls.at(-1) ?? [];
      expect(JSON.parse(String(errorPayload))).toMatchObject({
        toolName: 'unknown_tool',
        argsRedacted: true,
        persona: 'ambassador',
      });
    });

    it('should include error context in unknown tool errors', async () => {
      const request = {
        params: {
          name: 'unknown_tool_with_context',
          arguments: { foo: 'bar' },
        },
      };

      try {
        await callToolHandler(request);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Unknown tool');
        expect(consoleErrorSpy).toHaveBeenCalledWith('[MCP_SERVER_ERROR]', expect.any(String));

        const [, errorPayload] = consoleErrorSpy.mock.calls.at(-1) ?? [];
        const parsed = JSON.parse(String(errorPayload));
        expect(parsed).toMatchObject({
          toolName: 'unknown_tool_with_context',
          argsRedacted: true,
          persona: 'ambassador',
        });
        expect(String(errorPayload)).not.toContain('bar');
      }
    });
  });
});
