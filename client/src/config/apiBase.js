const LOCAL_API_BASE = 'http://localhost:3001';
const DEFAULT_PROD_API_BASE = 'https://jobfinder-yw48.onrender.com';

const readEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] != null) {
    return String(import.meta.env[key] || '');
  }

  if (typeof process !== 'undefined' && process.env && process.env[key] != null) {
    return String(process.env[key] || '');
  }

  return '';
};

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
  const envBase = readEnv('REACT_APP_API_BASE') || readEnv('VITE_API_BASE');
  const normalizedEnvBase = normalizeBaseUrl(envBase || '');

  if (normalizedEnvBase) {
    return normalizedEnvBase;
  }

  const nodeEnv = readEnv('NODE_ENV') || readEnv('MODE');
  return nodeEnv === 'development' ? LOCAL_API_BASE : DEFAULT_PROD_API_BASE;
};

export const API_BASE = getApiBase();