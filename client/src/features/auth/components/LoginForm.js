import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../../components/NotificationProvider';
import { API_BASE as CLIENT_API_BASE } from '../../../config/apiBase';

const REMEMBER_KEY = 'remembered_login_identity';

const GOOGLE_CLIENT_ID_ENV_KEYS = [
  'REACT_APP_GOOGLE_CLIENT_ID',
  'REACT_APP_GOOGLE_OAUTH_CLIENT_ID',
  'REACT_APP_GSI_CLIENT_ID',
  'VITE_GOOGLE_CLIENT_ID'
];

const GOOGLE_CLIENT_ID_META_SELECTORS = [
  'meta[name="google-client-id"]',
  'meta[name="react-app-google-client-id"]',
  'meta[name="vite-google-client-id"]'
];

const isTemplateValue = (value) => /^(your_|react_app_|vite_|next_public_)/i.test(value);

const parseGoogleClientIds = (rawValue) => String(rawValue || '')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value && !isTemplateValue(value));

const readRuntimeEnv = () => {
  const env = {};

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    Object.assign(env, import.meta.env);
  }

  if (typeof process !== 'undefined' && process.env) {
    Object.assign(env, process.env);
  }

  return env;
};

const readGoogleClientIdFromEnv = () => {
  const env = readRuntimeEnv();

  for (const key of GOOGLE_CLIENT_ID_ENV_KEYS) {
    const ids = parseGoogleClientIds(env[key]);
    if (ids.length > 0) return ids[0];
  }

  return '';
};

const resolveGoogleClientId = () => {
  const envValue = readGoogleClientIdFromEnv();
  if (envValue) return envValue;

  if (typeof window !== 'undefined') {
    const runtimeCandidates = [
      window.__GOOGLE_CLIENT_ID__,
      window.__GOOGLE_CLIENT_IDS__
    ];

    for (const candidate of runtimeCandidates) {
      const ids = parseGoogleClientIds(candidate);
      if (ids.length > 0) return ids[0];
    }
  }

  if (typeof document !== 'undefined') {
    for (const selector of GOOGLE_CLIENT_ID_META_SELECTORS) {
      const ids = parseGoogleClientIds(document.querySelector(selector)?.getAttribute('content'));
      if (ids.length > 0) return ids[0];
    }
  }

  return '';
};

