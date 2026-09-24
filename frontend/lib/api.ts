import { API_BASE_URL } from './constants';
import { getDeviceFingerprint } from './fingerprint';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    if (!headers.has('x-device-fingerprint')) {
      const fp = await getDeviceFingerprint();
      if (fp) headers.set('x-device-fingerprint', fp);
    }
  } catch (e) {}

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Always send cookies (ct_session)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}
