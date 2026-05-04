import React, { useEffect, useRef, useState } from 'react';
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

const getGooglePopupErrorMessage = (reason, t) => {
  const normalizedReason = String(reason || '').trim().toLowerCase();

  if (normalizedReason.includes('popup_closed_by_user')) {
    return '';
  }

  if (normalizedReason.includes('popup_failed_to_open')) {
    return t('authPages.loginForm.errors.googlePopupBlocked');
  }

  if (normalizedReason.includes('idpiframe_initialization_failed')) {
    return t('authPages.loginForm.errors.googleIframeInitFailed');
  }

  if (normalizedReason.includes('origin_mismatch')) {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    return `Google chua cho phep origin hien tai${currentOrigin ? ` (${currentOrigin})` : ''}. Hay them origin nay vao Google Cloud Console.`;
  }

  return t('authPages.loginForm.errors.googleLoginFailed');
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
  const googleButtonContainerRef = useRef(null);
  const googleInitializedRef = useRef(false);
  const googleInitializedClientIdRef = useRef('');
  const googleCredentialHandlerRef = useRef(null);
  const initialGoogleClientId = resolveGoogleClientId();

  // State for Google Client ID with fallback support
  const [googleClientId, setGoogleClientId] = useState(initialGoogleClientId);
  const [googleScriptReady, setGoogleScriptReady] = useState(
    typeof window !== 'undefined' && Boolean(window.google?.accounts?.id)
  );
  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);

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

  // Wait for the Google Identity Services script to load (it is loaded async)
  useEffect(() => {
    if (googleScriptReady) return undefined;
    if (typeof window === 'undefined') return undefined;

    let cancelled = false;
    const start = Date.now();

    const intervalId = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        if (!cancelled) setGoogleScriptReady(true);
        window.clearInterval(intervalId);
      } else if (Date.now() - start > 15000) {
        window.clearInterval(intervalId);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [googleScriptReady]);

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

  // Keep a stable ref to the credential handler so the GIS callback (which is
  // captured at initialize time) always uses the latest closure.
  useEffect(() => {
    googleCredentialHandlerRef.current = async (response) => {
      const credential = String(response?.credential || '').trim();
      if (!credential) {
        setError(getGooglePopupErrorMessage('missing_credential', t));
        return;
      }

      setGoogleLoading(true);
      setError('');

      try {
        await handleGoogleCredential(credential);
      } catch (err) {
        setError(err.message || t('authPages.loginForm.errors.googleLoginFailed'));
      } finally {
        setGoogleLoading(false);
      }
    };
  });

  // Render the official Google Sign-In button as soon as GIS + clientId are ready.
  // We render it visibly so the user clicks the iframe directly, which lets GIS
  // use FedCM in browsers that block third-party cookies (Edge production case).
  useEffect(() => {
    if (!googleScriptReady) return;
    if (!googleClientId) return;
    const container = googleButtonContainerRef.current;
    if (!container) return;
    if (!window.google?.accounts?.id) return;

    const shouldInitialize = !googleInitializedRef.current
      || googleInitializedClientIdRef.current !== googleClientId;

    if (shouldInitialize) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        use_fedcm_for_prompt: true,
        itp_support: true,
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: false,
        error_callback: (googleError) => {
          setGoogleLoading(false);
          setError(getGooglePopupErrorMessage(googleError?.type || googleError?.message, t));
        },
        callback: (response) => {
          if (googleCredentialHandlerRef.current) {
            googleCredentialHandlerRef.current(response);
          }
        }
      });

      googleInitializedRef.current = true;
      googleInitializedClientIdRef.current = googleClientId;
    }

    container.innerHTML = '';

    const measuredWidth = container.offsetWidth || container.parentElement?.offsetWidth || 360;
    const buttonWidth = Math.max(240, Math.min(400, Math.floor(measuredWidth)));

    window.google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: buttonWidth
    });

    setGoogleButtonRendered(true);
  }, [googleScriptReady, googleClientId, t]);

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

      <div className="auth-google-wrap">
        <div
          ref={googleButtonContainerRef}
          className="auth-google-button"
          aria-busy={!googleButtonRendered}
        ></div>

        {!googleButtonRendered ? (
          <button
            type="button"
            className="auth-social-btn auth-social-btn--google auth-google-placeholder"
            disabled
          >
            <span className="auth-social-icon auth-social-icon--google" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
            </span>
            <span>{t('authPages.loginForm.continueWithGoogle')}</span>
          </button>
        ) : null}

        {googleLoading ? (
          <div className="auth-google-loading">
            <i className="bi bi-arrow-repeat auth-google-spinner" aria-hidden="true"></i>
            <span>{t('authPages.loginForm.processing')}</span>
          </div>
        ) : null}
      </div>

      <p className="auth-switch-inline">
        {t('authPages.loginForm.noAccount')} <Link to="/register">{t('authPages.loginForm.register')}</Link>
      </p>
    </form>
  );
};

export default LoginForm;
