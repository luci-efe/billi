const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

let authToken: string | null = null;

/**
 * apiFetch is a wrapper around the native fetch API that ensures:
 * 1. credentials: 'include' is set for Clerk session cookie propagation.
 * 2. The correct API_BASE_URL is used (empty for same-origin proxy, or a full URL for staging).
 * 3. The Authorization header is set if a token is available.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
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
