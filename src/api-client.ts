import { fetch } from './fetch-polyfill.js';
import { createHash } from 'crypto';
import {
  Persona,
  Constitution,
  MergedConstitution,
  ExportConfig,
  CreedSpaceConfig,
} from './types.js';
import type { CacheEntry, ApiResponse } from './types/api.js';
import { CREED_VERSION, MCP_SERVER_VERSION } from './version.js';

const API_REQUEST_TIMEOUT_MS = Number(process.env.CREEDSPACE_API_TIMEOUT_MS ?? '10000');

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(API_REQUEST_TIMEOUT_MS);
}

export class CreedSpaceClient {
  private config: CreedSpaceConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private etagCache: Map<string, string> = new Map();
  private creedHash: string | null = null;
  private creedVersion: string = CREED_VERSION;

  constructor(config: Partial<CreedSpaceConfig> = {}) {
    this.config = {
      apiUrl: config.apiUrl ?? process.env.CREEDSPACE_API_URL ?? 'https://api.creed.space',
      apiKey: config.apiKey ?? process.env.CREEDSPACE_API_KEY,
      persona: config.persona ?? 'ambassador',
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTtl: config.cacheTtl ?? 300000, // 5 minutes
      offlineMode: config.offlineMode ?? false,
    };
  }

  private computeCreedHash(data: unknown): string {
    const content = JSON.stringify(data);
    return createHash('sha256').update(content).digest('hex').substring(0, 8);
  }

