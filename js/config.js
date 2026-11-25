/**
 * Smart Inventory Management System - Centralized Environment & API Configuration
 * Vite injects VITE_API_BASE_URL at build/dev time via __VITE_API_BASE_URL__.
 * Never store MongoDB connection strings, JWT secrets, or private credentials here.
 */
(function (global) {
  const BUILD_API_BASE_URL = '__VITE_API_BASE_URL__';
  const normalizedBuildUrl =
    BUILD_API_BASE_URL &&
    !BUILD_API_BASE_URL.includes('__VITE_API_BASE_URL__')
      ? BUILD_API_BASE_URL.trim().replace(/\/$/, '')
      : '';

  const hostname = (global.location && global.location.hostname) || '';
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]';

  function resolveApiBaseUrl() {
    let savedUrl = '';
    try {
      savedUrl = (global.localStorage?.getItem('sims_api_base_url') || '').trim().replace(/\/$/, '');
    } catch {
      savedUrl = '';
    }

    if (savedUrl) {
      // Guard against accidental localhost override left in localStorage on a deployed origin
      if (!isLocalHost && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(savedUrl) && normalizedBuildUrl) {
        return normalizedBuildUrl;
      }
      return savedUrl;
    }

    if (normalizedBuildUrl) {
      return normalizedBuildUrl;
    }

    return isLocalHost ? 'http://localhost:5000/api' : '';
  }

  function resolveUseBackendApi() {
    try {
      const savedToggle = global.localStorage?.getItem('sims_use_backend');
      if (savedToggle === 'true') return true;
      if (savedToggle === 'false') return false;
    } catch {
      // ignore storage errors
    }
    return Boolean(normalizedBuildUrl);
  }

  global.APP_CONFIG = {
    buildApiBaseUrl: normalizedBuildUrl,
    isLocalHost,
    resolveApiBaseUrl,
    resolveUseBackendApi
  };
})(window);
