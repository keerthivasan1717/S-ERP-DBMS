export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMsg = (typeof data === 'object' && data?.error) ? data.error : (typeof data === 'string' ? data : res.statusText);
    throw new ApiError(res.status, errorMsg, data);
  }

  return data as T;
}

export const api = {
  get: <T = any>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T = any>(url: string, body?: any) => request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(url: string, body?: any) => request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(url: string) => request<T>(url, { method: 'DELETE' }),
};
