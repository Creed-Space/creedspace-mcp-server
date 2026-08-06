import {
  assertProductionApiAuthentication,
  CreedSpaceClient,
} from '../src/api-client';

const mockFetch = jest.fn();

jest.mock('../src/fetch-polyfill', () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(data: string): Response {
  return new Response(data, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

describe('production API authentication contract', () => {
  it('requires a cs_ API key for the production API', () => {
    expect(() =>
      assertProductionApiAuthentication({
        apiUrl: 'https://api.creed.space',
        apiKey: '',
        offlineMode: false,
      })
    ).toThrow(/CREEDSPACE_API_KEY is required/);
    expect(() =>
      assertProductionApiAuthentication({
        apiUrl: 'https://api.creed.space',
        apiKey: 'wrong-format',
        offlineMode: false,
      })
    ).toThrow(/must be a cs_ API key/);
  });

  it('accepts an API key, offline mode, or a non-production API', () => {
    expect(() =>
      assertProductionApiAuthentication({
        apiUrl: 'https://api.creed.space',
        apiKey: 'cs_test_example',
      })
    ).not.toThrow();
    expect(() =>
      assertProductionApiAuthentication({
        apiUrl: 'https://api.creed.space',
        apiKey: '',
        offlineMode: true,
      })
    ).not.toThrow();
    expect(() =>
      assertProductionApiAuthentication({ apiUrl: 'http://localhost:8000', apiKey: '' })
    ).not.toThrow();
  });
});

describe('API-key-compatible route contract', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation(async (input: unknown) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/v1/personas/list') {
        return jsonResponse({
          personas: [
            {
              id: 'sentinel',
              name: 'The Sentinel',
              icon: 'fa-shield-alt',
              description: 'Privacy and security',
              isActive: true,
              uvc_token: 'secure.privacy.sentinel',
              suggested_qualities: {
                desired: ['vigilant', 'vigilant'],
                disliked: ['careless'],
                never: ['credential disclosure'],
              },
            },
          ],
        });
      }
      if (url.pathname === '/api/v1/constitutions') {
        return jsonResponse({ directories: [] });
      }
      if (url.pathname.startsWith('/api/v1/constitutions/') && url.pathname.endsWith('/content')) {
        return textResponse(`Constitution content for ${url.pathname}`);
      }
      return new Response(JSON.stringify({ detail: 'Not Found' }), {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  it('loads the selected persona and constitution only through registered X-API-Key routes', async () => {
    const client = new CreedSpaceClient({
      apiUrl: 'https://api.creed.space',
      apiKey: 'cs_test_example',
      persona: 'sentinel',
    });

    await expect(client.getPersona('sentinel')).resolves.toMatchObject({
      id: 'sentinel',
      name: 'The Sentinel',
    });
    await expect(client.getMergedConstitution('sentinel')).resolves.toMatchObject({
      persona: { id: 'sentinel', name: 'The Sentinel' },
      totalRules: 3,
      uvcToken: 'secure.privacy.sentinel',
      mergedContent: expect.stringContaining('Constitution content for /api/v1/constitutions/'),
    });
    await expect(client.getUvcQualities('sentinel')).resolves.toEqual({
      qualities: {
        desired: ['vigilant'],
        disliked: ['careless'],
        never: ['credential disclosure'],
      },
    });

    const requests = mockFetch.mock.calls.map(([input, init]) => ({
      url: new URL(String(input)),
      headers: init?.headers as Record<string, string>,
    }));
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every(({ headers }) => headers['X-API-Key'] === 'cs_test_example')).toBe(true);
    expect(requests.some(({ url }) => url.pathname === '/api/v1/personas/list')).toBe(true);
    expect(requests.some(({ url }) => url.pathname === '/api/v1/constitutions')).toBe(true);
    expect(
      requests.every(({ url }) =>
        /^\/api\/v1\/(?:personas\/list|constitutions(?:\/.*\/content)?)$/.test(url.pathname)
      )
    ).toBe(true);
    expect(requests.some(({ url }) => url.pathname === '/api/v1/mcp/constitution')).toBe(false);
    expect(requests.some(({ url }) => url.pathname.startsWith('/api/v1/uvc/'))).toBe(false);
  });
});
