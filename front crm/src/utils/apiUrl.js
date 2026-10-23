/**
 * Centralized API URL and endpoint resolution utilities for Redpex CRM.
 * Resolves base URLs, prevents duplicate '/api/api' segments, and normalizes paths.
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

export const getBackendOrigin = () => {
  let url = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (!url) {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.origin;
    }
    return '';
  }
  return url.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '').replace(/\/v1\/?$/, '');
};

export const getApiEndpoint = (endpoint = '') => {
  const base = getApiBaseUrl();
  let cleanEndpoint = String(endpoint).trim();
  if (!cleanEndpoint.startsWith('/')) {
    cleanEndpoint = `/${cleanEndpoint}`;
  }
  // Prevent /api/api if base ends with /api and endpoint starts with /api/
  if (base.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.slice(4);
  }
  return `${base}${cleanEndpoint}`;
};

export default getApiBaseUrl;
