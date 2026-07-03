import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CreedSpaceClient } from './api-client.js';
import { CREEDSPACE_TOOLS } from './tools.js';
import { CreedSpaceConfig, TransportType, HttpConfig } from './types.js';
import { startHttpTransport, type HttpTransportHandle } from './transports/index.js';
import { MCP_SERVER_VERSION } from './version.js';
import {
  validateToolArgs,
  GetConstitutionSchema,
  GetSystemPromptSchema,
  SetPersonaSchema,
  GetUvcQualitiesSchema,
  GetAnchorSchema,
  AttestResponseSchema,
  PreviewExportSchema,
  GetConstitutionByIdSchema,
  SearchConstitutionsSchema,
  AdjudicateSchema,
  HeartbeatSchema,
  MultiScaleHandshakeSchema,
  GetScaleAttestationSchema,
} from './validation.js';

const PDP_REQUEST_TIMEOUT_MS = Number(process.env.CREEDSPACE_PDP_TIMEOUT_MS ?? '10000');

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(PDP_REQUEST_TIMEOUT_MS);
}

export class CreedSpaceMCPServer {
  private server: Server;
  private client: CreedSpaceClient;
  private currentPersona: string;
  private activeConstitutions: string[];
  private baseUrl: string;
  private transportType: TransportType;
  private httpConfig: HttpConfig;
  private httpHandle?: HttpTransportHandle;

