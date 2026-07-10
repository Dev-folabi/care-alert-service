import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Fetch wrapper with JWT authentication and error handling.
 * Automatically includes the Authorization header from the auth store.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, ...rest } = options;

  // Build URL with query params
  let url = `${API_BASE}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // Build headers
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((customHeaders as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...rest,
    headers,
  });

  // Handle errors
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Request failed" }));
    const error = new Error(data.error || data.message || `HTTP ${response.status}`);
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return response.json() as Promise<T>;
}

/** Shorthand methods */
export const api = {
  get: <T>(path: string, params?: Record<string, string>) =>
    apiFetch<T>(path, { method: "GET", params }),

  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