const parseJsonSafe = async (response) => {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const redirectByRole = (navigate, role) => {
  switch (role) {
    case 'Quan tri':
    case 'Quản trị':
    case 'Sieu quan tri vien':
    case 'Siêu quản trị viên':
      navigate('/admin/dashboard');
      break;
    case 'Nha tuyen dung':
    case 'Nhà tuyển dụng':
      navigate('/employer');
      break;
    case 'Ung vien':
    case 'Ứng viên':
    default:
      navigate('/profile');
      break;
  }
};

const LoginForm = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notify } = useNotification();
  const apiBase = CLIENT_API_BASE;
  const initialGoogleClientId = resolveGoogleClientId();

  // State for Google Client ID with fallback support
  const [googleClientId, setGoogleClientId] = useState(initialGoogleClientId);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Fetch Google Client ID from backend API for runtime configuration
  useEffect(() => {
    let isActive = true;

    const applyGoogleClientId = (value) => {
      const ids = parseGoogleClientIds(value);
      if (!ids.length) return;

      const nextId = ids[0];

      if (typeof window !== 'undefined') {
        window.__GOOGLE_CLIENT_ID__ = nextId;
      }

      if (!isActive) return;

      setGoogleClientId((prev) => (prev === nextId ? prev : nextId));
    };

    if (initialGoogleClientId) {
      applyGoogleClientId(initialGoogleClientId);
    }

    const fetchGoogleConfig = async () => {
      try {
        const response = await fetch(`${apiBase}/auth/config`);
        if (response.ok) {
          const data = await response.json();
          applyGoogleClientId(data?.googleClientId);
        }
      } catch (err) {
        console.warn('Failed to fetch Google config from backend, using build-time value:', err?.message);
      }
    };

    fetchGoogleConfig();

    return () => {
      isActive = false;
    };
  }, [apiBase, initialGoogleClientId]);

  useEffect(() => {
    const rememberedIdentity = localStorage.getItem(REMEMBER_KEY);
    if (rememberedIdentity) {
      setEmail(rememberedIdentity);
      setRememberMe(true);
    }
  }, []);

  const handleLoginSuccess = (data, identityForRemember = '') => {
    if (!data.token || !data.user) {
      throw new Error(t('authPages.loginForm.errors.invalidLoginResponse'));
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    if (rememberMe) {
      const rememberedIdentity = String(identityForRemember || data.user.email || '').trim();
      if (rememberedIdentity) {
        localStorage.setItem(REMEMBER_KEY, rememberedIdentity);
      }
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    notify({
      type: 'success',
      message: t('authPages.loginForm.messages.loginSuccessWelcome', { name: data.user.name || '' })
    });

    if (onSuccess) {
      onSuccess();
    }

    const nextStep = String(data?.nextStep || '').trim();
    const needsOnboarding = Boolean(nextStep || data?.needsOnboarding || data?.user?.needsOnboarding);
    if (needsOnboarding) {
      navigate(nextStep || '/onboarding/role');
      return;
    }

    redirectByRole(navigate, data.user.role);
  };

  const handleGoogleCredential = async (credential) => {
    const response = await fetch(`${apiBase}/auth/google-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ credential })
    });

    const data = await parseJsonSafe(response);

    if (!response.ok) {
      throw new Error(data.error || t('authPages.loginForm.errors.googleLoginFailed'));
    }

    handleLoginSuccess(data, data?.user?.email || email);
  };

  // Handle redirect callback: parse id_token from URL hash and complete login
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    if (!hash.includes('id_token=')) return;

    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const idToken = params.get('id_token');
    const returnedState = params.get('state') || '';
    const expectedState = sessionStorage.getItem('google_oauth_state') || '';

    // Clean URL immediately so refresh doesn't re-trigger
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

    if (!idToken) return;

    if (expectedState && returnedState !== expectedState) {
      setError(t('authPages.loginForm.errors.googleLoginFailed'));
      return;
    }

    sessionStorage.removeItem('google_oauth_state');
    sessionStorage.removeItem('google_oauth_nonce');

    (async () => {
      setGoogleLoading(true);
      setError('');
      try {
        await handleGoogleCredential(idToken);
      } catch (err) {
        setError(err.message || t('authPages.loginForm.errors.googleLoginFailed'));
      } finally {
        setGoogleLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateRandomToken = () => {
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const arr = new Uint8Array(16);
      window.crypto.getRandomValues(arr);
      return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  };

  const handleGoogleLogin = () => {
    setError('');

    if (!googleClientId) {
      setError(t('authPages.loginForm.errors.missingGoogleClientId'));
      return;
    }

    const nonce = generateRandomToken();
    const state = generateRandomToken();
    sessionStorage.setItem('google_oauth_nonce', nonce);
    sessionStorage.setItem('google_oauth_state', state);

    const redirectUri = `${window.location.origin}/login`;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleClientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'select_account');

    window.location.href = authUrl.toString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        const backendHint = response.status === 405
          ? t('authPages.loginForm.errors.backendConfigHint')
          : '';
        throw new Error(data.error || `${response.status} ${response.statusText}. ${backendHint}`.trim());
      }

      handleLoginSuccess(data, email);
    } catch (err) {
      const message = String(err?.message || '').trim();
      if (/Failed to fetch|NetworkError|Load failed|fetch failed/i.test(message)) {
        setError(t('authPages.loginForm.errors.cannotConnectServer', { apiBase: apiBase || 'same-origin' }));
      } else {
        setError(message || t('authPages.loginForm.errors.loginFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="loginIdentity">
          {t('authPages.loginForm.labels.identity')}
        </label>
        <input
          id="loginIdentity"
          type="text"
          className="auth-input"
          placeholder={t('authPages.loginForm.placeholders.identity')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="auth-field">
        <label className="auth-field-label" htmlFor="loginPassword">
          {t('authPages.loginForm.labels.password')}
        </label>
        <div className="auth-input-wrap">
          <input
            id="loginPassword"
            type={showPassword ? 'text' : 'password'}
            className="auth-input auth-input--with-icon"
            placeholder={t('authPages.loginForm.placeholders.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="auth-password-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword
              ? t('authPages.loginForm.aria.hidePassword')
              : t('authPages.loginForm.aria.showPassword')}
          >
            <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
          </button>
        </div>
      </div>

      {error ? <div className="auth-error-banner">{error}</div> : null}

      <div className="auth-row-between">
        <label className="auth-checkbox-wrap" htmlFor="rememberMe">
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span>{t('authPages.loginForm.rememberMe')}</span>
        </label>
        <Link className="auth-inline-link" to="/forgot-password">
          {t('authPages.loginForm.forgotPassword')}
        </Link>
      </div>

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? t('authPages.loginForm.processing') : t('authPages.loginForm.submit')}
        <i className="bi bi-arrow-right"></i>
      </button>

      <div className="auth-social-divider" role="separator" aria-label={t('authPages.loginForm.or')}> 
        <span>{t('authPages.loginForm.or')}</span>
      </div>

      <button
        type="button"
        className="auth-social-btn"
        onClick={handleGoogleLogin}
        disabled={loading || googleLoading || !googleClientId}
      >
        <span className="auth-social-icon" aria-hidden="true">
          <i className="bi bi-google"></i>
        </span>
        <span>{googleLoading
          ? t('authPages.loginForm.processing')
          : t('authPages.loginForm.continueWithGoogle')}</span>
      </button>

      <p className="auth-switch-inline">
        {t('authPages.loginForm.noAccount')} <Link to="/register">{t('authPages.loginForm.register')}</Link>
      </p>
    </form>
  );
};

export default LoginForm;
