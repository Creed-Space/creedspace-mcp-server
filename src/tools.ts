import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const CREEDSPACE_TOOLS: Tool[] = [
  {
    name: 'get_constitution',
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
  },
  {
    name: 'list_personas',
    description: 'List all available AI personas with their descriptions and current status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'set_persona',
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
  },
  {
    name: 'get_uvc_qualities',
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
  },
  {
    name: 'get_system_prompt',
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
  },
  {
    name: 'preview_export',
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
  },
  {
    name: 'get_constitution_by_id',
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
  },
  {
    name: 'search_constitutions',
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
  },
  {
    name: 'get_active_persona',
    description: 'Get the currently active persona for this session',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'clear_cache',
    description: 'Clear the local cache to force fresh data from the API',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'adjudicate',
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
  },
  {
    name: 'get_anchor',
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
  },
  {
    name: 'attest_response',
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
  },
  {
    name: 'heartbeat',
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
  },
  {
    name: 'perform_multi_scale_handshake',
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
  },
  {
    name: 'get_scale_attestation',
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
