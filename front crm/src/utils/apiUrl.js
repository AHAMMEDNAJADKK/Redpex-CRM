/**
 * Resolves and normalizes the backend API base URL.
 * Automatically ensures the URL includes the `/api` prefix without creating duplicate `/api/api` segments.
 * Handles both local proxy (/api) and production origins (e.g., https://redpex-crm.onrender.com or https://redpex-crm.onrender.com/api).
 */
export const getApiBaseUrl = () => {
  let url = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
  
  if (!url) {
    return '/api';
  }

  // If an absolute URL is provided without an /api or /v1 suffix, append /api
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (!url.endsWith('/api') && !url.includes('/api/') && !url.endsWith('/v1') && !url.includes('/v1/')) {
      url = `${url}/api`;
    }
  }

  return url;
};

export default getApiBaseUrl;
