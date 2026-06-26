/**
 * API fetch interceptor — automatically injects Authorization header.
 *
 * Usage:
 *   import { apiFetch } from '../lib/api';
 *   const res = await apiFetch('/api/contacts/employees/search?query=foo');
 */

import { getToken } from './auth';
import { resolveUrl } from './url';

/**
 * Fetch wrapper that automatically injects the Authorization header.
 * Drop-in replacement for `fetch` — accepts the same arguments.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  if (token) {
    options = {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers as Record<string, string> | undefined),
      },
    };
  }
  url = resolveUrl(url);
  const response = await fetch(url, options);
  
  // Handle 401 Unauthorized - redirect to login
  if (response.status === 401) {
    const loginUrl = `${window.location.origin}/login`;
    window.location.href = loginUrl;
    throw new Error('UNAUTHORIZED');
  }
  
  return response;
}

// patchFetch 已移除。
// 全局 fetch 拦截（注入 Authorization header 等）统一由 ai-app-client 负责，
// 请在应用入口处初始化 ai-app-client 的拦截器，无需在此处调用 patchFetch。