  private async fetchWithCache<T = unknown>(
    endpoint: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    } = {}
  ): Promise<T> {
    const cacheKey = `${endpoint}`;

    // Check cache first
    if (this.config.cacheEnabled && (!options.method || options.method === 'GET')) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTtl) {
        return cached.data as T;
      }
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': `@creedspace/mcp-server/${MCP_SERVER_VERSION}`,
        ...((options.headers || {}) as Record<string, string>),
      };

      if (this.config.apiKey) {
        headers['X-API-Key'] = this.config.apiKey;
      }

      // Add ETag support for conditional requests
      const etag = this.etagCache.get(cacheKey);
      if (etag && this.config.cacheEnabled) {
        headers['If-None-Match'] = etag;
      }

      const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
        ...options,
        headers,
        signal: timeoutSignal(),
      });

      // Handle 304 Not Modified
      if (response.status === 304) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return cached.data as T;
        }
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as T;

      // Store ETag if present
      const newEtag = response.headers.get('ETag');
      if (newEtag) {
        this.etagCache.set(cacheKey, newEtag);
      }

      // Update creed hash
      this.creedHash = this.computeCreedHash(data);

      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
      }

      return data;
    } catch (error) {
      // SECURITY: Log API failures with context for monitoring
      const errorContext = {
        endpoint,
        apiUrl: this.config.apiUrl,
        hasApiKey: !!this.config.apiKey,
        cacheEnabled: this.config.cacheEnabled,
        timestamp: new Date().toISOString(),
      };
      console.error('[API_CLIENT_ERROR]', JSON.stringify(errorContext));

      // If offline mode is enabled and we have cached data, return it
      if (this.config.offlineMode && this.cache.has(cacheKey)) {
        console.warn('[FALLBACK_MODE] API unavailable, using cached data', {
          endpoint,
          cacheAge: Date.now() - (this.cache.get(cacheKey)?.timestamp || 0),
        });
        return this.cache.get(cacheKey)?.data as T;
      }

      // Re-throw with enhanced context
      if (error instanceof Error) {
        const enhancedError = new Error(`API request to ${endpoint} failed: ${error.message}`);
        enhancedError.cause = error;
        throw enhancedError;
      }
      throw error;
    }
  }

  async getPersonas(): Promise<Persona[]> {
    const data = await this.fetchWithCache<{ personas: Persona[] }>('/api/v1/personas/list');
    return data.personas || [];
  }

  async getPersona(personaId: string): Promise<Persona> {
    const personas = await this.getPersonas();
    const persona = personas.find((p) => p.id === personaId);
    if (!persona) {
      throw new Error(`Persona not found: ${personaId}`);
    }
    return persona;
  }

  async getConstitutions(personaId?: string): Promise<Constitution[]> {
    try {
      // Get the full constitution hierarchy
      const hierarchy = await this.fetchWithCache<{
        directories?: Array<{
          constitutions?: Array<{
            relativePath: string;
            title: string;
            description?: string;
          }>;
        }>;
      }>('/api/v1/constitutions');

      // Get persona-specific constitutions if personaId provided
      if (personaId) {
        await this.getPersona(personaId);

        // Fetch actual constitution content for this persona
        const constitutions: Constitution[] = [];

        // Always include UEF
        const uefContent = await this.fetchWithCache<string>(
          '/api/v1/constitutions/Recommended/UEF.md/content',
          { headers: { Accept: 'text/plain' } }
        ).catch(() => 'Universal Ethics Foundation: Prioritize human safety and wellbeing');

        constitutions.push({
          id: 'uef',
          name: 'Universal Ethics Foundation',
          content: uefContent,
          isSystemConstitution: true,
        });

        // Add persona-specific constitutions based on the persona type
        const personaConstitutions = this.getPersonaDefaultConstitutions(personaId);
        for (const constPath of personaConstitutions) {
          try {
            const content = await this.fetchWithCache<string>(
              `/api/v1/constitutions/${constPath}/content`,
              { headers: { Accept: 'text/plain' } }
            );
            constitutions.push({
              id: constPath.split('/').pop()?.replace('.md', '') || constPath,
              name: this.formatConstitutionName(constPath),
              content,
              isSystemConstitution: false,
            });
          } catch (error) {
            console.warn(`Failed to fetch constitution ${constPath}:`, error);
          }
        }

        return constitutions;
      }

      // Return all available constitutions
      const allConstitutions: Constitution[] = [];
      for (const dir of hierarchy.directories || []) {
        for (const constitution of dir.constitutions || []) {
          allConstitutions.push({
            id: constitution.relativePath,
            name: constitution.title,
            content: constitution.description || '',
            isSystemConstitution: constitution.relativePath.includes('UEF'),
          });
        }
      }

      return allConstitutions;
    } catch (error) {
      console.error('Failed to fetch real constitutions, using defaults:', error);

      // Fallback to basic defaults if API is unavailable
      return [
        {
          id: 'uef',
          name: 'Universal Ethics Foundation',
          content:
            'Prioritize human safety and wellbeing. Respect autonomy. Act with transparency.',
          isSystemConstitution: true,
        },
      ];
    }
  }

  private getPersonaDefaultConstitutions(personaId: string): string[] {
    const defaults: Record<string, string[]> = {
      nanny: ['Safety/child_protection.md', 'Educational/age_appropriate.md'],
      sentinel: ['Privacy/data_protection.md', 'Security/opsec.md'],
      godparent: ['Religious/interfaith.md', 'Ethics/moral_guidance.md'],
      ambassador: ['Professional/diplomatic.md', 'Communication/effective.md'],
      muse: ['Creative/artistic_ethics.md', 'Innovation/responsible.md'],
      mediator: ['Governance/procedural_fairness.md', 'Ethics/balanced_governance.md'],
    };
    return defaults[personaId] || [];
  }

  private formatConstitutionName(path: string): string {
    const name = path.split('/').pop()?.replace('.md', '') || path;
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async getMergedConstitution(personaId: string): Promise<MergedConstitution> {
    try {
      // Try to get merged constitution from the Live Config API
      const liveConfig = await this.fetchWithCache<{
        constitution?: { content?: string; rule_count?: number };
        constitutions?: Constitution[];
      }>(`/api/v1/mcp/constitution`, {
        method: 'GET',
        headers: {
          'X-Persona-ID': personaId,
        },
      }).catch(() => null);

      if (liveConfig?.constitution) {
        const persona = await this.getPersona(personaId);
        return {
          persona,
          constitutions: liveConfig.constitutions || [],
          mergedContent: liveConfig.constitution.content || liveConfig.constitution,
          totalRules: liveConfig.constitution.rule_count || 1,
          creedHash: this.creedHash,
        } as MergedConstitution;
      }
    } catch (error) {
      console.warn('Live Config API not available, falling back to manual merge:', error);
    }

    // Fallback to manual merging
    const persona = await this.getPersona(personaId);
    const constitutions = await this.getConstitutions(personaId);

    const mergedContent = constitutions.map((c) => c.content).join('\n\n');
    this.creedHash = this.computeCreedHash({ personaId, constitutions });

    return {
      persona,
      constitutions,
      mergedContent,
      totalRules: constitutions.length,
      creedHash: this.creedHash,
    } as MergedConstitution;
  }

  async getUvcQualities(
    personaId: string
  ): Promise<{ qualities?: { desired?: string[]; disliked?: string[]; never?: string[] } } | null> {
    try {
      const data = await this.fetchWithCache<{
        qualities?: { desired?: string[]; disliked?: string[]; never?: string[] };
      }>(`/api/v1/uvc/${encodeURIComponent(personaId)}`);
      return data;
    } catch (error) {
      // SECURITY: Log UVC fetch failures for monitoring
      console.warn('[UVC_FETCH_ERROR]', {
        personaId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // UVC might not be available for all personas - this is expected
      // Re-throw critical errors but return null for 404/not found
      if (error instanceof Error && error.message.includes('404')) {
        return null; // Expected: UVC not configured for this persona
      }

      // For unexpected errors, preserve the error chain
      if (error instanceof Error) {
        const enhancedError = new Error(
          `Failed to fetch UVC qualities for persona ${personaId}: ${error.message}`
        );
        enhancedError.cause = error;
        throw enhancedError;
      }

      throw new Error(`Failed to fetch UVC qualities for persona ${personaId}: ${String(error)}`);
    }
  }

  async getExportPreview(config: ExportConfig): Promise<string> {
    const exportData = await this.fetchWithCache<{
      export_id?: string;
      preview?: string;
      data?: { preview: string };
    }>('/api/v1/export', {
      method: 'POST',
      body: JSON.stringify({
        constitution_ids: config.constitutionIds || [],
        format: config.format || 'json',
        include_metadata: config.includeMetadata ?? true,
        include_personas: config.includePersonas ?? true,
        adherence_level: config.adherenceLevel || 'standard',
      }),
    });

    // Update creed hash with export data
    this.creedHash = this.computeCreedHash(exportData);

    // Return formatted preview
    if (exportData.export_id) {
      return `Export created: ${exportData.export_id}\nCreed Hash: ${this.creedHash}\nVersion: ${this.creedVersion}`;
    }

    const data = exportData as ApiResponse<{ preview: string }>;

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from export preview API');
    }

    if ('preview' in data && typeof data.preview === 'string') {
      return data.preview;
    } else if (
      'data' in data &&
      data.data &&
      typeof data.data === 'object' &&
      'preview' in data.data
    ) {
      return (data.data as { preview: string }).preview;
    } else {
      throw new Error('Invalid export preview response format');
    }
  }

  async getSystemPrompt(personaId: string): Promise<string> {
    const merged = await this.getMergedConstitution(personaId);

    // Build a comprehensive system prompt with attestation
    const parts = [
      `You are operating with the ${merged.persona.name} persona.`,
      `Creed: ${this.creedVersion} sha256:${this.creedHash || 'pending'}`,
      '',
      '# Constitution Rules',
      merged.mergedContent,
      '',
    ];

    // Add UVC qualities if available
    const uvc = await this.getUvcQualities(personaId);
    if (uvc?.qualities) {
      parts.push('# Value Alignment');
      if (uvc.qualities.desired?.length) {
        parts.push(`Desired: ${uvc.qualities.desired.join(', ')}`);
      }
      if (uvc.qualities.disliked?.length) {
        parts.push(`Disliked: ${uvc.qualities.disliked.join(', ')}`);
      }
      if (uvc.qualities.never?.length) {
        parts.push(`Never: ${uvc.qualities.never.join(', ')}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }

  clearCache(): void {
    this.cache.clear();
    this.etagCache.clear();
    this.creedHash = null;
  }

  getCreedHash(): string | null {
    return this.creedHash;
  }

  getCreedVersion(): string {
    return this.creedVersion;
  }

  getCreedAttestation(): string {
    return `Creed: ${this.creedVersion} sha256:${this.creedHash || 'unverified'}`;
  }

  setPersona(personaId: string): void {
    this.config.persona = personaId;
    this.clearCache(); // Clear cache when persona changes
  }

  getCurrentPersona(): string {
    return this.config.persona || 'ambassador';
  }

  async performMultiScaleHandshake(
    parties: Array<{ entity_id: string; scale: string; capabilities?: string[] }>,
    invariants: string[] = []
  ): Promise<unknown> {
    const response = await this.fetchWithCache('/api/safety/multi-scale/handshake', {
      method: 'POST',
      body: JSON.stringify({
        parties,
        invariants,
      }),
    });
    return response;
  }

  async getScaleAttestation(
    entityId: string,
    scale: string,
    includeChain: boolean = false
  ): Promise<unknown> {
    const params = new URLSearchParams({
      entity_id: entityId,
      scale,
      include_chain: includeChain.toString(),
    });

    const response = await this.fetchWithCache(`/api/safety/multi-scale/attestation?${params}`);
    return response;
  }

  getApiKey(): string | undefined {
    return this.config.apiKey;
  }
}
