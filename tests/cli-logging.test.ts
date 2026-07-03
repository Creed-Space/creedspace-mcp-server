import { sanitizeMcpServerConfigForLog } from '../src/cli-logging';

describe('CLI startup error logging', () => {
  it('redacts API keys before serializing config for logs', () => {
    const sanitized = sanitizeMcpServerConfigForLog({
      persona: 'ambassador',
      apiUrl: 'https://api.creed.space',
      apiKey: 'cs_live_secret_value',
      http: {
        host: 'localhost',
        port: 3100,
        cors: false,
        stateless: false,
        apiKey: 'transport_secret_value',
      },
    });

    const serialized = JSON.stringify(sanitized);

    expect(serialized).not.toContain('cs_live_secret_value');
    expect(serialized).not.toContain('transport_secret_value');
    expect(sanitized).toMatchObject({
      persona: 'ambassador',
      apiUrl: 'https://api.creed.space',
      apiKey: '[REDACTED]',
      http: expect.objectContaining({ apiKey: '[REDACTED]' }),
    });
  });
});
