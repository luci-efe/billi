const STAGING_API_BASE_URL = 'https://billi-api-staging.eduardo-lalo1999.workers.dev';
const BILLI_STAGING_PAGES_HOST_RE = /^billi-web-staging(?:-[a-z0-9]+)?\.pages\.dev$/;

export function resolveApiBaseUrl(
  explicitBaseUrl = import.meta.env.VITE_API_BASE_URL || '',
  locationHref = globalThis.location?.href ?? '',
): string {
  const configuredBaseUrl = explicitBaseUrl.trim();
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/$/, '');

  try {
    const { hostname } = new URL(locationHref);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return '';
    if (BILLI_STAGING_PAGES_HOST_RE.test(hostname)) return STAGING_API_BASE_URL;
  } catch {
    return '';
  }
  return '';
}

export const API_BASE_URL = resolveApiBaseUrl();

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

let authToken: string | null = null;
let authTokenProvider: (() => Promise<string | null>) | null = null;

async function resolveAuthToken(): Promise<string | null> {
  if (authTokenProvider) {
    return await authTokenProvider();
  }
  return authToken;
}

/**
 * apiFetch is a wrapper around the native fetch API that ensures:
 * 1. credentials: 'include' is set for Clerk session cookie propagation.
 * 2. The resolved API base URL is used (same-origin in local dev, Worker URL for staging Pages).
 * 3. A fresh Authorization token is attached when available.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = buildApiUrl(path);
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  const token = await resolveAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  return response;
}

export const apiClient = {
  setAuthToken: (token: string | null) => {
    authToken = token;
  },
  setAuthTokenProvider: (provider: (() => Promise<string | null>) | null) => {
    authTokenProvider = provider;
  },
  get: (path: string, options?: RequestInit) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path: string, body?: unknown, options?: RequestInit) => 
    apiFetch(path, { ...options, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (path: string, body?: unknown, options?: RequestInit) => 
    apiFetch(path, { ...options, method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (path: string, options?: RequestInit) => apiFetch(path, { ...options, method: 'DELETE' }),
  /**
   * Multipart upload — DOES NOT set Content-Type so the browser/runtime
   * generates the correct boundary. credentials:'include' is preserved.
   */
  postFormData: (path: string, formData: FormData) => 
    apiFetch(path, { method: 'POST', body: formData }),
};
