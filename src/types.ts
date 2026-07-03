export interface Persona {
  id: string;
  name: string;
  icon: string;
  description: string;
  isActive: boolean;
}

export interface Constitution {
  id: string;
  name: string;
  content: string;
  personaId?: string;
  isSystemConstitution: boolean;
  uvcQualities?: {
    desired: string[];
    disliked: string[];
    never: string[];
  };
}

export interface MergedConstitution {
  persona: Persona;
  constitutions: Constitution[];
  mergedContent: string;
  uvcToken?: string;
  totalRules: number;
  creedHash?: string;
}

export interface ExportConfig {
  personaId: string;
  personaName: string;
  includeSystemPrompt: boolean;
  includeConstitutions: boolean;
  includeUvc: boolean;
  selectedConstitutionIds: string[];
  constitutionIds?: string[];
  format?: string;
  includeMetadata?: boolean;
  includePersonas?: boolean;
  adherenceLevel?: string;
}

export type TransportType = 'stdio' | 'http';

export interface HttpConfig {
  port: number;
  host: string;
  cors: boolean;
  corsOrigins?: string[];
  stateless?: boolean;
  enableJsonResponse?: boolean;
}

export interface CreedSpaceConfig {
  apiUrl: string;
  baseUrl?: string;
  apiKey?: string;
  persona?: string;
  cacheEnabled: boolean;
  cacheTtl: number;
  offlineMode?: boolean;
  // Transport configuration
  transport?: TransportType;
  http?: HttpConfig;
}

// ---------------------------------------------------------------------------
// VCP Protocol Stack Interop Types
// ---------------------------------------------------------------------------

/** Binding verification level for a creed attestation. */
export type CreedBindingLevel =
  | 'self_declared'
  | 'tested'
  | 'verified'
  | 'audited'
  | 'certified';

/** Machine-verifiable proof that an agent operates under a specific creed. */
export interface VCPCreedAttestation {
  attestation_id: string;
  agent_id: string;
  agent_name: string;
  agent_version: string;
  creed_id: string;
  creed_hash: string;
  creed_version: string;
  creed_title: string;
  csm1_code: string;
  level: CreedBindingLevel;
  bound_at: string;
  expires_at: string;
  scope_type: string;
  scopes: string[];
  issuer_id: string;
  issuer_signature: string;
  auditor_id?: string;
  auditor_signature?: string;
  revoked: boolean;
  content_hash: string;
}

/** Result of verifying a peer agent's creed attestation. */
export interface VCPVerificationResult {
  valid: boolean;
  level: CreedBindingLevel;
  trust_score: number;
  warnings: string[];
  errors: string[];
}

/** Compatibility level between two VCP-carrying agents. */
export type CompatibilityLevel = 'compatible' | 'negotiable' | 'incompatible';

/** Result of checking compatibility between two agents. */
export interface VCPCompatibilityResult {
  compatible: boolean;
  level: CompatibilityLevel;
  conflicts: VCPConflict[];
  negotiation_required: boolean;
  blocking_conflicts: number;
}

/** A detected conflict between two VCP contexts. */
export interface VCPConflict {
  conflict_type: string;
  domain: string;
  description: string;
  agent_a_position: string;
  agent_b_position: string;
  negotiable: boolean;
  severity: number;
}

/** VCP value envelope for cross-protocol messages (A2A / MCP). */
export interface VCPValueEnvelope {
  sender_creed: string;
  sender_attestation_ref: string;
  required_peer_scopes: string[];
  negotiation_id?: string;
}

/** A2A Agent Card extension with VCP metadata. */
export interface VCPAgentCardExtension {
  creed_id: string;
  creed_hash: string;
  attestation: VCPCreedAttestation;
  negotiation_supported: boolean;
  scopes: string[];
}