  constructor(config: Partial<CreedSpaceConfig> = {}) {
    this.currentPersona = config.persona ?? 'ambassador';
    this.activeConstitutions = ['UEF']; // Default constitutions
    this.baseUrl = config.baseUrl ?? config.apiUrl ?? 'http://localhost:8000';
    this.client = new CreedSpaceClient(config);
    this.transportType = config.transport ?? 'stdio';
    this.httpConfig = config.http ?? {
      port: 3100,
      host: 'localhost',
      // Secure-by-default: CORS disabled unless explicitly enabled. Without an
      // apiKey there is no auth middleware, so a permissive CORS default would
      // let any browser origin reaching localhost dispatch MCP tool calls.
      cors: false,
    };

    this.server = new Server(
      {
        name: 'creedspace',
        version: MCP_SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: CREEDSPACE_TOOLS,
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: rawArgs } = request.params;

      try {
        switch (name) {
          case 'get_constitution': {
            const args = validateToolArgs(GetConstitutionSchema, {
              personaId: rawArgs?.persona_id ?? this.currentPersona,
            });
            const personaId = args.personaId;
            const constitution = await this.client.getMergedConstitution(personaId);
            const creedAttestation = this.client.getCreedAttestation();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      persona: constitution.persona.name,
                      icon: constitution.persona.icon,
                      totalRules: constitution.totalRules,
                      content: constitution.mergedContent,
                      uvcToken: constitution.uvcToken,
                      creedAttestation,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'list_personas': {
            const personas = await this.client.getPersonas();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      current: this.currentPersona,
                      available: personas.map((p) => ({
                        id: p.id,
                        name: p.name,
                        icon: p.icon,
                        description: p.description,
                        active: p.isActive,
                      })),
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'set_persona': {
            const args = validateToolArgs(SetPersonaSchema, rawArgs);
            const personaId = args.personaId;

            // Verify persona exists
            const persona = await this.client.getPersona(personaId);
            this.currentPersona = personaId;
            this.client.setPersona(personaId);

            return {
              content: [
                {
                  type: 'text',
                  text: `Switched to ${persona.name} persona (${persona.icon}). ${persona.description}`,
                },
              ],
            };
          }

          case 'get_uvc_qualities': {
            const args = validateToolArgs(GetUvcQualitiesSchema, {
              personaId: rawArgs?.persona_id ?? this.currentPersona,
            });
            const personaId = args.personaId;
            const uvc = await this.client.getUvcQualities(personaId);

            if (!uvc) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `No UVC qualities configured for ${personaId}`,
                  },
                ],
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(uvc, null, 2),
                },
              ],
            };
          }

          case 'get_system_prompt': {
            const args = validateToolArgs(GetSystemPromptSchema, {
              personaId: rawArgs?.persona_id ?? this.currentPersona,
            });
            const systemPrompt = await this.client.getSystemPrompt(args.personaId);
            const creedAttestation = this.client.getCreedAttestation();

            return {
              content: [
                {
                  type: 'text',
                  text: `${systemPrompt}\n\n${creedAttestation}`,
                },
              ],
            };
          }

          case 'preview_export': {
            const args = validateToolArgs(PreviewExportSchema, {
              personaId: rawArgs?.persona_id ?? this.currentPersona,
              includeSystemPrompt: rawArgs?.include_system_prompt,
              includeConstitutions: rawArgs?.include_constitutions,
              includeUvc: rawArgs?.include_uvc,
            });

            const config = {
              personaId: args.personaId,
              personaName: '',
              includeSystemPrompt: args.includeSystemPrompt,
              includeConstitutions: args.includeConstitutions,
              includeUvc: args.includeUvc,
              selectedConstitutionIds: [] as string[],
            };

            // Get persona name
            const persona = await this.client.getPersona(config.personaId);
            config.personaName = persona.name;

            // Get all constitution IDs for this persona
            const constitutions = await this.client.getConstitutions(config.personaId);
            config.selectedConstitutionIds = constitutions.map((c) => c.id);

            const preview = await this.client.getExportPreview(config);

            return {
              content: [
                {
                  type: 'text',
                  text: preview,
                },
              ],
            };
          }

          case 'get_constitution_by_id': {
            const args = validateToolArgs(GetConstitutionByIdSchema, {
              constitutionId: rawArgs?.constitution_id,
            });

            const constitutions = await this.client.getConstitutions();
            const constitution = constitutions.find((c) => c.id === args.constitutionId);

            if (!constitution) {
              throw new Error(`Constitution not found: ${args.constitutionId}`);
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(constitution, null, 2),
                },
              ],
            };
          }

          case 'search_constitutions': {
            const args = validateToolArgs(SearchConstitutionsSchema, {
              query: rawArgs?.query,
              personaId: rawArgs?.persona_id,
            });

            let constitutions = await this.client.getConstitutions(args.personaId);

            if (args.query) {
              const searchLower = args.query.toLowerCase();
              constitutions = constitutions.filter(
                (c) =>
                  c.name.toLowerCase().includes(searchLower) ||
                  c.content.toLowerCase().includes(searchLower)
              );
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      query: args.query,
                      persona: args.personaId ?? 'all',
                      results: constitutions.length,
                      constitutions: constitutions.map((c) => ({
                        id: c.id,
                        name: c.name,
                        persona: c.personaId,
                        isSystem: c.isSystemConstitution,
                        preview: c.content.substring(0, 200) + '...',
                      })),
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'get_active_persona': {
            const persona = await this.client.getPersona(this.currentPersona);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      id: persona.id,
                      name: persona.name,
                      icon: persona.icon,
                      description: persona.description,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'clear_cache': {
            this.client.clearCache();
            return {
              content: [
                {
                  type: 'text',
                  text: 'Cache cleared successfully. Fresh data will be fetched on next request.',
                },
              ],
            };
          }

          case 'adjudicate': {
            const args = validateToolArgs(AdjudicateSchema, {
              question: rawArgs?.question,
              personaId: rawArgs?.persona_id ?? this.currentPersona,
              context: rawArgs?.context,
            });

            // Call PDP adjudicate API
            const response = await fetch(`${this.baseUrl}/api/v1/pdp/adjudicate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(this.client.getApiKey() ? { 'X-API-Key': this.client.getApiKey() } : {}),
              },
              signal: timeoutSignal(),
              body: JSON.stringify({
                message: args.question,
                persona: args.personaId,
                constitutions: args.context?.constitutions ?? this.activeConstitutions,
                adherence_level: args.context?.adherenceLevel ?? 3,
                influence_scope: args.context?.influenceScope ?? 'advise_only',
                context: {
                  user_id: args.context?.userId,
                  session_id: args.context?.sessionId,
                },
              }),
            });

            if (!response.ok) {
              throw new Error(`PDP adjudicate failed: ${response.statusText}`);
            }

            const kernel = await response.json();

            // Return the decision kernel as tool result
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(kernel, null, 2),
                },
              ],
            };
          }

          case 'get_anchor': {
            const args = validateToolArgs(GetAnchorSchema, {
              personaId: rawArgs?.persona_id ?? this.currentPersona,
              maxLength: rawArgs?.max_length ?? 1500,
            });

            const constitution = await this.client.getMergedConstitution(args.personaId);
            const creedAttestation = this.client.getCreedAttestation();

            // Extract top 10 non-negotiable rules
            const rules = constitution.mergedContent
              .split('\n')
              .filter((line) => line.trim() && !line.startsWith('#'))
              .slice(0, 10);

            // Build compact anchor
            const anchor = [
              `## Creed Anchor - ${constitution.persona.name}`,
              creedAttestation,
              '',
              '### Core Rules (Non-Negotiable):',
              ...rules.map((r, i) => `${i + 1}. ${r.trim()}`),
              '',
              `UVC: ${constitution.uvcToken || 'Not configured'}`,
              `Total Rules: ${constitution.totalRules}`,
            ].join('\n');

            // Truncate if needed
            const maxLen = args.maxLength ?? 1500;
            const truncatedAnchor =
              anchor.length > maxLen ? anchor.substring(0, maxLen - 3) + '...' : anchor;

            return {
              content: [
                {
                  type: 'text',
                  text: truncatedAnchor,
                },
              ],
            };
          }

          case 'attest_response': {
            const args = validateToolArgs(AttestResponseSchema, rawArgs ?? {});

            // Get current constitution for validation
            const currentHash = this.client.getCreedHash();

            // Simple pattern checks against constitution rules
            const violations: string[] = [];
            const warnings: string[] = [];

            // Check for obvious rule violations (simplified)
            const responseText = args.response.toLowerCase();

            // Check against never qualities if available
            const uvc = await this.client.getUvcQualities(args.personaId).catch(() => null);
            if (uvc?.qualities?.never) {
              for (const neverQuality of uvc.qualities.never) {
                if (responseText.includes(neverQuality.toLowerCase())) {
                  violations.push(`Contains forbidden quality: ${neverQuality}`);
                }
              }
            }

            // Check for creed hash in response
            const hasAttestation = args.response.includes(currentHash || 'no-hash');
            if (!hasAttestation) {
              warnings.push('Response lacks creed attestation');
            }

            const result = {
              status: violations.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'pass',
              creedHash: currentHash,
              violations,
              warnings,
              attestationPresent: hasAttestation,
            };

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'heartbeat': {
            const args = validateToolArgs(HeartbeatSchema, {
              messageCount: rawArgs?.message_count,
              personaId: rawArgs?.persona_id ?? this.currentPersona,
              force: rawArgs?.force,
            });

            // Return anchor every 10 messages or when forced
            if (args.force || (args.messageCount > 0 && args.messageCount % 10 === 0)) {
              const constitution = await this.client.getMergedConstitution(args.personaId);
              const creedAttestation = this.client.getCreedAttestation();

              // Extract key rules for re-anchoring
              const rules = constitution.mergedContent
                .split('\n')
                .filter((line) => line.trim() && !line.startsWith('#'))
                .slice(0, 5); // Top 5 rules for heartbeat

              const miniAnchor = [
                `[Context Refresh - Message ${args.messageCount}]`,
                creedAttestation,
                'Key Rules:',
                ...rules.map((r, i) => `${i + 1}. ${r.trim().substring(0, 100)}`),
                `Persona: ${constitution.persona.name}`,
              ].join('\n');

              return {
                content: [
                  {
                    type: 'text',
                    text: miniAnchor,
                  },
                ],
              };
            } else {
              // No anchor needed yet
              return {
                content: [
                  {
                    type: 'text',
                    text: `[Heartbeat OK - Message ${args.messageCount}]`,
                  },
                ],
              };
            }
          }

          case 'perform_multi_scale_handshake': {
            const args = validateToolArgs(MultiScaleHandshakeSchema, {
              parties: rawArgs?.parties,
              invariants: rawArgs?.invariants,
            });

            // Call the multi-scale handshake API endpoint
            const response = await this.client.performMultiScaleHandshake(
              args.parties.map((p) => ({
                entity_id: p.entityId,
                scale: p.scale,
                capabilities: p.capabilities,
              })),
              args.invariants
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(response, null, 2),
                },
              ],
            };
          }

          case 'get_scale_attestation': {
            const args = validateToolArgs(GetScaleAttestationSchema, {
              entityId: rawArgs?.entity_id,
              scale: rawArgs?.scale,
              includeChain: rawArgs?.include_chain,
            });

            // Call the attestation API endpoint
            const attestation = await this.client.getScaleAttestation(
              args.entityId,
              args.scale,
              args.includeChain
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(attestation, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        // SECURITY: Log error metadata without raw tool arguments; tool args can
        // contain prompts, user IDs, session IDs, or secrets.
        const errorContext = {
          toolName: name,
          argsRedacted: true,
          persona: this.currentPersona,
          timestamp: new Date().toISOString(),
          stack: error instanceof Error ? error.stack : undefined,
        };

        console.error('[MCP_SERVER_ERROR]', JSON.stringify(errorContext));

        // Re-throw with proper error chain to preserve original context
        if (error instanceof Error) {
          const enhancedError = new Error(`MCP tool '${name}' failed: ${error.message}`);
          enhancedError.cause = error; // Preserve error chain
          throw enhancedError;
        }

        // For non-Error objects, create specific actionable error
        throw new Error(`MCP tool '${name}' failed with unknown error type: ${String(error)}`);
      }
    });
  }

  async start(): Promise<void> {
    if (this.transportType === 'http') {
      // HTTP transport mode
      this.httpHandle = await startHttpTransport(this.server, {
        port: this.httpConfig.port,
        host: this.httpConfig.host,
        corsEnabled: this.httpConfig.cors,
        corsOrigins: this.httpConfig.corsOrigins,
        enableJsonResponse: this.httpConfig.enableJsonResponse ?? true,
        apiKey: this.client.getApiKey(),
        stateless: this.httpConfig.stateless,
      });

      console.error('Creed Space MCP Server started (HTTP transport)');
      console.error(`Active persona: ${this.currentPersona}`);
      console.error(`Listening on: http://${this.httpConfig.host}:${this.httpConfig.port}/mcp`);
    } else {
      // Default stdio transport mode
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      // Log to stderr so it doesn't interfere with stdio protocol
      console.error('Creed Space MCP Server started (stdio transport)');
      console.error(`Active persona: ${this.currentPersona}`);
    }
  }

  async stop(): Promise<void> {
    if (this.httpHandle) {
      await this.httpHandle.close();
      this.httpHandle = undefined;
    }
    await this.server.close();
    console.error('Creed Space MCP Server stopped');
  }

  getServer(): Server {
    return this.server;
  }
}
