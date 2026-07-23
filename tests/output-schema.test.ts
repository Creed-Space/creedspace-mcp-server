import Ajv, { ValidateFunction } from 'ajv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CreedSpaceMCPServer } from '../src/server';
import { CREEDSPACE_TOOLS } from '../src/tools';
import { CreedSpaceClient } from '../src/api-client';

jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('../src/api-client');
jest.mock('../src/transports/index');

// --- Fixtures: representative API payloads -------------------------------

const PERSONA = {
  id: 'ambassador',
  name: 'Ambassador',
  icon: '🕊️',
  description: 'Diplomatic and even-handed',
  isActive: true,
};

const CONSTITUTION = {
  id: 'uef-core',
  name: 'UEF Core',
  content: '# UEF\nDo not deceive the user.\nRespect user autonomy.\n',
  personaId: 'ambassador',
  isSystemConstitution: true,
  uvcQualities: { desired: ['honest'], disliked: ['curt'], never: ['deceptive'] },
};

const MERGED_CONSTITUTION = {
  persona: PERSONA,
  constitutions: [CONSTITUTION],
  mergedContent: '# UEF\nDo not deceive the user.\nRespect user autonomy.\n',
  uvcToken: 'A5W',
  totalRules: 2,
  creedHash: 'abc123',
};

const UVC = { qualities: { desired: ['honest'], disliked: ['curt'], never: ['deceptive'] } };

/** Mirrors the PDP DecisionKernel response model. */
const DECISION_KERNEL = {
  decision: 'allow',
  rationale: 'No norm conflicts detected.',
  norms: [{ id: 'uef-1', text: 'Do not deceive' }],
  precedence: ['uef-core'],
  sources: [{ constitution: 'uef-core', line: 2 }],
  caveats: [],
  nonce: null,
  hash: 'kernel-hash-1',
  timestamp: 1_752_000_000,
  transparency: null,
};

/** Mirrors the safety-stack /multi-scale/handshake response. */
const HANDSHAKE_RESULT = {
  synthesized_constitution: { persona: 'A', adherence: 5, scopes: ['W'] },
  party_weights: { 'entity-1': 0.6, 'entity-2': 0.4 },
  scale_attestations: { micro: { hash: 'h1' } },
  precedence_decisions: [{ domain: 'privacy', winner: 'entity-1' }],
  conflicts: [],
  rationale: 'Micro scale deferred to meso on privacy.',
};

/** Mirrors the safety-stack /multi-scale/attestation response (chain form). */
const ATTESTATION_RESULT = {
  entity_id: 'entity-1',
  scale: 'micro',
  chain: [{ hash: 'h1', parent_hash: null }],
};

function buildMockClient() {
  return {
    getMergedConstitution: jest.fn().mockResolvedValue(MERGED_CONSTITUTION),
    getPersonas: jest.fn().mockResolvedValue([PERSONA]),
    getPersona: jest.fn().mockResolvedValue(PERSONA),
    getConstitutions: jest.fn().mockResolvedValue([CONSTITUTION]),
    getUvcQualities: jest.fn().mockResolvedValue(UVC),
    getSystemPrompt: jest.fn().mockResolvedValue('You are the Ambassador.'),
    getExportPreview: jest.fn().mockResolvedValue('# Export preview\n...'),
    performMultiScaleHandshake: jest.fn().mockResolvedValue(HANDSHAKE_RESULT),
    getScaleAttestation: jest.fn().mockResolvedValue(ATTESTATION_RESULT),
    getCreedAttestation: jest.fn().mockReturnValue('Operating under creed abc123'),
    getCreedHash: jest.fn().mockReturnValue('abc123'),
    getApiKey: jest.fn().mockReturnValue(undefined),
    setPersona: jest.fn(),
    clearCache: jest.fn(),
  };
}

/** Every advertised tool, with arguments that exercise its primary branch. */
const TOOL_CALLS: Array<{ name: string; args: Record<string, unknown> }> = [
  { name: 'get_constitution', args: {} },
  { name: 'list_personas', args: {} },
  { name: 'set_persona', args: { persona_id: 'sentinel' } },
  { name: 'get_uvc_qualities', args: {} },
  { name: 'get_system_prompt', args: {} },
  { name: 'preview_export', args: {} },
  { name: 'get_constitution_by_id', args: { constitution_id: 'uef-core' } },
  { name: 'search_constitutions', args: { query: 'deceive' } },
  { name: 'get_active_persona', args: {} },
  { name: 'clear_cache', args: {} },
  { name: 'adjudicate', args: { question: 'Can I share this data?' } },
  { name: 'get_anchor', args: {} },
  { name: 'attest_response', args: { response: 'Here is an honest answer. abc123' } },
  { name: 'heartbeat', args: { message_count: 10 } },
  {
    name: 'perform_multi_scale_handshake',
    args: { parties: [{ entity_id: 'entity-1', scale: 'micro' }] },
  },
  { name: 'get_scale_attestation', args: { entity_id: 'entity-1', scale: 'micro' } },
];

