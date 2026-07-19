import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CreedSpaceMCPServer } from '../src/server';
import { CreedSpaceClient } from '../src/api-client';

jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('../src/api-client');
jest.mock('../src/transports/index');

const PERSONA = {
  id: 'sentinel',
  name: 'Sentinel',
  icon: '🛡️',
  description: 'Vigilant and protective',
  isActive: true,
};

/**
 * Every tool advertises snake_case parameters in its inputSchema, while the zod
 * validation schemas are camelCase. These tests pin the translation: calling a
 * tool with exactly the arguments it advertises must not raise a validation
 * error.
 */
describe('Tool argument translation', () => {
  let callToolHandler: (request: unknown) => Promise<any>;
  let mockClient: Record<string, jest.Mock>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    mockClient = {
      getPersona: jest.fn().mockResolvedValue(PERSONA),
      getUvcQualities: jest.fn().mockResolvedValue({ qualities: { never: ['deceptive'] } }),
      getCreedHash: jest.fn().mockReturnValue('abc123'),
      getApiKey: jest.fn().mockReturnValue(undefined),
      setPersona: jest.fn(),
      performMultiScaleHandshake: jest.fn().mockResolvedValue({ rationale: 'ok' }),
    };
    (CreedSpaceClient as unknown as jest.Mock).mockImplementation(() => mockClient);

    const mockServerInstance = {
      setRequestHandler: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
    };
    (Server as unknown as jest.Mock).mockImplementation(() => mockServerInstance);

    new CreedSpaceMCPServer();

    const call = mockServerInstance.setRequestHandler.mock.calls.find(
      (args: unknown[]) => args[0] === CallToolRequestSchema
    );
    callToolHandler = call![1] as typeof callToolHandler;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: async () => ({ decision: 'allow', hash: 'h1' }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('set_persona accepts persona_id', async () => {
    await callToolHandler({
      params: { name: 'set_persona', arguments: { persona_id: 'sentinel' } },
    });

    expect(mockClient.setPersona).toHaveBeenCalledWith('sentinel');
  });

  it('attest_response accepts response and persona_id', async () => {
    const result = await callToolHandler({
      params: {
        name: 'attest_response',
        arguments: { response: 'An honest answer.', persona_id: 'sentinel' },
      },
    });

    expect(mockClient.getUvcQualities).toHaveBeenCalledWith('sentinel');
    expect(JSON.parse(result.content[0].text)).toMatchObject({ status: 'warn' });
  });

  it('attest_response defaults persona_id to the active persona', async () => {
    await callToolHandler({
      params: { name: 'attest_response', arguments: { response: 'An honest answer.' } },
    });

    expect(mockClient.getUvcQualities).toHaveBeenCalledWith('ambassador');
  });

  it('perform_multi_scale_handshake accepts entity_id on each party', async () => {
    await callToolHandler({
      params: {
        name: 'perform_multi_scale_handshake',
        arguments: { parties: [{ entity_id: 'entity-1', scale: 'micro' }] },
      },
    });

    expect(mockClient.performMultiScaleHandshake).toHaveBeenCalledWith(
      [expect.objectContaining({ entity_id: 'entity-1', scale: 'micro' })],
      []
    );
  });

  it('adjudicate forwards snake_case context fields to the PDP', async () => {
    await callToolHandler({
      params: {
        name: 'adjudicate',
        arguments: {
          question: 'Can I share this data?',
          context: {
            adherence_level: 5,
            influence_scope: 'compare_options',
            user_id: 'user-1',
            session_id: 'session-1',
          },
        },
      },
    });

    const [, init] = (global.fetch as unknown as jest.Mock).mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({
      adherence_level: 5,
      influence_scope: 'compare_options',
      context: { user_id: 'user-1', session_id: 'session-1' },
    });
  });
});
