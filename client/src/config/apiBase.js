const LOCAL_API_BASE = 'http://localhost:3001';
const DEFAULT_PROD_API_BASE = 'https://jobfinder-yw48.onrender.com';

const normalizeBaseUrl = (value) => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) {
    return `http://${trimmed}`;
  }

  return `https://${trimmed}`;
};

export const getApiBase = () => {
  const envBase = typeof process !== 'undefined' ? process.env.REACT_APP_API_BASE : '';
  const normalizedEnvBase = normalizeBaseUrl(envBase || '');

  if (normalizedEnvBase) {
    return normalizedEnvBase;
  }

  return process.env.NODE_ENV === 'development' ? LOCAL_API_BASE : DEFAULT_PROD_API_BASE;
};

export const API_BASE = getApiBase();