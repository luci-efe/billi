const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * apiFetch is a wrapper around the native fetch API that ensures:
 * 1. credentials: 'include' is set for Clerk session cookie propagation.
 * 2. The correct API_BASE_URL is used (empty for same-origin proxy, or a full URL for staging).
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  return response;
}

export const apiClient = {
  get: (path: string, options?: RequestInit) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path: string, body?: unknown, options?: RequestInit) => 
    apiFetch(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: (path: string, body?: unknown, options?: RequestInit) => 
    apiFetch(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string, options?: RequestInit) => apiFetch(path, { ...options, method: 'DELETE' }),
};
