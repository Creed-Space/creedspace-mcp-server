import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Shared output-schema fragments -------------------------------------------

/** Persona summary as returned by list_personas / get_active_persona. */
const PERSONA_PROPERTIES = {
  id: { type: 'string', description: 'Persona ID' },
  name: { type: 'string', description: 'Human-readable persona name' },
  icon: { type: 'string', description: 'Persona icon (emoji)' },
  description: { type: 'string', description: 'Persona description' },
} as const;

/** UVC quality buckets. Every bucket is optional — the API omits empty ones. */
const UVC_QUALITIES_SCHEMA = {
  type: 'object',
  description: 'Value qualities for the persona; null when UVC is not configured',
  properties: {
    desired: { type: 'array', items: { type: 'string' }, description: 'Desired qualities' },
    disliked: { type: 'array', items: { type: 'string' }, description: 'Disliked qualities' },
    never: { type: 'array', items: { type: 'string' }, description: 'Forbidden qualities' },
  },
} as const;

export const CREEDSPACE_TOOLS: Tool[] = [
  {
    name: 'get_constitution',
    annotations: {
      title: 'Get merged constitution',
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      'Get the merged constitution for a specific persona, including all active rules and UVC qualities',
    inputSchema: {
      type: 'object',
      properties: {
        persona_id: {
          type: 'string',
          description: 'The persona ID (e.g., "ambassador", "nanny", "sentinel")',
          default: 'ambassador',
        },
      },
      required: [],
    },
    outputSchema: {
      type: 'object',
      properties: {
        persona: { type: 'string', description: 'Human-readable persona name' },
        icon: { type: 'string', description: 'Persona icon (emoji)' },
        totalRules: { type: 'number', description: 'Total number of rules in the merged creed' },
        content: { type: 'string', description: 'Merged constitution text' },
        uvcToken: { type: 'string', description: 'UVC token, when configured for the persona' },
        creedAttestation: {
          type: 'string',
          description: 'Attestation line binding this response to the active creed hash',
        },
      },
      required: ['persona', 'totalRules', 'content'],
    },
  },
  {
    name: 'list_personas',
    annotations: {
      title: 'List personas',
      readOnlyHint: true,
      openWorldHint: true,
    },
    description: 'List all available AI personas with their descriptions and current status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    outputSchema: {
      type: 'object',
      properties: {
        current: { type: 'string', description: 'Currently active persona ID for this session' },
        available: {
          type: 'array',
          description: 'All personas available from the Creed Space API',
          items: {
            type: 'object',
            properties: {
              ...PERSONA_PROPERTIES,
              active: { type: 'boolean', description: 'Whether the persona is active' },
            },
            required: ['id', 'name', 'icon', 'description', 'active'],
          },
        },
      },
      required: ['current', 'available'],
    },
  },
  {
    name: 'set_persona',
    annotations: {
      title: 'Set active persona',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    description: 'Switch to a different AI persona for the current session',
    inputSchema: {
      type: 'object',
      properties: {
        persona_id: {
          type: 'string',
          description: 'The persona ID to switch to',
          enum: ['ambassador', 'nanny', 'sentinel', 'godparent', 'muse', 'anchor'],
        },
      },
      required: ['persona_id'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        ...PERSONA_PROPERTIES,
        message: { type: 'string', description: 'Human-readable confirmation of the switch' },
      },
      required: ['id', 'name', 'icon', 'description', 'message'],
    },
  },
  {
    name: 'get_uvc_qualities',
    annotations: {
      title: 'Get UVC qualities',
      readOnlyHint: true,
      openWorldHint: true,
    },
    description: 'Get the desired, disliked, and never qualities for a persona from the UVC system',
    inputSchema: {
      type: 'object',
      properties: {
        persona_id: {
          type: 'string',
          description: 'The persona ID',
          default: 'ambassador',
        },
      },
      required: [],
    },
    outputSchema: {
      type: 'object',
      properties: {
        personaId: { type: 'string', description: 'The persona the qualities belong to' },
        configured: {
          type: 'boolean',
          description: 'False when no UVC qualities are configured for the persona',
        },
        qualities: { ...UVC_QUALITIES_SCHEMA, type: ['object', 'null'] },
      },
      required: ['personaId', 'configured'],
    },
  },
  {
    name: 'get_system_prompt',
    annotations: {
      title: 'Get system prompt',
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      'Get a complete system prompt for a persona including constitution and UVC qualities',
    inputSchema: {
      type: 'object',
      properties: {
        persona_id: {
          type: 'string',
          description: 'The persona ID',
          default: 'ambassador',
        },
      },
      required: [],
    },
    outputSchema: {
      type: 'object',
      properties: {
        personaId: { type: 'string', description: 'The persona the prompt was built for' },
        systemPrompt: { type: 'string', description: 'Assembled system prompt text' },
        creedAttestation: {
          type: 'string',
          description: 'Attestation line binding the prompt to the active creed hash',
        },
      },
      required: ['personaId', 'systemPrompt', 'creedAttestation'],
    },
  },
  {
    name: 'preview_export',
    annotations: {
      title: 'Preview export',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    description: 'Preview the export configuration for Claude Code or other AI tools',
    inputSchema: {
      type: 'object',
      properties: {
        persona_id: {
          type: 'string',
          description: 'The persona ID',
          default: 'ambassador',
        },
        include_system_prompt: {
          type: 'boolean',
          description: 'Include system prompt in export',
          default: true,
        },
        include_constitutions: {
          type: 'boolean',
          description: 'Include constitutions in export',
          default: true,
        },
        include_uvc: {
          type: 'boolean',
          description: 'Include UVC qualities in export',
          default: true,
        },
      },
      required: [],
    },
    outputSchema: {
      type: 'object',
      properties: {
        personaId: { type: 'string', description: 'The persona the export was built for' },
        personaName: { type: 'string', description: 'Human-readable persona name' },
        preview: { type: 'string', description: 'Rendered export preview text' },
        includeSystemPrompt: {
          type: 'boolean',
          description: 'Whether the system prompt was included',
        },
        includeConstitutions: {
          type: 'boolean',
          description: 'Whether constitutions were included',
        },
        includeUvc: { type: 'boolean', description: 'Whether UVC qualities were included' },
        constitutionIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Constitution IDs included in the export',
        },
      },
      required: ['personaId', 'personaName', 'preview'],
    },
  },
  {
    name: 'get_constitution_by_id',
    annotations: {
      title: 'Get constitution by ID',
      readOnlyHint: true,
      openWorldHint: true,
    },
    description: 'Get a specific constitution by its ID',
    inputSchema: {
      type: 'object',
      properties: {
        constitution_id: {
          type: 'string',
          description: 'The constitution ID',
        },
      },
      required: ['constitution_id'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Constitution ID' },
        name: { type: 'string', description: 'Constitution name' },
        content: { type: 'string', description: 'Full constitution text' },
        personaId: { type: 'string', description: 'Owning persona ID, when persona-scoped' },
        isSystemConstitution: {
          type: 'boolean',
          description: 'True for built-in system constitutions',
        },
        uvcQualities: UVC_QUALITIES_SCHEMA,
      },
      required: ['id', 'name', 'content', 'isSystemConstitution'],
    },
  },
  {
    name: 'search_constitutions',
    annotations: {
      title: 'Search constitutions',
      readOnlyHint: true,
      openWorldHint: true,
    },
    description: 'Search constitutions by keyword or persona',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        persona_id: {
          type: 'string',
          description: 'Filter by persona ID',
        },
      },
      required: [],
    },
    outputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Echo of the search query, when one was supplied' },
        persona: { type: 'string', description: 'Persona filter applied, or "all"' },
        results: { type: 'number', description: 'Number of matching constitutions' },
        constitutions: {
          type: 'array',
          description: 'Matching constitutions (content truncated to a 200-character preview)',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Constitution ID' },
              name: { type: 'string', description: 'Constitution name' },
              persona: { type: 'string', description: 'Owning persona ID, when persona-scoped' },
              isSystem: { type: 'boolean', description: 'True for built-in system constitutions' },
              preview: { type: 'string', description: 'First 200 characters of the content' },
            },
            required: ['id', 'name', 'isSystem', 'preview'],
          },
        },
      },
      required: ['persona', 'results', 'constitutions'],
    },
  },
  {
    name: 'get_active_persona',
    annotations: {
      title: 'Get active persona',
      readOnlyHint: true,
      openWorldHint: true,
    },
    description: 'Get the currently active persona for this session',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    outputSchema: {
      type: 'object',
      properties: { ...PERSONA_PROPERTIES },
      required: ['id', 'name', 'icon', 'description'],
    },
  },
  {
    name: 'clear_cache',
    annotations: {
      title: 'Clear local cache',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description: 'Clear the local cache to force fresh data from the API',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    outputSchema: {
      type: 'object',
      properties: {
        cleared: { type: 'boolean', description: 'True once the local cache has been cleared' },
        message: { type: 'string', description: 'Human-readable confirmation' },
      },
      required: ['cleared', 'message'],
    },
  },
  {
    name: 'adjudicate',
    annotations: {
      title: 'Adjudicate a request',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    description: 'Get a policy decision kernel for a user request based on active constitutions and persona',
    inputSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The user question or request to adjudicate',
        },
        persona_id: {
          type: 'string',
          description: 'The persona ID for policy context',
          default: 'ambassador',
        },
        context: {
          type: 'object',
          description: 'Additional context for the decision',
          properties: {
            constitutions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Active constitutions (defaults to current active set)',
            },
            adherence_level: {
              type: 'number',
              description: 'Constitutional adherence level (1-5)',
              minimum: 1,
              maximum: 5,
              default: 3,
            },
            influence_scope: {
              type: 'string',
              description: 'Influence scope for the decision',
              enum: ['advise_only', 'compare_options', 'motivate_with_disclosure'],
              default: 'advise_only',
            },
            user_id: {
              type: 'string',
              description: 'User ID for influence tracking',
            },
            session_id: {
              type: 'string',
              description: 'Session ID for influence tracking',
            },
          },
        },
      },
      required: ['question'],
    },
    // Passthrough of the PDP decision kernel. Fields mirror the upstream
    // DecisionKernel model, but the PDP versions independently of this server,
    // so nothing is marked required and extra fields are permitted.
    outputSchema: {
      type: 'object',
      description: 'Policy decision kernel returned by the Creed Space PDP',
      properties: {
        decision: {
          type: 'string',
          description:
            'Policy verdict (allow, block, modify, escalate, permit, forbid, divert, depends)',
        },
        rationale: { type: 'string', description: 'Short explanation of the decision' },
        norms: {
          type: 'array',
          items: { type: 'object' },
          description: 'Norms applied when reaching the decision',
        },
        precedence: {
          type: 'array',
          items: { type: 'string' },
          description: 'Precedence ordering used to resolve conflicting norms',
        },
        sources: {
          type: 'array',
          items: { type: 'object' },
          description: 'Constitution sources cited by the decision',
        },
        caveats: { type: 'array', items: { type: 'string' }, description: 'Caveats to the verdict' },
        nonce: {
          type: ['string', 'null'],
          description: 'Echo of the request nonce; null when none was supplied',
        },
        hash: { type: 'string', description: 'Kernel hash for verification' },
        timestamp: { type: 'number', description: 'Unix timestamp of the decision' },
        transparency: {
          type: ['object', 'null'],
          description: 'Transparency detail; null unless a transparency level was requested',
        },
      },
      required: [],
      additionalProperties: true,
    },
  },
  {
    name: 'get_anchor',
    annotations: {
      title: 'Get creed anchor',
      readOnlyHint: true,
      openWorldHint: true,
    },
    description: 'Get a compact anchor (1-2KB) with top 10 non-negotiable rules and creed hash for quick context reinforcement',
    inputSchema: {
      type: 'object',
      properties: {
        persona_id: {
          type: 'string',
          description: 'The persona ID',
          default: 'ambassador',
        },
        max_length: {
          type: 'number',
          description: 'Maximum length of anchor in characters (100-2000)',
          default: 1500,
          minimum: 100,
          maximum: 2000,
        },
      },
      required: [],
    },
    outputSchema: {
      type: 'object',
      properties: {
        personaId: { type: 'string', description: 'The persona the anchor was built for' },
        persona: { type: 'string', description: 'Human-readable persona name' },
        anchor: { type: 'string', description: 'Compact anchor text' },
        truncated: {
          type: 'boolean',
          description: 'True when the anchor was cut to fit max_length',
        },
        maxLength: { type: 'number', description: 'Maximum length applied' },
        totalRules: { type: 'number', description: 'Total rules in the merged creed' },
      },
      required: ['personaId', 'persona', 'anchor', 'truncated', 'maxLength'],
    },
  },
  {
    name: 'attest_response',
    annotations: {
      title: 'Attest a response',
      readOnlyHint: true,
      openWorldHint: true,
    },
    description: 'Validate a response against the active creed to check for violations and ensure attestation',
    inputSchema: {
      type: 'object',
      properties: {
        response: {
          type: 'string',
          description: 'The response text to validate',
        },
        persona_id: {
          type: 'string',
          description: 'The persona ID to validate against',
          default: 'ambassador',
        },
      },
      required: ['response'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pass', 'warn', 'fail'],
          description: 'fail on violations, warn on warnings only, otherwise pass',
        },
        creedHash: {
          type: ['string', 'null'],
          description: 'Active creed hash, or null when no creed has been fetched yet',
        },
        violations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Forbidden qualities detected in the response',
        },
        warnings: {
          type: 'array',
          items: { type: 'string' },
          description: 'Non-blocking issues, e.g. a missing attestation',
        },
        attestationPresent: {
          type: 'boolean',
          description: 'Whether the response embeds the active creed hash',
        },
      },
      required: ['status', 'violations', 'warnings', 'attestationPresent'],
    },
  },
  {
    name: 'heartbeat',
    annotations: {
      title: 'Heartbeat re-anchor',
      readOnlyHint: true,
      openWorldHint: true,
    },
    description: 'Periodic re-anchoring to prevent context drift - returns mini-anchor every 10 messages',
    inputSchema: {
      type: 'object',
      properties: {
        message_count: {
          type: 'number',
          description: 'Current message count in the session',
        },
        persona_id: {
          type: 'string',
          description: 'The persona ID',
          default: 'ambassador',
        },
        force: {
          type: 'boolean',
          description: 'Force anchor return regardless of message count',
          default: false,
        },
      },
      required: [],
    },
    outputSchema: {
      type: 'object',
      properties: {
        anchored: {
          type: 'boolean',
          description: 'True when a mini-anchor was returned rather than a plain acknowledgement',
        },
        messageCount: { type: 'number', description: 'Message count supplied by the caller' },
        personaId: { type: 'string', description: 'The persona used for re-anchoring' },
        text: { type: 'string', description: 'Mini-anchor text, or the heartbeat acknowledgement' },
        persona: {
          type: 'string',
          description: 'Human-readable persona name; present only when anchored',
        },
      },
      required: ['anchored', 'messageCount', 'personaId', 'text'],
    },
  },
  {
    name: 'perform_multi_scale_handshake',
    annotations: {
      title: 'Perform multi-scale handshake',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    description: 'Perform N-party value handshake across micro/meso/macro scales with anti-collusion and hierarchical budgets',
    inputSchema: {
      type: 'object',
      properties: {
        parties: {
          type: 'array',
          description: 'Array of party contexts for handshake',
          items: {
            type: 'object',
            properties: {
              entity_id: {
                type: 'string',
                description: 'Unique identifier for the entity',
              },
              scale: {
                type: 'string',
                enum: ['micro', 'meso', 'macro'],
                description: 'Alignment scale level',
              },
              persona_id: {
                type: 'string',
                description: 'Persona ID for this party',
              },
              agency: {
                type: 'number',
                description: 'Agency level (0.0-1.0)',
                minimum: 0,
                maximum: 1,
              },
              constraints: {
                type: 'number',
                description: 'Constraint level (0.0-1.0)',
                minimum: 0,
                maximum: 1,
              },
            },
            required: ['entity_id', 'scale'],
          },
        },
        invariants: {
          type: 'array',
          description: 'List of invariant rules that must be enforced',
          items: {
            type: 'string',
          },
        },
      },
      required: ['parties'],
    },
    // Passthrough of the safety-stack handshake response. Extra fields are
    // permitted because the upstream API versions independently.
    outputSchema: {
      type: 'object',
      description: 'Handshake result returned by the Creed Space safety stack',
      properties: {
        synthesized_constitution: {
          type: ['object', 'null'],
          description: 'Merged UVC components agreed across parties; null when no synthesis was reached',
        },
        party_weights: {
          type: 'object',
          description: 'Weight assigned to each party in the synthesis',
        },
        scale_attestations: {
          type: 'object',
          description: 'Attestation record per alignment scale',
        },
        precedence_decisions: {
          type: 'array',
          items: { type: 'object' },
          description: 'Precedence decisions taken to resolve competing party values',
        },
        conflicts: {
          type: 'array',
          items: { type: 'object' },
          description: 'Conflicts detected between parties',
        },
        rationale: { type: 'string', description: 'Explanation of the handshake outcome' },
      },
      required: [],
      additionalProperties: true,
    },
  },
  {
    name: 'get_scale_attestation',
    annotations: {
      title: 'Get scale attestation',
      readOnlyHint: true,
      openWorldHint: true,
    },
    description: 'Get attestation record with hash chain for a specific scale and entity',
    inputSchema: {
      type: 'object',
      properties: {
        entity_id: {
          type: 'string',
          description: 'Entity ID to get attestation for',
        },
        scale: {
          type: 'string',
          enum: ['micro', 'meso', 'macro'],
          description: 'Scale level for attestation',
        },
        include_chain: {
          type: 'boolean',
          description: 'Include parent hash chain',
          default: false,
        },
      },
      required: ['entity_id', 'scale'],
    },
    // Passthrough. The upstream endpoint returns one of three shapes: a chain
    // wrapper (include_chain), a bare attestation record, or a null-attestation
    // placeholder — so no field is required and extras are permitted.
    outputSchema: {
      type: 'object',
      description: 'Attestation record, attestation chain, or null-attestation placeholder',
      properties: {
        entity_id: { type: 'string', description: 'Entity the attestation belongs to' },
        scale: { type: 'string', description: 'Alignment scale of the attestation' },
        chain: {
          type: 'array',
          items: { type: 'object' },
          description: 'Parent hash chain; present when include_chain was set',
        },
        attestation: {
          type: ['object', 'null'],
          description: 'Null when no attestation exists for the entity',
        },
      },
      required: [],
      additionalProperties: true,
    },
  },

  // VCP Protocol Stack Interop Tools — RESERVED. These four tools are declared
  // but NOT yet implemented in the CallToolRequestSchema handler (server.ts),
  // so they are excluded from the advertised tool list for the 1.1.x release to
  // avoid publishing non-functional tools that throw "Unknown tool" on call.
  // Re-enable by removing this block comment AND adding the corresponding
  // handler cases in server.ts (and api-client methods). See CHANGELOG.
  /*
  {
    name: 'vcp_present_attestation',
    description:
      "Present this agent's creed attestation to a peer. Returns the attestation artifact for the current persona's governing creed, suitable for A2A Agent Card extension or direct peer exchange.",
    inputSchema: {
      type: 'object',
      properties: {
        persona_id: {
          type: 'string',
          description: 'The persona ID to present attestation for',
          default: 'ambassador',
        },
        include_profile: {
          type: 'boolean',
          description: 'Include VCP Profile extensions (delegation, negotiation, privacy)',
          default: false,
        },
      },
      required: [],
    },
  },
  {
    name: 'vcp_verify_peer',
    description:
      "Verify another agent's creed attestation. Checks signatures, creed hash against Hub, expiration, and revocation. Returns trust score and verification result.",
    inputSchema: {
      type: 'object',
      properties: {
        attestation: {
          type: 'object',
          description: "The peer agent's creed attestation to verify",
        },
        expected_creed_hash: {
          type: 'string',
          description: 'Expected creed hash from Hub (optional, for extra verification)',
        },
        constitution_type: {
          type: 'string',
          description: 'Criticality tier for trust score calculation',
          enum: ['safety-critical', 'standard', 'stable'],
          default: 'standard',
        },
      },
      required: ['attestation'],
    },
  },
  {
    name: 'vcp_check_compatibility',
    description:
      'Check compatibility between this agent and a peer before interaction. Detects scope mismatches, privacy boundary violations, delegation limits, and value conflicts. Returns compatible/negotiable/incompatible.',
    inputSchema: {
      type: 'object',
      properties: {
        peer_scopes: {
          type: 'array',
          items: { type: 'string' },
          description: "Peer agent's active CSM1 scope codes",
        },
        requested_action: {
          type: 'string',
          description: 'Action the peer wants to perform (optional)',
        },
        requested_data: {
          type: 'array',
          items: { type: 'string' },
          description: 'Data categories the peer requests (optional)',
        },
        peer_tradeoff_priorities: {
          type: 'array',
          items: { type: 'string' },
          description: "Peer's tradeoff priorities for conflict detection (optional)",
        },
      },
      required: ['peer_scopes'],
    },
  },
  {
    name: 'vcp_negotiate_values',
    description:
      'Initiate or continue value negotiation with a peer agent. Uses priority cascade, Pareto search, or escalation to resolve detected conflicts. Returns negotiation outcome or escalation request.',
    inputSchema: {
      type: 'object',
      properties: {
        negotiation_id: {
          type: 'string',
          description: 'Existing negotiation ID to continue (omit to start new)',
        },
        peer_agent_id: {
          type: 'string',
          description: 'Peer agent identifier',
        },
        conflicts: {
          type: 'array',
          description: 'Detected conflicts to resolve (from vcp_check_compatibility)',
          items: {
            type: 'object',
            properties: {
              conflict_type: { type: 'string' },
              domain: { type: 'string' },
              description: { type: 'string' },
              negotiable: { type: 'boolean' },
              severity: { type: 'number' },
            },
          },
        },
        proposal: {
          type: 'object',
          description: 'Counter-proposal from peer (for continuing negotiation)',
          properties: {
            action_requested: { type: 'string' },
            conditions: { type: 'object' },
            constraints_relaxed: { type: 'array', items: { type: 'string' } },
            constraints_firm: { type: 'array', items: { type: 'string' } },
          },
        },
        max_rounds: {
          type: 'number',
          description: 'Maximum negotiation rounds before escalation',
          default: 3,
        },
      },
      required: ['peer_agent_id'],
    },
  },
  */
];
