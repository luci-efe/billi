import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, apiFetch, resolveApiBaseUrl } from '../api-client';

describe('api base URL resolution', () => {
  it('prefers an explicit VITE_API_BASE_URL', () => {
    expect(resolveApiBaseUrl('https://api.example.test', 'https://billi-web-staging.pages.dev')).toBe(
      'https://api.example.test',
    );
  });

  it('keeps localhost same-origin so the Vite dev proxy handles /api', () => {
    expect(resolveApiBaseUrl('', 'http://localhost:5173')).toBe('');
    expect(resolveApiBaseUrl('', 'http://127.0.0.1:5173')).toBe('');
  });

  it('uses the staging Worker for Billi staging Pages hosts when no explicit base URL is configured', () => {
    expect(resolveApiBaseUrl('', 'https://billi-web-staging.pages.dev')).toBe(
      'https://billi-api-staging.eduardo-lalo1999.workers.dev',
    );
    expect(resolveApiBaseUrl('', 'https://billi-web-staging-6pj.pages.dev')).toBe(
      'https://billi-api-staging.eduardo-lalo1999.workers.dev',
    );
  });

  it('falls back to same-origin for unknown hosts when no explicit base URL is configured', () => {
    expect(resolveApiBaseUrl('', 'https://app.example.test')).toBe('');
  });
});

describe('api auth token handling', () => {
  afterEach(() => {
    apiClient.setAuthTokenProvider(null);
    apiClient.setAuthToken(null);
    vi.restoreAllMocks();
  });

  it('prefers a fresh token from the provider on each request', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Response(JSON.stringify({ ok: true, auth: new Headers(init?.headers).get('Authorization') }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const getToken = vi.fn()
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('token-2');

    apiClient.setAuthToken('stale-token');
    apiClient.setAuthTokenProvider(getToken);

    await apiFetch('/api/me');
    await apiFetch('/api/me');

    expect(getToken).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/me',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe('Bearer token-1');
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe('Bearer token-2');
  });
});