describe('Tool outputSchema', () => {
  const ajv = new Ajv({ strict: false, allErrors: true });
  const validators = new Map<string, ValidateFunction>();

  let callToolHandler: (request: unknown) => Promise<any>;
  let mockClient: ReturnType<typeof buildMockClient>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeAll(() => {
    for (const tool of CREEDSPACE_TOOLS) {
      if (tool.outputSchema) {
        validators.set(tool.name, ajv.compile(tool.outputSchema));
      }
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    mockClient = buildMockClient();
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

    // adjudicate talks to the PDP over bare fetch rather than the API client.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: async () => DECISION_KERNEL,
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('declares an outputSchema for every advertised tool', () => {
    const missing = CREEDSPACE_TOOLS.filter((t) => !t.outputSchema).map((t) => t.name);
    expect(missing).toEqual([]);
  });

  it('declares a compilable JSON Schema for every advertised tool', () => {
    expect(validators.size).toBe(CREEDSPACE_TOOLS.length);
  });

  it.each(TOOL_CALLS)('$name returns structuredContent matching its outputSchema', async ({
    name,
    args,
  }) => {
    const result = await callToolHandler({ params: { name, arguments: args } });

    expect(result.structuredContent).toBeDefined();

    const validate = validators.get(name)!;
    const valid = validate(result.structuredContent);
    if (!valid) {
      throw new Error(
        `${name} structuredContent violates its outputSchema: ${ajv.errorsText(validate.errors)}`
      );
    }

    // The text block stays a usable fallback for clients that ignore structure.
    expect(typeof result.content[0].text).toBe('string');
    expect(result.content[0].text.length).toBeGreaterThan(0);
  });

  describe('alternate success branches', () => {
    it('get_uvc_qualities conforms when no UVC is configured', async () => {
      mockClient.getUvcQualities.mockResolvedValue(null);

      const result = await callToolHandler({
        params: { name: 'get_uvc_qualities', arguments: {} },
      });

      expect(validators.get('get_uvc_qualities')!(result.structuredContent)).toBe(true);
      expect(result.structuredContent).toMatchObject({ configured: false, qualities: null });
    });

    it('heartbeat conforms on the non-anchoring branch', async () => {
      const result = await callToolHandler({
        params: { name: 'heartbeat', arguments: { message_count: 3 } },
      });

      expect(validators.get('heartbeat')!(result.structuredContent)).toBe(true);
      expect(result.structuredContent).toMatchObject({ anchored: false, messageCount: 3 });
    });

    it('get_constitution conforms when the persona has no UVC token', async () => {
      mockClient.getMergedConstitution.mockResolvedValue({
        ...MERGED_CONSTITUTION,
        uvcToken: undefined,
      });

      const result = await callToolHandler({
        params: { name: 'get_constitution', arguments: {} },
      });

      expect(validators.get('get_constitution')!(result.structuredContent)).toBe(true);
    });

    it('attest_response reports a violation when a never-quality appears', async () => {
      const result = await callToolHandler({
        params: {
          name: 'attest_response',
          arguments: { response: 'This is a deceptive answer.' },
        },
      });

      expect(validators.get('attest_response')!(result.structuredContent)).toBe(true);
      expect(result.structuredContent).toMatchObject({ status: 'fail' });
    });

    it('get_scale_attestation conforms on the null-attestation shape', async () => {
      mockClient.getScaleAttestation.mockResolvedValue({
        entity_id: 'entity-1',
        scale: 'micro',
        attestation: null,
      });

      const result = await callToolHandler({
        params: {
          name: 'get_scale_attestation',
          arguments: { entity_id: 'entity-1', scale: 'micro' },
        },
      });

      expect(validators.get('get_scale_attestation')!(result.structuredContent)).toBe(true);
    });
  });

  it('serializes structuredContent into the text block for JSON-shaped tools', async () => {
    const result = await callToolHandler({
      params: { name: 'list_personas', arguments: {} },
    });

    expect(JSON.parse(result.content[0].text)).toEqual(result.structuredContent);
  });
});

describe('Tool annotations', () => {
  it('declares annotations for every advertised tool', () => {
    const missing = CREEDSPACE_TOOLS.filter((t) => !t.annotations).map((t) => t.name);
    expect(missing).toEqual([]);
  });

  it('gives every tool a title and explicit readOnly/openWorld hints', () => {
    for (const tool of CREEDSPACE_TOOLS) {
      expect(typeof tool.annotations!.title).toBe('string');
      expect(typeof tool.annotations!.readOnlyHint).toBe('boolean');
      expect(typeof tool.annotations!.openWorldHint).toBe('boolean');
    }
  });

  it('omits destructive/idempotent hints on read-only tools and sets them otherwise', () => {
    for (const tool of CREEDSPACE_TOOLS) {
      const { readOnlyHint, destructiveHint, idempotentHint } = tool.annotations!;
      if (readOnlyHint) {
        // Both hints are defined only for tools that modify state.
        expect(destructiveHint).toBeUndefined();
        expect(idempotentHint).toBeUndefined();
      } else {
        expect(typeof destructiveHint).toBe('boolean');
        expect(typeof idempotentHint).toBe('boolean');
      }
    }
  });

  it('marks no tool destructive - none of them delete user data', () => {
    const destructive = CREEDSPACE_TOOLS.filter((t) => t.annotations!.destructiveHint).map(
      (t) => t.name
    );
    expect(destructive).toEqual([]);
  });

  it('treats only the local cache tool as closed-world', () => {
    const closedWorld = CREEDSPACE_TOOLS.filter((t) => !t.annotations!.openWorldHint).map(
      (t) => t.name
    );
    expect(closedWorld).toEqual(['clear_cache']);
  });
});
