/**
 * Centralized version constants for Creed Space MCP Server.
 *
 * This module provides a single source of truth for version numbers
 * used across the MCP server. Import from here to ensure consistency.
 */

// Creed constitution version - semantic versioning
// Bump this when constitution format or rules change
export const CREED_VERSION = '2.1.4';

// MCP server package version (should match package.json)
export const MCP_SERVER_VERSION = '1.1.1';

// MCP protocol version
export const MCP_PROTOCOL_VERSION = '0.3.0';

// Schema version - for data structure versioning
export const SCHEMA_VERSION = 1;

/**
 * Generate a standardized creed attestation string.
 *
 * @param creedHash - Optional SHA256 hash of the creed content
 * @returns Attestation string in format "Creed: X.Y.Z sha256:hash"
 */
export function getCreedAttestation(creedHash: string | null = null): string {
  const hashValue = creedHash ?? 'unverified';
  return `Creed: ${CREED_VERSION} sha256:${hashValue}`;
}

/**
 * Get all version information as an object.
 *
 * @returns Object containing all version constants
 */
export function getVersionInfo(): {
  creedVersion: string;
  mcpServerVersion: string;
  mcpProtocolVersion: string;
  schemaVersion: number;
} {
  return {
    creedVersion: CREED_VERSION,
    mcpServerVersion: MCP_SERVER_VERSION,
    mcpProtocolVersion: MCP_PROTOCOL_VERSION,
    schemaVersion: SCHEMA_VERSION,
  };
}
