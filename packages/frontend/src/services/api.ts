const BASE_URL = '/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public error: { code: string; message: string; details?: Array<{ field: string; message: string }> },
  ) {
    super(error.message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  // 401 interceptor — redirect to login on session expiry
  // Skip for /auth/login (returns 401 for invalid credentials)
  // Skip for /auth/me (handled by useAuth — avoids infinite reload for unauthenticated users)
  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/me')) {
    window.location.href = '/login?expired=true';
    throw new ApiError(401, { code: 'UNAUTHORIZED', message: 'Session expired' });
  }

  if (!res.ok) {
    let body: { error: { code: string; message: string; details?: Array<{ field: string; message: string }> } };
    try {
      body = await res.json();
    } catch {
      throw new ApiError(res.status, { code: 'UNKNOWN_ERROR', message: `Request failed with status ${res.status}` });
    }
    throw new ApiError(res.status, body.error);
  }

  return res.json();
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}
