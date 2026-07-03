const REDACTED = '[REDACTED]';

type LoggableConfig = Record<string, unknown>;

export function sanitizeMcpServerConfigForLog(config: unknown): LoggableConfig {
  return redactSecretKeys(config as LoggableConfig);
}

function redactSecretKeys(value: unknown): LoggableConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const redacted: LoggableConfig = {};
  for (const [key, nestedValue] of Object.entries(value as LoggableConfig)) {
    if (isSecretKey(key)) {
      redacted[key] = nestedValue ? REDACTED : nestedValue;
    } else if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
      redacted[key] = redactSecretKeys(nestedValue);
    } else {
      redacted[key] = nestedValue;
    }
  }

  return redacted;
}

function isSecretKey(key: string): boolean {
  return /(?:api[-_]?key|token|secret|password|credential)/i.test(key);
}
