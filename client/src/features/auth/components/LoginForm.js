import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../components/NotificationProvider';
import { API_BASE as CLIENT_API_BASE } from '../../../config/apiBase';

const REMEMBER_KEY = 'remembered_login_identity';

const resolveGoogleClientId = () => {
  const envValue = String(process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
  if (envValue) return envValue;

  if (typeof window !== 'undefined') {
    const runtimeValue = String(window.__GOOGLE_CLIENT_ID__ || '').trim();
    if (runtimeValue) return runtimeValue;
  }

  if (typeof document !== 'undefined') {
    const metaValue = String(document.querySelector('meta[name="google-client-id"]')?.getAttribute('content') || '').trim();
    if (metaValue && !metaValue.includes('REACT_APP_GOOGLE_CLIENT_ID')) {
      return metaValue;
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
  const { notify } = useNotification();
  const apiBase = CLIENT_API_BASE;
  const googleButtonContainerRef = useRef(null);
  const googleInitializedRef = useRef(false);
  const GOOGLE_CLIENT_ID = resolveGoogleClientId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const rememberedIdentity = localStorage.getItem(REMEMBER_KEY);
    if (rememberedIdentity) {
      setEmail(rememberedIdentity);
      setRememberMe(true);
    }
  }, []);

  const handleLoginSuccess = (data, identityForRemember = '') => {
    if (!data.token || !data.user) {
      throw new Error('Phản hồi đăng nhập không hợp lệ từ máy chủ.');
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

    notify({ type: 'success', message: `Đăng nhập thành công! Xin chào ${data.user.name}` });

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
      throw new Error(data.error || 'Đăng nhập Google thất bại.');
    }

    handleLoginSuccess(data, data?.user?.email || email);
  };

  const handleGoogleLogin = () => {
    setError('');

    if (!GOOGLE_CLIENT_ID) {
      setError('Thiếu cấu hình REACT_APP_GOOGLE_CLIENT_ID cho đăng nhập Google. Nếu chạy trên Vercel, hãy thêm biến môi trường này trong Project Settings > Environment Variables rồi redeploy.');
      return;
    }

    if (!window.google?.accounts?.id) {
      setError('Google API chưa sẵn sàng. Vui lòng thử lại sau giây lát.');
      return;
    }

    if (!googleInitializedRef.current) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          const credential = String(response?.credential || '').trim();
          if (!credential) {
            setError('Không nhận được thông tin xác thực từ Google.');
            return;
          }

          setGoogleLoading(true);
          setError('');

          try {
            await handleGoogleCredential(credential);
          } catch (err) {
            setError(err.message || 'Đăng nhập Google thất bại.');
          } finally {
            setGoogleLoading(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      googleInitializedRef.current = true;
    }

    if (!googleButtonContainerRef.current) {
      setError('Không thể khởi tạo nút đăng nhập Google.');
      return;
    }

    googleButtonContainerRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleButtonContainerRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill'
    });

    const googleButton = googleButtonContainerRef.current.querySelector('div[role="button"]');
    if (!googleButton) {
      setError('Không thể mở popup Google. Vui lòng thử lại.');
      return;
    }

    googleButton.click();
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
          ? 'API chưa trỏ đúng backend. Kiểm tra REACT_APP_API_BASE trên Vercel và redeploy.'
          : '';
        throw new Error(data.error || `${response.status} ${response.statusText}. ${backendHint}`.trim());
      }

      handleLoginSuccess(data, email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label className="auth-field-label" htmlFor="loginIdentity">
          Email hoặc tên đăng nhập
        </label>
        <input
          id="loginIdentity"
          type="text"
          className="auth-input"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="auth-field">
        <label className="auth-field-label" htmlFor="loginPassword">
          Mật khẩu
        </label>
        <div className="auth-input-wrap">
          <input
            id="loginPassword"
            type={showPassword ? 'text' : 'password'}
            className="auth-input auth-input--with-icon"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="auth-password-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
          <span>Ghi nhớ đăng nhập</span>
        </label>
        <Link className="auth-inline-link" to="/forgot-password">
          Quên mật khẩu?
        </Link>
      </div>

      <button type="submit" className="auth-submit-btn" disabled={loading}>
        {loading ? 'Đang xử lý...' : 'Đăng nhập ngay'}
        <i className="bi bi-arrow-right"></i>
      </button>

      <div className="auth-social-divider" role="separator" aria-label="hoặc">
        <span>Hoặc</span>
      </div>

      <button
        type="button"
        className="auth-social-btn"
        onClick={handleGoogleLogin}
        disabled={loading || googleLoading}
      >
        <span className="auth-social-icon" aria-hidden="true">
          <i className="bi bi-google"></i>
        </span>
        <span>{googleLoading ? 'Đang xử lý...' : 'Tiếp tục với Google'}</span>
      </button>

      <div ref={googleButtonContainerRef} className="auth-google-hidden" aria-hidden="true"></div>

      <p className="auth-switch-inline">
        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
      </p>
    </form>
  );
};

export default LoginForm;
