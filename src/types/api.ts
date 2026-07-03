/**
 * API and MCP server type definitions
 * Replaces unsafe 'as any' assertions with proper types
 */

// Base API types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// Cache types
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl?: number;
}

export interface CacheManager<T = unknown> {
  get(key: string): T | null;
  set(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
}

// Configuration types
export interface ServerConfig {
  apiUrl: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

// Request/Response types
export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface PersonaResponse {
  id: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  config?: Record<string, unknown>;
}

export interface ConstitutionResponse {
  id: string;
  name: string;
  content: string;
  version: string;
  active: boolean;
  metadata?: Record<string, unknown>;
}

export interface ExportResponse {
  format: string;
  content: string;
  metadata: {
    timestamp: string;
    version: string;
    personas: string[];
    constitutions: string[];
  };
}

// CLI types
export interface CliConfig {
  apiUrl?: string;
  apiKey?: string;
  outputFormat?: 'json' | 'yaml' | 'text';
  verbose?: boolean;
  interactive?: boolean;
}

export interface CliCommand {
  name: string;
  description: string;
  options?: CliOption[];
  handler: (args: CliArgs) => Promise<void> | void;
}

export interface CliOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: unknown;
}

export interface CliArgs {
  [key: string]: unknown;
  _: string[];
}

// Event types
export interface ServerEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  source?: string;
}

export interface EventHandler<T = unknown> {
  (event: ServerEvent<T>): void | Promise<void>;
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Type guards
export function isApiResponse<T>(obj: unknown): obj is ApiResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    typeof (obj as ApiResponse).success === 'boolean'
  );
}

export function isApiError(obj: unknown): obj is ApiError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj &&
    typeof (obj as ApiError).code === 'string' &&
    typeof (obj as ApiError).message === 'string'
  );
}

export function isPersonaResponse(obj: unknown): obj is PersonaResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'icon' in obj &&
    typeof (obj as PersonaResponse).id === 'string' &&
    typeof (obj as PersonaResponse).name === 'string' &&
    typeof (obj as PersonaResponse).icon === 'string'
  );
}

export function isConstitutionResponse(obj: unknown): obj is ConstitutionResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'content' in obj &&
    typeof (obj as ConstitutionResponse).id === 'string' &&
    typeof (obj as ConstitutionResponse).name === 'string' &&
    typeof (obj as ConstitutionResponse).content === 'string'
  );
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// HTTP status code types
export type HttpStatusCode =
  | 200
  | 201
  | 204 // Success
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422 // Client errors
  | 500
  | 502
  | 503
  | 504; // Server errors

export interface HttpResponse<T = unknown> extends ApiResponse<T> {
  status: HttpStatusCode;
  headers: Record<string, string>;
}
